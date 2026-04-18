export function analyzeData(history) {
  if (!history || history.length === 0) return null;
  const latest = history[history.length - 1].snapshot;

  // Posture Classification
  let postureQuality = "Poor";
  if (latest.postureScore >= 80) postureQuality = "Good";
  else if (latest.postureScore >= 50) postureQuality = "Moderate";

  // Trend Detection (last N)
  let trend = "Stable";
  if (history.length >= 10) {
    const len = history.length;
    let oldAvg = 0, newAvg = 0;
    for(let i=0; i<5; i++) oldAvg += history[i].snapshot.postureScore;
    for(let i=1; i<=5; i++) newAvg += history[len - i].snapshot.postureScore;
    oldAvg /= 5;
    newAvg /= 5;

    if (newAvg < oldAvg - 5) trend = "Decreasing";
    else if (newAvg > oldAvg + 5) trend = "Improving";
  }

  // Stability Analysis
  let stabilityStatus = "Moderate";
  if (latest.stability < 40) stabilityStatus = "Unstable";
  else if (latest.stability > 70) stabilityStatus = "Stable";

  // Activity Awareness
  let activityAdvice = "";
  if (latest.activity === "Idle") activityAdvice = "You've been idle, consider standing up and moving a bit.";
  else if (latest.activity === "Walking") activityAdvice = "While walking, try to maintain a straight back and look forward.";
  else if (latest.activity === "Running") activityAdvice = "Focus on balance and keeping a steady rhythm.";

  // ML Profile & Risk Analysis
  let movementProfile = "Active & Balanced";
  if (latest.activity === "Idle" && latest.postureScore < 60) movementProfile = "Slouching (Sedentary)";
  else if (latest.activity === "Walking" && latest.stability < 50) movementProfile = "Unstable Gait";
  else if (latest.activity === "Running" && latest.stability > 70) movementProfile = "High-Performance";

  let strainRisk = "Low Risk";
  if (latest.alerts > 2 || latest.postureScore < 40) strainRisk = "High Risk";
  else if (latest.alerts > 0 || latest.postureScore < 60) strainRisk = "Medium Risk";

  let anomalyStatus = "Clear";
  if (history.length >= 2) {
    const prev = history[history.length - 2].snapshot;
    if (Math.abs(latest.stability - prev.stability) > 30) {
      anomalyStatus = "Irregularity Detected";
    }
  }

  const ruleBasedInsight = `You are currently ${latest.activity.toLowerCase()} with a ${postureQuality.toLowerCase()} posture. Your posture is ${trend.toLowerCase()} over time.`;
  const ruleBasedRecommendation = activityAdvice || `Try to improve stability, which is currently at ${Math.round(latest.stability)}%.`;

  return {
    postureScore: latest.postureScore,
    stability: latest.stability,
    steps: latest.steps || 0,
    activity: latest.activity,
    alerts: latest.alerts || 0,
    trend: trend,
    postureQuality: postureQuality,
    mlProfile: {
      movementProfile,
      strainRisk,
      anomalyStatus,
      trendVector: trend
    },
    ruleBasedInsight,
    ruleBasedRecommendation
  };
}
