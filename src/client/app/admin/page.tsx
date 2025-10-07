'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { SolanaProgramService } from '@/lib/services/solana-program.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

export default function AdminPage() {
  const wallet = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalState, setGlobalState] = useState<any>(null);

  const programService = new SolanaProgramService(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    process.env.NEXT_PUBLIC_PROGRAM_ID || '6cSLcQ5RCyzPKeFWux2UMjm3SWf3tD41vHK5qsuphzKZ'
  );

  // Initialize global state form
  const [initForm, setInitForm] = useState({
    oraclePubkey: '',
    usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
  });

  // Publish batch form
  const [batchForm, setBatchForm] = useState({
    batchId: '1',
    candyMachine: '',
    metadataUris: '',
    merkleRoot: '',
    snapshotTime: Math.floor(Date.now() / 1000).toString(),
  });

  // Create box form
  const [boxForm, setBoxForm] = useState({
    batchId: '1',
    userPubkey: '',
  });

  useEffect(() => {
    checkAdminStatus();
    loadGlobalState();
  }, [wallet.publicKey]);

  const checkAdminStatus = async () => {
    if (!wallet.publicKey) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const admin = await programService.isAdmin(wallet.publicKey);
      setIsAdmin(admin);
    } catch (error) {
      console.error('Failed to check admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalState = async () => {
    try {
      const state = await programService.getGlobalState();
      setGlobalState(state);
    } catch (error) {
      console.error('Failed to load global state:', error);
    }
  };

  const handleInitializeGlobalState = async () => {
    if (!wallet.publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const oraclePubkey = new PublicKey(initForm.oraclePubkey);
      const usdcMint = new PublicKey(initForm.usdcMint);

      const signature = await programService.initializeGlobalState(
        wallet,
        oraclePubkey,
        usdcMint
      );

      toast.success(`Global state initialized! Signature: ${signature.slice(0, 8)}...`);
      await loadGlobalState();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishBatch = async () => {
    if (!wallet.publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const candyMachine = new PublicKey(batchForm.candyMachine);
      const uris = batchForm.metadataUris.split('\n').filter(u => u.trim());
      const merkleRoot = batchForm.merkleRoot
        ? JSON.parse(batchForm.merkleRoot)
        : Array(32).fill(0);

      const signature = await programService.publishMerkleRoot(wallet, {
        batchId: parseInt(batchForm.batchId),
        candyMachine,
        metadataUris: uris,
        merkleRoot,
        snapshotTime: parseInt(batchForm.snapshotTime),
      });

      toast.success(`Batch published! Signature: ${signature.slice(0, 8)}...`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBox = async () => {
    if (!wallet.publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const userPubkey = new PublicKey(boxForm.userPubkey);

      const signature = await programService.createBoxForUser(
        wallet,
        parseInt(boxForm.batchId),
        userPubkey
      );

      toast.success(`Box created! Signature: ${signature.slice(0, 8)}...`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && wallet.publicKey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!wallet.publicKey) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Admin Panel
            </CardTitle>
            <CardDescription>
              Connect your wallet to access admin functions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Only the program authority wallet can access this page.
              </AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Connect with the wallet that deployed the program
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied: You are not authorized to access this page.
            Only the program authority can perform admin functions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-green-500" />
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage the SkinVault program</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Connected as admin</p>
            <p className="font-mono text-xs">{wallet.publicKey.toString().slice(0, 8)}...{wallet.publicKey.toString().slice(-8)}</p>
          </div>
          <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground" />
        </div>
      </div>

      {globalState && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Global State
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-sm">
            <div><span className="text-muted-foreground">Authority:</span> {globalState.authority?.toString()}</div>
            <div><span className="text-muted-foreground">Oracle:</span> {globalState.oracle?.toString()}</div>
            <div><span className="text-muted-foreground">Treasury:</span> {globalState.treasuryAta?.toString()}</div>
            <div><span className="text-muted-foreground">Paused:</span> {globalState.paused ? 'Yes' : 'No'}</div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="initialize" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="initialize">Initialize</TabsTrigger>
          <TabsTrigger value="batch">Create Batch</TabsTrigger>
          <TabsTrigger value="box">Create Box</TabsTrigger>
        </TabsList>

        <TabsContent value="initialize">
          <Card>
            <CardHeader>
              <CardTitle>Initialize Global State</CardTitle>
              <CardDescription>
                Initialize the program's global state (only needs to be done once)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Oracle Public Key</label>
                <Input
                  placeholder="Enter oracle public key"
                  value={initForm.oraclePubkey}
                  onChange={(e) => setInitForm({ ...initForm, oraclePubkey: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">USDC Mint</label>
                <Input
                  placeholder="USDC mint address"
                  value={initForm.usdcMint}
                  onChange={(e) => setInitForm({ ...initForm, usdcMint: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default is Devnet USDC mint
                </p>
              </div>
              <Button
                onClick={handleInitializeGlobalState}
                disabled={loading || !initForm.oraclePubkey}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Initialize Global State
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch">
          <Card>
            <CardHeader>
              <CardTitle>Publish Merkle Root Batch</CardTitle>
              <CardDescription>
                Create a new batch with Candy Machine and metadata URIs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Batch ID</label>
                  <Input
                    type="number"
                    value={batchForm.batchId}
                    onChange={(e) => setBatchForm({ ...batchForm, batchId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Snapshot Time</label>
                  <Input
                    type="number"
                    value={batchForm.snapshotTime}
                    onChange={(e) => setBatchForm({ ...batchForm, snapshotTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Candy Machine Address</label>
                <Input
                  placeholder="Candy Machine public key"
                  value={batchForm.candyMachine}
                  onChange={(e) => setBatchForm({ ...batchForm, candyMachine: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Metadata URIs (one per line)</label>
                <textarea
                  className="w-full min-h-[120px] p-2 rounded-md border bg-background"
                  placeholder="https://arweave.net/...&#10;https://arweave.net/...&#10;https://arweave.net/..."
                  value={batchForm.metadataUris}
                  onChange={(e) => setBatchForm({ ...batchForm, metadataUris: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Merkle Root (optional, 32 bytes array)</label>
                <Input
                  placeholder='[0,1,2,...,31] or leave empty for dummy root'
                  value={batchForm.merkleRoot}
                  onChange={(e) => setBatchForm({ ...batchForm, merkleRoot: e.target.value })}
                />
              </div>
              <Button
                onClick={handlePublishBatch}
                disabled={loading || !batchForm.candyMachine || !batchForm.metadataUris}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Publish Batch
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="box">
          <Card>
            <CardHeader>
              <CardTitle>Create Box for User</CardTitle>
              <CardDescription>
                Create a loot box for a specific user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Batch ID</label>
                <Input
                  type="number"
                  value={boxForm.batchId}
                  onChange={(e) => setBoxForm({ ...boxForm, batchId: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">User Public Key</label>
                <Input
                  placeholder="User wallet address"
                  value={boxForm.userPubkey}
                  onChange={(e) => setBoxForm({ ...boxForm, userPubkey: e.target.value })}
                />
              </div>
              <Button
                onClick={handleCreateBox}
                disabled={loading || !boxForm.userPubkey}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Box
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
