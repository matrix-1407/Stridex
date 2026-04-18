# Stridex UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Stridex frontend into a hero-first, Apple-minimal plus futuristic-glass experience while preserving the existing Firebase live-data path and safe frontend-only architecture.

**Architecture:** Keep the app as plain HTML/CSS/JS with Chart.js and Firebase browser SDK. The redesign keeps the tested telemetry normalization core in `dashboard-core.mjs`, remaps the UI hierarchy around a split hero and calmer dashboard in `index.html`, expresses the new visual language and motion in `style.css`, and drives the new interaction model from `script.js` without changing the backend contract.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Firebase browser SDK, Chart.js, Node for lightweight test/syntax verification.

---

## File Structure

### Files To Modify
- `D:\Smart Shoe\index.html`
  - Replace the current dense dashboard-first markup with a slim floating nav, split hero, dashboard reveal, quieter analytics, and compact diagnostics structure.
- `D:\Smart Shoe\style.css`
  - Replace the current visual system with the new palette, spacing, glass treatment, pseudo-3D shoe styling, ambient hero motion, and calmer dashboard styling.
- `D:\Smart Shoe\script.js`
  - Re-map the DOM bindings and rendering flow to the hero chips, compact metric row, insight block, secondary charts, scroll transitions, and pseudo-3D shoe motion state.
- `D:\Smart Shoe\dashboard-core.mjs`
  - Adapt helper functions to support hero chip priorities, quieter analytics, revised insight copy, and any new semantic helpers needed by the redesign.
- `D:\Smart Shoe\tests\dashboard-core.test.mjs`
  - Extend tests for any new core helpers or revised copy/priority behavior before implementation code is added.

### Existing Files To Leave Alone
- `D:\Smart Shoe\database.rules.json`
- `D:\Smart Shoe\README.md`
- Backend/Firebase firmware or schema files outside the frontend surface

---

### Task 1: Extend The Testable Dashboard Core First

**Files:**
- Modify: `D:\Smart Shoe\tests\dashboard-core.test.mjs`
- Modify: `D:\Smart Shoe\dashboard-core.mjs`
- Test: `D:\Smart Shoe\tests\dashboard-core.test.mjs`

- [ ] **Step 1: Write the failing tests for hero priority and quieter analytics behavior**

Replace the test file contents with:

```javascript
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
```

- [ ] **Step 2: Run the test file to verify it fails for the expected reason**

Run:

```powershell
node tests/dashboard-core.test.mjs
```

Expected: `FAIL buildHeroMetrics returns the approved hero chip order` with an import or missing-function error for `buildHeroMetrics`.

- [ ] **Step 3: Add the minimal new helper to the dashboard core**

Insert this export near the bottom of `D:\Smart Shoe\dashboard-core.mjs` after `buildTrendSummary`:

```javascript
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
```

- [ ] **Step 4: Run the test file again to verify it passes**

Run:

```powershell
node tests/dashboard-core.test.mjs
```

Expected: all tests print `PASS` and the command exits successfully.

- [ ] **Step 5: Commit the core helper change**

Run:

```powershell
git add tests/dashboard-core.test.mjs dashboard-core.mjs
git commit -m "test: add hero metric core helper"
```

Expected: a commit containing only the test and core helper changes.

---

### Task 2: Rebuild The HTML Around The Approved Information Hierarchy

**Files:**
- Modify: `D:\Smart Shoe\index.html`
- Test: visual structure review in browser after implementation

- [ ] **Step 1: Write the failing structural expectation as a manual checklist**

Use this checklist as the structural failure target before editing:

```text
Current page fails the approved structure because:
- there is no floating nav
- there is no split product hero
- there is no pseudo-3D shoe stage
- the first viewport is still dominated by dashboard cards
- charts are not secondary
```

- [ ] **Step 2: Replace the body markup with the new semantic layout skeleton**

Replace everything inside `<body>` in `D:\Smart Shoe\index.html` with this structure:

