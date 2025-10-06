import fs from 'fs';
import path from 'path';
import os from 'os';

export interface WalrusHTTPResult {
    blobId: string;
    uri: string;
    size: number;
}

export class WalrusHTTPClient {
    private verbose: boolean;
    private publisherUrl: string;
    private aggregatorUrl: string;
    private mockMode: boolean;

    constructor(verbose: boolean = true) {
        this.verbose = verbose;
        // Allow overrides via env; default to testnet
        this.publisherUrl = process.env.WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';
        this.aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space/v1';
        this.mockMode = process.env.WALRUS_HTTP_MOCK === '1';
    }

    /**
     * Upload JSON metadata using Walrus HTTP API
     */
    async uploadJson(metadata: object): Promise<WalrusHTTPResult> {
        if (this.verbose) {
            console.log(`📝 Uploading JSON metadata to Walrus via HTTP API...`);
        }

        // Convert metadata to JSON string
        const jsonString = JSON.stringify(metadata, null, 2);
        const jsonBuffer = Buffer.from(jsonString, 'utf-8');

        // Mock mode: skip network and return deterministic fake blob
        if (this.mockMode) {
            const blobId = this.generateMockBlobId(jsonBuffer);
            const uri = `${this.aggregatorUrl}/${blobId}`;
            if (this.verbose) {
                console.log(`🧪 WALRUS_HTTP_MOCK=1 → returning mock URI: ${uri}`);
            }
            return { blobId, uri, size: jsonBuffer.length };
        }

        if (this.verbose) {
            console.log(`📤 Uploading blob to Walrus testnet via HTTP...`);
        }

        try {
            // Use Walrus HTTP API to upload
            const response = await fetch(`${this.publisherUrl}/v1/blobs?epochs=50&deletable=true`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                body: jsonBuffer,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json() as any;
            
            // Extract blob ID from the response
            if (!result.newlyCreated || !result.newlyCreated.blobObject || !result.newlyCreated.blobObject.blobId) {
                throw new Error(`Could not extract blob ID from HTTP response. Response: ${JSON.stringify(result)}`);
            }

            const blobId = result.newlyCreated.blobObject.blobId;
            const uri = `${this.aggregatorUrl}/${blobId}`;
            const size = jsonBuffer.length;

            if (this.verbose) {
                console.log(`✅ Walrus HTTP upload successful!`);
                console.log(`🔗 Blob ID: ${blobId}`);
                console.log(`🔗 URI: ${uri}`);
                console.log(`📊 Size: ${size} bytes`);
            }

            return {
                blobId,
                uri,
                size
            };

        } catch (error: any) {
            if (this.verbose) {
                console.error(`❌ Walrus HTTP upload failed: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Upload multiple JSON objects using Walrus HTTP API
     */
    async uploadJsonBatch(metadataArray: object[]): Promise<string[]> {
        if (this.verbose) {
            console.log(`🐋 Uploading ${metadataArray.length} metadata files to Walrus via HTTP API...`);
        }

        const uris: string[] = [];

        for (let i = 0; i < metadataArray.length; i++) {
            const metadata = metadataArray[i];
            if (this.verbose) {
                console.log(`\n[${i + 1}/${metadataArray.length}] Uploading to Walrus via HTTP...`);
            }
            
            const result = await this.uploadJson(metadata);
            uris.push(result.uri);
            
            if (this.verbose) {
                console.log(`✅ Walrus HTTP upload ${i + 1} successful: ${result.uri.substring(0, 50)}...`);
            }
        }

        if (this.verbose) {
            console.log(`\n✅ All ${metadataArray.length} files uploaded to Walrus via HTTP API!`);
        }
        return uris;
    }

    private generateMockBlobId(data: Buffer): string {
        // Simple deterministic mock id based on size and a hash-like base64
        const base = data.toString('base64').slice(0, 16).replace(/[^a-zA-Z0-9-_]/g, '_');
        return `${base}-${data.length}`;
    }
}
