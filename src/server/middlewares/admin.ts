import { Request, Response, NextFunction } from "express";
import { constantTimeAdminCheck, randomDelay } from "../utils/timingAttackProtection";

// List of admin wallet addresses (load from environment)
// Normalize: split by comma, trim whitespace, filter empty strings
const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || "")
  .split(",")
  .map((addr: string) => addr.trim())
  .filter((addr: string) => addr.length > 0);

export interface AdminRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    isAdmin?: boolean;
  };
}

/**
 * Middleware to check if user is an admin
 * Must be used after authMiddleware
 * Uses constant-time comparison to prevent timing attacks
 */
export async function adminMiddleware(
  req: AdminRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    // Check if user wallet is in admin list (constant-time to prevent timing attacks)
    const isAdmin = constantTimeAdminCheck(req.user.walletAddress, ADMIN_WALLETS);

    // Add random delay to mask timing differences
    await randomDelay(20, 80); // 20-80ms delay

    if (!isAdmin) {
      // Log failed admin attempt for debugging (in dev only)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Admin Middleware] Access denied for wallet: ${req.user.walletAddress}`);
        console.log(`[Admin Middleware] Configured admin wallets:`, ADMIN_WALLETS);
      }
      return res.status(403).json({
        success: false,
        error: "Admin access required",
      });
    }

    // Mark user as admin
    req.user.isAdmin = true;

    return next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Export current admin wallets (for debugging - admin only)
 */
export function getAdminWallets(): string[] {
  return ADMIN_WALLETS;
}

if (ADMIN_WALLETS.length === 0) {
  console.warn(
    `⚠️  Admin middleware initialized with NO admin wallets! Set ADMIN_WALLETS env var.`
  );
} else {
  console.log(
    `✅ Admin middleware initialized with ${ADMIN_WALLETS.length} admin wallet(s):`
  );
  ADMIN_WALLETS.forEach((wallet, index) => {
    console.log(`   ${index + 1}. ${wallet}`);
  });
}
