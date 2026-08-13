#!/usr/bin/env python3
"""Build the static LSTM results dashboard snapshot from pipeline artifacts.

The script uses only the Python standard library. It validates the test-only
prediction contract before writing a compact JSON file for GitHub Pages.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


SENTIMENT_ORDER = ("negative", "neutral", "positive")
TOPIC_ORDER = ("refrigerator", "smartphone", "television", "washing_machine")
REQUIRED_PREDICTION_FIELDS = {
    "ID",
    "text",
    "expected_sentiment",
    "expected_topic",
    "predicted_sentiment",
    "predicted_topic",
    "type",
    "input_timestamp",
    "model_timestamp",
}
REQUIRED_EVALUATION_FIELDS = {
    "ID",
    "task",
    "confidence",
    "correct",
    "type",
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError(f"{path}: missing CSV header")
        return list(reader)


def require_fields(path: Path, rows: list[dict[str, str]], required: set[str]) -> None:
    if not rows:
        raise ValueError(f"{path}: no data rows")
    missing = required - set(rows[0])
    if missing:
        raise ValueError(f"{path}: missing columns: {', '.join(sorted(missing))}")


def accuracy(correct: int, total: int) -> float:
    return round(correct / total, 6) if total else 0.0


def confusion(rows: list[dict[str, object]], labels: tuple[str, ...]) -> dict[str, object]:
    matrix = {expected: {predicted: 0 for predicted in labels} for expected in labels}
    for row in rows:
        expected = str(row["expected"])
        predicted = str(row["predicted"])
        if expected not in matrix or predicted not in matrix[expected]:
            raise ValueError(f"unexpected label pair: {expected!r} -> {predicted!r}")
        matrix[expected][predicted] += 1
    return {"labels": list(labels), "matrix": matrix}


def task_summary(rows: list[dict[str, object]], labels: tuple[str, ...]) -> dict[str, object]:
    correct = sum(bool(row["correct"]) for row in rows)
    expected_counts = Counter(str(row["expected"]) for row in rows)
    predicted_counts = Counter(str(row["predicted"]) for row in rows)
    confidence_values = [float(row["confidence"]) for row in rows]
    class_accuracy: dict[str, float] = {}
    for label in labels:
        label_rows = [row for row in rows if row["expected"] == label]
        label_correct = sum(bool(row["correct"]) for row in label_rows)
        class_accuracy[label] = accuracy(label_correct, len(label_rows))

    confidence_bands = {
        "high_0_80_to_1_00": sum(value >= 0.8 for value in confidence_values),
        "medium_0_60_to_0_79": sum(0.6 <= value < 0.8 for value in confidence_values),
        "low_below_0_60": sum(value < 0.6 for value in confidence_values),
    }
    return {
        "accuracy": accuracy(correct, len(rows)),
        "correct": correct,
        "errors": len(rows) - correct,
        "average_confidence": round(sum(confidence_values) / len(confidence_values), 6),
        "expected_distribution": {label: expected_counts[label] for label in labels},
        "predicted_distribution": {label: predicted_counts[label] for label in labels},
        "class_accuracy": class_accuracy,
        "confidence_bands": confidence_bands,
        "confusion": confusion(rows, labels),
    }


def build_snapshot(run_dir: Path) -> dict[str, object]:
    manifest_path = run_dir / "run_manifest.json"
    predictions_path = run_dir / "predictions.csv"
    evaluation_path = run_dir / "evaluation_predictions.csv"

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    predictions = read_csv(predictions_path)
    evaluations = read_csv(evaluation_path)
    require_fields(predictions_path, predictions, REQUIRED_PREDICTION_FIELDS)
    require_fields(evaluation_path, evaluations, REQUIRED_EVALUATION_FIELDS)

    if any(row["type"] != "test" for row in predictions + evaluations):
        raise ValueError("dashboard artifacts must contain test rows only")

    prediction_ids = [int(row["ID"]) for row in predictions]
    if len(prediction_ids) != len(set(prediction_ids)):
        raise ValueError("predictions.csv contains duplicate IDs")

    evaluations_by_key: dict[tuple[int, str], dict[str, object]] = {}
    task_rows: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in evaluations:
        row_id = int(row["ID"])
        task = row["task"]
        if task not in {"sentiment", "topic"}:
            raise ValueError(f"unexpected task: {task!r}")
        item: dict[str, object] = {
            "id": row_id,
            "task": task,
            "expected": row["expected"],
            "predicted": row["predicted"],
            "confidence": round(float(row["confidence"]), 6),
            "correct": row["correct"].strip().lower() == "true",
        }
        key = (row_id, task)
        if key in evaluations_by_key:
            raise ValueError(f"duplicate evaluation row for ID {row_id}, task {task}")
        evaluations_by_key[key] = item
        task_rows[task].append(item)

    reviews: list[dict[str, object]] = []
    for row in predictions:
        row_id = int(row["ID"])
        sentiment = evaluations_by_key.get((row_id, "sentiment"))
        topic = evaluations_by_key.get((row_id, "topic"))
        if sentiment is None or topic is None:
            raise ValueError(f"missing evaluation rows for ID {row_id}")
        if sentiment["expected"] != row["expected_sentiment"] or sentiment["predicted"] != row["predicted_sentiment"]:
            raise ValueError(f"sentiment mismatch between artifacts for ID {row_id}")
        if topic["expected"] != row["expected_topic"] or topic["predicted"] != row["predicted_topic"]:
            raise ValueError(f"topic mismatch between artifacts for ID {row_id}")
        reviews.append(
            {
                "id": row_id,
                "text": row["text"],
                "expected_sentiment": row["expected_sentiment"],
                "predicted_sentiment": row["predicted_sentiment"],
                "sentiment_confidence": sentiment["confidence"],
                "sentiment_correct": sentiment["correct"],
                "expected_topic": row["expected_topic"],
                "predicted_topic": row["predicted_topic"],
                "topic_confidence": topic["confidence"],
                "topic_correct": topic["correct"],
                "both_correct": bool(sentiment["correct"] and topic["correct"]),
            }
        )

    sentiment = task_summary(task_rows["sentiment"], SENTIMENT_ORDER)
    topic = task_summary(task_rows["topic"], TOPIC_ORDER)
    joint_correct = sum(bool(review["both_correct"]) for review in reviews)

    wrong_pairs = Counter(
        (str(row["expected"]), str(row["predicted"]))
        for row in task_rows["sentiment"]
        if not row["correct"]
    )
    most_common_error = None
    if wrong_pairs:
        (expected, predicted), count = wrong_pairs.most_common(1)[0]
        most_common_error = {"expected": expected, "predicted": predicted, "count": count}

    return {
        "schema_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "metadata": {
            "run_id": manifest["run_id"],
            "status": manifest["status"],
            "pipeline_version": manifest["pipeline_version"],
            "input_timestamp": manifest["input_timestamps"][0],
            "model_timestamp": manifest["model_timestamp"],
            "epochs": manifest["parameters"]["epochs"],
            "seed": manifest["parameters"]["seed"],
            "python_version": manifest["python_version"],
            "tensorflow_version": manifest["tensorflow_version"],
            "data_scope": "Synthetic product reviews; test partition only",
            "confidence_thresholds": {"high": ">= 0.80", "medium": "0.60-0.79", "low": "< 0.60"},
        },
        "kpis": {
            "test_reviews": len(reviews),
            "sentiment_accuracy": sentiment["accuracy"],
            "topic_accuracy": topic["accuracy"],
            "joint_accuracy": accuracy(joint_correct, len(reviews)),
            "joint_correct": joint_correct,
            "joint_errors": len(reviews) - joint_correct,
        },
        "sentiment": sentiment,
        "topic": topic,
        "insights": {
            "most_common_sentiment_error": most_common_error,
            "topic_errors": topic["errors"],
        },
        "reviews": reviews,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("run_dir", type=Path, help="Pipeline run directory")
    parser.add_argument("output", type=Path, help="Dashboard JSON output path")
    args = parser.parse_args()

    snapshot = build_snapshot(args.run_dir.resolve())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {args.output} with {snapshot['kpis']['test_reviews']} reviews; "
        f"sentiment accuracy={snapshot['kpis']['sentiment_accuracy']:.1%}, "
        f"topic accuracy={snapshot['kpis']['topic_accuracy']:.1%}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
