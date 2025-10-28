"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Shield,
  Package,
  Loader2,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Upload,
  FileText,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { boxesService } from "@/lib/services";

interface Box {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  priceSol: number;
  priceUsdc: number;
  totalItems: number;
  itemsAvailable: number;
  itemsOpened: number;
  candyMachine: string;
  collectionMint: string;
  candyGuard?: string;
  treasuryAddress?: string;
  symbol?: string;
  sellerFeeBasisPoints: number;
  isMutable: boolean;
  status: 'active' | 'paused' | 'sold_out' | 'ended';
  createdAt: string;
  updatedAt: string;
}

interface BoxSkin {
  id: string;
  boxId: string;
  name: string;
  weapon: string;
  rarity: string;
  condition: string;
  imageUrl?: string;
  basePriceUsd: number;
  metadataUri?: string;
  weight: number;
  skinTemplateId?: string;
}

interface DraftSkin {
  id: string;
  name: string;
  weapon: string;
  rarity: string;
  condition: string;
  imageUrl?: string;
  basePriceUsd: number;
  metadataUri?: string;
  weight: number;
  skinTemplateId?: string;
  uploadedToArweave?: boolean;
}

export default function PackManagerPage() {
  const { connected, publicKey } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [boxSkins, setBoxSkins] = useState<BoxSkin[]>([]);
  const [collectionFilesStatus, setCollectionFilesStatus] = useState<{
    [boxId: string]: {
      exists: boolean;
      collectionJsonPath: string;
      collectionImagePath: string;
    };
  }>({});
  
  // Draft box states
  const [draftBox, setDraftBox] = useState<{
    name: string;
    description: string;
    imageUrl: string;
    symbol: string;
    priceSol: number;
    priceUsdc: number;
    totalItems: number;
    candyMachine: string;
    collectionMint: string;
    candyGuard: string;
    treasuryAddress: string;
    sellerFeeBasisPoints: number;
    isMutable: boolean;
  } | null>(null);
  const [draftSkins, setDraftSkins] = useState<DraftSkin[]>([]);
  const [uploadingToArweave, setUploadingToArweave] = useState<string | null>(null);
  const [jsonSkinsInput, setJsonSkinsInput] = useState<string>("");
  
  // Form states
  const [creatingBox, setCreatingBox] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [boxForm, setBoxForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    symbol: "SKIN",
    priceSol: 0,
    priceUsdc: 0,
    totalItems: 100,
    candyMachine: "",
    collectionMint: "",
    candyGuard: "",
    treasuryAddress: "",
    sellerFeeBasisPoints: 500,
    isMutable: false,
  });

  // Skin form states
  const [addingSkin, setAddingSkin] = useState(false);
  const [skinForm, setSkinForm] = useState({
    name: "",
    weapon: "",
    rarity: "common",
    condition: "factory_new",
    imageUrl: "",
    basePriceUsd: 0,
    metadataUri: "",
    weight: 1,
  });

  // Check if connected wallet is admin
  useEffect(() => {
    const adminWallet = "v1t1nCTfxttsTFW3t7zTQFUsdpznu8kggzYSg7SDJMs";
    if (publicKey) {
      const isAdminWallet = publicKey.toBase58() === adminWallet;
      setIsAdmin(isAdminWallet);
      if (!isAdminWallet) {
        toast.error("Access denied: Admin wallet required");
      }
    } else {
      setIsAdmin(false);
    }
  }, [publicKey]);

  // Load boxes on mount
  useEffect(() => {
    if (isAdmin) {
      loadBoxes();
    }
  }, [isAdmin]);

  const loadBoxes = async () => {
    try {
      setLoading(true);
      const data = await boxesService.getAllBoxes();
      setBoxes(data);
      
      // Check collection files status for each box
      const statusPromises = data.map(async (box: Box) => {
        try {
          const response = await fetch(`/api/v1/boxes/${box.id}/collection-files`);
          const result = await response.json();
          return { boxId: box.id, status: result.success ? result.data : null };
          } catch (error) {
          return { boxId: box.id, status: null };
        }
      });
      
      const statusResults = await Promise.all(statusPromises);
      const statusMap: any = {};
      statusResults.forEach(({ boxId, status }) => {
        statusMap[boxId] = status;
      });
      
      setCollectionFilesStatus(statusMap);
    } catch (error) {
      console.error("Failed to load boxes:", error);
      toast.error("Failed to load boxes");
    } finally {
      setLoading(false);
    }
  };

  const loadBoxSkins = async (boxId: string) => {
    try {
      const response = await fetch(`/api/v1/box-skins/box/${boxId}`);
      const data = await response.json();
      if (data.success) {
        setBoxSkins(data.data);
      }
      } catch (error) {
      console.error("Failed to load box skins:", error);
      toast.error("Failed to load box skins");
    }
  };

  const generateCollectionFiles = async (boxData: any) => {
    try {
      // Generate collection.json
      const collectionJson = {
        name: boxData.name,
        symbol: boxData.symbol,
        description: boxData.description,
        image: "collection.png",
        attributes: [],
        properties: {
          files: [
            {
              uri: "collection.png",
              type: "image/png"
            }
          ],
          category: "image"
        }
      };

      // Send to backend to generate files
      const response = await fetch("/api/v1/boxes/generate-collection-files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boxId: boxData.id,
          collectionData: collectionJson,
          imageUrl: boxData.imageUrl,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to generate collection files");
      }

      return data.data;
    } catch (error) {
      console.error("Failed to generate collection files:", error);
      throw error;
    }
  };

  const handleCreateBox = async () => {
    try {
      setCreatingBox(true);
      const response = await fetch("/api/v1/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(boxForm),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success("Box created successfully");
        
        // Generate collection files
        try {
          await generateCollectionFiles(data.data);
          toast.success("Collection files generated successfully");
        } catch (fileError) {
          console.error("Failed to generate collection files:", fileError);
          toast.error("Box created but failed to generate collection files");
        }
        
        setBoxForm({
          name: "",
          description: "",
          imageUrl: "",
          symbol: "SKIN",
          priceSol: 0,
          priceUsdc: 0,
          totalItems: 100,
          candyMachine: "",
          collectionMint: "",
          candyGuard: "",
          treasuryAddress: "",
          sellerFeeBasisPoints: 500,
          isMutable: false,
        });
        loadBoxes();
      } else {
        throw new Error(data.error?.message || "Failed to create box");
      }
    } catch (error) {
      console.error("Failed to create box:", error);
      toast.error("Failed to create box");
    } finally {
      setCreatingBox(false);
    }
  };

  const handleAddSkin = async () => {
    if (!selectedBox) return;
    
    try {
      setAddingSkin(true);
      const response = await fetch("/api/v1/box-skins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...skinForm,
          boxId: selectedBox.id,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success("Skin added successfully");
        setSkinForm({
          name: "",
          weapon: "",
          rarity: "common",
          condition: "factory_new",
          imageUrl: "",
          basePriceUsd: 0,
          metadataUri: "",
          weight: 1,
        });
        loadBoxSkins(selectedBox.id);
      } else {
        throw new Error(data.error?.message || "Failed to add skin");
      }
    } catch (error) {
      console.error("Failed to add skin:", error);
      toast.error("Failed to add skin");
    } finally {
      setAddingSkin(false);
    }
  };

  const handleGenerateCollectionFiles = async (box: Box) => {
    try {
      toast.loading("Generating collection files...", { id: "generate-files" });
      
      await generateCollectionFiles(box);
      toast.success("Collection files generated successfully!", { id: "generate-files" });
      
      // Refresh collection files status
      loadBoxes();
    } catch (error: any) {
      console.error("Failed to generate collection files:", error);
      toast.error(error.message || "Failed to generate collection files", { id: "generate-files" });
    }
  };

  const handleDeleteSkin = async (skinId: string) => {
    if (!confirm("Are you sure you want to delete this skin?")) return;
    
    try {
      const response = await fetch(`/api/v1/box-skins/${skinId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        toast.success("Skin deleted successfully");
      if (selectedBox) {
          loadBoxSkins(selectedBox.id);
        }
      } else {
        throw new Error("Failed to delete skin");
      }
    } catch (error) {
      console.error("Failed to delete skin:", error);
      toast.error("Failed to delete skin");
    }
  };

  // Draft box functions
  const startDraftBox = () => {
    setDraftBox({
      name: "",
      description: "",
      imageUrl: "",
      symbol: "SKIN",
      priceSol: 0,
      priceUsdc: 0,
      totalItems: 100,
      candyMachine: "",
      collectionMint: "",
      candyGuard: "",
      treasuryAddress: "",
      sellerFeeBasisPoints: 500,
      isMutable: false,
    });
    setDraftSkins([]);
  };

  const addDraftSkin = () => {
    const newSkin: DraftSkin = {
      id: `draft-${Date.now()}`,
      name: skinForm.name,
      weapon: skinForm.weapon,
      rarity: skinForm.rarity,
      condition: skinForm.condition,
      imageUrl: skinForm.imageUrl,
      basePriceUsd: skinForm.basePriceUsd,
      metadataUri: skinForm.metadataUri,
      weight: skinForm.weight,
      uploadedToArweave: false,
    };

    setDraftSkins([...draftSkins, newSkin]);
    setSkinForm({
      name: "",
      weapon: "",
      rarity: "common",
      condition: "factory_new",
      imageUrl: "",
      basePriceUsd: 0,
      metadataUri: "",
      weight: 1,
    });
    toast.success("Skin added to draft");
  };

  const addSkinsFromJson = async () => {
    if (!jsonSkinsInput.trim()) {
      toast.error("Please enter JSON data");
      return;
    }

    try {
      // Skip all the cleaning bullshit and just parse the JSON directly
      let skinsData;
      
      try {
        // First try direct parsing
        skinsData = JSON.parse(jsonSkinsInput);
      } catch (directError) {
        // If that fails, try minimal cleaning
        let cleanedJson = jsonSkinsInput.trim();
        cleanedJson = cleanedJson.replace(/'/g, '"'); // Only fix quotes
        cleanedJson = cleanedJson.replace(/\/\/.*$/gm, ''); // Remove comments
        cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        
        skinsData = JSON.parse(cleanedJson);
      }
      
      if (!Array.isArray(skinsData)) {
        toast.error("JSON must be an array of skins");
        return;
      }

      if (skinsData.length === 0) {
        toast.error("JSON array is empty");
        return;
      }

      // Validate each skin object
      const validSkins: DraftSkin[] = [];
      for (let i = 0; i < skinsData.length; i++) {
        const skin = skinsData[i];
        
        // Handle both 'name' and 'skinName' fields
        const skinName = skin.name || skin.skinName;
        
        if (!skinName || !skin.weapon || !skin.rarity || !skin.condition) {
          toast.error(`Skin at index ${i} is missing required fields (name/skinName, weapon, rarity, condition)`);
          return;
        }

        const newSkin: DraftSkin = {
          id: `draft-${Date.now()}-${i}`,
          name: skinName,
          weapon: skin.weapon,
          rarity: skin.rarity.toLowerCase(), // Normalize rarity to lowercase
          condition: skin.condition.toLowerCase().replace(/\s+/g, '_'), // Normalize condition
          imageUrl: skin.imageUrl || "",
          basePriceUsd: skin.basePriceUsd || 0,
          metadataUri: skin.metadataUri || "",
          weight: skin.weight || 1,
          uploadedToArweave: false,
        };

        validSkins.push(newSkin);
      }

      // Add all valid skins to draft
      setDraftSkins([...draftSkins, ...validSkins]);
      setJsonSkinsInput("");
      toast.success(`Added ${validSkins.length} skins to draft!`);
      
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      toast.error(`Invalid JSON format: ${error.message}. Please check your syntax.`);
    }
  };

  const loadSampleJson = () => {
    const sampleJson = `[
  {
    "weapon": "AK-47",
    "skinName": "Redline",
    "rarity": "Common",
    "condition": "Field-Tested",
    "basePriceUsd": 25.50,
    "imageUrl": "https://example.com/skins/ak47-redline.jpg"
  },
  {
    "weapon": "AWP",
    "skinName": "Dragon Lore",
    "rarity": "Legendary",
    "condition": "Factory New",
    "basePriceUsd": 8500.00,
    "imageUrl": "https://example.com/skins/awp-dragon-lore.jpg"
  }
]`;
    setJsonSkinsInput(sampleJson);
    toast.success("Sample JSON loaded!");
  };

  const loadCleanJson = () => {
    const cleanJson = `[
  {
    "weapon": "AK-47",
    "skinName": "Redline",
    "rarity": "Common",
    "condition": "Field-Tested",
    "basePriceUsd": 25.50,
    "imageUrl": "https://example.com/skins/ak47-redline.jpg"
  },
  {
    "weapon": "M4A4",
    "skinName": "Desert-Strike",
    "rarity": "Common",
    "condition": "Minimal Wear",
    "basePriceUsd": 18.75,
    "imageUrl": "https://example.com/skins/m4a4-desert-strike.jpg"
  },
  {
    "weapon": "AWP",
    "skinName": "Worm God",
    "rarity": "Common",
    "condition": "Factory New",
    "basePriceUsd": 12.30,
    "imageUrl": "https://example.com/skins/awp-worm-god.jpg"
  },
  {
    "weapon": "AK-47",
    "skinName": "Frontside Misty",
    "rarity": "Uncommon",
    "condition": "Field-Tested",
    "basePriceUsd": 45.80,
    "imageUrl": "https://example.com/skins/ak47-frontside-misty.jpg"
  },
  {
    "weapon": "M4A1-S",
    "skinName": "Hyper Beast",
    "rarity": "Uncommon",
    "condition": "Well-Worn",
    "basePriceUsd": 52.40,
    "imageUrl": "https://example.com/skins/m4a1s-hyper-beast.jpg"
  },
  {
    "weapon": "AK-47",
    "skinName": "Vulcan",
    "rarity": "Rare",
    "condition": "Field-Tested",
    "basePriceUsd": 125.50,
    "imageUrl": "https://example.com/skins/ak47-vulcan.jpg"
  },
  {
    "weapon": "AWP",
    "skinName": "Asiimov",
    "rarity": "Rare",
    "condition": "Field-Tested",
    "basePriceUsd": 98.75,
    "imageUrl": "https://example.com/skins/awp-asiimov.jpg"
  },
  {
    "weapon": "AK-47",
    "skinName": "Fire Serpent",
    "rarity": "Epic",
    "condition": "Field-Tested",
    "basePriceUsd": 450.00,
    "imageUrl": "https://example.com/skins/ak47-fire-serpent.jpg"
  },
  {
    "weapon": "M4A4",
    "skinName": "Howl",
    "rarity": "Epic",
    "condition": "Field-Tested",
    "basePriceUsd": 3500.00,
    "imageUrl": "https://example.com/skins/m4a4-howl.jpg"
  },
  {
    "weapon": "AWP",
    "skinName": "Dragon Lore",
    "rarity": "Legendary",
    "condition": "Factory New",
    "basePriceUsd": 8500.00,
    "imageUrl": "https://example.com/skins/awp-dragon-lore.jpg"
  },
  {
    "weapon": "Karambit",
    "skinName": "Fade",
    "rarity": "Legendary",
    "condition": "Factory New",
    "basePriceUsd": 2200.00,
    "imageUrl": "https://example.com/skins/karambit-fade.jpg"
  }
]`;
    setJsonSkinsInput(cleanJson);
    toast.success("Clean JSON loaded with all 11 skins!");
  };

  const validateJson = () => {
    if (!jsonSkinsInput.trim()) {
      toast.error("Please enter JSON data first");
      return;
    }

    try {
      // Try direct parsing first
      let parsed;
      try {
        parsed = JSON.parse(jsonSkinsInput);
      } catch (directError) {
        // If that fails, try minimal cleaning
        let cleanedJson = jsonSkinsInput.trim();
        cleanedJson = cleanedJson.replace(/'/g, '"'); // Only fix quotes
        cleanedJson = cleanedJson.replace(/\/\/.*$/gm, ''); // Remove comments
        cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        
        parsed = JSON.parse(cleanedJson);
      }
      
      console.log('Parsed successfully:', parsed);
      toast.success(`JSON is valid! Found ${Array.isArray(parsed) ? parsed.length : 'unknown'} items`);
    } catch (error: any) {
      toast.error(`JSON validation failed: ${error.message}`);
      console.error("JSON validation error:", error);
      
      // Offer to load clean JSON as fallback
      if (confirm("JSON parsing failed. Would you like to load the clean JSON with all 11 skins instead?")) {
        loadCleanJson();
      }
    }
  };

  const removeDraftSkin = (skinId: string) => {
    setDraftSkins(draftSkins.filter(skin => skin.id !== skinId));
    toast.success("Skin removed from draft");
  };

  const mockUploadToArweave = async (skin: DraftSkin): Promise<string> => {
    // Mock Arweave upload - simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock metadata URI
    const mockUri = `https://arweave.net/mock-${Date.now()}-${skin.name.replace(/\s+/g, '-').toLowerCase()}`;
    return mockUri;
  };

  const uploadSkinToArweave = async (skinId: string) => {
    const skin = draftSkins.find(s => s.id === skinId);
    if (!skin) return;

    try {
      setUploadingToArweave(skinId);
      toast.loading(`Uploading ${skin.name} to Arweave...`, { id: `upload-${skinId}` });

      const metadataUri = await mockUploadToArweave(skin);
      
      // Update the skin with the metadata URI
      setDraftSkins(draftSkins.map(s => 
        s.id === skinId 
          ? { ...s, metadataUri, uploadedToArweave: true }
          : s
      ));

      toast.success(`${skin.name} uploaded to Arweave successfully!`, { id: `upload-${skinId}` });
    } catch (error) {
      console.error("Failed to upload to Arweave:", error);
      toast.error(`Failed to upload ${skin.name} to Arweave`, { id: `upload-${skinId}` });
    } finally {
      setUploadingToArweave(null);
    }
  };

  const uploadAllSkinsToArweave = async () => {
    const unuploadedSkins = draftSkins.filter(skin => !skin.uploadedToArweave);
    
    if (unuploadedSkins.length === 0) {
      toast.info("All skins are already uploaded to Arweave");
      return;
    }

    try {
      setUploadingToArweave("all");
      toast.loading(`Uploading ${unuploadedSkins.length} skins to Arweave...`, { id: "upload-all" });
      
      for (let i = 0; i < unuploadedSkins.length; i++) {
        const skin = unuploadedSkins[i];
        
        try {
          setUploadingToArweave(skin.id);
          const metadataUri = await mockUploadToArweave(skin);
          
          // Update the skin in the draft
          setDraftSkins(prevSkins => 
            prevSkins.map(s => 
              s.id === skin.id 
                ? { ...s, metadataUri, uploadedToArweave: true }
                : s
            )
          );
          
          toast.success(`Uploaded ${skin.name} (${i + 1}/${unuploadedSkins.length})`, { id: "upload-all" });
        } catch (error) {
          console.error(`Failed to upload ${skin.name}:`, error);
          toast.error(`Failed to upload ${skin.name}`, { id: "upload-all" });
        }
      }
      
      toast.success(`Successfully uploaded all ${unuploadedSkins.length} skins to Arweave!`, { id: "upload-all" });
    } catch (error) {
      console.error("Failed to upload skins:", error);
      toast.error("Failed to upload skins to Arweave", { id: "upload-all" });
    } finally {
      setUploadingToArweave(null);
    }
  };

  const createBoxFromDraft = async () => {
    if (!draftBox) return;

    // Validate that we have uploaded skins
    const uploadedSkins = draftSkins.filter(s => s.uploadedToArweave);
    if (uploadedSkins.length === 0) {
      toast.error("Please upload at least one skin to Arweave before creating the box");
      return;
    }

    try {
      setCreatingBox(true);
      
      // Get metadata URIs from uploaded skins
      const metadataUris = uploadedSkins.map(skin => skin.metadataUri).filter(Boolean);
      
      // Create box data with metadata URIs
      const boxData = {
        ...draftBox,
        metadataUris,
        totalItems: uploadedSkins.length, // Set total items to number of uploaded skins
      };
      
      // First create the box
      const response = await fetch("/api/v1/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(boxData),
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to create box");
      }

      const createdBox = data.data;

      // Then add all uploaded skins to the box
      for (const skin of draftSkins.filter(s => s.uploadedToArweave)) {
        await fetch("/api/v1/box-skins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boxId: createdBox.id,
            name: skin.name,
            weapon: skin.weapon,
            rarity: skin.rarity,
            condition: skin.condition,
            imageUrl: skin.imageUrl,
            basePriceUsd: skin.basePriceUsd,
            metadataUri: skin.metadataUri,
            weight: skin.weight,
          }),
        });
      }

      toast.success("Box created successfully with all skins!");
      
      // Generate collection files
      try {
        await generateCollectionFiles(createdBox);
        toast.success("Collection files generated successfully");
      } catch (fileError) {
        console.error("Failed to generate collection files:", fileError);
        toast.error("Box created but failed to generate collection files");
      }

      // Reset draft
      setDraftBox(null);
      setDraftSkins([]);
      loadBoxes();
    } catch (error) {
      console.error("Failed to create box from draft:", error);
      toast.error("Failed to create box from draft");
    } finally {
      setCreatingBox(false);
    }
  };

  const cancelDraftBox = () => {
    setDraftBox(null);
    setDraftSkins([]);
    toast.success("Draft cancelled");
  };

  const handleDeleteBox = async (boxId: string) => {
    if (!confirm("Are you sure you want to delete this box? This will also delete all associated skins.")) return;
    
    try {
      const response = await fetch(`/api/v1/boxes/${boxId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        toast.success("Box deleted successfully");
        loadBoxes();
        if (selectedBox?.id === boxId) {
          setSelectedBox(null);
          setBoxSkins([]);
        }
      } else {
        throw new Error("Failed to delete box");
      }
    } catch (error) {
      console.error("Failed to delete box:", error);
      toast.error("Failed to delete box");
    }
  };

  if (!connected) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Wallet Not Connected</h2>
          <p className="text-muted-foreground">
            Please connect your wallet to access the pack manager.
          </p>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center border-destructive">
          <Shield className="mx-auto h-12 w-12 text-destructive mb-4" />
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Pack Manager</h1>
            <p className="text-muted-foreground">
              Manage candy machine boxes and their skin pools
            </p>
          </div>
        </div>

        {/* Draft Box Workflow */}
        {draftBox ? (
          <div className="space-y-6">
            {/* Draft Box Header */}
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Draft Box: {draftBox.name || "Untitled Box"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add skins to your box, upload to Arweave, then create the box
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={cancelDraftBox}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel Draft
                    </Button>
                    <Button 
                      onClick={createBoxFromDraft}
                      disabled={creatingBox || draftSkins.length === 0 || draftSkins.some(s => !s.uploadedToArweave)}
                    >
                      {creatingBox ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating Box...
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 mr-2" />
                          Create Box ({draftSkins.filter(s => s.uploadedToArweave).length}/{draftSkins.length} skins ready)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Draft Box Form */}
              <div className="space-y-4">
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Box Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="draft-box-name">Box Name</Label>
                        <Input
                          id="draft-box-name"
                          value={draftBox.name}
                          onChange={(e) => setDraftBox({ ...draftBox, name: e.target.value })}
                          placeholder="Enter box name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="draft-box-symbol">Symbol</Label>
                        <Input
                          id="draft-box-symbol"
                          value={draftBox.symbol}
                          onChange={(e) => setDraftBox({ ...draftBox, symbol: e.target.value })}
                          placeholder="SKIN"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="draft-box-price">Price (SOL)</Label>
                        <Input
                          id="draft-box-price"
                          type="number"
                          step="0.01"
                          value={draftBox.priceSol}
                          onChange={(e) => setDraftBox({ ...draftBox, priceSol: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="draft-box-total-items">Total Items</Label>
                        <Input
                          id="draft-box-total-items"
                          type="number"
                          value={draftBox.totalItems}
                          onChange={(e) => setDraftBox({ ...draftBox, totalItems: parseInt(e.target.value) || 100 })}
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="draft-box-description">Description</Label>
                      <Textarea
                        id="draft-box-description"
                        value={draftBox.description}
                        onChange={(e) => setDraftBox({ ...draftBox, description: e.target.value })}
                        placeholder="Enter box description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="draft-box-image">Image URL</Label>
                      <Input
                        id="draft-box-image"
                        value={draftBox.imageUrl}
                        onChange={(e) => setDraftBox({ ...draftBox, imageUrl: e.target.value })}
                        placeholder="https://example.com/box-image.png"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="draft-candy-machine">Candy Machine ID</Label>
                        <Input
                          id="draft-candy-machine"
                          value={draftBox.candyMachine}
                          onChange={(e) => setDraftBox({ ...draftBox, candyMachine: e.target.value })}
                          placeholder="Candy Machine address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="draft-collection-mint">Collection Mint</Label>
                        <Input
                          id="draft-collection-mint"
                          value={draftBox.collectionMint}
                          onChange={(e) => setDraftBox({ ...draftBox, collectionMint: e.target.value })}
                          placeholder="Collection mint address"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Add Multiple Skins via JSON */}
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Add Multiple Skins (JSON)
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Paste JSON array of skins to add them all at once
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="json-skins">Skins JSON</Label>
                      <Textarea
                        id="json-skins"
                        placeholder={`[
  {
    "skinName": "Redline",
    "weapon": "AK-47",
    "rarity": "Common",
    "condition": "Field-Tested",
    "imageUrl": "https://example.com/skin1.jpg",
    "basePriceUsd": 45.50,
    "weight": 1
  },
  {
    "skinName": "Dragon Lore",
    "weapon": "AWP",
    "rarity": "Legendary",
    "condition": "Factory New",
    "imageUrl": "https://example.com/skin2.jpg",
    "basePriceUsd": 2500.00,
    "weight": 1
  }
]`}
                        className="min-h-[200px] font-mono text-sm"
                        onChange={(e) => setJsonSkinsInput(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={addSkinsFromJson}
                        disabled={!jsonSkinsInput.trim() || uploadingToArweave}
                        className="flex-1"
                      >
                        {uploadingToArweave ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Adding Skins...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add All Skins from JSON
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setJsonSkinsInput("")}
                        disabled={!jsonSkinsInput.trim()}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary"
                        onClick={loadSampleJson}
                        className="flex-1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Load Sample JSON
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={validateJson}
                        className="flex-1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Validate JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Add Skin Form */}
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Single Skin to Draft
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="draft-skin-name">Skin Name</Label>
                        <Input 
                          id="draft-skin-name"
                          value={skinForm.name}
                          onChange={(e) => setSkinForm({ ...skinForm, name: e.target.value })}
                          placeholder="AK-47 | Redline"
                        />
                      </div>
                      <div>
                        <Label htmlFor="draft-skin-weapon">Weapon</Label>
                        <Input 
                          id="draft-skin-weapon"
                          value={skinForm.weapon}
                          onChange={(e) => setSkinForm({ ...skinForm, weapon: e.target.value })}
                          placeholder="AK-47"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="draft-skin-rarity">Rarity</Label>
                        <Select
                          value={skinForm.rarity}
                          onValueChange={(value) => setSkinForm({ ...skinForm, rarity: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
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
                      <div>
                        <Label htmlFor="draft-skin-weight">Weight</Label>
                        <Input 
                          id="draft-skin-weight"
                          type="number"
                          min="1"
                          value={skinForm.weight}
                          onChange={(e) => setSkinForm({ ...skinForm, weight: parseInt(e.target.value) || 1 })}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="draft-skin-price">Base Price (USD)</Label>
                      <Input 
                        id="draft-skin-price"
                        type="number"
                        step="0.01"
                        value={skinForm.basePriceUsd}
                        onChange={(e) => setSkinForm({ ...skinForm, basePriceUsd: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="draft-skin-image">Image URL</Label>
                      <Input 
                        id="draft-skin-image"
                        value={skinForm.imageUrl}
                        onChange={(e) => setSkinForm({ ...skinForm, imageUrl: e.target.value })}
                        placeholder="https://example.com/skin-image.png"
                      />
                    </div>

                    <Button
                      onClick={addDraftSkin}
                      disabled={!skinForm.name || !skinForm.weapon}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Skin to Draft
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Draft Skins */}
              <div className="space-y-4">
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Draft Skins ({draftSkins.length})
                      </CardTitle>
                      {draftSkins.some(s => !s.uploadedToArweave) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={uploadAllSkinsToArweave}
                          disabled={uploadingToArweave !== null}
                        >
                          {uploadingToArweave === "all" ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading All...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload All to Arweave
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {draftSkins.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Skins Added</h3>
                        <p className="text-muted-foreground">
                          Add skins to your draft box using the form on the left.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {draftSkins.map((skin) => (
                          <div
                            key={skin.id}
                            className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-700"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{skin.name}</h4>
                                <Badge 
                                  variant={skin.uploadedToArweave ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {skin.uploadedToArweave ? "Uploaded" : "Pending"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {skin.weapon} • {skin.rarity} • Weight: {skin.weight} • ${skin.basePriceUsd}
                              </p>
                              {skin.metadataUri && (
                                <p className="text-xs text-green-400 mt-1">
                                  Arweave: {skin.metadataUri}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {!skin.uploadedToArweave && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => uploadSkinToArweave(skin.id)}
                                  disabled={uploadingToArweave === skin.id}
                                >
                                  {uploadingToArweave === skin.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDraftSkin(skin.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Boxes List */}
            <div className="space-y-4">
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Boxes
                  </CardTitle>
                  <Button onClick={startDraftBox} className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Box
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
        {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
                  <div className="space-y-2">
                    {boxes.map((box) => (
                      <div
                        key={box.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedBox?.id === box.id
                            ? "bg-primary/20 border-primary"
                            : "bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                        }`}
                        onClick={() => {
                          setSelectedBox(box);
                          loadBoxSkins(box.id);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{box.name}</h3>
                              <Badge 
                                variant={collectionFilesStatus[box.id]?.exists ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {collectionFilesStatus[box.id]?.exists ? "Files Ready" : "No Files"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {box.itemsAvailable} available • {box.priceSol} SOL • {box.symbol}
                            </p>
                            {box.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {box.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!collectionFilesStatus[box.id]?.exists && (
                  <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateCollectionFiles(box);
                                }}
                                className="text-xs"
                              >
                                Generate Files
                  </Button>
                            )}
                      <Button
                        variant="ghost"
                        size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBox(box.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                        </div>
                        </div>
                    ))}
                        </div>
                )}
              </CardContent>
            </Card>

              </div>

          {/* Right Column - Selected Box Skins */}
                  <div className="space-y-4">
            {selectedBox ? (
              <>
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {selectedBox.name} - Skins
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {boxSkins.map((skin) => (
                        <div
                          key={skin.id}
                          className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-700"
                        >
                              <div>
                            <h4 className="font-medium">{skin.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {skin.weapon} • {skin.rarity} • Weight: {skin.weight}
                                </p>
                              </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSkin(skin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                    ))}
                  </div>
                  </CardContent>
              </Card>

                {/* Add Skin Form */}
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Skin to {selectedBox.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                  <div>
                        <Label htmlFor="skin-name">Skin Name</Label>
                    <Input 
                          id="skin-name"
                          value={skinForm.name}
                          onChange={(e) => setSkinForm({ ...skinForm, name: e.target.value })}
                          placeholder="AK-47 | Redline"
                    />
                  </div>
                  <div>
                        <Label htmlFor="skin-weapon">Weapon</Label>
                    <Input 
                          id="skin-weapon"
                          value={skinForm.weapon}
                          onChange={(e) => setSkinForm({ ...skinForm, weapon: e.target.value })}
                          placeholder="AK-47"
                    />
                  </div>
                </div>
                
                    <div className="grid grid-cols-2 gap-4">
                <div>
                        <Label htmlFor="skin-rarity">Rarity</Label>
                        <Select
                          value={skinForm.rarity}
                          onValueChange={(value) => setSkinForm({ ...skinForm, rarity: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
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
                    <div>
                        <Label htmlFor="skin-weight">Weight</Label>
                    <Input 
                          id="skin-weight"
                      type="number"
                          min="1"
                          value={skinForm.weight}
                          onChange={(e) => setSkinForm({ ...skinForm, weight: parseInt(e.target.value) || 1 })}
                          placeholder="1"
                        />
                  </div>
                    </div>

                  <div>
                      <Label htmlFor="skin-price">Base Price (USD)</Label>
                    <Input 
                        id="skin-price"
                        type="number"
                        step="0.01"
                        value={skinForm.basePriceUsd}
                        onChange={(e) => setSkinForm({ ...skinForm, basePriceUsd: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                  </div>

                  <Button
                      onClick={handleAddSkin}
                      disabled={addingSkin || !skinForm.name || !skinForm.weapon}
                      className="w-full"
                    >
                      {addingSkin ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Skin
                        </>
                      )}
                  </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-zinc-950 border-zinc-800">
                <CardContent className="p-8 text-center">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Box Selected</h3>
                  <p className="text-muted-foreground">
                    Select a box from the list to view and manage its skins.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}