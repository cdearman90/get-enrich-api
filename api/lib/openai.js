// api/lib/openai.js v1.0.3
export async function callOpenAI(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  const defaults = {
    model: "gpt-4-turbo",
    max_tokens: 50,
    temperature: 0.3,
    systemMessage: "You are a helpful assistant.",
    retries: 2,
    timeoutMs: 9000,
  };
  const opts = { ...defaults, ...options };

  if (!apiKey) {
    console.warn("⚠️ OPENAI_API_KEY is not set — returning default response");
    return {
      output: JSON.stringify({ isReadable: true, isConfident: false }),
      tokens: 0,
      confidence: "low",
      source: "GPT",
      error: "Missing OPENAI_API_KEY"
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

  let attempt = 0;
  while (attempt <= opts.retries) {
    try {
      console.warn(`📡 OpenAI [Attempt ${attempt + 1}]: ${prompt.slice(0, 80)}...`);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: opts.model,
          messages: [
            { role: "system", content: opts.systemMessage },
            { role: "user", content: prompt },
          ],
          max_tokens: opts.max_tokens,
          temperature: opts.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const raw = await response.text();

      if (!response.ok) {
        logToGPTErrorTab(prompt, raw, `HTTP ${response.status}`);
        if (response.status >= 500 || response.status === 429) throw new Error("Retryable error");
        throw new Error(`OpenAI Error: ${raw}`);
      }

      let json;
      try {
        json = JSON.parse(raw);
      } catch (err) {
        console.error(`JSON parse error: ${err.message}`);
        logToGPTErrorTab(prompt, raw, "Invalid JSON");
        throw new Error("Malformed OpenAI JSON");
      }

      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty OpenAI response");

      return {
        output: content,
        tokens: json.usage?.total_tokens || opts.max_tokens,
        confidence: content.length > 10 ? "high" : "low",
        source: "GPT",
      };
    } catch (err) {
      attempt++;
      if (attempt > opts.retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  return {
    output: JSON.stringify({ isReadable: true, isConfident: false }),
    tokens: 0,
    confidence: "low",
    source: "GPT",
  };
}

async function logToGPTErrorTab(prompt, errorMsg, errorType) {
  const gasUrl = "https://script.google.com/a/macros/ipsys.ai/s/AKfycbxRTWC8MNpCdsukETju2Ovhk5zvqdXHJ8RGxrg_nDa0EpmygTG6M5Nrld7V7X5UCQ3c/exec";
  const secret = process.env.GAS_SECRET;

  if (!secret) {
    console.warn("⚠️ GAS_SECRET not set — skipping GPT log");
    return;
  }

  try {
    await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: secret,
        prompt: prompt.slice(0, 500),
        errorMsg,
        errorType,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Failed to log GPT error:", err.message);
  }
}
