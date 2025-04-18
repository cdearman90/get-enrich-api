// api/lib/openai.js v1.0.4
<<<<<<< HEAD
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
=======
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
<<<<<<< HEAD
    new winston.transports.File({ filename: "logs/enrich.log", maxsize: 5242880, maxFiles: 5 }),
=======
    new winston.transports.File({ filename: 'logs/enrich.log', maxsize: 5242880, maxFiles: 5 }),
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
    new winston.transports.Console()
  ]
});

function log(level, message, context = {}) {
  logger[level]({ message, ...context });
}

export async function callOpenAI(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  const defaults = {
    model: 'gpt-4-turbo',
    max_tokens: 50,
    temperature: 0.3,
    systemMessage: 'You are a helpful assistant.',
    retries: 2,
    timeoutMs: 9000
  };
  const opts = { ...defaults, ...options };

  if (!apiKey) {
<<<<<<< HEAD
    log("warn", "OPENAI_API_KEY is not set — returning default response", { prompt });
=======
    log('warn', 'OPENAI_API_KEY is not set — returning default response', { prompt });
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
    return {
      output: JSON.stringify({ isReadable: true, isConfident: false }),
      tokens: 0,
      confidence: 'low',
      source: 'GPT',
      error: 'Missing OPENAI_API_KEY'
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
<<<<<<< HEAD
    log("warn", "OpenAI API timeout triggered", { prompt });
=======
    log('warn', 'OpenAI API timeout triggered', { prompt });
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
    controller.abort();
  }, opts.timeoutMs);

  let attempt = 0;
  while (attempt <= opts.retries) {
    try {
<<<<<<< HEAD
      log("warn", `OpenAI [Attempt ${attempt + 1}]: ${prompt.slice(0, 80)}...`, { prompt });
=======
      log('warn', `OpenAI [Attempt ${attempt + 1}]: ${prompt.slice(0, 80)}...`, { prompt });
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
<<<<<<< HEAD
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
=======
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
        },
        body: JSON.stringify({
          model: opts.model,
          messages: [
<<<<<<< HEAD
            { role: "system", content: opts.systemMessage },
            { role: "user", content: prompt }
=======
            { role: 'system', content: opts.systemMessage },
            { role: 'user', content: prompt },
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
          ],
          max_tokens: opts.max_tokens,
          temperature: opts.temperature
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const raw = await response.text();

      if (!response.ok) {
<<<<<<< HEAD
        log("error", `OpenAI HTTP error: ${response.status}`, { prompt, raw });
        await logToGPTErrorTab(prompt, raw, `HTTP ${response.status}`);
        if (response.status >= 500 || response.status === 429) throw new Error("Retryable error");
=======
        log('error', `OpenAI HTTP error: ${response.status}`, { prompt, raw });
        await logToGPTErrorTab(prompt, raw, `HTTP ${response.status}`);
        if (response.status >= 500 || response.status === 429) throw new Error('Retryable error');
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
        throw new Error(`OpenAI Error: ${raw}`);
      }

      let json;
      try {
        json = JSON.parse(raw);
      } catch (err) {
<<<<<<< HEAD
        log("error", `JSON parse error: ${err.message}`, { prompt, raw });
        await logToGPTErrorTab(prompt, raw, "Invalid JSON");
        throw new Error("Malformed OpenAI JSON");
=======
        log('error', `JSON parse error: ${err.message}`, { prompt, raw });
        await logToGPTErrorTab(prompt, raw, 'Invalid JSON');
        throw new Error('Malformed OpenAI JSON');
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
      }

      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('Empty OpenAI response');

      return {
        output: content,
        tokens: json.usage?.total_tokens || opts.max_tokens,
<<<<<<< HEAD
        confidence: content.length > 10 ? "high" : "low",
        source: "GPT"
=======
        confidence: content.length > 10 ? 'high' : 'low',
        source: 'GPT',
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
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
<<<<<<< HEAD
    confidence: "low",
    source: "GPT"
=======
    confidence: 'low',
    source: 'GPT',
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
  };
}

async function logToGPTErrorTab(prompt, errorMsg, errorType) {
  const gasUrl = 'https://script.google.com/a/macros/ipsys.ai/s/AKfycbxRTWC8MNpCdsukETju2Ovhk5zvqdXHJ8RGxrg_nDa0EpmygTG6M5Nrld7V7X5UCQ3c/exec';
  const secret = process.env.GAS_SECRET;

  if (!secret) {
<<<<<<< HEAD
    log("warn", "GAS_SECRET not set — skipping GPT log", { prompt });
=======
    log('warn', 'GAS_SECRET not set — skipping GPT log', { prompt });
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
    return;
  }

  try {
    await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: secret,
        prompt: prompt.slice(0, 500),
        errorMsg,
        errorType,
        timestamp: new Date().toISOString()
      })
    });
  } catch (err) {
<<<<<<< HEAD
    log("error", "Failed to log GPT error", { prompt, error: err.message });
=======
    log('error', 'Failed to log GPT error', { prompt, error: err.message });
>>>>>>> 6714cd8293509cdff03ca570d9a82daeb846187b
  }
}
