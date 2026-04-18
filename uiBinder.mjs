export function bindAIUI() {
  return {
    aiInsightText: document.getElementById('ai-insight-text'),
    aiRecommendationText: document.getElementById('ai-recommendation-text'),
    aiMotivationText: document.getElementById('ai-motivation-text'),
    aiProfile: document.getElementById('ai-profile'),
    aiRisk: document.getElementById('ai-risk'),
    aiAnomaly: document.getElementById('ai-anomaly'),
    aiVector: document.getElementById('ai-vector'),
  };
}

export function updateAIPanel(aiDom, ruleData, llmData) {
  if (!ruleData) return;

  const insightText = llmData?.insight || ruleData.ruleBasedInsight;
  const recText = llmData?.recommendation || ruleData.ruleBasedRecommendation;
  const motText = llmData?.motivation || "";

  if (aiDom.aiInsightText) aiDom.aiInsightText.textContent = insightText;
  if (aiDom.aiRecommendationText) aiDom.aiRecommendationText.textContent = recText;
  
  if (aiDom.aiMotivationText) {
    if (motText) {
      aiDom.aiMotivationText.textContent = motText;
      aiDom.aiMotivationText.style.display = 'block';
    } else {
      aiDom.aiMotivationText.style.display = 'none';
    }
  }

  if (aiDom.aiProfile) aiDom.aiProfile.textContent = ruleData.mlProfile.movementProfile;
  if (aiDom.aiRisk) {
    aiDom.aiRisk.textContent = ruleData.mlProfile.strainRisk;
    aiDom.aiRisk.style.color = ruleData.mlProfile.strainRisk === 'High Risk' ? 'var(--alert-red)' : 
                               ruleData.mlProfile.strainRisk === 'Medium Risk' ? 'var(--alert-orange)' : 'var(--text-primary)';
  }
  if (aiDom.aiAnomaly) {
    aiDom.aiAnomaly.textContent = ruleData.mlProfile.anomalyStatus;
    aiDom.aiAnomaly.style.color = ruleData.mlProfile.anomalyStatus === 'Irregularity Detected' ? 'var(--alert-red)' : 'var(--text-primary)';
  }
  if (aiDom.aiVector) aiDom.aiVector.textContent = ruleData.mlProfile.trendVector;
}
