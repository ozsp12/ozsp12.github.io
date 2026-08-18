(function () {
  "use strict";

  const CONTRACT_URL = "/data/integrations/lstm.json";
  const SENTIMENT_ORDER = ["negative", "neutral", "positive"];
  const TOPIC_ORDER = ["refrigerator", "smartphone", "television", "washing_machine"];
  const LEVELS = ["limited", "informal", "standard", "advanced", "technical"];
  const PAGE_SIZE = 20;
  const IS_PT = document.documentElement.lang.toLowerCase().startsWith("pt");
  const state = { data: null, filtered: [], page: 1 };

  const copy = IS_PT ? {
    correct: "corretas", reviews: "avaliações", loading: "Carregando metadados do pipeline…",
    live: "Ao vivo", unavailable: "Dados indisponíveis", noResults: "Nenhuma avaliação corresponde aos filtros selecionados.",
    page: "Página", of: "de", showing: "Exibindo", bothCorrect: "Ambos corretos", twoErrors: "Dois erros",
    topicError: "Erro de tópico", sentimentError: "Erro de sentimento", expected: "Esperado", confidence: "confiança",
    incomingReviews: "avaliações de entrada", correctHint: "correto", errorHint: "erro", noneHint: "nenhum",
    baselineTitle: "O baseline linear supera a LSTM no lote sintético atual.",
    tradeoffTitle: "LSTM e baseline linear apresentam diferenças dependentes da tarefa no lote sintético atual.",
    sourceError: "Os resultados do modelo não puderam ser carregados ou não passaram pela validação. Nenhum resultado em cache foi exibido.",
    sourceInvalid: "A fonte ao vivo não pôde ser validada.",
  } : {
    correct: "correct", reviews: "reviews", loading: "Loading pipeline metadata…",
    live: "Live", unavailable: "Data unavailable", noResults: "No reviews match the selected filters.",
    page: "Page", of: "of", showing: "Showing", bothCorrect: "Both correct", twoErrors: "Two errors",
    topicError: "Topic error", sentimentError: "Sentiment error", expected: "Expected", confidence: "confidence",
    incomingReviews: "incoming reviews", correctHint: "correct", errorHint: "error", noneHint: "none",
    baselineTitle: "The linear baseline outperforms the LSTM on the current synthetic batch.",
    tradeoffTitle: "The LSTM and linear baseline show task-dependent differences on the current synthetic batch.",
    sourceError: "Live model results could not be loaded or did not pass validation. No cached result is being shown.",
    sourceInvalid: "The live source could not be validated.",
  };

  const byId = (id) => document.getElementById(id);
  const ratio = (a, b) => b ? a / b : 0;
  const number = (value) => new Intl.NumberFormat(IS_PT ? "pt-BR" : "en-US").format(Number(value));
  const percent = (value, digits = 1) => `${(Number(value) * 100).toFixed(digits)}%`;
  const points = (value, digits = 1) => `${Number(value) >= 0 ? "+" : ""}${(Number(value) * 100).toFixed(digits)} pp`;
  const label = (value) => String(value).replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value;
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function requireFields(object, fields, labelName) {
    assert(object && typeof object === "object", `${labelName} is missing.`);
    const missing = fields.filter((field) => !Object.hasOwn(object, field));
    assert(!missing.length, `${labelName} is missing fields: ${missing.join(", ")}.`);
  }

  function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(IS_PT ? "pt-BR" : "en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      timeZone: "UTC", timeZoneName: "short",
    }).format(date);
  }

  async function fetchJson(url, cache = "default") {
    const response = await fetch(url, { cache });
    if (!response.ok) throw new Error(`Data request failed (${response.status}): ${url}`);
    return response.json();
  }

  async function fetchRunDocument(root, contract) {
    const runUrl = `${root}/${contract.run_file}`;
    return { document: await fetchJson(runUrl, "force-cache"), url: runUrl, file: contract.run_file };
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

  function validateTask(taskData, task, contract) {
    requireFields(taskData, contract.required_task_fields, `run.tasks.${task}`);
    for (const group of ["metrics", "baseline_metrics", "metric_delta_vs_baseline"]) {
      assert(taskData[group] && typeof taskData[group] === "object", `Missing ${task}.${group}.`);
    }
    for (const key of ["accuracy", "macro_f1", "weighted_f1", "log_loss", "brier_score"]) {
      assert(Number.isFinite(Number(taskData.metrics[key])), `Invalid ${task} LSTM ${key}.`);
      assert(Number.isFinite(Number(taskData.baseline_metrics[key])), `Invalid ${task} baseline ${key}.`);
    }
    const ci = taskData.uncertainty && taskData.uncertainty.accuracy_ci95;
    assert(ci && ci.method === "wilson", `Missing ${task} 95% Wilson accuracy interval.`);
    assert(Number(ci.low) >= 0 && Number(ci.high) <= 1 && Number(ci.low) <= Number(ci.high), `Invalid ${task} confidence interval.`);
  }

  function normalizeReview(row) {
    const id = Number(row.ID);
    const sentimentConfidence = Number(row.sentiment_confidence);
    const topicConfidence = Number(row.topic_confidence);
    assert(Number.isInteger(id), `Invalid review ID: ${row.ID}.`);
    assert(Number.isFinite(sentimentConfidence) && sentimentConfidence >= 0 && sentimentConfidence <= 1, `Invalid sentiment confidence for ID ${id}.`);
    assert(Number.isFinite(topicConfidence) && topicConfidence >= 0 && topicConfidence <= 1, `Invalid topic confidence for ID ${id}.`);
    assert(SENTIMENT_ORDER.includes(row.expected_sentiment) && SENTIMENT_ORDER.includes(row.predicted_sentiment), `Invalid sentiment label for ID ${id}.`);
    assert(TOPIC_ORDER.includes(row.expected_topic) && TOPIC_ORDER.includes(row.predicted_topic), `Invalid topic label for ID ${id}.`);
    assert(LEVELS.includes(row.linguistic_level), `Invalid linguistic level for ID ${id}.`);
    assert(typeof row.sentiment_correct === "boolean" && typeof row.topic_correct === "boolean", `Invalid correctness flags for ID ${id}.`);
    assert(row.sentiment_correct === (row.expected_sentiment === row.predicted_sentiment), `Sentiment correctness mismatch for ID ${id}.`);
    assert(row.topic_correct === (row.expected_topic === row.predicted_topic), `Topic correctness mismatch for ID ${id}.`);
    return {
      id, text: String(row.text),
      expected_sentiment: row.expected_sentiment, predicted_sentiment: row.predicted_sentiment,
      sentiment_confidence: sentimentConfidence, sentiment_correct: row.sentiment_correct,
      expected_topic: row.expected_topic, predicted_topic: row.predicted_topic,
      topic_confidence: topicConfidence, topic_correct: row.topic_correct,
      linguistic_level: row.linguistic_level, flagprofanity: Number(row.flagprofanity),
      goldtest: Number(row.goldtest), both_correct: row.sentiment_correct && row.topic_correct,
    };
  }

  function buildDashboardData(runDocument, contract, runId, source) {
    assert(runDocument.schema_version === contract.schema_version, `Unsupported run schema: ${runDocument.schema_version}.`);
    assert(runDocument.artifact_type === "experiment_run", "run.json has an invalid artifact type.");
    requireFields(runDocument.run, contract.required_run_fields, "run.run");
    assert(runDocument.run.status === contract.required_status, "The latest run is not complete.");
    assert(runDocument.run.run_id === runId, `latest.json and ${source.file} disagree on run_id.`);
    for (const [field, expected] of Object.entries(contract.required_scope)) {
      assert(runDocument.scope && runDocument.scope[field] === expected, `Unexpected run scope for ${field}.`);
    }
    validateTask(runDocument.tasks.sentiment, "sentiment", contract);
    validateTask(runDocument.tasks.topic, "topic", contract);
    assert(Array.isArray(runDocument.reviews) && runDocument.reviews.length, `${source.file} contains no review-level results.`);

    const reviews = runDocument.reviews.map(normalizeReview);
    const ids = reviews.map((row) => row.id);
    assert(ids.length === new Set(ids).size, `${source.file} contains duplicate review IDs.`);
    const sentiment = taskSummary(reviews, "sentiment", SENTIMENT_ORDER);
    const topic = taskSummary(reviews, "topic", TOPIC_ORDER);
    assert(Math.abs(sentiment.accuracy - Number(runDocument.tasks.sentiment.metrics.accuracy)) < 1e-9, `Sentiment accuracy disagrees with ${source.file}.`);
    assert(Math.abs(topic.accuracy - Number(runDocument.tasks.topic.metrics.accuracy)) < 1e-9, `Topic accuracy disagrees with ${source.file}.`);
    const jointCorrect = reviews.filter((review) => review.both_correct).length;
    return {
      metadata: {
        ...runDocument.run,
        scope: runDocument.scope,
        schema_version: runDocument.schema_version,
        benchmark: runDocument.benchmark || null,
        loaded_at: new Date().toISOString(),
        source_urls: source,
      },
      kpis: {
        incoming_reviews: reviews.length,
        sentiment_accuracy: sentiment.accuracy,
        topic_accuracy: topic.accuracy,
        joint_accuracy: ratio(jointCorrect, reviews.length),
        joint_correct: jointCorrect,
        goldtest_count: reviews.filter((review) => review.goldtest === 1).length,
      },
      sentiment, topic, metrics: runDocument.tasks, reviews,
    };
  }

  async function loadLiveDataAttempt() {
    const contract = await fetchJson(CONTRACT_URL, "default");
    const cacheKey = Date.now();
    const latest = await fetchJson(`${contract.source_root}/${contract.latest_file}?live=${cacheKey}`, "no-store");
    requireFields(latest, contract.required_latest_fields, contract.latest_file);
    assert(typeof latest.run_id === "string" && /^[A-Za-z0-9._-]+$/.test(latest.run_id), "latest.json contains an invalid run ID.");
    const runId = latest.run_id;
    const root = `${contract.source_root}/${encodeURIComponent(runId)}`;
    const source = await fetchRunDocument(root, contract);
    source.runId = runId;
    source.browser = `${contract.browser_root}/${encodeURIComponent(runId)}`;
    return buildDashboardData(source.document, contract, runId, source);
  }

  async function loadLiveData() {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await loadLiveDataAttempt();
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 750 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  function ciText(taskData) {
    const ci = taskData.uncertainty.accuracy_ci95;
    return `95% CI ${percent(ci.low)}–${percent(ci.high)}`;
  }

  function renderMetadata(data) {
    const { metadata, kpis, sentiment, topic } = data;
    setText("run-id", metadata.run_id);
    setText("model-time", formatTimestamp(metadata.model_timestamp));
    setText("kpi-sentiment", percent(kpis.sentiment_accuracy));
    setText("kpi-topic", percent(kpis.topic_accuracy));
    setText("kpi-joint", percent(kpis.joint_accuracy));
    setText("kpi-reviews", number(kpis.incoming_reviews));
    setText("kpi-sentiment-detail", `${number(sentiment.correct)} / ${number(kpis.incoming_reviews)} ${copy.correct} · ${ciText(data.metrics.sentiment)}`);
    setText("kpi-topic-detail", `${number(topic.correct)} / ${number(kpis.incoming_reviews)} ${copy.correct} · ${ciText(data.metrics.topic)}`);
    setText("kpi-joint-detail", `${number(kpis.joint_correct)} / ${number(kpis.incoming_reviews)} ${copy.reviews}`);
    setText("data-review-count", number(kpis.incoming_reviews));
    setText("source-freshness", `Run ${metadata.run_id} · generation ${metadata.input_generation} · ${formatTimestamp(metadata.model_timestamp)} · ${metadata.source_urls.file}`);
    const status = byId("live-status");
    status.className = "status-complete";
    status.innerHTML = `<i aria-hidden="true"></i> ${copy.live}`;
    byId("download-results").href = metadata.source_urls.url;
    byId("source-run-link").href = metadata.source_urls.browser;
    const seeds = Array.isArray(metadata.parameters.replicate_seeds) ? metadata.parameters.replicate_seeds : [metadata.parameters.seed];
    setText("method-meta", `Pipeline ${metadata.pipeline_version} · Generation ${metadata.input_generation} · Seeds ${seeds.join(", ")} · ${metadata.parameters.epochs} epochs · TensorFlow ${metadata.tensorflow_version}`);
  }

  function renderFinding(data) {
    const sentimentDelta = Number(data.metrics.sentiment.metric_delta_vs_baseline.accuracy);
    const topicDelta = Number(data.metrics.topic.metric_delta_vs_baseline.accuracy);
    setText("finding-title", sentimentDelta < 0 && topicDelta < 0 ? copy.baselineTitle : copy.tradeoffTitle);
    const body = IS_PT
      ? `No lote sintético atual, a acurácia de sentimento é ${percent(data.metrics.sentiment.metrics.accuracy)} para a LSTM e ${percent(data.metrics.sentiment.baseline_metrics.accuracy)} para TF-IDF + Regressão Logística (${points(sentimentDelta)}). Para tópico, os valores são ${percent(data.metrics.topic.metrics.accuracy)} e ${percent(data.metrics.topic.baseline_metrics.accuracy)} (${points(topicDelta)}). Estes números não constituem validação externa.`
      : `On the current synthetic batch, sentiment accuracy is ${percent(data.metrics.sentiment.metrics.accuracy)} for the LSTM versus ${percent(data.metrics.sentiment.baseline_metrics.accuracy)} for TF-IDF + Logistic Regression (${points(sentimentDelta)}). Topic accuracy is ${percent(data.metrics.topic.metrics.accuracy)} versus ${percent(data.metrics.topic.baseline_metrics.accuracy)} for TF-IDF + Logistic Regression (${points(topicDelta)}). These values are not external validation.`;
    setText("finding-body", body);
  }

  function createBarRow(name, value, alert) {
    const row = document.createElement("div"); row.className = "bar-row";
    const nameElement = document.createElement("div"); nameElement.className = "bar-label"; nameElement.textContent = name;
    const track = document.createElement("div"); track.className = "bar-track"; track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("div"); fill.className = `bar-fill${alert ? " is-alert" : ""}`; fill.style.width = `${Math.max(0, Math.min(100, value * 100))}%`; track.appendChild(fill);
    const valueElement = document.createElement("div"); valueElement.className = "bar-value"; valueElement.textContent = percent(value);
    row.append(nameElement, track, valueElement);
    return row;
  }

  function renderBarChart(id, rows) {
    byId(id).replaceChildren(...rows.map((row) => createBarRow(row.name, Number(row.value), row.alert)));
  }

  function renderModelAccuracy(data) {
    renderBarChart("model-accuracy-chart", [
      { name: "Sentiment · LSTM", value: data.metrics.sentiment.metrics.accuracy, alert: data.metrics.sentiment.metric_delta_vs_baseline.accuracy < 0 },
      { name: "Sentiment · TF-IDF + LR", value: data.metrics.sentiment.baseline_metrics.accuracy, alert: false },
      { name: "Topic · LSTM", value: data.metrics.topic.metrics.accuracy, alert: data.metrics.topic.metric_delta_vs_baseline.accuracy < 0 },
      { name: "Topic · TF-IDF + LR", value: data.metrics.topic.baseline_metrics.accuracy, alert: false },
    ]);
  }

  function renderSentimentClasses(data) {
    renderBarChart("sentiment-class-chart", data.sentiment.confusion.labels.map((name) => ({
      name: label(name), value: data.sentiment.class_accuracy[name], alert: data.sentiment.class_accuracy[name] < 0.8,
    })));
  }

  function renderMatrix(data) {
    const { labels, matrix } = data.sentiment.confusion;
    const maxValue = Math.max(...labels.flatMap((a) => labels.map((b) => matrix[a][b])));
    const table = document.createElement("table"); table.className = "matrix-table"; table.setAttribute("aria-label", IS_PT ? "Matriz de confusão de sentimento" : "Sentiment confusion matrix");
    const thead = document.createElement("thead"), heading = document.createElement("tr");
    heading.appendChild(document.createElement("th"));
    labels.forEach((predicted) => { const th = document.createElement("th"); th.scope = "col"; th.textContent = label(predicted); heading.appendChild(th); });
    thead.appendChild(heading);
    const tbody = document.createElement("tbody");
    labels.forEach((expected) => {
      const tr = document.createElement("tr"), th = document.createElement("th"); th.scope = "row"; th.textContent = label(expected); tr.appendChild(th);
      labels.forEach((predicted) => {
        const value = matrix[expected][predicted];
        const td = document.createElement("td"); td.className = `matrix-cell ${expected === predicted ? "is-diagonal" : "is-error"}`;
        td.style.setProperty("--matrix-opacity", String(value === 0 ? 0.04 : 0.14 + (value / Math.max(1, maxValue)) * 0.46));
        td.textContent = number(value);
        const hint = document.createElement("small"); hint.textContent = expected === predicted ? copy.correctHint : value ? copy.errorHint : copy.noneHint; td.appendChild(hint); tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.append(thead, tbody); byId("sentiment-matrix").replaceChildren(table);
  }

  function renderTopics(data) {
    const cards = data.topic.confusion.labels.map((name) => {
      const card = document.createElement("div"); card.className = "topic-card";
      const title = document.createElement("p"); title.className = "topic-card-label"; title.textContent = label(name);
      const score = document.createElement("strong"); score.textContent = percent(data.topic.class_accuracy[name]);
      const volume = document.createElement("span"); volume.textContent = `${number(data.topic.expected_distribution[name])} ${copy.incomingReviews}`;
      card.append(title, score, volume); return card;
    });
    byId("topic-chart").replaceChildren(...cards);
  }

  function renderDistribution(data) {
    const labels = data.sentiment.confusion.labels;
    const maximum = Math.max(1, ...labels.flatMap((name) => [data.sentiment.expected_distribution[name], data.sentiment.predicted_distribution[name]]));
    const columns = labels.map((name) => {
      const wrapper = document.createElement("div"); wrapper.className = "grouped-column";
      const expected = document.createElement("div"); expected.className = "vertical-bar expected"; expected.style.height = `${(data.sentiment.expected_distribution[name] / maximum) * 100}%`;
      const expectedValue = document.createElement("span"); expectedValue.textContent = number(data.sentiment.expected_distribution[name]); expected.appendChild(expectedValue);
      const predicted = document.createElement("div"); predicted.className = "vertical-bar predicted"; predicted.style.height = `${(data.sentiment.predicted_distribution[name] / maximum) * 100}%`;
      const predictedValue = document.createElement("span"); predictedValue.textContent = number(data.sentiment.predicted_distribution[name]); predicted.appendChild(predictedValue);
      const nameElement = document.createElement("div"); nameElement.className = "grouped-column-label"; nameElement.textContent = label(name);
      wrapper.append(expected, predicted, nameElement); return wrapper;
    });
    byId("sentiment-distribution-chart").replaceChildren(...columns);
  }

  function confidenceCard(name, confidence, accuracyValue, className) {
    const card = document.createElement("div"); card.className = `confidence-card ${className}`;
    const title = document.createElement("p"); title.textContent = name;
    const value = document.createElement("strong"); value.textContent = percent(confidence);
    const comparison = document.createElement("span"); comparison.textContent = `${percent(accuracyValue)} ${IS_PT ? "acurácia" : "accuracy"}`;
    card.append(title, value, comparison); return card;
  }

  function renderConfidence(data) {
    byId("confidence-comparison").replaceChildren(
      confidenceCard(IS_PT ? "Sentimento" : "Sentiment", data.sentiment.average_confidence, data.sentiment.accuracy, "is-warning"),
      confidenceCard(IS_PT ? "Tópico" : "Topic", data.topic.average_confidence, data.topic.accuracy, "is-strong")
    );
  }

  function predictionCell(predicted, expected, confidence) {
    const cell = document.createElement("td"), wrapper = document.createElement("div"); wrapper.className = "prediction-cell";
    const predictedElement = document.createElement("strong"); predictedElement.textContent = label(predicted);
    const detail = document.createElement("span"); detail.textContent = predicted === expected ? `${percent(confidence)} ${copy.confidence}` : `${copy.expected} ${label(expected)} · ${percent(confidence)} ${copy.confidence}`;
    wrapper.append(predictedElement, detail); cell.appendChild(wrapper); return cell;
  }

  function renderReviews() {
    const body = byId("review-table-body"), total = state.filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.min(state.page, pageCount);
    const start = (state.page - 1) * PAGE_SIZE;
    const rows = state.filtered.slice(start, start + PAGE_SIZE);
    if (!rows.length) {
      const tr = document.createElement("tr"), td = document.createElement("td"); td.className = "empty-cell"; td.colSpan = 5; td.textContent = copy.noResults; tr.appendChild(td); body.replaceChildren(tr);
    } else {
      body.replaceChildren(...rows.map((review) => {
        const tr = document.createElement("tr"), idCell = document.createElement("td"), textCell = document.createElement("td"), resultCell = document.createElement("td");
        idCell.textContent = review.id; textCell.textContent = review.text;
        const result = document.createElement("span"); result.className = `result-pill ${review.both_correct ? "correct" : "error"}`;
        result.textContent = review.both_correct ? copy.bothCorrect : (!review.sentiment_correct && !review.topic_correct ? copy.twoErrors : review.sentiment_correct ? copy.topicError : copy.sentimentError);
        resultCell.appendChild(result);
        tr.append(idCell, textCell, predictionCell(review.predicted_sentiment, review.expected_sentiment, review.sentiment_confidence), predictionCell(review.predicted_topic, review.expected_topic, review.topic_confidence), resultCell);
        return tr;
      }));
    }
    const shownFrom = total ? start + 1 : 0, shownTo = Math.min(start + PAGE_SIZE, total);
    setText("review-count", `${copy.showing} ${number(shownFrom)}–${number(shownTo)} / ${number(total)} ${copy.reviews}`);
    setText("page-status", `${copy.page} ${state.page} ${copy.of} ${pageCount}`);
    byId("previous-page").disabled = state.page <= 1;
    byId("next-page").disabled = state.page >= pageCount;
  }

  function applyFilters() {
    const query = byId("review-search").value.trim().toLowerCase();
    const sentiment = byId("sentiment-filter").value, topic = byId("topic-filter").value, result = byId("result-filter").value;
    state.filtered = state.data.reviews.filter((review) => {
      const matchesQuery = !query || String(review.id).includes(query) || review.text.toLowerCase().includes(query);
      const matchesSentiment = sentiment === "all" || review.predicted_sentiment === sentiment;
      const matchesTopic = topic === "all" || review.predicted_topic === topic;
      const matchesResult = result === "all" || (result === "correct" ? review.both_correct : !review.both_correct);
      return matchesQuery && matchesSentiment && matchesTopic && matchesResult;
    });
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
    renderMetadata(data); renderFinding(data); renderModelAccuracy(data); renderSentimentClasses(data);
    renderMatrix(data); renderTopics(data); renderDistribution(data); renderConfidence(data); renderReviews(); bindControls();
    document.documentElement.dataset.dashboardReady = "true";
  }

  function showError(error) {
    const message = document.createElement("p"); message.className = "dashboard-load-error"; message.textContent = copy.sourceError;
    const hero = document.querySelector(".dashboard-hero"); if (hero) hero.insertAdjacentElement("afterend", message);
    const tableBody = byId("review-table-body");
    if (tableBody) { const tr = document.createElement("tr"), td = document.createElement("td"); td.className = "empty-cell"; td.colSpan = 5; td.textContent = copy.unavailable; tr.appendChild(td); tableBody.replaceChildren(tr); }
    const status = byId("live-status"); if (status) { status.className = "status-error"; status.innerHTML = `<i aria-hidden="true"></i> ${copy.unavailable}`; }
    setText("source-freshness", copy.sourceInvalid);
    document.documentElement.dataset.dashboardError = "true";
    console.error(error);
  }

  setText("method-meta", copy.loading);
  loadLiveData().then(render).catch(showError);
})();
