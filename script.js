import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, onValue, ref } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  STRIDEX_FIELDS,
  buildHeroMetrics,
  buildSystemInsight,
  buildTrendSummary,
  getMetricTone,
  normalizeSnapshot,
  pushHistorySample,
} from "./dashboard-core.mjs";
import { analyzeData } from "./aiEngine.mjs";
import { fetchAIInsight } from "./llmService.mjs";
import { bindAIUI, updateAIPanel } from "./uiBinder.mjs";

const FIREBASE_CONFIG_PLACEHOLDER = {
  apiKey: "AIzaSyACtwaN1muO2zFma4xL9w-w-u6hsOGbDo0",
  authDomain: "smart-shoe-001a.firebaseapp.com",
  databaseURL: "https://smart-shoe-001a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-shoe-001a",
};

const firebaseConfig = window.STRIDEX_FIREBASE_CONFIG ?? FIREBASE_CONFIG_PLACEHOLDER;
const TELEMETRY_PATH = "stridex";
const MAX_HISTORY_SAMPLES = 45;
const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const dom = {
  connectionPill: document.getElementById("connection-pill"),
  connectionLabel: document.getElementById("connection-label"),
  connectionDetail: document.getElementById("connection-detail"),
  lastUpdated: document.getElementById("last-updated"),
  heroChips: document.getElementById("hero-chips"),
  heroActivityPill: document.getElementById("hero-activity-pill"),
  heroPosturePill: document.getElementById("hero-posture-pill"),
  shoeRotator: document.getElementById("shoe-rotator"),
  insightPanel: document.getElementById("insight-panel"),
  insightHeadline: document.getElementById("insight-headline"),
  insightDetail: document.getElementById("insight-detail"),
  postureTag: document.getElementById("posture-tag"),
  activityTag: document.getElementById("activity-tag"),
  scoreRing: document.getElementById("score-ring"),
  ringScore: document.getElementById("ring-score"),
  stabilityValue: document.getElementById("stability-value"),
  stabilityFill: document.getElementById("stability-fill"),
  metricCards: Array.from(document.querySelectorAll(".metric-card")),
  freshnessPill: document.getElementById("freshness-pill"),
  diagnosticConnection: document.getElementById("diagnostic-connection"),
  diagnosticFreshness: document.getElementById("diagnostic-freshness"),
  diagnosticMissing: document.getElementById("diagnostic-missing"),
  diagnosticDistance: document.getElementById("diagnostic-distance"),
  diagnosticSamples: document.getElementById("diagnostic-samples"),
  diagnosticBanner: document.getElementById("diagnostic-banner"),
  stepsEmpty: document.getElementById("steps-empty"),
  trendEmpty: document.getElementById("trend-empty"),
  revealBlocks: Array.from(document.querySelectorAll(".reveal-on-scroll")),
};

const state = {
  metrics: normalizeSnapshot({}, 0),
  history: [],
  hasReceivedData: false,
  connectionMode: "reconnecting",
  connectionDetail: "Waiting for Firebase stream",
  errorMessage: "",
};

const charts = createCharts();
const firebaseReady = isFirebaseConfigured(firebaseConfig);

const aiDom = bindAIUI();
const aiState = {
  lastLlmUpdate: 0,
  llmInterval: 15000,
  currentLlmData: null,
  isFetching: false
};

initScrollReveal();
applyScrollState();
renderDashboard();

if (firebaseReady) {
  connectFirebase();
} else {
  state.connectionMode = "setup";
  state.connectionDetail = "Add your public Firebase config or window.STRIDEX_FIREBASE_CONFIG before loading the dashboard.";
  renderDashboard();
}

window.setInterval(() => {
  renderStatusBlock();
  renderInsights();
  renderDiagnostics();

  // --- AI ENGINE UPDATE ---
  if (state.history.length > 0) {
    const ruleData = analyzeData(state.history);
    const now = Date.now();
    
    // Throttle Gemini API calls to avoid spam
    if (now - aiState.lastLlmUpdate > aiState.llmInterval && !aiState.isFetching) {
      aiState.isFetching = true;
      fetchAIInsight(ruleData).then(llmData => {
        if (llmData) aiState.currentLlmData = llmData;
        aiState.lastLlmUpdate = Date.now();
        aiState.isFetching = false;
        updateAIPanel(aiDom, ruleData, aiState.currentLlmData);
      }).catch(() => {
        aiState.isFetching = false;
      });
    } else {
      updateAIPanel(aiDom, ruleData, aiState.currentLlmData);
    }
  }
}, 1000);

