import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { AuthMiddleware } from '../middlewares/auth';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class AuthController {
  private userService: UserService;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.userService = new UserService();
    this.authMiddleware = new AuthMiddleware(this.userService);
  }

  connect = catchAsync(async (req: Request, res: Response) => {
    const { walletAddress, signature, message } = req.body;

    // Verify signature
    const isValidSignature = await this.authMiddleware.verifyWalletSignature(
      walletAddress,
      signature,
      message
    );

    if (!isValidSignature) {
      return ResponseUtil.unauthorized(res, 'Invalid signature');
    }

    // Find or create user
    let user = await this.userService.findByWalletAddress(walletAddress);
    
    if (!user) {
      user = await this.userService.createUser(walletAddress);
    }

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Generate session token
    const sessionToken = this.authMiddleware.generateToken(user.id, walletAddress);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create session record
    await this.userService.createSession(user.id, walletAddress, sessionToken, expiresAt);

    ResponseUtil.success(res, {
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        totalSpent: user.totalSpent,
        totalEarned: user.totalEarned,
        casesOpened: user.casesOpened,
      },
      sessionToken,
      expiresAt,
    });
  });

  disconnect = catchAsync(async (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = this.authMiddleware.verifyToken(token);
      if (decoded?.userId) {
        await this.userService.deactivateAllUserSessions(decoded.userId);
      }
    }

    ResponseUtil.success(res, { message: 'Successfully disconnected' });
  });

  getProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await this.userService.findById(userId);

    if (!user) {
      return ResponseUtil.notFound(res, 'User not found');
    }

    ResponseUtil.success(res, {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      email: user.email,
      totalSpent: user.totalSpent,
      totalEarned: user.totalEarned,
      casesOpened: user.casesOpened,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  });

  updateProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { username, email } = req.body;

    await this.userService.updateUser(userId, { username, email });

    ResponseUtil.success(res, { message: 'Profile updated successfully' });
  });
} 