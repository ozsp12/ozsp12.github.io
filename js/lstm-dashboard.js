(function () {
  "use strict";

  const DATA_URL = "/en/lstm_ftw/dashboard-data.json";
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
    setText(
      "method-meta",
      `Pipeline ${metadata.pipeline_version} · Seed ${metadata.seed} · ${metadata.epochs} epochs · TensorFlow ${metadata.tensorflow_version}`
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
    message.textContent = "The dashboard snapshot could not be loaded. Please refresh the page or download the data file directly.";
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
    console.error(error);
  }

  fetch(DATA_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Dashboard data request failed: ${response.status}`);
      return response.json();
    })
    .then(render)
    .catch(showError);
})();
