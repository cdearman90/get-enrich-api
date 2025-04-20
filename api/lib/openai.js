// api/lib/openai.js v1.0.4

import winston from "winston";

const isProd = process.env.NODE_ENV === "production";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: isProd
    ? [new winston.transports.Console()]
    : [
        new winston.transports.File({
          filename: "logs/enrich.log",
          maxsize: 5242880,
          maxFiles: 5
        }),
        new winston.transports.Console()
      ]
});


/**
 * Logs messages with Winston
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
function log(level, message, context = {}) {
  logger[level]({ message, ...context });
}

/**
 * Calls the OpenAI API with retries and timeout
 * @param {string} prompt - The prompt to send to OpenAI
 * @param {Object} options - Options for the API call
 * @returns {Object} - Response object with output, tokens, confidence, source, and error (if any)
 */
export async function callOpenAI(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  const defaults = {
    model: "gpt-4-turbo",
    max_tokens: 50,
    temperature: 0.3,
    systemMessage: "You are a helpful assistant.",
    retries: 2,
    timeoutMs: 9000
  };
  const opts = { ...defaults, ...options };

  if (!apiKey) {
    log("warn", "OPENAI_API_KEY is not set — returning default response", { prompt });
    return {
      output: JSON.stringify({ isReadable: true, isConfident: false }),
      tokens: 0,
      confidence: "low",
      source: "GPT",
      error: "Missing OPENAI_API_KEY"
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    log("warn", "OpenAI API timeout triggered", { prompt });
    controller.abort();
  }, opts.timeoutMs);

  let attempt = 0;
  while (attempt <= opts.retries) {
    try {
      log("warn", `OpenAI [Attempt ${attempt + 1}]: ${prompt.slice(0, 80)}...`, { prompt });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: opts.model,
          messages: [
            { role: "system", content: opts.systemMessage },
            { role: "user", content: prompt }
          ],
          max_tokens: opts.max_tokens,
          temperature: opts.temperature
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const raw = await response.text();

      if (!response.ok) {
        log("error", `OpenAI HTTP error: ${response.status}`, { prompt, raw });
        await logToGPTErrorTab(prompt, raw, `HTTP ${response.status}`);
        if (response.status >= 500 || response.status === 429) throw new Error("Retryable error");
        throw new Error(`OpenAI Error: ${raw}`);
      }

      let json;
      try {
        json = JSON.parse(raw);
      } catch (err) {
        log("error", `JSON parse error: ${err.message}`, { prompt, raw });
        await logToGPTErrorTab(prompt, raw, "Invalid JSON");
        throw new Error("Malformed OpenAI JSON");
      }

      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty OpenAI response");

      return {
        output: content,
        tokens: json.usage?.total_tokens || opts.max_tokens,
        confidence: content.length > 10 ? "high" : "low",
        source: "GPT"
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
    source: "GPT"
  };
}

/**
 * Logs OpenAI errors to a Google Apps Script endpoint
 * @param {string} prompt - The prompt that caused the error
 * @param {string} errorMsg - The error message
 * @param {string} errorType - The type of error
 */
async function logToGPTErrorTab(prompt, errorMsg, errorType) {
  const gasUrl = "https://script.google.com/a/macros/ipsys.ai/s/AKfycbxRTWC8MNpCdsukETju2Ovhk5zvqdXHJ8RGxrg_nDa0EpmygTG6M5Nrld7V7X5UCQ3c/exec";
  const secret = process.env.GAS_SECRET;

  if (!secret) {
    log("warn", "GAS_SECRET not set — skipping GPT log", { prompt });
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
        timestamp: new Date().toISOString()
      })
    });
  } catch (err) {
    log("error", "Failed to log GPT error", { prompt, error: err.message });
  }
}