```html
<body>
  <div class="site-bg">
    <div class="ambient-orb ambient-orb--one"></div>
    <div class="ambient-orb ambient-orb--two"></div>
    <div class="ambient-grid"></div>
  </div>

  <header class="floating-nav" id="top">
    <div class="floating-nav__brand">
      <span class="brand-mark">S</span>
      <div>
        <strong>Stridex</strong>
        <span>Smart movement intelligence</span>
      </div>
    </div>

    <nav class="floating-nav__links" aria-label="Primary">
      <a href="#hero">Overview</a>
      <a href="#dashboard">Live Metrics</a>
      <a href="#insights">Insights</a>
    </nav>

    <div class="floating-nav__meta">
      <span class="status-chip" id="connection-pill" data-tone="warning">
        <span class="status-dot"></span>
        <span id="connection-label">Reconnecting</span>
      </span>
      <a class="nav-cta" href="#dashboard">View Dashboard</a>
    </div>
  </header>

  <main class="page-shell">
    <section class="hero" id="hero">
      <div class="hero__copy">
        <p class="eyebrow">Fitness posture dashboard</p>
        <h1>Train smarter with live gait and posture clarity.</h1>
        <p class="hero__lede">
          Stridex turns smart-shoe telemetry into a calmer, cleaner live experience so movement quality is readable in seconds.
        </p>
        <div class="hero__actions">
          <a class="button button--primary" href="#dashboard">Enter Live Dashboard</a>
          <a class="button button--ghost" href="#insights">See Insights</a>
        </div>
        <div class="hero__chips" id="hero-chips"></div>
      </div>

      <div class="hero__visual">
        <div class="shoe-stage">
          <div class="shoe-halo"></div>
          <div class="shoe-rotator" id="shoe-rotator">
            <div class="shoe-model" aria-hidden="true">
              <div class="shoe-shadow"></div>
              <div class="shoe-sole"></div>
              <div class="shoe-upper"></div>
              <div class="shoe-heel"></div>
              <div class="shoe-collar"></div>
              <div class="shoe-laces"></div>
              <div class="shoe-accent shoe-accent--front"></div>
              <div class="shoe-accent shoe-accent--rear"></div>
            </div>
          </div>
          <div class="hero-stat hero-stat--top" id="hero-activity-pill">Activity: No data yet</div>
          <div class="hero-stat hero-stat--bottom" id="hero-posture-pill">Posture: No data yet</div>
        </div>
      </div>

      <a class="scroll-cue" href="#dashboard" aria-label="Scroll to dashboard">
        <span></span>
      </a>
    </section>

    <section class="dashboard" id="dashboard">
      <div class="dashboard__intro">
        <p class="eyebrow">Live overview</p>
        <h2>Essential metrics first</h2>
        <p>Track movement quality at a glance, then drill into quieter trends and diagnostics below.</p>
      </div>

      <section class="metric-row" aria-live="polite">
        <article class="metric-card" data-metric="steps"></article>
        <article class="metric-card" data-metric="postureScore"></article>
        <article class="metric-card" data-metric="activity"></article>
        <article class="metric-card" data-metric="alerts"></article>
      </section>

      <section class="insight-grid" id="insights">
        <article class="visual-panel" id="visual-panel"></article>
        <article class="insight-panel" id="insight-panel"></article>
        <article class="ai-panel" id="ai-panel"></article>
      </section>

      <section class="analytics-grid">
        <article class="chart-panel" id="steps-panel"></article>
        <article class="chart-panel" id="trend-panel"></article>
      </section>

      <section class="diagnostics-panel" id="diagnostics"></section>
    </section>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <script type="module" src="script.js"></script>
</body>
```

- [ ] **Step 3: Run a quick HTML sanity check by reopening the file and scanning for the required sections**

Run:

```powershell
Select-String -Path index.html -Pattern 'floating-nav|hero__copy|shoe-stage|metric-row|insight-grid|analytics-grid|diagnostics-panel'
```

Expected: one or more matches for each approved section name.

- [ ] **Step 4: Commit the HTML structure checkpoint**

Run:

```powershell
git add index.html
git commit -m "feat: add hero-first dashboard structure"
```

Expected: a commit containing only the new HTML layout scaffold.

---

### Task 3: Rebuild The CSS Visual System And Pseudo-3D Hero

**Files:**
- Modify: `D:\Smart Shoe\style.css`
- Test: browser visual review after implementation

- [ ] **Step 1: Replace the current root tokens with the approved palette and spacing system**

At the top of `D:\Smart Shoe\style.css`, replace the old root tokens with:

