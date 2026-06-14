/**
 * Fixed exchange rates used at import time.
 * Stored here so every import is reproducible.
 * Rate source: RBI reference rate, documented in DECISIONS.md.
 *
 * Interview: "why fixed?" — external API adds a network failure mode,
 * makes imports non-reproducible, and the assignment says document it.
 * A fixed rate with documentation is honest and explainable.
 */
const FIXED_RATES = {
  USD: 83.5,
  EUR: 90.2,
  GBP: 105.8,
  INR: 1
}

function convertToInr(amount, currency) {
  const cur = (currency || 'INR').toUpperCase().trim()
  const rate = FIXED_RATES[cur]

  if (!rate) {
    return {
      success: false,
      error: `Unknown currency: ${cur}`
    }
  }

  return {
    success:       true,
    amountInr:     +(amount * rate).toFixed(2),
    fxRate:        rate,
    currency:      cur
  }
}

export { convertToInr, FIXED_RATES }