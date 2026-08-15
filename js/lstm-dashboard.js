(function () {
  "use strict";

  const OUTPUT_ROOT = "https://raw.githubusercontent.com/ozsp12/lstm_for_the_win/main/data/output";
  const OUTPUT_BROWSER_ROOT = "https://github.com/ozsp12/lstm_for_the_win/tree/main/data/output";
  const SENTIMENT_ORDER = ["negative", "neutral", "positive"];
  const TOPIC_ORDER = ["refrigerator", "smartphone", "television", "washing_machine"];
  const LEVELS = ["limited", "informal", "standard", "advanced", "technical"];
  const PAGE_SIZE = 20;
  const state = { data: null, filtered: [], page: 1 };

  const byId = (id) => document.getElementById(id);
  const number = (value) => new Intl.NumberFormat("en-US").format(Number(value));
  const percent = (value, digits = 1) => `${(Number(value) * 100).toFixed(digits)}%`;
  const label = (value) => String(value).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const ratio = (a, b) => b ? a / b : 0;

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value;
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      timeZone: "UTC", timeZoneName: "short",
    }).format(date);
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
    let row = [], field = "", quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") {
        row.push(field.replace(/\r$/, ""));
        if (row.some((v) => v !== "")) records.push(row);
        row = []; field = "";
      } else field += c;
    }
    assert(!quoted, "CSV contains an unterminated quoted field.");
    if (field || row.length) {
      row.push(field.replace(/\r$/, ""));
      if (row.some((v) => v !== "")) records.push(row);
    }
    assert(records.length > 1, "CSV contains no data rows.");
    const headers = records[0];
    assert(headers.length === new Set(headers).size, "CSV contains duplicate column names.");
    return records.slice(1).map((values, i) => {
      assert(values.length === headers.length, `CSV row ${i + 2} has an invalid column count.`);
      return Object.fromEntries(headers.map((h, j) => [h, values[j]]));
    });
  }

  function requireFields(rows, required) {
    assert(rows.length, "predictions.csv contains no rows.");
    const fields = new Set(Object.keys(rows[0]));
    const missing = required.filter((field) => !fields.has(field));
    assert(!missing.length, `predictions.csv is missing columns: ${missing.join(", ")}.`);
  }

  function parseBool(value, field, id) {
    const normalized = String(value).toLowerCase();
    assert(["true", "false"].includes(normalized), `Invalid ${field} flag for ID ${id}.`);
    return normalized === "true";
  }

  function parseBinary(value, field, id) {
    assert(["0", "1"].includes(String(value)), `Invalid ${field} flag for ID ${id}.`);
    return Number(value);
  }

  function countBy(rows, field, labels) {
    const counts = Object.fromEntries(labels.map((name) => [name, 0]));
    rows.forEach((row) => {
      assert(Object.hasOwn(counts, row[field]), `Unexpected ${field} label: ${row[field]}.`);
      counts[row[field]] += 1;
    });
    return counts;
  }

  function taskSummary(reviews, task, labels) {
    const expected = `expected_${task}`;
    const predicted = `predicted_${task}`;
    const confidence = `${task}_confidence`;
    const correctFlag = `${task}_correct`;
    const correct = reviews.filter((row) => row[correctFlag]).length;
    const matrix = Object.fromEntries(labels.map((a) => [a, Object.fromEntries(labels.map((b) => [b, 0]))]));
    const classAccuracy = {};
    labels.forEach((name) => {
      const classRows = reviews.filter((row) => row[expected] === name);
      assert(classRows.length, `Expected class ${name} is missing.`);
      classAccuracy[name] = ratio(classRows.filter((row) => row[correctFlag]).length, classRows.length);
    });
    reviews.forEach((row) => { matrix[row[expected]][row[predicted]] += 1; });
    return {
      accuracy: ratio(correct, reviews.length), correct, errors: reviews.length - correct,
      average_confidence: reviews.reduce((sum, row) => sum + row[confidence], 0) / reviews.length,
      expected_distribution: countBy(reviews, expected, labels),
      predicted_distribution: countBy(reviews, predicted, labels),
      class_accuracy: classAccuracy,
      confusion: { labels, matrix },
    };
  }

  function buildDashboardData(manifest, rows, urls) {
    requireFields(rows, [
      "ID", "text", "expected_sentiment", "expected_topic", "predicted_sentiment", "predicted_topic",
      "sentiment_confidence", "topic_confidence", "sentiment_correct", "topic_correct",
      "linguistic_level", "flagprofanity", "goldtest", "input_timestamp", "model_timestamp",
    ]);
    assert(manifest.status === "complete", "The latest run is not complete.");
    assert(manifest.run_id === urls.runId, "latest.json and run_manifest.json disagree on the run ID.");
    assert(rows.every((row) => row.model_timestamp === manifest.model_timestamp), "predictions.csv and run_manifest.json disagree on the model timestamp.");

    const ids = rows.map((row) => Number(row.ID));
    assert(ids.every(Number.isInteger), "predictions.csv contains an invalid ID.");
    assert(ids.length === new Set(ids).size, "predictions.csv contains duplicate IDs.");

    const reviews = rows.map((row) => {
      const id = Number(row.ID);
      const sentimentConfidence = Number(row.sentiment_confidence);
      const topicConfidence = Number(row.topic_confidence);
      assert(Number.isFinite(sentimentConfidence) && sentimentConfidence >= 0 && sentimentConfidence <= 1, `Invalid sentiment confidence for ID ${id}.`);
      assert(Number.isFinite(topicConfidence) && topicConfidence >= 0 && topicConfidence <= 1, `Invalid topic confidence for ID ${id}.`);
      assert(SENTIMENT_ORDER.includes(row.expected_sentiment) && SENTIMENT_ORDER.includes(row.predicted_sentiment), `Invalid sentiment label for ID ${id}.`);
      assert(TOPIC_ORDER.includes(row.expected_topic) && TOPIC_ORDER.includes(row.predicted_topic), `Invalid topic label for ID ${id}.`);
      assert(LEVELS.includes(row.linguistic_level), `Invalid linguistic level for ID ${id}.`);
      const sentimentCorrect = parseBool(row.sentiment_correct, "sentiment_correct", id);
      const topicCorrect = parseBool(row.topic_correct, "topic_correct", id);
      assert(sentimentCorrect === (row.expected_sentiment === row.predicted_sentiment), `Sentiment correctness mismatch for ID ${id}.`);
      assert(topicCorrect === (row.expected_topic === row.predicted_topic), `Topic correctness mismatch for ID ${id}.`);
      return {
        id, text: row.text,
        expected_sentiment: row.expected_sentiment, predicted_sentiment: row.predicted_sentiment,
        sentiment_confidence: sentimentConfidence, sentiment_correct: sentimentCorrect,
        expected_topic: row.expected_topic, predicted_topic: row.predicted_topic,
        topic_confidence: topicConfidence, topic_correct: topicCorrect,
        linguistic_level: row.linguistic_level,
        flagprofanity: parseBinary(row.flagprofanity, "flagprofanity", id),
        goldtest: parseBinary(row.goldtest, "goldtest", id),
        both_correct: sentimentCorrect && topicCorrect,
      };
    });

    const sentiment = taskSummary(reviews, "sentiment", SENTIMENT_ORDER);
    const topic = taskSummary(reviews, "topic", TOPIC_ORDER);
    const jointCorrect = reviews.filter((review) => review.both_correct).length;
    return {
      metadata: { ...manifest, loaded_at: new Date().toISOString(), source_urls: urls },
      kpis: {
        incoming_reviews: reviews.length,
        sentiment_accuracy: sentiment.accuracy,
        topic_accuracy: topic.accuracy,
        joint_accuracy: ratio(jointCorrect, reviews.length),
        joint_correct: jointCorrect,
        goldtest_count: reviews.filter((review) => review.goldtest === 1).length,
        profanity_count: reviews.filter((review) => review.flagprofanity === 1).length,
      },
      sentiment, topic, reviews,
    };
  }

  async function loadLiveDataAttempt() {
    const cacheKey = Date.now();
    const latest = await fetchJson(`${OUTPUT_ROOT}/latest.json?live=${cacheKey}`);
    assert(typeof latest.run_id === "string" && /^[A-Za-z0-9._-]+$/.test(latest.run_id), "latest.json contains an invalid run ID.");
    const runId = latest.run_id;
    const root = `${OUTPUT_ROOT}/${encodeURIComponent(runId)}`;
    const urls = {
      runId,
      predictions: `${root}/predictions.csv?live=${cacheKey}`,
      manifest: `${root}/run_manifest.json?live=${cacheKey}`,
      browser: `${OUTPUT_BROWSER_ROOT}/${encodeURIComponent(runId)}`,
    };
    const [manifest, predictions] = await Promise.all([fetchJson(urls.manifest), fetchText(urls.predictions)]);
    return buildDashboardData(manifest, parseCsv(predictions), urls);
  }

  async function loadLiveData() {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { return await loadLiveDataAttempt(); }
      catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 750 * (attempt + 1)));
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
    setText("kpi-reviews", number(kpis.incoming_reviews));
    setText("kpi-sentiment-detail", `${number(sentiment.correct)} of ${number(kpis.incoming_reviews)} correct`);
    setText("kpi-topic-detail", `${number(topic.correct)} of ${number(kpis.incoming_reviews)} correct`);
    setText("kpi-joint-detail", `${number(kpis.joint_correct)} of ${number(kpis.incoming_reviews)} reviews`);
    setText("data-review-count", number(kpis.incoming_reviews));
    setText("source-freshness", `Live from ${metadata.run_id} · generation ${metadata.input_generation} · model executed ${formatTimestamp(metadata.model_timestamp)} · loaded ${formatTimestamp(metadata.loaded_at)}`);
    const status = byId("live-status");
    status.className = "status-complete";
    status.innerHTML = '<i aria-hidden="true"></i> Live';
    byId("download-results").href = metadata.source_urls.predictions;
    byId("source-run-link").href = metadata.source_urls.browser;
    setText("method-meta", `Pipeline ${metadata.pipeline_version} · Generation ${metadata.input_generation} · Seed ${metadata.parameters.seed} · ${metadata.parameters.epochs} epochs · TensorFlow ${metadata.tensorflow_version}`);
  }

  function renderFinding(data) {
    const pairs = [];
    data.sentiment.confusion.labels.forEach((expected) => data.sentiment.confusion.labels.forEach((predicted) => {
      if (expected !== predicted) pairs.push({ expected, predicted, count: data.sentiment.confusion.matrix[expected][predicted] });
    }));
    pairs.sort((a, b) => b.count - a.count);
    const largest = pairs[0];
    setText("finding-title", data.topic.errors === 0 ? "Topic separation is strong; sentiment remains the harder task." : "Both classifiers have measurable improvement opportunities.");
    const topicSentence = data.topic.errors === 0 ? "The topic model classified every incoming review correctly" : `The topic model reached ${percent(data.topic.accuracy)} accuracy`;
    const errorSentence = largest && largest.count ? `The most common sentiment error was ${label(largest.expected)} predicted as ${label(largest.predicted)} (${number(largest.count)} reviews).` : "No sentiment errors were observed.";
    setText("finding-body", `${topicSentence} in run ${data.metadata.run_id}. Average sentiment confidence was ${percent(data.sentiment.average_confidence)} against ${percent(data.sentiment.accuracy)} accuracy. ${errorSentence} ${number(data.kpis.goldtest_count)} reviews are goldtest candidates for the next training generation.`);
  }

  function createBarRow(name, value, alert) {
    const row = document.createElement("div"); row.className = "bar-row";
    const nameElement = document.createElement("div"); nameElement.className = "bar-label"; nameElement.textContent = name;
    const track = document.createElement("div"); track.className = "bar-track"; track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("div"); fill.className = `bar-fill${alert ? " is-alert" : ""}`; fill.style.width = `${Math.max(0, Math.min(100, value * 100))}%`; track.appendChild(fill);
    const valueElement = document.createElement("div"); valueElement.className = "bar-value"; valueElement.textContent = percent(value);
    row.append(nameElement, track, valueElement); return row;
  }

  function renderBarChart(id, rows) { byId(id).replaceChildren(...rows.map((row) => createBarRow(row.name, row.value, row.alert))); }

  function renderModelAccuracy(data) {
    renderBarChart("model-accuracy-chart", [
      { name: "Sentiment", value: data.sentiment.accuracy, alert: data.sentiment.accuracy < 0.8 },
      { name: "Topic", value: data.topic.accuracy, alert: data.topic.accuracy < 0.8 },
      { name: "Both correct", value: data.kpis.joint_accuracy, alert: data.kpis.joint_accuracy < 0.8 },
    ]);
  }

  function renderSentimentClasses(data) {
    renderBarChart("sentiment-class-chart", data.sentiment.confusion.labels.map((name) => ({ name: label(name), value: data.sentiment.class_accuracy[name], alert: data.sentiment.class_accuracy[name] < 0.8 })));
  }

  function renderMatrix(data) {
    const { labels, matrix } = data.sentiment.confusion;
    const maxValue = Math.max(...labels.flatMap((a) => labels.map((b) => matrix[a][b])));
    const table = document.createElement("table"); table.className = "matrix-table"; table.setAttribute("aria-label", "Sentiment confusion matrix");
    const thead = document.createElement("thead"), heading = document.createElement("tr"); heading.appendChild(document.createElement("th"));
    labels.forEach((name) => { const th = document.createElement("th"); th.scope = "col"; th.textContent = label(name); heading.appendChild(th); }); thead.appendChild(heading);
    const tbody = document.createElement("tbody");
    labels.forEach((expected) => {
      const tr = document.createElement("tr"), th = document.createElement("th"); th.scope = "row"; th.textContent = label(expected); tr.appendChild(th);
      labels.forEach((predicted) => {
        const value = matrix[expected][predicted], td = document.createElement("td"), diagonal = expected === predicted;
        td.className = `matrix-cell ${diagonal ? "is-diagonal" : "is-error"}`;
        td.style.setProperty("--matrix-opacity", String(value === 0 ? 0.04 : 0.14 + (value / maxValue) * 0.46)); td.textContent = number(value);
        const small = document.createElement("small"); small.textContent = diagonal ? "correct" : value ? "error" : "none"; td.appendChild(small); tr.appendChild(td);
      }); tbody.appendChild(tr);
    });
    table.append(thead, tbody); byId("sentiment-matrix").replaceChildren(table);
  }

  function renderTopics(data) {
    byId("topic-chart").replaceChildren(...data.topic.confusion.labels.map((name) => {
      const card = document.createElement("div"); card.className = "topic-card";
      const p = document.createElement("p"); p.className = "topic-card-label"; p.textContent = label(name);
      const strong = document.createElement("strong"); strong.textContent = percent(data.topic.class_accuracy[name]);
      const span = document.createElement("span"); span.textContent = `${number(data.topic.expected_distribution[name])} incoming reviews`;
      card.append(p, strong, span); return card;
    }));
  }

  function renderDistribution(data) {
    const labels = data.sentiment.confusion.labels;
    const maximum = Math.max(...labels.flatMap((name) => [data.sentiment.expected_distribution[name], data.sentiment.predicted_distribution[name]]));
    byId("sentiment-distribution-chart").replaceChildren(...labels.map((name) => {
      const wrapper = document.createElement("div"); wrapper.className = "grouped-column";
      const expected = document.createElement("div"); expected.className = "vertical-bar expected"; expected.style.height = `${data.sentiment.expected_distribution[name] / maximum * 100}%`;
      const ev = document.createElement("span"); ev.textContent = number(data.sentiment.expected_distribution[name]); expected.appendChild(ev);
      const predicted = document.createElement("div"); predicted.className = "vertical-bar predicted"; predicted.style.height = `${data.sentiment.predicted_distribution[name] / maximum * 100}%`;
      const pv = document.createElement("span"); pv.textContent = number(data.sentiment.predicted_distribution[name]); predicted.appendChild(pv);
      const title = document.createElement("div"); title.className = "grouped-column-label"; title.textContent = label(name); wrapper.append(expected, predicted, title); return wrapper;
    }));
  }

  function confidenceCard(name, confidence, accuracy, className) {
    const card = document.createElement("div"); card.className = `confidence-card ${className}`;
    const p = document.createElement("p"); p.textContent = name;
    const strong = document.createElement("strong"); strong.textContent = percent(confidence);
    const span = document.createElement("span"); span.textContent = `${percent(accuracy)} accuracy`; card.append(p, strong, span); return card;
  }

  function renderConfidence(data) {
    byId("confidence-comparison").replaceChildren(confidenceCard("Sentiment", data.sentiment.average_confidence, data.sentiment.accuracy, "is-warning"), confidenceCard("Topic", data.topic.average_confidence, data.topic.accuracy, "is-strong"));
  }

  function predictionCell(predicted, expected, confidence) {
    const td = document.createElement("td"), wrapper = document.createElement("div"); wrapper.className = "prediction-cell";
    const strong = document.createElement("strong"); strong.textContent = label(predicted);
    const span = document.createElement("span"); span.textContent = predicted === expected ? `${percent(confidence)} confidence` : `Expected ${label(expected)} · ${percent(confidence)} confidence`;
    wrapper.append(strong, span); td.appendChild(wrapper); return td;
  }

  function renderReviews() {
    const body = byId("review-table-body"), total = state.filtered.length, pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.min(state.page, pageCount); const start = (state.page - 1) * PAGE_SIZE, rows = state.filtered.slice(start, start + PAGE_SIZE);
    if (!rows.length) {
      const tr = document.createElement("tr"), td = document.createElement("td"); td.className = "empty-cell"; td.colSpan = 5; td.textContent = "No reviews match the selected filters."; tr.appendChild(td); body.replaceChildren(tr);
    } else body.replaceChildren(...rows.map((review) => {
      const tr = document.createElement("tr"), id = document.createElement("td"), text = document.createElement("td"), resultCell = document.createElement("td"), result = document.createElement("span");
      id.textContent = review.id; text.textContent = review.text; result.className = `result-pill ${review.both_correct ? "correct" : "error"}`;
      result.textContent = review.both_correct ? "Both correct" : (!review.sentiment_correct && !review.topic_correct ? "Two errors" : review.sentiment_correct ? "Topic error" : "Sentiment error"); resultCell.appendChild(result);
      tr.append(id, text, predictionCell(review.predicted_sentiment, review.expected_sentiment, review.sentiment_confidence), predictionCell(review.predicted_topic, review.expected_topic, review.topic_confidence), resultCell); return tr;
    }));
    setText("review-count", `Showing ${number(total ? start + 1 : 0)}–${number(Math.min(start + PAGE_SIZE, total))} of ${number(total)} reviews`);
    setText("page-status", `Page ${state.page} of ${pageCount}`); byId("previous-page").disabled = state.page <= 1; byId("next-page").disabled = state.page >= pageCount;
  }

  function applyFilters() {
    const query = byId("review-search").value.trim().toLowerCase(), sentiment = byId("sentiment-filter").value, topic = byId("topic-filter").value, result = byId("result-filter").value;
    state.filtered = state.data.reviews.filter((review) => (!query || String(review.id).includes(query) || review.text.toLowerCase().includes(query)) && (sentiment === "all" || review.predicted_sentiment === sentiment) && (topic === "all" || review.predicted_topic === topic) && (result === "all" || (result === "correct" ? review.both_correct : !review.both_correct)));
    state.page = 1; renderReviews();
  }

  function bindControls() {
    byId("review-search").addEventListener("input", applyFilters);
    ["sentiment-filter", "topic-filter", "result-filter"].forEach((id) => byId(id).addEventListener("change", applyFilters));
    byId("previous-page").addEventListener("click", () => { state.page -= 1; renderReviews(); });
    byId("next-page").addEventListener("click", () => { state.page += 1; renderReviews(); });
  }

  function render(data) {
    state.data = data; state.filtered = data.reviews.slice();
    renderMetadata(data); renderFinding(data); renderModelAccuracy(data); renderSentimentClasses(data); renderMatrix(data); renderTopics(data); renderDistribution(data); renderConfidence(data); renderReviews(); bindControls();
    document.documentElement.dataset.dashboardReady = "true";
  }

  function showError(error) {
    const message = document.createElement("p"); message.className = "dashboard-load-error"; message.textContent = "Live model results could not be loaded or did not pass validation. No cached result is being shown. Please refresh the page or open the source files.";
    document.querySelector(".dashboard-hero").insertAdjacentElement("afterend", message);
    const body = byId("review-table-body"); if (body) { const tr = document.createElement("tr"), td = document.createElement("td"); td.className = "empty-cell"; td.colSpan = 5; td.textContent = "Results unavailable."; tr.appendChild(td); body.replaceChildren(tr); }
    const status = byId("live-status"); if (status) { status.className = "status-error"; status.innerHTML = '<i aria-hidden="true"></i> Data unavailable'; }
    setText("source-freshness", "The live source could not be validated."); document.documentElement.dataset.dashboardError = "true"; console.error(error);
  }

  loadLiveData().then(render).catch(showError);
})();
