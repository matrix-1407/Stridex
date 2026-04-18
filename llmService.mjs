const GEMINI_API_KEY = "AIzaSyBK4koTNQU5Tdv9Tk3ckTAVRGMxx9aJzNs";

export async function fetchAIInsight(dataPayload) {
  if (!dataPayload) return null;

  const prompt = `You are Stridex, a smart wearable assistant tracking movement and posture. 
Analyze the following real-time data and provide:
1. A short, friendly, and non-technical insight (1-2 sentences).
2. A single actionable recommendation (1 sentence).
3. A short, punchy motivational phrase (1 sentence).

Data:
- Posture Score: ${dataPayload.postureScore} (${dataPayload.postureQuality})
- Stability: ${dataPayload.stability}%
- Steps: ${dataPayload.steps}
- Activity: ${dataPayload.activity}
- Alerts: ${dataPayload.alerts}
- Trend: ${dataPayload.trend}

Respond ONLY with valid JSON in this exact format:
{
  "insight": "Your insight here",
  "recommendation": "Your recommendation here",
  "motivation": "Your motivation here"
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const json = await response.json();
    const text = json.candidates[0].content.parts[0].text;
    
    // Safety clean
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("[Stridex AI] LLM Fetch Error:", e);
    return null;
  }
}
