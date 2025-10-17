"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  useWallet,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { mintCoreNft } from "@/lib/solana/core-nft";
// import { getWalrusClient } from "@/lib/walrus/upload";
// import { uploadJsonToIrys } from "@/lib/irys-upload";
// import { irysService } from "@/lib/services/irys.service";
import { metadataService } from "@/lib/services/metadata.service";

interface MintedNFT {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  metadataUri?: string;
  rarity?: string;
  attributes?: Record<string, any>;
  createdAt: number;
  mintedAsset?: string;
  mintedAt?: number;
  mintTx?: string;
}

export default function AdminInventoryPage() {
  const walletCtx = useWallet();
  const { connected, publicKey } = walletCtx;
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [inventory, setInventory] = useState<MintedNFT[]>([]);

  // Mint form
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [nftImageUrl, setNftImageUrl] = useState("");
  const [nftRarity, setNftRarity] = useState("legendary");
  const [nftSymbol, setNftSymbol] = useState("SKIN");
  const [nftCollection, setNftCollection] = useState("CS:GO Skins Collection");
  
  // Structured attributes
  const [nftWeapon, setNftWeapon] = useState("");
  const [nftSkin, setNftSkin] = useState("");
  const [nftFloat, setNftFloat] = useState("");
  const [nftWear, setNftWear] = useState("");
  const [nftStattrak, setNftStattrak] = useState(false);

  // Check if connected wallet is admin
  useEffect(() => {
    const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
    if (publicKey && adminWallet) {
      const isAdminWallet = publicKey.toBase58() === adminWallet;
      setIsAdmin(isAdminWallet);
      if (!isAdminWallet) {
        toast.error("Access denied: Admin wallet required");
      }
    } else {
      setIsAdmin(false);
    }
  }, [publicKey]);

  // Load inventory
  useEffect(() => {
    if (connected && isAdmin) {
      loadInventory();
    }
  }, [connected, isAdmin]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
        }/api/v1/admin/inventory`
      );
      const data = await response.json();
      if (data.success) {
        setInventory(data.data || []);
      }
    } catch (error: any) {
      console.error("Failed to load inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleMintNFT = async () => {
    if (!wallet || !connected) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!nftName || !nftImageUrl) {
      toast.error("Name and Image URL are required");
      return;
    }

    try {
      setMinting(true);
      toast.loading("Saving metadata to server...", { id: "upload" });

      // Create structured attributes from form inputs
      const parsedAttributes = [
        { trait_type: "Rarity", value: nftRarity },
        { trait_type: "Weapon", value: nftWeapon || "Unknown" },
        { trait_type: "Skin", value: nftSkin || "Default" },
        { trait_type: "Float", value: nftFloat || "0.00" },
        { trait_type: "Wear", value: nftWear || "Factory New" },
        { trait_type: "StatTrak", value: nftStattrak ? "Yes" : "No" },
      ];

      // Create metadata object exactly like integration-flow.test.ts
      const metadata = {
        name: nftName,
        symbol: nftSymbol,
        description: nftDescription || `NFT metadata for ${nftName}`,
        image: nftImageUrl,
        attributes:
          parsedAttributes.length > 0
            ? parsedAttributes
            : [{ trait_type: "Rarity", value: nftRarity }],
        collection: {
          name: nftCollection,
          family: "Counter-Strike",
        },
      };

      console.log("Saving metadata to DB:", metadata);

      // Save metadata JSON to server DB
      const stored = await metadataService.upload(metadata);

      toast.success(
        `Metadata saved! ID: ${stored.id.slice(0, 8)}...`,
        { id: "upload" }
      );
      console.log("Metadata store result:", stored);

      // Mint Core NFT on-chain
      toast.loading("Minting Core NFT...", { id: "mint" });
      const result = await mintCoreNft({
        name: nftName,
        uri: stored.uri,
        walletAdapter: walletCtx as any,
        connection,
      });

      toast.success("NFT minted successfully!", { id: "mint" });
      console.log("Mint result:", result);

      // Save to backend database
      toast.loading("Saving to database...", { id: "save" });
      const saveResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
        }/api/v1/admin/inventory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nftName,
            description: nftDescription,
            imageUrl: nftImageUrl,
            metadataUri: stored.uri,
            rarity: nftRarity,
            attributes: metadata.attributes,
            mintedAsset: result.assetAddress,
            mintTx: result.signature,
          }),
        }
      );

      const saveData = await saveResponse.json();
      if (saveData.success) {
        toast.success("Saved to database!", { id: "save" });

        // Clear form
        setNftName("");
        setNftDescription("");
        setNftImageUrl("");
        setNftRarity("legendary");
        setNftSymbol("SKIN");
        setNftCollection("CS:GO Skins Collection");
        
        // Clear structured attributes
        setNftWeapon("");
        setNftSkin("");
        setNftFloat("");
        setNftWear("Factory New");
        setNftStattrak(false);

        // Reload inventory
        await loadInventory();
      } else {
        toast.error("Failed to save to database", { id: "save" });
      }
    } catch (error: any) {
      console.error("Minting failed:", error);
      toast.error(error.message || "Minting failed", { id: "mint" });
    } finally {
      setMinting(false);
    }
  };

  if (!connected) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Wallet Not Connected</h2>
          <p className="text-muted-foreground">
            Please connect your wallet to access the admin inventory.
          </p>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center border-destructive">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Admin wallet required to access this page.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">NFT Inventory Admin</h1>
            <p className="text-muted-foreground">
              Mint Core NFTs and manage skin metadata
            </p>
          </div>
        </div>

        {/* Mint Section */}
        <Card className="p-6 bg-zinc-950 border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Mint New NFT</h2>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nft-name">NFT Name *</Label>
                <Input
                  id="nft-name"
                  placeholder="AK-47 | Fire Serpent"
                  value={nftName}
                  onChange={(e) => setNftName(e.target.value)}
                  disabled={minting}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>

              <div>
                <Label htmlFor="nft-symbol">Symbol</Label>
                <Input
                  id="nft-symbol"
                  placeholder="SKIN"
                  value={nftSymbol}
                  onChange={(e) => setNftSymbol(e.target.value)}
                  disabled={minting}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="nft-description">Description</Label>
              <Textarea
                id="nft-description"
                placeholder="A legendary skin from CS:GO..."
                value={nftDescription}
                onChange={(e) => setNftDescription(e.target.value)}
                disabled={minting}
                rows={3}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nft-image-url">Image URL *</Label>
                <Input
                  id="nft-image-url"
                  placeholder="https://example.com/fire-serpent.png"
                  value={nftImageUrl}
                  onChange={(e) => setNftImageUrl(e.target.value)}
                  disabled={minting}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>

              <div>
                <Label htmlFor="nft-rarity">Rarity</Label>
                <Select
                  value={nftRarity}
                  onValueChange={(v) => setNftRarity(v)}
                  disabled={minting}
                >
                  <SelectTrigger
                    id="nft-rarity"
                    className="bg-zinc-900 border-zinc-700 text-zinc-100"
                  >
                    <SelectValue placeholder="Select rarity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="uncommon">Uncommon</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="legendary">Legendary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="nft-collection">Collection Name</Label>
              <Input
                id="nft-collection"
                placeholder="CS:GO Skins Collection"
                value={nftCollection}
                onChange={(e) => setNftCollection(e.target.value)}
                disabled={minting}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            {/* Structured Attributes */}
            <div className="space-y-4">
              <Label className="text-white">Weapon & Skin Details</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nft-weapon" className="text-zinc-300">Weapon</Label>
                  <Input
                    id="nft-weapon"
                    placeholder="AK-47, AWP, M4A4..."
                    value={nftWeapon}
                    onChange={(e) => setNftWeapon(e.target.value)}
                    disabled={minting}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
                
                <div>
                  <Label htmlFor="nft-skin" className="text-zinc-300">Skin Name</Label>
                  <Input
                    id="nft-skin"
                    placeholder="Fire Serpent, Dragon Lore..."
                    value={nftSkin}
                    onChange={(e) => setNftSkin(e.target.value)}
                    disabled={minting}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nft-float" className="text-zinc-300">Float Value</Label>
                  <Input
                    id="nft-float"
                    placeholder="0.07"
                    value={nftFloat}
                    onChange={(e) => setNftFloat(e.target.value)}
                    disabled={minting}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
                
                <div>
                  <Label htmlFor="nft-wear" className="text-zinc-300">Wear Condition</Label>
                  <Select value={nftWear} onValueChange={setNftWear} disabled={minting}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                      <SelectValue placeholder="Select wear" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Factory New">Factory New</SelectItem>
                      <SelectItem value="Minimal Wear">Minimal Wear</SelectItem>
                      <SelectItem value="Field-Tested">Field-Tested</SelectItem>
                      <SelectItem value="Well-Worn">Well-Worn</SelectItem>
                      <SelectItem value="Battle-Scarred">Battle-Scarred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="nft-stattrak"
                  checked={nftStattrak}
                  onChange={(e) => setNftStattrak(e.target.checked)}
                  disabled={minting}
                  className="bg-zinc-800"
                />
                <Label htmlFor="nft-stattrak" className="text-zinc-300">StatTrak™</Label>
              </div>
            </div>

            <div className="bg-zinc-900/40 p-4 rounded-lg border border-zinc-800">
              <p className="text-sm text-muted-foreground">
                <strong>🕸️ Arweave (Irys) Upload:</strong> Metadata will be
                automatically uploaded to Arweave via Irys before minting.
              </p>
            </div>

            <Button
              onClick={handleMintNFT}
              disabled={minting || !nftName || !nftImageUrl}
              className="w-full"
              size="lg"
            >
              {minting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Minting...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Upload to Arweave (Irys) & Mint Core NFT
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Inventory List Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Minted NFTs</h2>
            </div>
            <Button
              onClick={loadInventory}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Loading inventory...</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No NFTs minted yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {inventory.map((nft) => (
                <Card
                  key={nft.id}
                  className="relative overflow-hidden bg-zinc-950 border-2 border-amber-500/80 hover:border-amber-400 transition-colors shadow-[0_0_16px_rgba(245,158,11,0.35),0_0_36px_rgba(245,158,11,0.25)]"
                >
                  <div className="pointer-events-none absolute inset-1 rounded-sm border border-amber-300/40" />
                  <div className="px-4 py-3 bg-zinc-900/80 border-b border-amber-300/30 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-zinc-100 truncate pr-2">
                      {nft.name}
                    </h3>
                    {nft.rarity && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-400/15 text-amber-300">
                        {nft.rarity}
                      </span>
                    )}
                  </div>
                  <div className="relative bg-zinc-900 flex items-center justify-center h-72">
                    {nft.imageUrl ? (
                      <img
                        src={nft.imageUrl}
                        alt={nft.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : null}
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-amber-400/60" />
                      <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-amber-400/60" />
                      <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-amber-400/60" />
                      <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-amber-400/60" />
                    </div>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    {nft.metadataUri && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Metadata</span>
                        <a
                          href={nft.metadataUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-300 hover:underline truncate max-w-[180px]"
                        >
                          {nft.metadataUri.slice(0, 32)}...
                        </a>
                      </div>
                    )}
                    {nft.mintedAsset && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Asset</span>
                        <a
                          href={`https://explorer.solana.com/address/${nft.mintedAsset}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-300 hover:underline truncate max-w-[180px]"
                        >
                          {nft.mintedAsset.slice(0, 8)}...
                          {nft.mintedAsset.slice(-8)}
                        </a>
                      </div>
                    )}
                    {nft.mintedAt && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Minted</span>
                        <span className="text-zinc-300">
                          {new Date(nft.mintedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