function isFirebaseConfigured(config) {
  return [config.apiKey, config.authDomain, config.databaseURL, config.projectId].every((value) => typeof value === "string" && value.trim().length > 0);
}

function connectFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    onValue(ref(database, ".info/connected"), (snapshot) => {
      const connected = Boolean(snapshot.val());
      if (connected) {
        state.connectionMode = "connected";
        state.connectionDetail = state.hasReceivedData ? "Live stream is healthy." : "Connected to Firebase. Waiting for first sample.";
      } else {
        state.connectionMode = state.hasReceivedData ? "disconnected" : "reconnecting";
        state.connectionDetail = state.hasReceivedData ? "Connection dropped. Trying to recover the stream." : "Connecting to Firebase realtime channel.";
      }
      renderStatusBlock();
      renderDiagnostics();
    });

    onValue(
      ref(database, TELEMETRY_PATH),
      (snapshot) => {
        if (!snapshot.exists()) {
          state.connectionMode = "reconnecting";
          state.connectionDetail = "Connected to Firebase, but /stridex has no data yet.";
          state.errorMessage = "";
          renderDashboard();
          return;
        }

        const timestamp = Date.now();
        const metrics = normalizeSnapshot(snapshot.val(), timestamp);
        state.metrics = metrics;
        state.hasReceivedData = true;
        state.errorMessage = "";
        state.connectionMode = "connected";
        state.connectionDetail = metrics.missingFields.length
          ? "Live stream active with partial telemetry fields."
          : "Realtime telemetry active.";
        state.history = pushHistorySample(
          state.history,
          {
            label: formatSampleLabel(timestamp),
            steps: metrics.steps,
            postureScore: metrics.postureScore,
            snapshot: metrics
          },
          MAX_HISTORY_SAMPLES
        );
        renderDashboard();
      },
      (error) => {
        state.connectionMode = "disconnected";
        state.connectionDetail = "Firebase subscription failed.";
        state.errorMessage = error?.message || "Unknown Firebase error";
        renderDashboard();
      }
    );
  } catch (error) {
    state.connectionMode = "disconnected";
    state.connectionDetail = "Firebase setup failed to initialize.";
    state.errorMessage = error instanceof Error ? error.message : String(error);
    renderDashboard();
  }
}

function createCharts() {
  if (!window.Chart) {
    return { steps: null, trend: null };
  }

  return {
    steps: createLineChart(document.getElementById("steps-chart"), {
      borderColor: "#90d8ff",
      fillStart: "rgba(144, 216, 255, 0.18)",
      fillEnd: "rgba(144, 216, 255, 0.02)",
      label: "Steps",
      yFormatter: (value) => `${Math.round(value)}`,
      min: 0,
    }),
    trend: createLineChart(document.getElementById("trend-chart"), {
      borderColor: "#75d7a5",
      fillStart: "rgba(117, 215, 165, 0.16)",
      fillEnd: "rgba(117, 215, 165, 0.02)",
      label: "Posture score",
      yFormatter: (value) => `${Math.round(Number(value))}%`,
      min: 0,
      max: 100,
    }),
  };
}

function createLineChart(canvas, config) {
  const ctx = canvas.getContext("2d");
  return new window.Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: config.label,
          data: [],
          borderColor: config.borderColor,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0.4,
          fill: true,
          backgroundColor(context) {
            const chart = context.chart;
            const { chartArea } = chart;
            if (!chartArea) {
              return config.fillStart;
            }
            const gradient = chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, config.fillStart);
            gradient.addColorStop(1, config.fillEnd);
            return gradient;
          },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 260, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: "rgba(7, 11, 18, 0.92)",
          borderColor: "rgba(255, 255, 255, 0.12)",
          borderWidth: 1,
          callbacks: { label: (context) => config.yFormatter(context.parsed.y) },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.04)", drawBorder: false },
          ticks: { color: "#8d9caf", maxTicksLimit: 5 },
        },
        y: {
          min: config.min,
          max: config.max,
          grid: { color: "rgba(255, 255, 255, 0.04)", drawBorder: false },
          ticks: {
            color: "#8d9caf",
            maxTicksLimit: 5,
            callback: (value) => config.yFormatter(Number(value)),
          },
        },
      },
    },
  });
}

function renderDashboard() {
  renderStatusBlock();
  renderHeroChips();
  renderMetricRow();
  renderInsights();
  renderCharts();
  renderDiagnostics();
}

