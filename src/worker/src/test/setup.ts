import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/loot_test',
    },
  },
});

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  // Clean database before each test
  await prisma.userSkin.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.skin.deleteMany();
  await prisma.lootBox.deleteMany();
  await prisma.user.deleteMany();
  await prisma.merkleSnapshot.deleteMany();
  await prisma.treasuryLedger.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
