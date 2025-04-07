// api/lib/openai.js
export async function callOpenAI(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("❌ OPENAI_API_KEY is not set in environment variables");
  }

  const defaultOptions = {
    model: "gpt-4-turbo",
    max_tokens: 50,
    temperature: 0.3,
    systemMessage: "You are a helpful assistant.",
  };
  const finalOptions = { ...defaultOptions, ...options };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: finalOptions.model,
        messages: [
          { role: "system", content: finalOptions.systemMessage },
          { role: "user", content: prompt },
        ],
        max_tokens: finalOptions.max_tokens,
        temperature: finalOptions.temperature,
      }),
    });

    const status = response.status;
    const text = await response.text();

    // ✅ Log any non-2xx errors explicitly
    if (!response.ok) {
      console.error(`❌ OpenAI Error (HTTP ${status}): ${text}`);
      throw new Error(`OpenAI API returned HTTP ${status}`);
    }

    // ✅ Parse response safely
    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonErr) {
      console.error(`❌ Failed to parse OpenAI response JSON: ${jsonErr.message}`);
      throw new Error("Invalid JSON from OpenAI");
    }

    const output = data.choices?.[0]?.message?.content?.trim();
    if (!output || typeof output !== "string") {
      throw new Error("OpenAI returned empty or malformed content");
    }

    return output;
  } catch (err) {
    console.error(`🔥 callOpenAI() failed: ${err.message}`);
    throw err; // Bubble up so you can handle fallback properly
  }
}
