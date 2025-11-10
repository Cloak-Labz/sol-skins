import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

async function main() {
  const wallet = process.argv[2];
  if (!wallet) {
    console.error('Usage: tsx scripts/check-user-created-at.ts <WALLET_ADDRESS>');
    process.exit(1);
  }

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { walletAddress: wallet } });
    if (!user) {
      console.log(JSON.stringify({ found: false }));
      process.exit(0);
    }
    console.log(JSON.stringify({ found: true, id: user.id, wallet: user.walletAddress, createdAt: user.createdAt, updatedAt: user.updatedAt }));
  } catch (err) {
    console.error('Error:', err);
    process.exit(2);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main();


