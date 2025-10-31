import { Router } from 'express';
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import { AppError } from '../middlewares/errorHandler';
import logger from '../middlewares/logger';
import { WebIrys } from '@irys/sdk';
import nacl from 'tweetnacl';

const router = Router();

// Poll multiple Arweave gateways until the transaction becomes available
async function resolveArweaveUri(txId: string): Promise<string | null> {
  const gateways = [
    'https://arweave.net',
    'https://ar-io.net',
  ];
  const deadline = Date.now() + 30000; // 30s overall

  while (Date.now() < deadline) {
    for (const base of gateways) {
      const url = `${base}/${txId}`;
      try {
        const resp = await fetch(url, { method: 'HEAD' });
        if (resp.ok) return url;
      } catch (_) {
        // ignore and continue
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

// Server-side Irys upload using admin private key
router.post('/upload', async (req, res) => {
  try {
    const { metadata } = req.body;
    
    if (!metadata) {
      throw new AppError('Metadata is required', 400, 'MISSING_METADATA');
    }

    // Initialize Irys with server-side key
    const privateKey = process.env.IRYS_PRIVATE_KEY;
    if (!privateKey) {
      throw new AppError('IRYS_PRIVATE_KEY not configured', 500, 'MISSING_IRYS_KEY');
    }

    // Parse private key (base58 format)
    let keypair: Keypair;
    try {
      const bs58 = require('bs58');
      const decoded = bs58.decode(privateKey);
      keypair = Keypair.fromSecretKey(decoded);
    } catch (error) {
      console.error('Key parsing error:', error);
      throw new AppError('Invalid IRYS_PRIVATE_KEY format', 500, 'INVALID_IRYS_KEY');
    }

    // Use Irys SDK with proper wallet adapter
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Create a proper wallet adapter for Irys
    const walletAdapter = {
      publicKey: keypair.publicKey,
      signMessage: async (message: Uint8Array) => {
        return nacl.sign.detached(message, keypair.secretKey);
      },
      signTransaction: async (transaction: Transaction) => {
        transaction.sign(keypair);
        return transaction;
      },
      signAllTransactions: async (transactions: Transaction[]) => {
        transactions.forEach(tx => tx.sign(keypair));
        return transactions;
      },
      sendTransaction: async (transaction: Transaction) => {
        return await connection.sendTransaction(transaction, [keypair]);
      },
    };

    // Determine Irys node based on environment
    // Use devnet Irys for devnet Solana, mainnet Irys for mainnet Solana
    const isDevnet = rpcUrl.includes('devnet');
    const irysNode = isDevnet ? 'https://devnet.irys.xyz' : 'https://node1.irys.xyz';
    
    // Config object - devnet requires providerUrl to be set
    const irysConfig: any = {
      url: irysNode,
      token: 'solana',
      wallet: walletAdapter,
    };
    
    // If using devnet, must provide the RPC URL
    if (isDevnet) {
      irysConfig.config = {
        providerUrl: rpcUrl,
      };
    }
    
    const irys = new WebIrys(irysConfig);

    await irys.ready();

    // Upload metadata
    const jsonString = JSON.stringify(metadata);
    const tags = [{ name: 'Content-Type', value: 'application/json' }];

    const response = await irys.upload(jsonString, { tags });
    // Try to resolve a reachable gateway URL before returning
    const resolved = await resolveArweaveUri(response.id);
    const uri = resolved ?? `https://arweave.net/${response.id}`;

    console.log('Metadata uploaded to Irys:', { 
      id: response.id, 
      uri,
      size: jsonString.length 
    });

    res.json({
      success: true,
      data: {
        id: response.id,
        uri,
        size: jsonString.length
      }
    });

  } catch (error: any) {
    console.error('Irys upload error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'IRYS_UPLOAD_ERROR',
          message: error?.message || 'Failed to upload to Irys'
        }
      });
    }
  }
});

export default router;
