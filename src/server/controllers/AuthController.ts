import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { WalletAuthMiddleware } from "../middlewares/walletAuth";
import { ResponseUtil } from "../utils/response";
import { catchAsync } from "../middlewares/errorHandler";
import { getAuth } from "../middlewares/auth";
import { tokenBlacklistService } from "../services/TokenBlacklistService";
import { AuditService } from "../services/AuditService";
import { AuditEventType } from "../entities/AuditLog";
import { logger } from "../middlewares/logger";
import { AuthMiddleware } from "../middlewares/auth";

export class AuthController {
  private userService: UserService;
  private walletAuth: WalletAuthMiddleware;
  private auditService: AuditService;
  private auth: AuthMiddleware;

  constructor() {
    this.userService = new UserService();
    this.walletAuth = new WalletAuthMiddleware(this.userService);
    this.auditService = new AuditService();
    this.auth = new AuthMiddleware(this.userService);
  }

  connect = catchAsync(async (req: Request, res: Response) => {
    const { walletAddress, signature, message, referredByUsername } = req.body;

      // Verify signature if provided
      if (signature && message) {
        const isValidSignature = await this.walletAuth.verifyWalletSignature(
          message,
          signature,
          walletAddress
        );

      if (!isValidSignature) {
        return ResponseUtil.unauthorized(res, "Invalid signature");
      }
    }

    // Find or create user
    let user = await this.userService.findByWalletAddress(walletAddress);

    if (!user) {
      user = await this.userService.createUser(walletAddress, undefined, referredByUsername);
    }

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Generate JWT token
    const token = this.auth.generateToken(user.id, user.walletAddress);

    return ResponseUtil.success(res, {
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        totalSpent: user.totalSpent,
        totalEarned: user.totalEarned,
        casesOpened: user.casesOpened,
      },
      token,
      message: "Wallet connected successfully",
    });
  });

  disconnect = catchAsync(async (req: Request, res: Response) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // If token provided, revoke it (logout)
    if (token) {
      tokenBlacklistService.revokeToken(token);

      // Audit log logout
      if (req.user?.id) {
        await this.auditService.logAuth(AuditEventType.AUTH_LOGOUT, {
          userId: req.user.id,
          walletAddress: req.user.walletAddress,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: true,
        }).catch(err => logger.error('Failed to log audit event:', err));
      }
    }

    return ResponseUtil.success(res, { 
      message: "Successfully disconnected",
      tokenRevoked: !!token,
    });
  });

  /**
   * POST /auth/logout
   * Explicit logout endpoint that revokes the current token
   */
  logout = catchAsync(async (req: Request, res: Response) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtil.error(res, 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Revoke token
    tokenBlacklistService.revokeToken(token);

    // Audit log logout
    if (req.user?.id) {
      await this.auditService.logAuth(AuditEventType.AUTH_LOGOUT, {
        userId: req.user.id,
        walletAddress: req.user.walletAddress,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
      }).catch(err => logger.error('Failed to log audit event:', err));
    }

    return ResponseUtil.success(res, { 
      message: "Successfully logged out",
    });
  });

  /**
   * GET /auth/sessions
   * Get active sessions for current user (if using session-based auth)
   */
  getSessions = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    
    // Get blacklist stats (for admin/debugging)
    const stats = tokenBlacklistService.getStats();

    return ResponseUtil.success(res, {
      message: "Session management active",
      blacklistStats: stats,
      note: "Tokens are revoked on logout. Expired tokens are automatically cleaned up.",
    });
  });

  getProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await this.userService.findById(userId);

    if (!user) {
      return ResponseUtil.notFound(res, "User not found");
    }

    return ResponseUtil.success(res, {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      email: user.email,
      tradeUrl: user.tradeUrl,
      totalSpent: user.totalSpent,
      totalEarned: user.totalEarned,
      casesOpened: user.casesOpened,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  });

  updateProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { username, email, tradeUrl } = req.body;

    // Sanitize all user inputs to prevent XSS
    const { sanitizeProfileUpdate } = require('../utils/sanitization');
    const sanitizedUpdates = sanitizeProfileUpdate({ username, email, tradeUrl });

    await this.userService.updateUser(userId, sanitizedUpdates);

    return ResponseUtil.success(res, {
      message: "Profile updated successfully",
    });
  });
}
