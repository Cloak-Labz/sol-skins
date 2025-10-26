import { Request, Response, NextFunction } from 'express';

/**
 * Simple auth middleware export for routes
 * This should be initialized properly in your app setup
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // For development/testing, you can skip auth
  // TODO: Replace with proper auth from getAuth().protect

  // Mock user for testing (replace with real auth)
  req.user = {
    id: 'admin-user',
    walletAddress: process.env.ADMIN_WALLET_ADDRESS || 'DEV_ADMIN_WALLET',
  };

  next();
}
