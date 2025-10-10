/**
 * Utility helpers for converting between USD and SOL values.
 *
 * We infer the USD↔SOL rate using (in order of precedence):
 * 1. Explicit price information from a loot box (priceUsdc / priceSol)
 * 2. Environment configuration: SOL_PRICE_USD or USD_PER_SOL
 * 3. Default fallback of 100 USD per SOL
 */
const DEFAULT_USD_PER_SOL = Number(process.env.DEFAULT_USD_PER_SOL ?? '100');

interface PriceReference {
  priceSol?: unknown;
  priceUsdc?: unknown;
}

const ENV_USD_PER_SOL_KEYS = ['SOL_PRICE_USD', 'USD_PER_SOL'];

function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const num = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function getEnvUsdPerSol(): number | undefined {
  for (const key of ENV_USD_PER_SOL_KEYS) {
    const raw = process.env[key];
    const parsed = parseNumber(raw);
    if (parsed && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

export function deriveUsdPerSol(reference?: PriceReference): number | undefined {
  if (!reference) {
    return undefined;
  }

  const priceSol = parseNumber(reference.priceSol);
  const priceUsdc = parseNumber(reference.priceUsdc);

  if (priceSol && priceSol > 0 && priceUsdc && priceUsdc > 0) {
    return priceUsdc / priceSol;
  }

  return undefined;
}

export function resolveUsdPerSol(reference?: PriceReference, fallback?: number): number {
  const derived = deriveUsdPerSol(reference);
  if (derived && derived > 0) {
    return derived;
  }

  const envRate = getEnvUsdPerSol();
  if (envRate && envRate > 0) {
    return envRate;
  }

  if (fallback && fallback > 0) {
    return fallback;
  }

  return DEFAULT_USD_PER_SOL > 0 ? DEFAULT_USD_PER_SOL : 100;
}

export function convertUsdToSol(
  usdAmount: number,
  reference?: PriceReference,
  fallback?: number
): number {
  if (!usdAmount || usdAmount <= 0) {
    return 0;
  }

  const usdPerSol = resolveUsdPerSol(reference, fallback);
  return usdAmount / usdPerSol;
}

