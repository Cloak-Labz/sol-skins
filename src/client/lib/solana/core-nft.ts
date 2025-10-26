import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  generateSigner,
  PublicKey as UmiPublicKey,
} from "@metaplex-foundation/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { create, fetchAsset } from "@metaplex-foundation/mpl-core";
import { Connection, PublicKey } from "@solana/web3.js";
import type { WalletAdapter } from "@solana/wallet-adapter-base";

export interface MintCoreNftParams {
  name: string;
  uri: string;
  walletAdapter: WalletAdapter; // use wallet adapter identity in browser
  connection: Connection;
  collection?: PublicKey;
}

export interface MintCoreNftResult {
  assetAddress: string;
  signature: string;
}

/**
 * Mint a Core NFT using Metaplex Core
 * Based on integration-flow.test.ts pattern
 */
export async function mintCoreNft(
  params: MintCoreNftParams
): Promise<MintCoreNftResult> {
  const { name, uri, walletAdapter, connection, collection } = params;

  // Create UMI instance (prefer provided connection endpoint; fallback to devnet)
  // Prefer explicit env, then wallet connection endpoint; fallback to mainnet-beta (Core program is deployed there)
  const rpcEndpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC ||
    (connection as any)?.rpcEndpoint ||
    (connection as any)?._rpcEndpoint ||
    "https://api.mainnet-beta.solana.com";
  const umi = createUmi(rpcEndpoint);

  // Use wallet adapter identity (browser wallet signing)
  umi.use(walletAdapterIdentity(walletAdapter));

  if (!walletAdapter?.publicKey) {
    throw new Error("Wallet adapter not connected");
  }

  // Generate new asset
  const asset = generateSigner(umi);

  console.log("Minting Core NFT:", {
    name,
    uri,
    asset: asset.publicKey,
    collection: collection?.toBase58() || "none",
  });

  // Create the Core NFT
  let result;
  try {
    result = await create(umi, {
      asset,
      name,
      uri,
      collection: collection
        ? { publicKey: collection.toBase58() as UmiPublicKey, verified: false }
        : undefined,
    }).sendAndConfirm(umi);
  } catch (e: any) {
    // Surface simulation logs when available
    const logs = e?.logs || e?.getLogs?.();
    console.error("Core NFT mint failed", { message: e?.message, logs });
    throw e;
  }

  const signature = Buffer.from(result.signature).toString("base64");

  console.log("Core NFT minted successfully:", {
    asset: asset.publicKey,
    signature,
  });

  return {
    assetAddress: asset.publicKey.toString(),
    signature,
  };
}

/**
 * Fetch Core NFT asset data
 */
export async function fetchCoreNft(
  assetAddress: string,
  connection: Connection
): Promise<any> {
  const umi = createUmi(connection.rpcEndpoint);
  const asset = await fetchAsset(umi, assetAddress as UmiPublicKey);
  return asset;
}
