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
    retries: 2,
    timeoutMs: 9000,
  };
  const finalOptions = { ...defaultOptions, ...options };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeoutMs);

  let attempt = 0;
  while (attempt <= finalOptions.retries) {
    try {
      console.log(`📡 [Attempt ${attempt + 1}/${finalOptions.retries + 1}] Calling OpenAI: ${finalOptions.model} | Prompt: ${prompt.slice(0, 80)}...`);

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const status = response.status;
      const text = await response.text();

      if (!response.ok) {
        const errorMsg = `❌ OpenAI API error (HTTP ${status}): ${text}`;
        console.error(errorMsg);
        logToGPTErrorTab(prompt, errorMsg, status);
        if (status === 429 || status >= 500) throw new Error(`Retryable error: HTTP ${status}`);
        throw new Error(`OpenAI API returned HTTP ${status}`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        const errorMsg = `❌ Failed to parse OpenAI response JSON: ${jsonErr.message}`;
        console.error(errorMsg);
        logToGPTErrorTab(prompt, errorMsg, "JSON_PARSE_ERROR");
        throw new Error("Invalid JSON from OpenAI");
      }

      const output = data.choices?.[0]?.message?.content?.trim();
      if (!output || typeof output !== "string") {
        const errorMsg = "❌ OpenAI returned empty or malformed content";
        console.error(errorMsg);
        logToGPTErrorTab(prompt, errorMsg, "MALFORMED_OUTPUT");
        throw new Error(errorMsg);
      }

      if (output.length >= finalOptions.max_tokens - 5) {
        console.warn(`⚠️ Output near max_tokens limit (${output.length}/${finalOptions.max_tokens})`);
      }

      return {
        output,
        tokensUsed: data.usage?.total_tokens || finalOptions.max_tokens,
        confidence: output.length > 10 ? "high" : "low",
        source: "GPT"
      };
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(`🔥 callOpenAI() failed: ${err.message}`);
      
      if (err.name === "AbortError") {
        logToGPTErrorTab(prompt, "Request timed out after 9s", "TIMEOUT");
        throw new Error("OpenAI request timed out");
      }

      if (attempt < finalOptions.retries && (err.message.includes("Retryable") || err.name === "AbortError")) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        continue;
      }
      logToGPTErrorTab(prompt, err.message, "GENERIC_ERROR");
      throw err;
    }
  }
}

function logToGPTErrorTab(prompt, errorMsg, errorType) {
  console.log(`[GPT Error Log] Prompt: ${prompt} | Error: ${errorMsg} | Type: ${errorType}`);
  // TODO: Integrate with Google Apps Script to append to "GPT Error Log" tab
}
