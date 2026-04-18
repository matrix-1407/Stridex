const NUMERIC_DEFAULTS = {
  distance: 0,
  steps: 0,
  roll: 0,
  avgRoll: 0,
  postureScore: 0,
  stability: 0,
  walked: 0,
  alerts: 0,
};

const TEXT_DEFAULTS = {
  posture: "No data yet",
  activity: "No data yet",
};

export const STRIDEX_FIELDS = [
  "distance",
  "steps",
  "roll",
  "avgRoll",
  "postureScore",
  "stability",
  "walked",
  "alerts",
  "posture",
  "activity",
];

function isMissing(value) {
  return value === null || value === undefined || value === "";
}

function coerceNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coerceText(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

export function normalizeSnapshot(raw, timestampMs = Date.now()) {
  const source = raw && typeof raw === "object" ? raw : {};
  const missingFields = [];
  const normalized = {};

  Object.entries(NUMERIC_DEFAULTS).forEach(([field, fallback]) => {
    if (isMissing(source[field])) {
      missingFields.push(field);
      normalized[field] = fallback;
      return;
    }

    normalized[field] = coerceNumber(source[field], fallback);
  });

  Object.entries(TEXT_DEFAULTS).forEach(([field, fallback]) => {
    if (isMissing(source[field])) {
      missingFields.push(field);
      normalized[field] = fallback;
      return;
    }

    normalized[field] = coerceText(source[field], fallback);
  });

  normalized.steps = Math.max(0, Math.round(normalized.steps));
  normalized.alerts = Math.max(0, Math.round(normalized.alerts));
  normalized.postureScore = Math.max(0, Math.min(100, normalized.postureScore));
  normalized.stability = Math.max(0, Math.min(100, normalized.stability));
  normalized.lastUpdatedMs = timestampMs;
  normalized.missingFields = Array.from(new Set(missingFields));
  normalized.hasData = Object.keys(source).length > 0 && normalized.missingFields.length < STRIDEX_FIELDS.length;

  return normalized;
}

export function pushHistorySample(history, sample, maxSamples = 45) {
  const nextHistory = [...history, sample];
  return nextHistory.slice(-Math.max(1, maxSamples));
}

export function getMetricTone(metricKey, value) {
  switch (metricKey) {
    case "postureScore":
      if (value >= 85) return "good";
      if (value >= 60) return "warning";
      return "danger";
    case "stability":
      if (value >= 80) return "good";
      if (value >= 60) return "warning";
      return "danger";
    case "roll":
    case "avgRoll": {
      const absoluteRoll = Math.abs(Number(value));
      if (absoluteRoll <= 6) return "good";
      if (absoluteRoll <= 12) return "warning";
      return "danger";
    }
    case "alerts":
      if (value <= 0) return "good";
      if (value === 1) return "warning";
      return "danger";
    case "posture": {
      const posture = String(value).toLowerCase();
      if (/(aligned|upright|good|stable)/.test(posture)) return "good";
      if (/(neutral|steady|balanced)/.test(posture)) return "info";
      if (/(slouch|lean|bad|tilt|bend)/.test(posture)) return "danger";
      return "info";
    }
    case "activity":
      return "info";
    default:
      return "info";
  }
}

export function buildSystemInsight(metrics, freshnessMs) {
  if (freshnessMs > 15000) {
    return {
      headline: "Telemetry is stale",
      detail: "No fresh Firebase sample has arrived recently. Check connection health while keeping posture correction in focus.",
      tone: "warning",
    };
  }

  if (metrics.alerts > 0) {
    return {
      headline: "Alert activity detected",
      detail: `There ${metrics.alerts === 1 ? "is" : "are"} ${metrics.alerts} active alert${metrics.alerts === 1 ? "" : "s"}. Review posture and balance changes immediately.`,
      tone: metrics.alerts > 1 ? "danger" : "warning",
    };
  }

  if (metrics.postureScore < 65 || /(slouch|lean|bend|tilt)/i.test(metrics.posture)) {
    return {
      headline: "Posture needs correction",
      detail: "Posture score is trending low. Reduce lateral roll and regain an upright gait before continuing at pace.",
      tone: "danger",
    };
  }

  if (/run/i.test(metrics.activity)) {
    return {
      headline: "Running detected",
      detail: "Cadence is elevated. Keep ankle roll controlled and monitor the stability band during the next few seconds.",
      tone: "info",
    };
  }

  if (/walk/i.test(metrics.activity)) {
    return {
      headline: "Walking detected",
      detail: "Stride activity is healthy. Continue monitoring posture score to maintain balanced movement.",
      tone: "good",
    };
  }

  if (metrics.stability < 70 || Math.abs(metrics.roll) > 10) {
    return {
      headline: "System stability needs attention",
      detail: "Balance is fluctuating more than expected. Slow down briefly and allow the shoe to settle into a steadier motion profile.",
      tone: "warning",
    };
  }

  return {
    headline: "Good posture maintained",
    detail: "Current telemetry shows stable movement, low roll drift, and a healthy posture profile.",
    tone: "good",
  };
}

export function buildTrendSummary(history) {
  if (history.length < 4) {
    return "Trend summary will appear after a few live samples.";
  }

  const recent = history.slice(-6);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const postureDelta = last.postureScore - first.postureScore;
  const rollDelta = Math.abs(last.roll) - Math.abs(first.roll);

  if (postureDelta >= 5) {
    return "Posture quality is improving over the current session window.";
  }

  if (postureDelta <= -5) {
    return "Posture quality is softening. Consider a correction cue if this persists.";
  }

  if (rollDelta <= -3) {
    return "Roll angle is settling down, suggesting a more stable stride.";
  }

  if (rollDelta >= 3) {
    return "Roll variability is climbing. Watch for ankle drift or uneven loading.";
  }

  return "Live trends are steady with no sharp swings in the latest sample window.";
}

export function buildHeroMetrics(metrics) {
  return [
    {
      key: "steps",
      label: "Steps",
      value: `${Math.round(metrics.steps ?? 0)}`,
    },
    {
      key: "postureScore",
      label: "Posture",
      value: `${Math.round(metrics.postureScore ?? 0)}%`,
    },
    {
      key: "activity",
      label: "Activity",
      value: String(metrics.activity ?? "No data yet"),
    },
  ];
}
