import Decimal from 'decimal.js';

// Type for Decimal instances
type DecimalInstance = InstanceType<typeof Decimal>;

// Export Decimal for use in other files
export { Decimal };
export type { DecimalInstance };

/**
 * Safe Math Utilities
 * 
 * Prevents integer overflow and maintains precision in financial calculations.
 * Uses Decimal.js for arbitrary precision arithmetic.
 */

// Configuration
const MAX_SAFE_AMOUNT = new Decimal('999999999999999'); // ~999 trilhões (safe for SOL/USD)
const MIN_SAFE_AMOUNT = new Decimal('-999999999999999');
const LAMPORTS_PER_SOL = new Decimal('1000000000'); // 1 billion lamports per SOL
const MAX_LAMPORTS = new Decimal('18446744073709551615'); // u64 max (Solana limit)

/**
 * Validate number is within safe range
 */
export function validateAmount(amount: number | string | DecimalInstance, fieldName: string = 'amount'): DecimalInstance {
  try {
    const decimal = new Decimal(amount);
    
    // Check for NaN or Infinity
    if (!decimal.isFinite()) {
      throw new Error(`${fieldName} must be a finite number`);
    }
    
    // Check range
    if (decimal.gt(MAX_SAFE_AMOUNT)) {
      throw new Error(`${fieldName} exceeds maximum safe value (${MAX_SAFE_AMOUNT.toString()})`);
    }
    
    if (decimal.lt(MIN_SAFE_AMOUNT)) {
      throw new Error(`${fieldName} is below minimum safe value (${MIN_SAFE_AMOUNT.toString()})`);
    }
    
    return decimal;
  } catch (error: any) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'DecimalError') {
      throw new Error(`Invalid ${fieldName}: ${error.message || 'Invalid decimal'}`);
    }
    throw error;
  }
}

/**
 * Safe multiplication (prevents overflow)
 */
export function safeMultiply(
  a: number | string | DecimalInstance,
  b: number | string | DecimalInstance,
  fieldName: string = 'result'
): DecimalInstance {
  const decimalA = validateAmount(a, 'operand A') as any;
  const decimalB = validateAmount(b, 'operand B') as any;
  
  const result = decimalA.mul(decimalB);
  
  // Check if result exceeds safe range
  if (result.gt(MAX_SAFE_AMOUNT) || result.lt(MIN_SAFE_AMOUNT)) {
    throw new Error(`${fieldName} calculation would overflow`);
  }
  
  return result;
}

/**
 * Safe division (prevents division by zero and overflow)
 */
export function safeDivide(
  a: number | string | DecimalInstance,
  b: number | string | DecimalInstance,
  fieldName: string = 'result'
): DecimalInstance {
  const decimalA = validateAmount(a, 'dividend');
  const decimalB = validateAmount(b, 'divisor');
  
  // Check division by zero
  if (decimalB.isZero()) {
    throw new Error(`${fieldName}: Division by zero`);
  }
  
  const result = decimalA.div(decimalB);
  
  // Check if result exceeds safe range
  if (result.gt(MAX_SAFE_AMOUNT) || result.lt(MIN_SAFE_AMOUNT)) {
    throw new Error(`${fieldName} calculation would overflow`);
  }
  
  return result;
}

/**
 * Safe addition (prevents overflow)
 */
export function safeAdd(
  a: number | string | DecimalInstance,
  b: number | string | DecimalInstance,
  fieldName: string = 'result'
): DecimalInstance {
  const decimalA = validateAmount(a, 'operand A') as any;
  const decimalB = validateAmount(b, 'operand B') as any;
  
  const result = decimalA.add(decimalB);
  
  // Check if result exceeds safe range
  if (result.gt(MAX_SAFE_AMOUNT) || result.lt(MIN_SAFE_AMOUNT)) {
    throw new Error(`${fieldName} calculation would overflow`);
  }
  
  return result;
}

/**
 * Safe subtraction (prevents overflow)
 */
export function safeSubtract(
  a: number | string | DecimalInstance,
  b: number | string | DecimalInstance,
  fieldName: string = 'result'
): DecimalInstance {
  const decimalA = validateAmount(a, 'minuend') as any;
  const decimalB = validateAmount(b, 'subtrahend') as any;
  
  const result = decimalA.sub(decimalB);
  
  // Check if result exceeds safe range
  if (result.gt(MAX_SAFE_AMOUNT) || result.lt(MIN_SAFE_AMOUNT)) {
    throw new Error(`${fieldName} calculation would overflow`);
  }
  
  return result;
}

