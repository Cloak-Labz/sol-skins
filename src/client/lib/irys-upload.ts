import { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { createHelia } from "helia"; // placeholder if needed later

// Lightweight Irys client using window wallet for signing
// We avoid server keys; uploads are paid by the connected wallet

export interface IrysUploadResult {
  id: string; // arweave tx id
  uri: string; // https://arweave.net/<id>
}

export function canIrysUpload(wallet: WalletContextState): boolean {
  return !!wallet?.publicKey && !!wallet?.signMessage;
}

export async function uploadJsonToIrys(wallet: WalletContextState, json: any): Promise<IrysUploadResult> {
  const node = process.env.NEXT_PUBLIC_IRYS_NODE || "https://node1.irys.xyz";
  const token = process.env.NEXT_PUBLIC_IRYS_TOKEN || "SOL";
  if (!wallet.publicKey) throw new Error("Connect wallet");
  if (!wallet.signMessage) throw new Error("Wallet does not support message signing. Enable it in your wallet or use a wallet that supports signMessage.");

  // Minimal client: send unsigned JSON to node; node will respond with a payable request we sign
  // In production, use @irys/sdk for full flow. Here we assume node accepts signed owner message.
  const payload = new TextEncoder().encode(JSON.stringify(json));
  const owner = wallet.publicKey.toBase58();
  const message = new TextEncoder().encode(`irys-upload:${owner}:${payload.length}`);
  const signature = await wallet.signMessage!(message);

  const res = await fetch(`${node}/bundles/${token}/tx`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream", "X-Owner": owner, "X-Signature": Buffer.from(signature).toString("base64") },
    body: payload,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Irys upload failed: ${res.status} ${text}`);
  }

  const out = await res.json();
  const id = out?.id || out?.txId || out?.transactionId;
  if (!id) throw new Error("Invalid Irys response (missing id)");
  return { id, uri: `https://arweave.net/${id}` };
}

export async function uploadJsonBatchToIrys(wallet: WalletContextState, jsonList: any[]): Promise<string[]> {
  const uris: string[] = [];
  for (const j of jsonList) {
    const r = await uploadJsonToIrys(wallet, j);
    uris.push(r.uri);
  }
  return uris;
}