```css
:root {
  --bg: #0a111b;
  --bg-soft: #0f1722;
  --surface: rgba(245, 248, 252, 0.08);
  --surface-strong: rgba(255, 255, 255, 0.12);
  --surface-border: rgba(255, 255, 255, 0.16);
  --text-main: #f7fbff;
  --text-soft: #c8d5e6;
  --text-muted: #8c9cb0;
  --accent: #8fd3ff;
  --accent-strong: #d7f0ff;
  --good: #75d7a5;
  --warning: #f5c36a;
  --danger: #ff7f8f;
  --shadow-lg: 0 40px 120px rgba(0, 0, 0, 0.35);
  --shadow-md: 0 20px 60px rgba(0, 0, 0, 0.22);
  --radius-xl: 32px;
  --radius-lg: 24px;
  --radius-md: 18px;
  --page-width: min(1240px, calc(100% - 32px));
}
```

- [ ] **Step 2: Add the new page, nav, and hero layout rules**

Add these layout rules after the root block:

```css
html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: "Manrope", sans-serif;
  color: var(--text-main);
  background: radial-gradient(circle at top left, rgba(143, 211, 255, 0.16), transparent 28%),
    linear-gradient(180deg, #09111a 0%, #0a111b 40%, #0d1621 100%);
}

.page-shell {
  width: var(--page-width);
  margin: 0 auto;
  padding: 20px 0 48px;
}

.floating-nav {
  position: sticky;
  top: 18px;
  z-index: 30;
  width: var(--page-width);
  margin: 18px auto 0;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-radius: 999px;
  backdrop-filter: blur(18px);
  background: rgba(13, 21, 31, 0.58);
  border: 1px solid var(--surface-border);
  box-shadow: var(--shadow-md);
}

.hero {
  min-height: calc(100vh - 120px);
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  align-items: center;
  gap: 40px;
  padding: 48px 0 28px;
}

.dashboard {
  padding-top: 48px;
}
```

- [ ] **Step 3: Add the pseudo-3D shoe, ambient background, and scroll-reveal styling**

Append these hero-visual rules:

```css
.hero__visual {
  position: relative;
  display: grid;
  place-items: center;
}

.shoe-stage {
  position: relative;
  width: min(100%, 520px);
  aspect-ratio: 1;
  border-radius: 40px;
  border: 1px solid var(--surface-border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03));
  backdrop-filter: blur(20px);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.shoe-halo {
  position: absolute;
  inset: 12% 16%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(143, 211, 255, 0.35), rgba(143, 211, 255, 0.02) 62%, transparent 72%);
  filter: blur(10px);
  animation: haloFloat 8s ease-in-out infinite;
}

.shoe-rotator {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  perspective: 1200px;
}

.shoe-model {
  position: relative;
  width: 280px;
  height: 170px;
  transform-style: preserve-3d;
  animation: shoeSpin 14s linear infinite;
}

.shoe-sole,
.shoe-upper,
.shoe-heel,
.shoe-collar,
.shoe-laces,
.shoe-accent {
  position: absolute;
  border-radius: 999px;
}

.shoe-sole {
  left: 22px;
  right: 4px;
  bottom: 22px;
  height: 40px;
  background: linear-gradient(180deg, #eef5fb, #bac9d8);
  transform: rotate(-9deg) translateZ(10px);
}

.shoe-upper {
  left: 36px;
  right: 30px;
  bottom: 48px;
  height: 84px;
  background: linear-gradient(135deg, #f7fbff, #9ab6d0 70%, #6e8ba5);
  border-radius: 48% 52% 38% 42% / 52% 56% 44% 40%;
  transform: rotate(-11deg) skewX(-10deg) translateZ(34px);
}

.shoe-heel {
  width: 86px;
  height: 72px;
  left: 22px;
  bottom: 54px;
  background: linear-gradient(135deg, #dce9f5, #7f9ab4);
  transform: rotate(-8deg) translateZ(26px);
}

.shoe-collar {
  width: 118px;
  height: 48px;
  left: 62px;
  bottom: 102px;
  background: linear-gradient(180deg, rgba(13, 21, 31, 0.76), rgba(13, 21, 31, 0.18));
  transform: rotate(-10deg) translateZ(36px);
}

.shoe-laces {
  left: 110px;
  bottom: 88px;
  width: 88px;
  height: 12px;
  background: repeating-linear-gradient(90deg, #f7fbff 0 10px, transparent 10px 16px);
  transform: rotate(-12deg) translateZ(42px);
}

.shoe-accent--front {
  width: 64px;
  height: 18px;
  right: 46px;
  bottom: 78px;
  background: linear-gradient(90deg, rgba(143, 211, 255, 0.2), rgba(143, 211, 255, 0.9));
  transform: rotate(-12deg) translateZ(46px);
}

.shoe-accent--rear {
  width: 48px;
  height: 14px;
  left: 58px;
  bottom: 92px;
  background: linear-gradient(90deg, rgba(143, 211, 255, 0.15), rgba(143, 211, 255, 0.8));
  transform: rotate(-12deg) translateZ(45px);
}

.shoe-shadow {
  position: absolute;
  left: 42px;
  right: 24px;
  bottom: 12px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  filter: blur(10px);
}

@keyframes shoeSpin {
  0% { transform: rotateX(18deg) rotateY(0deg); }
  50% { transform: rotateX(14deg) rotateY(180deg); }
  100% { transform: rotateX(18deg) rotateY(360deg); }
}

@keyframes haloFloat {
  0%, 100% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.06) translateY(-12px); }
}
```