/**
 * Convert SOL to lamports (with overflow protection)
 */
export function solToLamports(solAmount: number | string | DecimalInstance): string {
  const sol = validateAmount(solAmount, 'SOL amount');
  
  // Multiply by lamports per SOL
  const lamports = safeMultiply(sol, LAMPORTS_PER_SOL, 'lamports');
  
  // Check if exceeds u64 max
  if (lamports.gt(MAX_LAMPORTS)) {
    throw new Error(`Lamports amount exceeds Solana u64 maximum (${MAX_LAMPORTS.toString()})`);
  }
  
  // Round down to integer (lamports are integers)
  return lamports.floor().toString();
}

/**
 * Convert lamports to SOL (with precision)
 */
export function lamportsToSol(lamports: number | string | DecimalInstance): DecimalInstance {
  const lamportsDecimal = new Decimal(lamports);
  
  if (lamportsDecimal.lt(0)) {
    throw new Error('Lamports amount cannot be negative');
  }
  
  if (lamportsDecimal.gt(MAX_LAMPORTS)) {
    throw new Error(`Lamports amount exceeds Solana u64 maximum (${MAX_LAMPORTS.toString()})`);
  }
  
  return safeDivide(lamportsDecimal, LAMPORTS_PER_SOL, 'SOL amount');
}

/**
 * Convert USD to SOL (using exchange rate)
 */
export function usdToSol(usdAmount: number | string | DecimalInstance, solPriceUsd: number | string | DecimalInstance): DecimalInstance {
  const usd = validateAmount(usdAmount, 'USD amount');
  const solPrice = validateAmount(solPriceUsd, 'SOL price');
  
  return safeDivide(usd, solPrice, 'SOL amount');
}

/**
 * Convert SOL to USD (using exchange rate)
 */
export function solToUsd(solAmount: number | string | DecimalInstance, solPriceUsd: number | string | DecimalInstance): DecimalInstance {
  const sol = validateAmount(solAmount, 'SOL amount');
  const solPrice = validateAmount(solPriceUsd, 'SOL price');
  
  return safeMultiply(sol, solPrice, 'USD amount');
}

/**
 * Apply percentage (e.g., 85% buyback rate)
 */
export function applyPercentage(
  amount: number | string | DecimalInstance,
  percentage: number | string | DecimalInstance,
  fieldName: string = 'result'
): DecimalInstance {
  const amountDecimal = validateAmount(amount, 'base amount');
  const percentageDecimal = new Decimal(percentage);
  
  // Validate percentage is between 0 and 100
  if (percentageDecimal.lt(0) || percentageDecimal.gt(100)) {
    throw new Error('Percentage must be between 0 and 100');
  }
  
  // Convert percentage to decimal (e.g., 85% = 0.85)
  const rate = percentageDecimal.div(100);
  
  return safeMultiply(amountDecimal, rate, fieldName);
}

/**
 * Round to specific decimal places (for display/storage)
 */
export function roundToDecimals(amount: DecimalInstance, decimals: number = 2): DecimalInstance {
  return amount.toDecimalPlaces(decimals, Decimal.ROUND_DOWN);
}

/**
 * Convert Decimal to number (with validation)
 * Use this only when you need to store in database or send to client
 */
export function toNumber(amount: DecimalInstance): number {
  const num = amount.toNumber();
  
  // Check if conversion is safe
  if (!isFinite(num)) {
    throw new Error('Cannot convert to number: value is not finite');
  }
  
  return num;
}

/**
 * Check if two amounts are approximately equal (within tolerance)
 */
export function isApproximatelyEqual(
  a: number | string | DecimalInstance,
  b: number | string | DecimalInstance,
  tolerance: number = 0.01
): boolean {
  const decimalA = new Decimal(a);
  const decimalB = new Decimal(b);
  
  const decimalAInstance = validateAmount(decimalA, 'operand A') as any;
  const decimalBInstance = validateAmount(decimalB, 'operand B') as any;
  return decimalAInstance.sub(decimalBInstance).abs().lte(tolerance);
}

