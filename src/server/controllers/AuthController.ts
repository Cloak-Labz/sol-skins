import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { WalletAuthMiddleware } from "../middlewares/walletAuth";
import { ResponseUtil } from "../utils/response";
import { catchAsync } from "../middlewares/errorHandler";

export class AuthController {
  private userService: UserService;
  private walletAuth: WalletAuthMiddleware;

  constructor() {
    this.userService = new UserService();
    this.walletAuth = new WalletAuthMiddleware(this.userService);
  }

  connect = catchAsync(async (req: Request, res: Response) => {
    const { walletAddress, signature, message } = req.body;

    // Verify signature if provided
    if (signature && message) {
      const isValidSignature = this.walletAuth.verifyWalletSignature(
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
      user = await this.userService.createUser(walletAddress);
    }

    // Update last login
    await this.userService.updateLastLogin(user.id);

    return ResponseUtil.success(res, {
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        totalSpent: user.totalSpent,
        totalEarned: user.totalEarned,
        casesOpened: user.casesOpened,
      },
      message: "Wallet connected successfully",
    });
  });

  disconnect = catchAsync(async (req: Request, res: Response) => {
    // For wallet-based auth, we just return success
    // The frontend will handle clearing the wallet connection
    return ResponseUtil.success(res, { message: "Successfully disconnected" });
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

    await this.userService.updateUser(userId, { username, email, tradeUrl });

    return ResponseUtil.success(res, {
      message: "Profile updated successfully",
    });
  });
}
