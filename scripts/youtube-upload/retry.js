const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function isRetryable(error) {
  for (let current = error; current; current = current.cause) {
    if (RETRYABLE_CODES.has(current.code)) return true;
    if (/fetch failed|network error|socket hang up/i.test(current.message || "")) return true;
    const status = current.status || current.statusCode || current.response?.status;
    if (status === 429 || status >= 500) return true;
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryNetwork(operation, label, maxAttempts = 5) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error) || attempt >= maxAttempts) throw error;
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 16000);
      console.warn(`  Network error during ${label} (attempt ${attempt}/${maxAttempts}); retrying in ${delayMs / 1000}s: ${error.message}`);
      await sleep(delayMs);
    }
  }
}

module.exports = { retryNetwork };