function renderStatusBlock() {
  const status = getStatusPresentation();
  dom.connectionPill.dataset.tone = status.tone;
  dom.connectionLabel.textContent = status.label;
  dom.connectionDetail.textContent = state.errorMessage || state.connectionDetail;
  dom.lastUpdated.textContent = state.hasReceivedData
    ? timestampFormatter.format(new Date(state.metrics.lastUpdatedMs))
    : firebaseReady
      ? "Awaiting telemetry"
      : "Config required";
}

function getStatusPresentation() {
  const map = {
    connected: { label: "Connected", tone: "good" },
    reconnecting: { label: "Reconnecting", tone: "warning" },
    disconnected: { label: "Disconnected", tone: "danger" },
    setup: { label: "Setup needed", tone: "warning" },
  };
  return map[state.connectionMode] ?? map.reconnecting;
}

function renderHeroChips() {
  const chips = buildHeroMetrics(state.metrics);
  dom.heroChips.innerHTML = chips
    .map((chip) => `
      <div class="hero-chip hero-chip--${chip.key}">
        <span>${chip.label}</span>
        <strong>${state.hasReceivedData ? chip.value : "No data yet"}</strong>
      </div>
    `)
    .join("");

  dom.heroActivityPill.textContent = `Activity: ${state.hasReceivedData ? state.metrics.activity : "No data yet"}`;
  dom.heroPosturePill.textContent = `Posture: ${state.hasReceivedData ? state.metrics.posture : "No data yet"}`;
}

function renderMetricRow() {
  const metricOrder = ["steps", "postureScore", "activity", "alerts"];
  const labels = {
    steps: "Steps",
    postureScore: "Posture Score",
    activity: "Activity",
    alerts: "Alerts",
  };

  dom.metricCards.forEach((card, index) => {
    const key = metricOrder[index];
    const value = state.metrics[key];
    const tone = state.hasReceivedData ? getMetricTone(key, value) : "info";
    card.dataset.tone = tone;
    card.innerHTML = `
      <p class="metric-card__label">${labels[key]}</p>
      <strong class="metric-card__value">${formatMetricValue(key, value)}</strong>
      <span class="metric-card__meta">${buildMetricMeta(key)}</span>
    `;
  });
}

function renderInsights() {
  const freshness = getFreshnessState();
  const insight = state.hasReceivedData
    ? buildSystemInsight(state.metrics, freshness.ageMs)
    : {
        headline: firebaseReady ? "Waiting for telemetry" : "Firebase configuration required",
        detail: firebaseReady
          ? "The redesigned dashboard is listening for live telemetry at /stridex."
          : "Add your Firebase config or expose window.STRIDEX_FIREBASE_CONFIG before loading the page.",
        tone: firebaseReady ? "info" : "warning",
      };

  dom.insightPanel.dataset.tone = insight.tone;
  dom.insightHeadline.textContent = insight.headline;
  dom.insightDetail.textContent = insight.detail;
  dom.postureTag.textContent = `Posture: ${state.hasReceivedData ? state.metrics.posture : "No data yet"}`;
  dom.activityTag.textContent = `Activity: ${state.hasReceivedData ? state.metrics.activity : "No data yet"}`;

  const postureTone = state.hasReceivedData ? getMetricTone("postureScore", state.metrics.postureScore) : "info";
  const stabilityTone = state.hasReceivedData ? getMetricTone("stability", state.metrics.stability) : "info";
  dom.scoreRing.dataset.tone = postureTone;
  dom.scoreRing.style.setProperty("--score-angle", `${(state.hasReceivedData ? state.metrics.postureScore : 0) * 3.6}deg`);
  dom.ringScore.textContent = state.hasReceivedData ? `${Math.round(state.metrics.postureScore)}` : "--";
  dom.stabilityValue.textContent = state.hasReceivedData ? `${state.metrics.stability.toFixed(1)}%` : "--%";
  dom.stabilityFill.style.width = `${state.hasReceivedData ? state.metrics.stability : 0}%`;
  dom.stabilityFill.style.background = `linear-gradient(90deg, ${toneColor(stabilityTone)}, rgba(255, 255, 255, 0.48))`;
}

function renderCharts() {
  const labels = state.history.map((sample) => sample.label);
  updateChart(charts.steps, labels, state.history.map((sample) => sample.steps), dom.stepsEmpty);
  updateChart(charts.trend, labels, state.history.map((sample) => sample.postureScore), dom.trendEmpty);
}

