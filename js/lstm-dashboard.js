(function () {
  "use strict";

  const OUTPUT_ROOT = "https://raw.githubusercontent.com/ozsp12/lstm_for_the_win/main/data/output";
  const OUTPUT_BROWSER_ROOT = "https://github.com/ozsp12/lstm_for_the_win/tree/main/data/output";
  const SENTIMENT_ORDER = ["negative", "neutral", "positive"];
  const TOPIC_ORDER = ["refrigerator", "smartphone", "television", "washing_machine"];
  const PAGE_SIZE = 20;
  const state = { data: null, filtered: [], page: 1 };

  const byId = (id) => document.getElementById(id);
  const percent = (value, digits = 1) => `${(Number(value) * 100).toFixed(digits)}%`;
  const number = (value) => new Intl.NumberFormat("en-US").format(Number(value));
  const label = (value) => String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value;
  }

  function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(date);
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function fetchText(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Live data request failed (${response.status}): ${url}`);
    return response.text();
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Live data request failed (${response.status}): ${url}`);
    return response.json();
  }

  function parseCsv(text) {
    const records = [];
    let record = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (quoted) {
        if (character === '"' && text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else if (character === '"') {
          quoted = false;
        } else {
          field += character;
        }
      } else if (character === '"') {
        quoted = true;
      } else if (character === ",") {
        record.push(field);
        field = "";
      } else if (character === "\n") {
        record.push(field.replace(/\r$/, ""));
        if (record.some((value) => value !== "")) records.push(record);
        record = [];
        field = "";
      } else {
        field += character;
      }
    }

    assert(!quoted, "CSV contains an unterminated quoted field.");
    if (field || record.length) {
      record.push(field.replace(/\r$/, ""));
      if (record.some((value) => value !== "")) records.push(record);
    }
    assert(records.length > 1, "CSV contains no data rows.");

    const headers = records[0];
    assert(headers.length === new Set(headers).size, "CSV contains duplicate column names.");
    return records.slice(1).map((values, rowIndex) => {
      assert(values.length === headers.length, `CSV row ${rowIndex + 2} has an invalid column count.`);
      return Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex]]));
    });
  }

  function requireFields(rows, required, sourceName) {
    assert(rows.length > 0, `${sourceName} contains no rows.`);
    const available = new Set(Object.keys(rows[0]));
    const missing = required.filter((field) => !available.has(field));
    assert(missing.length === 0, `${sourceName} is missing columns: ${missing.join(", ")}.`);
  }

  function ratio(correct, total) {
    return total ? correct / total : 0;
  }

  function countBy(rows, field, labels) {
    const result = Object.fromEntries(labels.map((name) => [name, 0]));
    rows.forEach((row) => {
      assert(Object.hasOwn(result, row[field]), `Unexpected ${field} label: ${row[field]}.`);
      result[row[field]] += 1;
    });
    return result;
  }

  function taskSummary(rows, labels) {
    assert(rows.length > 0, "Evaluation task contains no rows.");
    const correct = rows.filter((row) => row.correct).length;
    const classAccuracy = {};
    labels.forEach((name) => {
      const classRows = rows.filter((row) => row.expected === name);
      assert(classRows.length > 0, `Expected class ${name} is missing.`);
      classAccuracy[name] = ratio(classRows.filter((row) => row.correct).length, classRows.length);
    });

    const matrix = Object.fromEntries(
      labels.map((expected) => [expected, Object.fromEntries(labels.map((predicted) => [predicted, 0]))])
    );
    rows.forEach((row) => {
      assert(Object.hasOwn(matrix, row.expected), `Unexpected expected label: ${row.expected}.`);
      assert(Object.hasOwn(matrix[row.expected], row.predicted), `Unexpected predicted label: ${row.predicted}.`);
      matrix[row.expected][row.predicted] += 1;
    });

    const averageConfidence = rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length;
    return {
      accuracy: ratio(correct, rows.length),
      correct,
      errors: rows.length - correct,
      average_confidence: averageConfidence,
      expected_distribution: countBy(rows, "expected", labels),
      predicted_distribution: countBy(rows, "predicted", labels),
      class_accuracy: classAccuracy,
      confidence_bands: {
        high_0_80_to_1_00: rows.filter((row) => row.confidence >= 0.8).length,
        medium_0_60_to_0_79: rows.filter((row) => row.confidence >= 0.6 && row.confidence < 0.8).length,
        low_below_0_60: rows.filter((row) => row.confidence < 0.6).length,
      },
      confusion: { labels, matrix },
    };
  }

  function buildDashboardData(manifest, predictionRows, evaluationRows, urls) {
    const predictionFields = [
      "ID", "text", "expected_sentiment", "expected_topic", "predicted_sentiment",
      "predicted_topic", "type", "input_timestamp", "model_timestamp",
    ];
    const evaluationFields = [
      "ID", "task", "expected", "predicted", "confidence", "correct", "type",
      "input_timestamp", "model_timestamp",
    ];
    requireFields(predictionRows, predictionFields, "predictions.csv");
    requireFields(evaluationRows, evaluationFields, "evaluation_predictions.csv");
    assert(manifest.status === "complete", "The latest run is not complete.");
    assert(manifest.run_id === urls.runId, "latest.json and run_manifest.json disagree on the run ID.");
    assert(predictionRows.every((row) => row.type === "test"), "predictions.csv contains non-test rows.");
    assert(evaluationRows.every((row) => row.type === "test"), "evaluation_predictions.csv contains non-test rows.");
    assert(
      predictionRows.every((row) => row.model_timestamp === manifest.model_timestamp),
      "predictions.csv and run_manifest.json disagree on the model timestamp."
    );
    assert(
      evaluationRows.every((row) => row.model_timestamp === manifest.model_timestamp),
      "evaluation_predictions.csv and run_manifest.json disagree on the model timestamp."
    );

    const ids = predictionRows.map((row) => Number(row.ID));
    assert(ids.every(Number.isInteger), "predictions.csv contains an invalid ID.");
    assert(ids.length === new Set(ids).size, "predictions.csv contains duplicate IDs.");

    const evaluations = new Map();
    const taskRows = { sentiment: [], topic: [] };
    evaluationRows.forEach((row) => {
      assert(row.task === "sentiment" || row.task === "topic", `Unexpected task: ${row.task}.`);
      assert(["true", "false"].includes(row.correct.toLowerCase()), `Invalid correct flag for ID ${row.ID}.`);
      const confidence = Number(row.confidence);
      const evaluationId = Number(row.ID);
      assert(Number.isInteger(evaluationId), `Invalid evaluation ID: ${row.ID}.`);
      assert(Number.isFinite(confidence) && confidence >= 0 && confidence <= 1, `Invalid confidence for ID ${row.ID}.`);
      const item = {
        id: evaluationId,
        task: row.task,
        expected: row.expected,
        predicted: row.predicted,
        confidence,
        correct: row.correct.toLowerCase() === "true",
      };
      const key = `${item.id}:${item.task}`;
      assert(!evaluations.has(key), `Duplicate ${item.task} evaluation for ID ${item.id}.`);
      evaluations.set(key, item);
      taskRows[item.task].push(item);
    });
    assert(evaluationRows.length === predictionRows.length * 2, "Each prediction must have two evaluation rows.");

    const reviews = predictionRows.map((row) => {
      const id = Number(row.ID);
      const sentiment = evaluations.get(`${id}:sentiment`);
      const topic = evaluations.get(`${id}:topic`);
      assert(sentiment && topic, `Missing evaluation data for ID ${id}.`);
      assert(sentiment.expected === row.expected_sentiment, `Sentiment expected-label mismatch for ID ${id}.`);
      assert(sentiment.predicted === row.predicted_sentiment, `Sentiment prediction mismatch for ID ${id}.`);
      assert(topic.expected === row.expected_topic, `Topic expected-label mismatch for ID ${id}.`);
      assert(topic.predicted === row.predicted_topic, `Topic prediction mismatch for ID ${id}.`);
      return {
        id,
        text: row.text,
        expected_sentiment: row.expected_sentiment,
        predicted_sentiment: row.predicted_sentiment,
        sentiment_confidence: sentiment.confidence,
        sentiment_correct: sentiment.correct,
        expected_topic: row.expected_topic,
        predicted_topic: row.predicted_topic,
        topic_confidence: topic.confidence,
        topic_correct: topic.correct,
        both_correct: sentiment.correct && topic.correct,
      };
    });

    const sentiment = taskSummary(taskRows.sentiment, SENTIMENT_ORDER);
    const topic = taskSummary(taskRows.topic, TOPIC_ORDER);
    const jointCorrect = reviews.filter((review) => review.both_correct).length;
    return {
      metadata: {
        ...manifest,
        data_scope: "Synthetic product reviews; test partition only",
        loaded_at: new Date().toISOString(),
        source_urls: urls,
      },
      kpis: {
        test_reviews: reviews.length,
        sentiment_accuracy: sentiment.accuracy,
        topic_accuracy: topic.accuracy,
        joint_accuracy: ratio(jointCorrect, reviews.length),
        joint_correct: jointCorrect,
        joint_errors: reviews.length - jointCorrect,
      },
      sentiment,
      topic,
      reviews,
    };
  }

  async function loadLiveDataAttempt() {
    const cacheKey = Date.now();
    const latest = await fetchJson(`${OUTPUT_ROOT}/latest.json?live=${cacheKey}`);
    assert(typeof latest.run_id === "string" && /^[A-Za-z0-9._-]+$/.test(latest.run_id), "latest.json contains an invalid run ID.");
    const runId = latest.run_id;
    const runRoot = `${OUTPUT_ROOT}/${encodeURIComponent(runId)}`;
    const urls = {
      runId,
      predictions: `${runRoot}/predictions.csv?live=${cacheKey}`,
      evaluations: `${runRoot}/evaluation_predictions.csv?live=${cacheKey}`,
      manifest: `${runRoot}/run_manifest.json?live=${cacheKey}`,
      browser: `${OUTPUT_BROWSER_ROOT}/${encodeURIComponent(runId)}`,
    };
    const [manifest, predictionsText, evaluationsText] = await Promise.all([
      fetchJson(urls.manifest),
      fetchText(urls.predictions),
      fetchText(urls.evaluations),
    ]);
    return buildDashboardData(manifest, parseCsv(predictionsText), parseCsv(evaluationsText), urls);
  }

  async function loadLiveData() {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await loadLiveDataAttempt();
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 750 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  function renderMetadata(data) {
    const { metadata, kpis, sentiment, topic } = data;
    setText("run-id", metadata.run_id);
    setText("model-time", formatTimestamp(metadata.model_timestamp));
    setText("kpi-sentiment", percent(kpis.sentiment_accuracy));
    setText("kpi-topic", percent(kpis.topic_accuracy));
    setText("kpi-joint", percent(kpis.joint_accuracy));
    setText("kpi-reviews", number(kpis.test_reviews));
    setText("kpi-sentiment-detail", `${number(sentiment.correct)} of ${number(kpis.test_reviews)} correct`);
    setText("kpi-topic-detail", `${number(topic.correct)} of ${number(kpis.test_reviews)} correct`);
    setText("kpi-joint-detail", `${number(kpis.joint_correct)} of ${number(kpis.test_reviews)} reviews`);
    setText("data-review-count", number(kpis.test_reviews));
    setText(
      "source-freshness",
      `Live from ${metadata.run_id} · model executed ${formatTimestamp(metadata.model_timestamp)} · loaded ${formatTimestamp(metadata.loaded_at)}`
    );
    const status = byId("live-status");
    status.className = "status-complete";
    status.innerHTML = '<i aria-hidden="true"></i> Live';
    byId("download-results").href = metadata.source_urls.predictions;
    byId("source-run-link").href = metadata.source_urls.browser;
    setText(
      "method-meta",
      `Pipeline ${metadata.pipeline_version} · Seed ${metadata.parameters.seed} · ${metadata.parameters.epochs} epochs · TensorFlow ${metadata.tensorflow_version}`
    );
  }

  function renderFinding(data) {
    const topicPerfect = data.topic.errors === 0;
    const confidenceGap = data.sentiment.average_confidence - data.sentiment.accuracy;
    const errorPairs = [];
    data.sentiment.confusion.labels.forEach((expected) => {
      data.sentiment.confusion.labels.forEach((predicted) => {
        if (expected !== predicted) {
          errorPairs.push({ expected, predicted, count: data.sentiment.confusion.matrix[expected][predicted] });
        }
      });
    });
    errorPairs.sort((left, right) => right.count - left.count);
    const largestError = errorPairs[0];
    setText(
      "finding-title",
      topicPerfect ? "Topic separation is strong; sentiment needs calibration." : "Both classifiers have measurable improvement opportunities."
    );
    const topicSentence = topicPerfect
      ? "The topic model classified every review correctly"
      : `The topic model reached ${percent(data.topic.accuracy)} accuracy`;
    const calibrationSentence = confidenceGap >= 0.1
      ? `Average sentiment confidence was ${percent(data.sentiment.average_confidence)}, which is high relative to its ${percent(data.sentiment.accuracy)} accuracy.`
      : `Average sentiment confidence was ${percent(data.sentiment.average_confidence)} against ${percent(data.sentiment.accuracy)} accuracy.`;
    const errorSentence = largestError && largestError.count
      ? `The most common sentiment error was ${label(largestError.expected)} predicted as ${label(largestError.predicted)} (${number(largestError.count)} reviews).`
      : "No sentiment errors were observed.";
    setText(
      "finding-body",
      `${topicSentence} in run ${data.metadata.run_id}. ${calibrationSentence} ${errorSentence}`
    );
  }

  function createBarRow(name, value, alert) {
    const row = document.createElement("div");
    row.className = "bar-row";

    const nameElement = document.createElement("div");
    nameElement.className = "bar-label";
    nameElement.textContent = name;

    const track = document.createElement("div");
    track.className = "bar-track";
    track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("div");
    fill.className = `bar-fill${alert ? " is-alert" : ""}`;
    fill.style.width = `${Math.max(0, Math.min(100, Number(value) * 100))}%`;
    track.appendChild(fill);

    const valueElement = document.createElement("div");
    valueElement.className = "bar-value";
    valueElement.textContent = percent(value);

    row.append(nameElement, track, valueElement);
    return row;
  }

  function renderBarChart(id, rows) {
    const container = byId(id);
    container.replaceChildren(...rows.map((row) => createBarRow(row.name, row.value, row.alert)));
  }

  function renderModelAccuracy(data) {
    renderBarChart("model-accuracy-chart", [
      { name: "Sentiment", value: data.sentiment.accuracy, alert: data.sentiment.accuracy < 0.8 },
      { name: "Topic", value: data.topic.accuracy, alert: false },
      { name: "Both correct", value: data.kpis.joint_accuracy, alert: data.kpis.joint_accuracy < 0.8 },
    ]);
  }

  function renderSentimentClasses(data) {
    const order = data.sentiment.confusion.labels;
    renderBarChart(
      "sentiment-class-chart",
      order.map((name) => ({
        name: label(name),
        value: data.sentiment.class_accuracy[name],
        alert: data.sentiment.class_accuracy[name] < 0.8,
      }))
    );
  }

  function renderMatrix(data) {
    const { labels, matrix } = data.sentiment.confusion;
    const maxValue = Math.max(...labels.flatMap((expected) => labels.map((predicted) => matrix[expected][predicted])));
    const table = document.createElement("table");
    table.className = "matrix-table";
    table.setAttribute("aria-label", "Sentiment confusion matrix");

    const thead = document.createElement("thead");
    const headingRow = document.createElement("tr");
    headingRow.appendChild(document.createElement("th"));
    labels.forEach((predicted) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label(predicted);
      headingRow.appendChild(th);
    });
    thead.appendChild(headingRow);

    const tbody = document.createElement("tbody");
    labels.forEach((expected) => {
      const row = document.createElement("tr");
      const rowHeader = document.createElement("th");
      rowHeader.scope = "row";
      rowHeader.textContent = label(expected);
      row.appendChild(rowHeader);
      labels.forEach((predicted) => {
        const value = matrix[expected][predicted];
        const cell = document.createElement("td");
        const diagonal = expected === predicted;
        cell.className = `matrix-cell ${diagonal ? "is-diagonal" : "is-error"}`;
        cell.style.setProperty("--matrix-opacity", String(value === 0 ? 0.04 : 0.14 + (value / maxValue) * 0.46));
        cell.textContent = number(value);
        const hint = document.createElement("small");
        hint.textContent = diagonal ? "correct" : value ? "error" : "none";
        cell.appendChild(hint);
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });

    table.append(thead, tbody);
    byId("sentiment-matrix").replaceChildren(table);
  }

  function renderTopics(data) {
    const labels = data.topic.confusion.labels;
    const cards = labels.map((name) => {
      const card = document.createElement("div");
      card.className = "topic-card";
      const title = document.createElement("p");
      title.className = "topic-card-label";
      title.textContent = label(name);
      const score = document.createElement("strong");
      score.textContent = percent(data.topic.class_accuracy[name]);
      const volume = document.createElement("span");
      volume.textContent = `${number(data.topic.expected_distribution[name])} test reviews`;
      card.append(title, score, volume);
      return card;
    });
    byId("topic-chart").replaceChildren(...cards);
  }

  function renderDistribution(data) {
    const labels = data.sentiment.confusion.labels;
    const maximum = Math.max(
      ...labels.flatMap((name) => [
        data.sentiment.expected_distribution[name],
        data.sentiment.predicted_distribution[name],
      ])
    );

    const columns = labels.map((name) => {
      const wrapper = document.createElement("div");
      wrapper.className = "grouped-column";
      const expected = document.createElement("div");
      expected.className = "vertical-bar expected";
      expected.style.height = `${(data.sentiment.expected_distribution[name] / maximum) * 100}%`;
      const expectedValue = document.createElement("span");
      expectedValue.textContent = number(data.sentiment.expected_distribution[name]);
      expected.appendChild(expectedValue);

      const predicted = document.createElement("div");
      predicted.className = "vertical-bar predicted";
      predicted.style.height = `${(data.sentiment.predicted_distribution[name] / maximum) * 100}%`;
      const predictedValue = document.createElement("span");
      predictedValue.textContent = number(data.sentiment.predicted_distribution[name]);
      predicted.appendChild(predictedValue);

      const nameElement = document.createElement("div");
      nameElement.className = "grouped-column-label";
      nameElement.textContent = label(name);
      wrapper.append(expected, predicted, nameElement);
      return wrapper;
    });
    byId("sentiment-distribution-chart").replaceChildren(...columns);
  }

  function confidenceCard(name, confidence, accuracyValue, className) {
    const card = document.createElement("div");
    card.className = `confidence-card ${className}`;
    const title = document.createElement("p");
    title.textContent = name;
    const value = document.createElement("strong");
    value.textContent = percent(confidence);
    const comparison = document.createElement("span");
    comparison.textContent = `${percent(accuracyValue)} accuracy`;
    card.append(title, value, comparison);
    return card;
  }

  function renderConfidence(data) {
    byId("confidence-comparison").replaceChildren(
      confidenceCard("Sentiment", data.sentiment.average_confidence, data.sentiment.accuracy, "is-warning"),
      confidenceCard("Topic", data.topic.average_confidence, data.topic.accuracy, "is-strong")
    );
  }

  function predictionCell(predicted, expected, confidence) {
    const cell = document.createElement("td");
    const wrapper = document.createElement("div");
    wrapper.className = "prediction-cell";
    const predictedElement = document.createElement("strong");
    predictedElement.textContent = label(predicted);
    const detail = document.createElement("span");
    detail.textContent = predicted === expected
      ? `${percent(confidence)} confidence`
      : `Expected ${label(expected)} · ${percent(confidence)} confidence`;
    wrapper.append(predictedElement, detail);
    cell.appendChild(wrapper);
    return cell;
  }

  function renderReviews() {
    const body = byId("review-table-body");
    const total = state.filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.min(state.page, pageCount);
    const start = (state.page - 1) * PAGE_SIZE;
    const rows = state.filtered.slice(start, start + PAGE_SIZE);

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.className = "empty-cell";
      td.colSpan = 5;
      td.textContent = "No reviews match the selected filters.";
      tr.appendChild(td);
      body.replaceChildren(tr);
    } else {
      const tableRows = rows.map((review) => {
        const tr = document.createElement("tr");
        const idCell = document.createElement("td");
        idCell.textContent = review.id;
        const textCell = document.createElement("td");
        textCell.textContent = review.text;
        const sentimentCell = predictionCell(
          review.predicted_sentiment,
          review.expected_sentiment,
          review.sentiment_confidence
        );
        const topicCell = predictionCell(review.predicted_topic, review.expected_topic, review.topic_confidence);
        const resultCell = document.createElement("td");
        const result = document.createElement("span");
        result.className = `result-pill ${review.both_correct ? "correct" : "error"}`;
        if (review.both_correct) {
          result.textContent = "Both correct";
        } else if (!review.sentiment_correct && !review.topic_correct) {
          result.textContent = "Two errors";
        } else {
          result.textContent = review.sentiment_correct ? "Topic error" : "Sentiment error";
        }
        resultCell.appendChild(result);
        tr.append(idCell, textCell, sentimentCell, topicCell, resultCell);
        return tr;
      });
      body.replaceChildren(...tableRows);
    }

    const shownFrom = total ? start + 1 : 0;
    const shownTo = Math.min(start + PAGE_SIZE, total);
    setText("review-count", `Showing ${number(shownFrom)}–${number(shownTo)} of ${number(total)} reviews`);
    setText("page-status", `Page ${state.page} of ${pageCount}`);
    byId("previous-page").disabled = state.page <= 1;
    byId("next-page").disabled = state.page >= pageCount;
  }

  function applyFilters() {
    const query = byId("review-search").value.trim().toLowerCase();
    const sentiment = byId("sentiment-filter").value;
    const topic = byId("topic-filter").value;
    const result = byId("result-filter").value;

    state.filtered = state.data.reviews.filter((review) => {
      const matchesQuery = !query || String(review.id).includes(query) || review.text.toLowerCase().includes(query);
      const matchesSentiment = sentiment === "all" || review.predicted_sentiment === sentiment;
      const matchesTopic = topic === "all" || review.predicted_topic === topic;
      const matchesResult = result === "all" || (result === "correct" ? review.both_correct : !review.both_correct);
      return matchesQuery && matchesSentiment && matchesTopic && matchesResult;
    });
    state.page = 1;
    renderReviews();
  }

  function bindControls() {
    byId("review-search").addEventListener("input", applyFilters);
    ["sentiment-filter", "topic-filter", "result-filter"].forEach((id) => {
      byId(id).addEventListener("change", applyFilters);
    });
    byId("previous-page").addEventListener("click", () => {
      state.page -= 1;
      renderReviews();
    });
    byId("next-page").addEventListener("click", () => {
      state.page += 1;
      renderReviews();
    });
  }

  function render(data) {
    state.data = data;
    state.filtered = data.reviews.slice();
    renderMetadata(data);
    renderFinding(data);
    renderModelAccuracy(data);
    renderSentimentClasses(data);
    renderMatrix(data);
    renderTopics(data);
    renderDistribution(data);
    renderConfidence(data);
    renderReviews();
    bindControls();
    document.documentElement.dataset.dashboardReady = "true";
  }

  function showError(error) {
    const message = document.createElement("p");
    message.className = "dashboard-load-error";
    message.textContent = "Live model results could not be loaded or did not pass validation. No cached result is being shown. Please refresh the page or open the source files.";
    const hero = document.querySelector(".dashboard-hero");
    hero.insertAdjacentElement("afterend", message);
    const tableBody = byId("review-table-body");
    if (tableBody) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.className = "empty-cell";
      td.colSpan = 5;
      td.textContent = "Results unavailable.";
      tr.appendChild(td);
      tableBody.replaceChildren(tr);
    }
    const status = byId("live-status");
    if (status) {
      status.className = "status-error";
      status.innerHTML = '<i aria-hidden="true"></i> Data unavailable';
    }
    setText("source-freshness", "The live source could not be validated.");
    document.documentElement.dataset.dashboardError = "true";
    console.error(error);
  }

  loadLiveData().then(render).catch(showError);
})();