- [ ] **Step 4: Add the calmer dashboard section styling and mobile behavior**

Append these dashboard rules:

```css
.metric-row,
.insight-grid,
.analytics-grid {
  display: grid;
  gap: 18px;
}

.metric-row {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 24px;
}

.insight-grid {
  grid-template-columns: 1.15fr 1fr 0.9fr;
  margin-top: 22px;
}

.analytics-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 22px;
}

.metric-card,
.visual-panel,
.insight-panel,
.ai-panel,
.chart-panel,
.diagnostics-panel {
  border-radius: var(--radius-lg);
  border: 1px solid var(--surface-border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.04));
  backdrop-filter: blur(18px);
  box-shadow: var(--shadow-md);
}

@media (max-width: 1080px) {
  .hero,
  .insight-grid,
  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .metric-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .floating-nav {
    width: min(100% - 20px, 1240px);
    border-radius: 24px;
    padding: 14px;
  }

  .page-shell {
    width: min(100% - 20px, 1240px);
  }

  .metric-row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Verify the stylesheet still parses as CSS by re-reading key selectors**

Run:

```powershell
Select-String -Path style.css -Pattern 'shoeSpin|floating-nav|hero__visual|metric-row|insight-grid|analytics-grid'
```

Expected: all selectors and keyframes are present.

- [ ] **Step 6: Commit the visual-system checkpoint**

Run:

```powershell
git add style.css
git commit -m "feat: redesign Stridex visual system"
```

Expected: a commit containing only the CSS redesign.

---

### Task 4: Rewire The Frontend Behavior To The New Layout

**Files:**
- Modify: `D:\Smart Shoe\script.js`
- Modify: `D:\Smart Shoe\dashboard-core.mjs`
- Test: `D:\Smart Shoe\tests\dashboard-core.test.mjs`

- [ ] **Step 1: Write the failing behavior target as a focused checklist**

Use this checklist before editing:

```text
Current script fails the new design because:
- hero chips are not rendered
- the nav and hero pills are not updated from live data
- compact metric cards are not injected into the new containers
- chart priority is not reduced to two calmer panels
- scroll-state styling is not driven from JS
```

- [ ] **Step 2: Replace the DOM map and state initialization with the new section references**

Near the top of `D:\Smart Shoe\script.js`, replace the current DOM selection blocks with:

```javascript
const dom = {
  connectionPill: document.getElementById("connection-pill"),
  connectionLabel: document.getElementById("connection-label"),
  heroChips: document.getElementById("hero-chips"),
  heroActivityPill: document.getElementById("hero-activity-pill"),
  heroPosturePill: document.getElementById("hero-posture-pill"),
  shoeRotator: document.getElementById("shoe-rotator"),
  dashboard: document.getElementById("dashboard"),
  insightPanel: document.getElementById("insight-panel"),
  visualPanel: document.getElementById("visual-panel"),
  aiPanel: document.getElementById("ai-panel"),
  stepsPanel: document.getElementById("steps-panel"),
  trendPanel: document.getElementById("trend-panel"),
  diagnostics: document.getElementById("diagnostics"),
  metricCards: Array.from(document.querySelectorAll(".metric-card")),
};

