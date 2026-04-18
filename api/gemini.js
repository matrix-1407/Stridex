export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const { dataPayload } = req.body;
  if (!dataPayload) {
    return res.status(400).json({ error: 'dataPayload is required' });
  }

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
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const json = await geminiResponse.json();
    const text = json.candidates[0].content.parts[0].text;
    
    // Safety clean
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanText);

    res.status(200).json(parsedData);
  } catch (error) {
    console.error("[Stridex AI] Vercel Function Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
