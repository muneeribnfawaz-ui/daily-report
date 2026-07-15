const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest/INR";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Fallback rate if API is unavailable and no cached value exists
const FALLBACK_INR_TO_SAR = 0.0428;

type CachedRate = {
  rate: number;
  fetchedAt: number;
};

let cachedRate: CachedRate | null = null;

/**
 * Fetches the latest INR → SAR exchange rate.
 * Uses an in-memory cache with a 1-hour TTL.
 * Falls back to the last cached rate (or a hardcoded fallback) on failure.
 */
export async function getINRtoSARRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL_MS) {
    return cachedRate.rate;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(EXCHANGE_RATE_API_URL, {
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }

    const data = await response.json();
    const sarRate = data?.rates?.SAR;

    if (typeof sarRate !== "number" || sarRate <= 0) {
      throw new Error("Invalid SAR rate in response");
    }

    cachedRate = { rate: sarRate, fetchedAt: Date.now() };
    return sarRate;
  } catch (error) {
    console.error("Failed to fetch exchange rate, using cached/fallback", error);
    return cachedRate?.rate ?? FALLBACK_INR_TO_SAR;
  }
}

/**
 * Converts an INR amount to SAR using the given exchange rate.
 */
export function convertINRtoSAR(amountINR: number, rate: number): number {
  return Math.round(amountINR * rate * 100) / 100;
}

/**
 * Formats a number as INR currency string.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formats a number as SAR currency string.
 */
export function formatSAR(amount: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Returns the currently cached exchange rate (or fallback) without making a network request.
 * Useful for client-side display when you don't want to trigger a fetch.
 */
export function getCachedRate(): number {
  return cachedRate?.rate ?? FALLBACK_INR_TO_SAR;
}
