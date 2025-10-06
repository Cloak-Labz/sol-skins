import { WalrusClient as WalrusSDK } from '@mysten/walrus';
import { CoinBalance, getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface WalrusUploadResult {
    blobId: string;
    url: string;
    size: number;
    timestamp: string;
}

export interface WalrusClientOptions {
    /** Walrus network to use. Default: 'testnet' */
    network?: 'testnet' | 'mainnet';
    /** Number of storage epochs. Default: 1 */
    epochs?: number;
    /** Enable verbose logging. Default: true */
    verbose?: boolean;
    /** Optional Sui keypair (will generate one if not provided) */
    keypair?: Ed25519Keypair;
    /** Path to save/load keypair. Default: ~/.walrus-keypair.json */
    keypairPath?: string;
    /** Use Sui CLI wallet instead of generating keypair. Default: false */
    useSuiCLI?: boolean;
}

/**
 * Walrus Client for uploading files and JSON metadata
 * Uses the official @mysten/walrus TypeScript SDK
 */
export class WalrusClient {
    private client: WalrusSDK;
    private suiClient: SuiClient;
    private signer: Ed25519Keypair;
    private network: 'testnet' | 'mainnet';
    private epochs: number;
    private verbose: boolean;
    private aggregatorUrl: string;

    private constructor(
        client: WalrusSDK,
        suiClient: SuiClient,
        signer: Ed25519Keypair,
        network: 'testnet' | 'mainnet',
        epochs: number,
        verbose: boolean
    ) {
        this.client = client;
        this.suiClient = suiClient;
        this.signer = signer;
        this.network = network;
        this.epochs = epochs;
        this.verbose = verbose;

        // Set aggregator URL based on network
        this.aggregatorUrl = network === 'mainnet'
            ? 'https://aggregator.walrus.space/v1'
            : 'https://aggregator.walrus-testnet.walrus.space/v1';
    }

    /**
     * Get the balance of the wallet, like the `sui client balance` command:
     * ```bash
     * sui client balance
     * ╭──────────────────────────────────────────╮
     * │ Balance of coins owned by this address   │
     * ├──────────────────────────────────────────┤
     * │ ╭──────────────────────────────────────╮ │
     * │ │ coin       balance (raw)  balance    │ │
     * ├──────────────────────────────────────┤ │
     * │ │ Sui        119851676      0.11 SUI   │ │
     * │ │ WAL Token  904650000      0.90 WAL   │ │
     * ╰──────────────────────────────────────╯ │
     * ╰──────────────────────────────────────────╯
     */
    async getBalance(
        coinType: string = '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL'
    ): Promise<string> {
        const balance: CoinBalance = await this.suiClient.getBalance({
            owner: this.signer.toSuiAddress(),
            coinType
        });
        return JSON.stringify(balance);
    }

    /**
     * Create a new WalrusClient instance
     * This is async because it needs to initialize the SDK
     */
    static async create(options: WalrusClientOptions = {}): Promise<WalrusClient> {
        const network = options.network || 'testnet';
        const epochs = options.epochs || 1;
        const verbose = options.verbose ?? true;
        const useSuiCLI = options.useSuiCLI ?? true; // Default to using Sui CLI
        const keypairPath = options.keypairPath || path.join(os.homedir(), '.walrus-keypair.json');

        let keypair: Ed25519Keypair;

        // Use provided keypair, or load from Sui CLI, or load/generate from file
        if (options.keypair) {
            keypair = options.keypair;
            if (verbose) {
                console.log('🔑 Using provided keypair');
            }
        } else if (useSuiCLI) {
            keypair = await this.loadSuiCLIKeypair(network, verbose);
        } else {
            keypair = await this.loadOrCreateKeypair(keypairPath, verbose);
        }

        // Create Sui client
        const suiClient = new SuiClient({ url: getFullnodeUrl(network) });

        // Initialize Walrus SDK client
        const client = new WalrusSDK({
            suiClient,
            network,
        });

        const address = keypair.toSuiAddress();
        if (verbose) {
            console.log(`🐋 Walrus SDK initialized for ${network}`);
            console.log(`👛 Wallet address: ${address}`);
            console.log(`💾 Keypair saved to: ${keypairPath}`);
        }

        return new WalrusClient(client, suiClient, keypair, network, epochs, verbose);
    }

    /**
     * Load keypair from Sui CLI wallet
     */
    private static async loadSuiCLIKeypair(network: string, verbose: boolean): Promise<Ed25519Keypair> {
        try {
            const { execSync } = require('child_process');
            
            // Get the active Sui address
            const address = execSync('sui client active-address', { encoding: 'utf-8' }).trim();
            
            // Get the keystore path
            const suiConfigDir = path.join(os.homedir(), '.sui', 'sui_config');
            const keystorePath = path.join(suiConfigDir, 'sui.keystore');
            
            if (!fs.existsSync(keystorePath)) {
                throw new Error(`Sui keystore not found at ${keystorePath}`);
            }
            
            // Load the keystore
            const keystoreData = JSON.parse(fs.readFileSync(keystorePath, 'utf-8'));
            
            // Find the keypair for the active address
            for (const key of keystoreData) {
                try {
                    // Decode the base64 key (format: base64 of [scheme_byte, ...private_key])
                    const decoded = fromBase64(key);
                    // Skip the first byte (scheme: 0x00 for Ed25519)
                    const privateKey = decoded.slice(1);
                    const keypair = Ed25519Keypair.fromSecretKey(privateKey);
                    
                    // Check if this is the right keypair
                    if (keypair.toSuiAddress() === address) {
                        if (verbose) {
                            console.log(`🔑 Loaded keypair from Sui CLI`);
                            console.log(`👛 Address: ${address}`);
                        }
                        return keypair;
                    }
                } catch (e) {
                    // Skip invalid keys
                    continue;
                }
            }
            
            throw new Error(`Could not find keypair for address ${address} in Sui keystore`);
        } catch (error: any) {
            throw new Error(`Failed to load Sui CLI keypair: ${error.message}`);
        }
    }

    /**
     * Load keypair from file, or create and save a new one
     */
    private static async loadOrCreateKeypair(keypairPath: string, verbose: boolean): Promise<Ed25519Keypair> {
        try {
            // Try to load existing keypair
            if (fs.existsSync(keypairPath)) {
                const data = fs.readFileSync(keypairPath, 'utf-8');
                const { privateKey } = JSON.parse(data);
                // privateKey is already a base64 string, convert to Uint8Array for fromSecretKey
                const secretKeyBytes = fromBase64(privateKey);
                const keypair = Ed25519Keypair.fromSecretKey(secretKeyBytes);
                
                if (verbose) {
                    console.log(`🔑 Loaded existing keypair from ${keypairPath}`);
                    console.log(`👛 Address: ${keypair.toSuiAddress()}`);
                }
                
                return keypair;
            }
        } catch (error: any) {
            if (verbose) {
                console.warn(`⚠️  Failed to load keypair: ${error.message}`);
            }
        }

        // Generate new keypair
        const keypair = Ed25519Keypair.generate();
        const address = keypair.toSuiAddress();

        // Save to file
        try {
            // Get the secret key and convert to base64
            // Ed25519Keypair.getSecretKey() returns the 32-byte seed
            const secretKey = keypair.getSecretKey();
            // Convert to base64 string for storage
            const privateKey = typeof secretKey === 'string' ? secretKey : toBase64(new Uint8Array(secretKey));
            const data = JSON.stringify({
                address,
                privateKey,
                network: 'sui',
                createdAt: new Date().toISOString(),
            }, null, 2);

            fs.writeFileSync(keypairPath, data, 'utf-8');
            
            if (verbose) {
                console.log(`🆕 Generated new keypair`);
                console.log(`👛 Address: ${address}`);
                console.log(`💾 Saved to: ${keypairPath}`);
                console.log('');
                console.log('⚠️  IMPORTANT: Fund this wallet with SUI and WAL tokens!');
                console.log('   Testnet faucet: https://discord.com/channels/916379725201563759/971488439931392130');
                console.log(`   Then exchange SUI for WAL: walrus get-wal`);
            }
        } catch (error: any) {
            if (verbose) {
                console.warn(`⚠️  Failed to save keypair: ${error.message}`);
            }
        }

        return keypair;
    }

    /**
     * Upload a Blob to Walrus
     */
    async uploadBlob(data: Uint8Array): Promise<WalrusUploadResult> {
        if (this.verbose) {
            console.log(`📤 Uploading blob to Walrus ${this.network}...`);
        }

        try {
            // Upload to Walrus using SDK
            const result = await this.client.writeBlob({
                blob: data,
                epochs: this.epochs,
                deletable: false,
                signer: this.signer,
            });

            const blobId = result.blobId;
            const url = `${this.aggregatorUrl}/${blobId}`;
            const size = data.length;

            if (this.verbose) {
                console.log(`  ✅ Uploaded! Blob ID: ${blobId}`);
                console.log(`  🔗 URL: ${url}`);
                console.log(`  📦 Size: ${size} bytes`);
                console.log(`  ⏰ Storage epochs: ${this.epochs}`);
            }

            return {
                blobId,
                url,
                size,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            throw new Error(`Failed to upload blob: ${error.message}`);
        }
    }

    /**
     * Upload JSON metadata to Walrus
     * Converts the object to JSON and uploads it
     */
    async uploadJson(metadata: object): Promise<string> {
        if (this.verbose) {
            console.log(`📝 Uploading JSON metadata to Walrus...`);
        }

        try {
            // Convert metadata to JSON string
            const jsonString = JSON.stringify(metadata, null, 2);

            // Convert to Uint8Array
            const encoder = new TextEncoder();
            const data = encoder.encode(jsonString);

            // Upload
            const result = await this.uploadBlob(data);

            return result.url;
        } catch (error: any) {
            throw new Error(`Failed to upload JSON: ${error.message}`);
        }
    }

    /**
     * Upload multiple JSON objects and return their URIs
     */
    async uploadJsonBatch(metadataArray: object[]): Promise<string[]> {
        if (this.verbose) {
            console.log(`🐋 Uploading ${metadataArray.length} metadata files to Walrus...`);
        }

        const uris: string[] = [];

        for (let i = 0; i < metadataArray.length; i++) {
            const metadata = metadataArray[i];
            if (this.verbose) {
                console.log(`\n[${i + 1}/${metadataArray.length}] Uploading metadata...`);
            }
            const uri = await this.uploadJson(metadata);
            uris.push(uri);
        }

        if (this.verbose) {
            console.log(`\n✅ All ${metadataArray.length} files uploaded!`);
        }

        return uris;
    }

    /**
     * Upload a file from the filesystem
     */
    async uploadFile(filePath: string): Promise<WalrusUploadResult> {
        if (this.verbose) {
            console.log(`📤 Uploading file to Walrus: ${filePath}`);
        }

        try {
            // Read file as buffer
            const fs = await import('fs/promises');
            const buffer = await fs.readFile(filePath);

            // Convert to Uint8Array
            const data = new Uint8Array(buffer);

            // Upload
            return await this.uploadBlob(data);
        } catch (error: any) {
            throw new Error(`Failed to upload file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Read a blob from Walrus by blob ID
     */
    async readBlob(blobId: string): Promise<Uint8Array> {
        try {
            const blob = await this.client.readBlob({ blobId });
            return blob;
        } catch (error: any) {
            throw new Error(`Failed to read blob ${blobId}: ${error.message}`);
        }
    }

    /**
     * Read a blob and parse it as JSON
     */
    async readJson<T = any>(blobId: string): Promise<T> {
        try {
            const data = await this.readBlob(blobId);
            const decoder = new TextDecoder();
            const text = decoder.decode(data);
            return JSON.parse(text);
        } catch (error: any) {
            throw new Error(`Failed to read JSON blob ${blobId}: ${error.message}`);
        }
    }

    /**
     * Get the aggregator URL for the current network
     */
    getAggregatorUrl(): string {
        return this.aggregatorUrl;
    }

    /**
     * Construct a Walrus URL from a blob ID
     */
    getBlobUrl(blobId: string): string {
        return `${this.aggregatorUrl}/${blobId}`;
    }

    /**
     * Get blob info
     */
    async getBlobInfo(blobId: string) {
        try {
            const walrusBlob = await this.client.getBlob({ blobId });
            return walrusBlob;
        } catch (error: any) {
            throw new Error(`Failed to get blob info for ${blobId}: ${error.message}`);
        }
    }

    /**
     * Set the number of storage epochs
     */
    setEpochs(epochs: number): void {
        this.epochs = epochs;
        if (this.verbose) {
            console.log(`⏰ Storage epochs set to ${epochs}`);
        }
    }

    /**
     * Get the current storage epochs setting
     */
    getEpochs(): number {
        return this.epochs;
    }

    /**
     * Get the Sui address of the signer
     */
    getAddress(): string {
        return this.signer.toSuiAddress();
    }
}
