import { Request, Response, NextFunction } from "express";

// List of admin wallet addresses (load from environment)
const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || "")
  .split(",")
  .filter(Boolean);

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
 */
export function adminMiddleware(
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

    // Check if user wallet is in admin list
    const isAdmin = ADMIN_WALLETS.includes(req.user.walletAddress);

    if (!isAdmin) {
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

console.log(
  `✅ Admin middleware initialized with ${ADMIN_WALLETS.length} admin wallet(s)`
);
