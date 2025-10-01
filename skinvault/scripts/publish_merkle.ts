import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Skinvault } from "../target/types/skinvault";
import * as crypto from "crypto";
import * as fs from "fs";

// Configuration
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const WALLET_PATH = process.env.WALLET_PATH || "~/.config/solana/id.json";
const PROGRAM_ID = "SKINVault1111111111111111111111111111111111";

interface InventoryItem {
  id: string;
  name: string;
  rarity: string;
  metadata: string;
}

class MerkleTreeBuilder {
  private leaves: Buffer[] = [];
  private items: InventoryItem[] = [];

  addItem(item: InventoryItem): void {
    this.items.push(item);
    const leaf = this.createLeaf(item.id, item.metadata);
    this.leaves.push(leaf);
  }

  private createLeaf(itemId: string, metadata: string): Buffer {
    const data = `${itemId}|${metadata}`;
    return crypto.createHash("sha256").update(data).digest();
  }

  buildTree(): { root: Buffer; proofs: { [itemId: string]: Buffer[] } } {
    if (this.leaves.length === 0) {
      throw new Error("No items to build tree");
    }

    if (this.leaves.length === 1) {
      return {
        root: this.leaves[0],
        proofs: { [this.items[0].id]: [] },
      };
    }

    let currentLevel = [...this.leaves];
    const allProofs: { [itemId: string]: Buffer[] } = {};

    // Initialize proof arrays
    this.items.forEach((item) => {
      allProofs[item.id] = [];
    });

    while (currentLevel.length > 1) {
      const nextLevel: Buffer[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        // Add sibling to proofs
        for (let j = 0; j < this.leaves.length; j++) {
          const leafIndex = this.findLeafIndex(currentLevel, this.leaves[j]);
          if (leafIndex === i) {
            allProofs[this.items[j].id].push(right);
          } else if (leafIndex === i + 1) {
            allProofs[this.items[j].id].push(left);
          }
        }

        // Create parent (smaller hash first)
        const [a, b] =
          Buffer.compare(left, right) <= 0 ? [left, right] : [right, left];
        const parent = crypto
          .createHash("sha256")
          .update(Buffer.concat([a, b]))
          .digest();
        nextLevel.push(parent);
      }

      currentLevel = nextLevel;
    }

    return { root: currentLevel[0], proofs: allProofs };
  }

  private findLeafIndex(level: Buffer[], leaf: Buffer): number {
    return level.findIndex((node) => Buffer.compare(node, leaf) === 0);
  }

  getItems(): InventoryItem[] {
    return [...this.items];
  }
}

async function loadInventoryFromFile(
  filePath: string
): Promise<InventoryItem[]> {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading inventory file:", error);
    throw error;
  }
}

function generateSampleInventory(): InventoryItem[] {
  return [
    {
      id: "weapon_ak47_redline",
      name: "AK-47 | Redline",
      rarity: "classified",
      metadata: "https://example.com/metadata/ak47_redline.json",
    },
    {
      id: "weapon_awp_dragonlore",
      name: "AWP | Dragon Lore",
      rarity: "covert",
      metadata: "https://example.com/metadata/awp_dragonlore.json",
    },
    {
      id: "knife_karambit_fade",
      name: "★ Karambit | Fade",
      rarity: "rare_special",
      metadata: "https://example.com/metadata/karambit_fade.json",
    },
    {
      id: "gloves_specialist_crimson",
      name: "★ Specialist Gloves | Crimson Kimono",
      rarity: "rare_special",
      metadata: "https://example.com/metadata/gloves_crimson.json",
    },
    {
      id: "weapon_m4a4_howl",
      name: "M4A4 | Howl",
      rarity: "contraband",
      metadata: "https://example.com/metadata/m4a4_howl.json",
    },
    {
      id: "weapon_glock_fade",
      name: "Glock-18 | Fade",
      rarity: "restricted",
      metadata: "https://example.com/metadata/glock_fade.json",
    },
    {
      id: "weapon_usp_kill_confirmed",
      name: "USP-S | Kill Confirmed",
      rarity: "covert",
      metadata: "https://example.com/metadata/usp_kill_confirmed.json",
    },
    {
      id: "weapon_deagle_blaze",
      name: "Desert Eagle | Blaze",
      rarity: "restricted",
      metadata: "https://example.com/metadata/deagle_blaze.json",
    },
  ];
}

async function publishMerkleRoot(
  program: Program<Skinvault>,
  authority: Keypair,
  batchId: number,
  merkleRoot: Buffer,
  snapshotTime: number,
  totalItems: number
): Promise<string> {
  const [globalPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("skinvault"), authority.publicKey.toBuffer()],
    program.programId
  );

  const [batchPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("batch"), Buffer.from(batchId.toString().padStart(8, "0"))],
    program.programId
  );

  const tx = await program.methods
    .publishMerkleRoot(
      new anchor.BN(batchId),
      Array.from(merkleRoot),
      new anchor.BN(snapshotTime),
      new anchor.BN(totalItems)
    )
    .accounts({
      global: globalPda,
      batch: batchPda,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  return tx;
}

async function main() {
  console.log("🌳 Merkle Tree Publisher");
  console.log("========================");

  // Setup connection and program
  const connection = new anchor.web3.Connection(RPC_URL);
  const wallet = anchor.Wallet.local();
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const programId = new PublicKey(PROGRAM_ID);
  const program = new Program<Skinvault>(
    JSON.parse(fs.readFileSync("target/idl/skinvault.json", "utf8")),
    programId,
    provider
  );

  const authority = wallet.payer;
  console.log(`👤 Authority: ${authority.publicKey.toString()}`);

  // Load or generate inventory
  let inventory: InventoryItem[];
  const inventoryFile = process.argv[2];

  if (inventoryFile && fs.existsSync(inventoryFile)) {
    console.log(`📁 Loading inventory from: ${inventoryFile}`);
    inventory = await loadInventoryFromFile(inventoryFile);
  } else {
    console.log("📦 Generating sample inventory");
    inventory = generateSampleInventory();
  }

  console.log(`📊 Total items: ${inventory.length}`);

  // Build Merkle tree
  const treeBuilder = new MerkleTreeBuilder();
  inventory.forEach((item) => treeBuilder.addItem(item));

  const { root, proofs } = treeBuilder.buildTree();
  const currentTime = Math.floor(Date.now() / 1000);
  const batchId = Date.now(); // Use timestamp as batch ID

  console.log(`🌳 Merkle root: ${root.toString("hex")}`);
  console.log(`🆔 Batch ID: ${batchId}`);

  // Publish to chain
  try {
    const signature = await publishMerkleRoot(
      program,
      authority,
      batchId,
      root,
      currentTime,
      inventory.length
    );

    console.log(`✅ Published successfully!`);
    console.log(`📝 Transaction: ${signature}`);
    console.log(
      `🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );

    // Save batch info to file
    const batchInfo = {
      batchId,
      merkleRoot: root.toString("hex"),
      snapshotTime: currentTime,
      totalItems: inventory.length,
      items: inventory,
      proofs: Object.fromEntries(
        Object.entries(proofs).map(([id, proof]) => [
          id,
          proof.map((p) => p.toString("hex")),
        ])
      ),
      transaction: signature,
    };

    const outputFile = `batch_${batchId}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(batchInfo, null, 2));
    console.log(`💾 Batch info saved to: ${outputFile}`);
  } catch (error) {
    console.error("❌ Failed to publish merkle root:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MerkleTreeBuilder, publishMerkleRoot, generateSampleInventory };