const state = {
  metrics: normalizeSnapshot({}, 0),
  history: [],
  hasReceivedData: false,
  connectionMode: "reconnecting",
  connectionDetail: "Waiting for Firebase stream",
  errorMessage: "",
};
```

- [ ] **Step 3: Add hero, metric, and scroll render helpers**

Append these helpers into `D:\Smart Shoe\script.js` after the chart factory functions:

```javascript
function renderHeroChips() {
  const items = buildHeroMetrics(state.metrics);
  dom.heroChips.innerHTML = items
    .map(
      (item) => `
        <div class="hero-chip hero-chip--${item.key}">
          <span>${item.label}</span>
          <strong>${state.hasReceivedData ? item.value : "No data yet"}</strong>
        </div>
      `
    )
    .join("");

  dom.heroActivityPill.textContent = `Activity: ${state.hasReceivedData ? state.metrics.activity : "No data yet"}`;
  dom.heroPosturePill.textContent = `Posture: ${state.hasReceivedData ? state.metrics.posture : "No data yet"}`;
}

function renderMetricRow() {
  const metricOrder = ["steps", "postureScore", "activity", "alerts"];

  dom.metricCards.forEach((card, index) => {
    const key = metricOrder[index];
    const value = state.metrics[key];
    const tone = state.hasReceivedData ? getMetricTone(key, value) : "info";
    const labelMap = {
      steps: "Steps",
      postureScore: "Posture Score",
      activity: "Activity",
      alerts: "Alerts",
    };

    card.dataset.tone = tone;
    card.innerHTML = `
      <p class="metric-card__label">${labelMap[key]}</p>
      <strong class="metric-card__value">${formatMetricValue(key, value)}</strong>
      <span class="metric-card__meta">${buildMetricMeta(key)}</span>
    `;
  });
}

function renderPanels() {
  const freshness = getFreshnessState();
  const insight = state.hasReceivedData
    ? buildSystemInsight(state.metrics, freshness.ageMs)
    : {
        headline: "Waiting for telemetry",
        detail: "The redesigned dashboard is connected and ready for live data.",
        tone: "info",
      };

  dom.visualPanel.innerHTML = `
    <p class="panel-kicker">Body status</p>
    <h3>Posture and stability</h3>
    <div class="score-ring" data-tone="${state.hasReceivedData ? getMetricTone("postureScore", state.metrics.postureScore) : "info"}">
      <strong>${state.hasReceivedData ? Math.round(state.metrics.postureScore) : "--"}</strong>
      <span>Posture score</span>
    </div>
    <div class="stability-meter">
      <span>Stability</span>
      <strong>${state.hasReceivedData ? state.metrics.stability.toFixed(1) : "--"}%</strong>
    </div>
  `;

  dom.insightPanel.dataset.tone = insight.tone;
  dom.insightPanel.innerHTML = `
    <p class="panel-kicker">System insight</p>
    <h3>${insight.headline}</h3>
    <p>${insight.detail}</p>
  `;

  dom.aiPanel.innerHTML = `
    <p class="panel-kicker">Trend summary</p>
    <h3>Future-ready AI slot</h3>
    <p>${buildTrendSummary(state.history)}</p>
  `;
}

