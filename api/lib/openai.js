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
 * @param {Object} params - Parameters for the API call
 * @param {string} params.prompt - The prompt to send to OpenAI
 * @param {string} [params.model="gpt-4-turbo"] - The model to use
 * @param {number} [params.max_tokens=50] - Maximum tokens
 * @param {number} [params.temperature=0.3] - Temperature
 * @param {string} [params.systemMessage="You are a helpful assistant."] - System message
 * @param {number} [params.retries=3] - Number of retries
 * @param {number} [params.timeoutMs=45000] - Timeout in milliseconds
 * @param {number} [params.backoffMs=2000] - Base backoff delay in milliseconds
 * @returns {Object} - Response object with output, tokens, confidence, source, and error (if any)
 */
export async function callOpenAI({
  prompt,
  model = "gpt-4-turbo",
  max_tokens = 50,
  temperature = 0.3,
  systemMessage = "You are a helpful assistant.",
  retries = 3,
  timeoutMs = 45000,
  backoffMs = 2000
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  // Validate prompt
  if (typeof prompt !== "string") {
    log("error", `Invalid prompt type: ${typeof prompt}, value: ${JSON.stringify(prompt)}`, {});
    return {
      output: JSON.stringify({ isReadable: true, isConfident: false }),
      tokens: 0,
      confidence: "low",
      source: "GPT",
      error: `Invalid prompt type: ${typeof prompt}`
    };
  }

  if (!apiKey) {
    log("warn", "OPENAI_API_KEY is not set — returning default response", { prompt: prompt.slice(0, 80) });
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
    log("warn", "OpenAI API timeout triggered", { prompt: prompt.slice(0, 80) });
    controller.abort();
  }, timeoutMs);

  let attempt = 0;
  while (attempt <= retries) {
    try {
      log("info", `OpenAI [Attempt ${attempt + 1}]: ${prompt.slice(0, 80)}...`, { prompt: prompt.slice(0, 500) });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt }
          ],
          max_tokens,
          temperature
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const raw = await response.text();

      if (!response.ok) {
        log("error", `OpenAI HTTP error: ${response.status}`, { prompt: prompt.slice(0, 80), raw });
        await logToGPTErrorTab(prompt, raw, `HTTP ${response.status}`);
        if (response.status >= 500 || response.status === 429) throw new Error("Retryable error");
        throw new Error(`OpenAI Error: ${raw}`);
      }

      let json;
      try {
        json = JSON.parse(raw);
      } catch (err) {
        log("error", `JSON parse error: ${err.message}`, { prompt: prompt.slice(0, 80), raw });
        await logToGPTErrorTab(prompt, raw, "Invalid JSON");
        throw new Error("Malformed OpenAI JSON");
      }

      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty OpenAI response");

      return {
        output: content,
        tokens: json.usage?.total_tokens || max_tokens,
        confidence: content.length > 10 ? "high" : "low",
        source: "GPT"
      };
    } catch (err) {
      clearTimeout(timeoutId);
      attempt++;
      if (attempt > retries) {
        log("error", `OpenAI failed after ${retries + 1} attempts: ${err.message}`, { prompt: prompt.slice(0, 80) });
        return {
          output: JSON.stringify({ isReadable: true, isConfident: false }),
          tokens: 0,
          confidence: "low",
          source: "GPT",
          error: err.message
        };
      }
      // Exponential backoff: 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)));
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
    log("warn", "GAS_SECRET not set — skipping GPT log", { prompt: prompt.slice(0, 80) });
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
    log("error", "Failed to log GPT error", { prompt: prompt.slice(0, 80), error: err.message });
  }
}
