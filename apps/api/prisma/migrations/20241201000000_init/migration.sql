-- CreateEnum
CREATE TYPE "SkinRarity" AS ENUM ('common', 'rare', 'epic', 'legendary', 'mythic');

-- CreateEnum
CREATE TYPE "SkinStatus" AS ENUM ('available', 'reserved', 'assigned', 'returned', 'burned', 'back_to_pool');

-- CreateEnum
CREATE TYPE "UserSkinStatus" AS ENUM ('owned', 'burned', 'buybacked');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('open_box', 'buyback', 'payout');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'success', 'failed');

-- CreateEnum
CREATE TYPE "TreasuryTxType" AS ENUM ('deposit', 'buyback', 'fee', 'withdraw');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loot_boxes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loot_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "SkinRarity" NOT NULL,
    "marketCategory" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "priceRef" DECIMAL(10,2) NOT NULL,
    "status" "SkinStatus" NOT NULL DEFAULT 'available',
    "inventoryRef" TEXT NOT NULL,
    "assignedNft" TEXT,
    "lootBoxId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skinId" TEXT NOT NULL,
    "nftMint" TEXT NOT NULL,
    "status" "UserSkinStatus" NOT NULL DEFAULT 'owned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lootBoxId" TEXT NOT NULL,
    "skinId" TEXT,
    "type" "TransactionType" NOT NULL,
    "txSignature" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merkle_snapshots" (
    "id" TEXT NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatorSig" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL,

    CONSTRAINT "merkle_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "nftMint" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "randomness" TEXT NOT NULL,
    "proof" JSONB NOT NULL,
    "backendSig" TEXT NOT NULL,
    "txSignature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "skinId" TEXT NOT NULL,
    "merkleSnapshotId" TEXT,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_ledger" (
    "id" TEXT NOT NULL,
    "txType" "TreasuryTxType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "txRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "user_skins_nftMint_key" ON "user_skins"("nftMint");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_nftMint_key" ON "assignments"("nftMint");

-- CreateIndex
CREATE INDEX "skins_status_idx" ON "skins"("status");

-- CreateIndex
CREATE INDEX "user_skins_userId_idx" ON "user_skins"("userId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "assignments_nftMint_idx" ON "assignments"("nftMint");

-- AddForeignKey
ALTER TABLE "skins" ADD CONSTRAINT "skins_lootBoxId_fkey" FOREIGN KEY ("lootBoxId") REFERENCES "loot_boxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skins" ADD CONSTRAINT "user_skins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skins" ADD CONSTRAINT "user_skins_skinId_fkey" FOREIGN KEY ("skinId") REFERENCES "skins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_lootBoxId_fkey" FOREIGN KEY ("lootBoxId") REFERENCES "loot_boxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_skinId_fkey" FOREIGN KEY ("skinId") REFERENCES "skins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_skinId_fkey" FOREIGN KEY ("skinId") REFERENCES "skins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_merkleSnapshotId_fkey" FOREIGN KEY ("merkleSnapshotId") REFERENCES "merkle_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
