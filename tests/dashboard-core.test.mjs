import assert from "node:assert/strict";
import {
  buildHeroMetrics,
  buildSystemInsight,
  buildTrendSummary,
  getMetricTone,
  normalizeSnapshot,
  pushHistorySample,
} from "../dashboard-core.mjs";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
}

run("normalizeSnapshot returns safe defaults and tracks missing fields", () => {
  const normalized = normalizeSnapshot(
    {
      steps: "1200",
      postureScore: "88.5",
      posture: "Aligned",
      activity: null,
      alerts: undefined,
    },
    1700000000000
  );

  assert.equal(normalized.steps, 1200);
  assert.equal(normalized.postureScore, 88.5);
  assert.equal(normalized.posture, "Aligned");
  assert.equal(normalized.activity, "No data yet");
  assert.equal(normalized.alerts, 0);
  assert.ok(normalized.missingFields.includes("activity"));
  assert.ok(normalized.missingFields.includes("alerts"));
  assert.equal(normalized.lastUpdatedMs, 1700000000000);
});

run("pushHistorySample keeps only the most recent samples", () => {
  const history = Array.from({ length: 4 }, (_, index) => ({ index }));
  const result = pushHistorySample(history, { index: 4 }, 3);

  assert.deepEqual(result, [{ index: 2 }, { index: 3 }, { index: 4 }]);
});

run("buildSystemInsight prioritizes alerts and stale posture issues", () => {
  const alertInsight = buildSystemInsight(
    {
      alerts: 2,
      postureScore: 91,
      stability: 85,
      posture: "Neutral",
      activity: "Walking",
      roll: 4,
    },
    2000
  );

  const staleInsight = buildSystemInsight(
    {
      alerts: 0,
      postureScore: 58,
      stability: 61,
      posture: "Slouched",
      activity: "Idle",
      roll: 15,
    },
    18000
  );

  assert.match(alertInsight.headline, /Alert activity detected/i);
  assert.match(staleInsight.headline, /Telemetry is stale/i);
  assert.match(staleInsight.detail, /posture correction/i);
});

run("getMetricTone maps health metrics to semantic tones", () => {
  assert.equal(getMetricTone("postureScore", 92), "good");
  assert.equal(getMetricTone("postureScore", 64), "warning");
  assert.equal(getMetricTone("alerts", 3), "danger");
  assert.equal(getMetricTone("activity", "Walking"), "info");
});

run("buildHeroMetrics returns the approved hero chip order", () => {
  const heroMetrics = buildHeroMetrics({
    steps: 4200,
    postureScore: 86,
    activity: "Walking",
    alerts: 1,
  });

  assert.deepEqual(heroMetrics.map((item) => item.key), ["steps", "postureScore", "activity"]);
  assert.equal(heroMetrics[0].value, "4200");
  assert.equal(heroMetrics[1].value, "86%");
  assert.equal(heroMetrics[2].value, "Walking");
});

run("buildTrendSummary stays calm when live data is steady", () => {
  const summary = buildTrendSummary([
    { postureScore: 81, roll: 5 },
    { postureScore: 82, roll: 5 },
    { postureScore: 81, roll: 4 },
    { postureScore: 82, roll: 4 },
  ]);

  assert.match(summary, /steady/i);
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