function updateChart(chart, labels, values, emptyElement) {
  const hasData = labels.length > 0;
  emptyElement.classList.toggle("is-hidden", hasData);
  if (!chart) {
    return;
  }
  chart.data.labels = labels;
  chart.data.datasets[0].data = values;
  chart.update();
}

function renderDiagnostics() {
  const freshness = getFreshnessState();
  dom.freshnessPill.dataset.tone = freshness.tone;
  dom.freshnessPill.textContent = freshness.label;
  dom.diagnosticConnection.textContent = getStatusPresentation().label;
  dom.diagnosticFreshness.textContent = freshness.detail;
  dom.diagnosticMissing.textContent = state.hasReceivedData ? `${state.metrics.missingFields.length}` : `${STRIDEX_FIELDS.length}`;
  dom.diagnosticDistance.textContent = state.hasReceivedData && !state.metrics.missingFields.includes("distance")
    ? `${state.metrics.distance.toFixed(1)} cm`
    : "No data yet";
  dom.diagnosticSamples.textContent = `${state.history.length} sample${state.history.length === 1 ? "" : "s"}`;

  if (state.errorMessage) {
    dom.diagnosticBanner.textContent = `Firebase error: ${state.errorMessage}`;
    return;
  }

  if (!state.hasReceivedData) {
    dom.diagnosticBanner.textContent = firebaseReady
      ? "Connected dashboard, waiting for values under /stridex. Empty states stay graceful until telemetry arrives."
      : "Firebase configuration is missing or incomplete for this session.";
    return;
  }

  const missingText = state.metrics.missingFields.length
    ? `Missing fields in latest sample: ${state.metrics.missingFields.join(", ")}.`
    : "All expected telemetry fields are present in the latest sample.";
  dom.diagnosticBanner.textContent = `${missingText} ${freshness.ageMs > 12000 ? "Data is getting stale." : "Data freshness is healthy."}`;
}

function getFreshnessState() {
  if (!state.hasReceivedData) {
    return {
      ageMs: Number.POSITIVE_INFINITY,
      label: firebaseReady ? "No data yet" : "Setup needed",
      detail: firebaseReady ? "Waiting for first sample" : "Add Firebase config",
      tone: "warning",
    };
  }

  const ageMs = Date.now() - state.metrics.lastUpdatedMs;
  if (ageMs < 5000) {
    return { ageMs, label: "Fresh", detail: `${Math.max(0, Math.round(ageMs / 1000))}s ago`, tone: "good" };
  }
  if (ageMs < 15000) {
    return { ageMs, label: "Watching", detail: `${Math.round(ageMs / 1000)}s ago`, tone: "warning" };
  }
  return { ageMs, label: "Stale", detail: `${Math.round(ageMs / 1000)}s ago`, tone: "danger" };
}

function formatMetricValue(key, value) {
  if (!state.hasReceivedData) {
    return key === "activity" ? "No data yet" : "--";
  }

  switch (key) {
    case "steps":
    case "alerts":
      return `${Math.round(value)}`;
    case "postureScore":
      return `${value.toFixed(1)}%`;
    case "activity":
      return String(value);
    default:
      return `${value}`;
  }
}

function buildMetricMeta(key) {
  if (!state.hasReceivedData) {
    return "Awaiting live telemetry";
  }

  switch (key) {
    case "steps":
      return `${state.metrics.activity} session cadence`;
    case "postureScore":
      return state.metrics.postureScore >= 85 ? "Strong alignment signal" : state.metrics.postureScore >= 65 ? "Mild posture drift" : "Correction recommended";
    case "activity":
      return "Current motion state";
    case "alerts":
      return state.metrics.alerts === 0 ? "No active alerts" : `${state.metrics.alerts} alert${state.metrics.alerts === 1 ? "" : "s"} active`;
    default:
      return "Live telemetry";
  }
}

function toneColor(tone) {
  const map = {
    good: "#75d7a5",
    warning: "#f4c26c",
    danger: "#ff8898",
    info: "#90d8ff",
  };
  return map[tone] ?? map.info;
}

function formatSampleLabel(timestamp) {
  const date = new Date(timestamp);
  return `${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function applyScrollState() {
  const update = () => {
    document.body.classList.toggle("is-scrolled", window.scrollY > 24);
    if (dom.shoeRotator) {
      const tilt = Math.min(10, window.scrollY / 80);
      dom.shoeRotator.style.transform = `translateY(${Math.min(16, window.scrollY / 30)}px) rotateX(${tilt}deg)`;
    }
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  dom.revealBlocks.forEach((block) => observer.observe(block));
}
