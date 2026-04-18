export async function fetchAIInsight(dataPayload) {
  if (!dataPayload) return null;

  try {
    const response = await fetch('/api/gemini', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataPayload })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.error("[Stridex AI] LLM Fetch Error:", e);
    return null;
  }
}