function applyScrollState() {
  const onScroll = () => {
    document.body.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}
```

- [ ] **Step 4: Simplify the chart and diagnostics rendering to the new secondary emphasis**

Update the render orchestration to this shape:

```javascript
function renderDashboard() {
  renderStatusBlock();
  renderHeroChips();
  renderMetricRow();
  renderPanels();
  renderCharts();
  renderDiagnostics();
}

function renderCharts() {
  const labels = state.history.map((sample) => sample.label);
  updateChart(charts.steps, labels, state.history.map((sample) => sample.steps), dom.stepsPanel);
  updateChart(charts.trend, labels, state.history.map((sample) => sample.postureScore), dom.trendPanel);
}
```

Update chart creation to only produce two instances:

```javascript
const charts = {
  steps: createLineChart(document.getElementById("steps-chart"), {
    borderColor: "#8fd3ff",
    fillStart: "rgba(143, 211, 255, 0.18)",
    fillEnd: "rgba(143, 211, 255, 0.02)",
    label: "Steps",
    yFormatter: (value) => `${Math.round(value)} steps`,
    min: 0,
  }),
  trend: createLineChart(document.getElementById("trend-chart"), {
    borderColor: "#75d7a5",
    fillStart: "rgba(117, 215, 165, 0.16)",
    fillEnd: "rgba(117, 215, 165, 0.02)",
    label: "Posture score",
    yFormatter: (value) => `${Number(value).toFixed(1)}%`,
    min: 0,
    max: 100,
  }),
};
```

- [ ] **Step 5: Initialize scroll behavior and re-run the core tests**

At startup, add:

```javascript
applyScrollState();
```

Then run:

```powershell
node tests/dashboard-core.test.mjs
```

Expected: all tests still pass after the script/core changes.

- [ ] **Step 6: Commit the behavior wiring checkpoint**

Run:

```powershell
git add script.js dashboard-core.mjs tests/dashboard-core.test.mjs
git commit -m "feat: wire hero-first Stridex interactions"
```

Expected: a commit containing the new script behavior and any core adjustments.

---

### Task 5: Final Verification And Browser Fit Check

**Files:**
- Modify: `D:\Smart Shoe\index.html` if small spacing fixes are needed
- Modify: `D:\Smart Shoe\style.css` if visual polish fixes are needed
- Modify: `D:\Smart Shoe\script.js` if behavior polish fixes are needed

- [ ] **Step 1: Run the automated verification commands**

Run:

```powershell
node tests/dashboard-core.test.mjs
node --check script.js
node --check dashboard-core.mjs
```

Expected:
- test file prints all `PASS`
- both `node --check` commands exit successfully with no syntax errors

- [ ] **Step 2: Launch a local static server for manual review**

Run:

```powershell
py -m http.server 5500
```

Expected: the terminal prints a local server message such as `Serving HTTP on`.

- [ ] **Step 3: Manually review the page against the approved spec**

Use this checklist in the browser:

```text
- floating nav feels slim and premium
- first viewport is hero-first, not dashboard-first
- pseudo-3D shoe rotates smoothly and reads as a shoe
- hero background motion is subtle
- dashboard cards are cleaner and less cluttered
- only two charts remain and they feel secondary
- posture/stability block is still useful but calmer
- mobile/tablet layouts keep the hero readable
- empty or partial data states still look intentional
```

- [ ] **Step 4: Make any final polish edits needed to satisfy the checklist**

Typical polish edits should be limited to:

```text
- spacing and alignment fixes in index.html/style.css
- motion timing tweaks in style.css/script.js
- label text simplification in script.js/dashboard-core.mjs
```

- [ ] **Step 5: Re-run verification after final polish**

Run:

```powershell
node tests/dashboard-core.test.mjs
node --check script.js
node --check dashboard-core.mjs
```

Expected: same successful output as Step 1 after the final polish pass.

- [ ] **Step 6: Commit the finished redesign**

Run:

```powershell
git add index.html style.css script.js dashboard-core.mjs tests/dashboard-core.test.mjs
git commit -m "feat: redesign Stridex dashboard experience"
```

Expected: one final implementation commit for the completed redesign.

---

## Self-Review

### Spec Coverage
- Hero-first split layout: covered in Task 2 and Task 3
- Floating glass nav: covered in Task 2 and Task 3
- Pseudo-3D shoe without external asset: covered in Task 2 and Task 3
- Reduced dashboard clutter and calmer hierarchy: covered in Task 2, Task 3, and Task 4
- 1-2 secondary charts only: covered in Task 4
- Posture score and stability kept as secondary visualization: covered in Task 4
- Smooth scrolling and scroll transition: covered in Task 4 and Task 5
- Existing Firebase contract preserved: covered in Task 4
- Responsive behavior and empty/error states preserved: covered in Task 3, Task 4, and Task 5

### Placeholder Scan
- No `TBD`, `TODO`, or “implement later” placeholders remain.
- Commands, file paths, and code snippets are concrete.

### Type Consistency
- `buildHeroMetrics` is introduced in Task 1 and then consumed consistently in Task 4.
- Chart naming uses `steps` and `trend` consistently in Task 4.
- Primary metric order remains `steps`, `postureScore`, `activity`, `alerts` throughout the plan.
