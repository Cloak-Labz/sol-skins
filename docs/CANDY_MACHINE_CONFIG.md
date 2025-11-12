# Candy Machine Configuration Guide

This guide documents the complete process of setting up a Metaplex Candy Machine v2 for the Sol Skins NFT collection using Sugar CLI. The candy machine is configured with **Hidden Settings**, which allows us to mint NFTs with placeholder metadata that can be revealed later when users open their packs.

## Overview

In our application, each box (pack) has its own Candy Machine. When users purchase and open a pack, they receive an NFT that is initially minted with hidden/placeholder metadata. The actual skin metadata is revealed later through our reveal service, which updates the NFT's on-chain metadata with the specific skin details from our database.

**Key Configuration:**
- **Hidden Settings**: Enabled (allows placeholder metadata during mint)
- **Mutable NFTs**: Yes (required for reveal functionality)
- **Collection**: Each box has its own collection NFT
- **Mint Authority**: Candy Guard (for access control)

---

## Prerequisites

### 1. Set Solana Network

Before starting, configure your Solana CLI to use the devnet network:

```bash
solana config set --url devnet
```

**Why devnet?** 
- Development and testing environment
- Free SOL available from faucets
- No real money at risk during development
- Can switch to mainnet-beta for production

### 2. Prepare Assets Folder

Create an `assets` folder in your project directory with the following structure:

```
assets/
├── collection.json
└── collection.png
```

**collection.json** - Collection metadata (name, description, image URI)
**collection.png** - Collection image (recommended: 1000x1000px)

> **Note**: For hidden settings configuration, you only need the collection files. Individual NFT assets are not uploaded at this stage since we're using placeholder metadata.

---

## Step 1: Create Configuration File

### Command

```bash
sugar config create
```

This command launches an interactive configuration wizard that generates a `config.json` file with all the necessary settings for your Candy Machine.

### Interactive Configuration

```bash
❯ sugar config create
[1/2] 🍬 Sugar interactive config maker

Check out our Candy Machine config docs to learn about the options:
  -> https://developers.metaplex.com/candy-machine/sugar/configuration

✔ How many NFTs will you have in your candy machine? · 500
✔ What is the symbol of your collection? Hit [ENTER] for no symbol. · D3PACK
✔ What is the seller fee basis points? · 0
? Do you want to use a sequential mint index generation? We recommend you choose n
✔ Do you want to use a sequential mint index generation? We recommend you choose no. · no
✔ How many creator wallets do you have? (max limit of 4) · 1
✔ Enter creator wallet address #1 · J9MDQqcqkfFWS1gVVrayHmrPDWbWMZKRdXtQ8rgGxfGq
✔ Enter royalty percentage share for creator #1 (e.g., 70). Total shares must add to 100. · 100
✔ Which extra features do you want to use? (use [SPACEBAR] to select options you want and hit [ENTER] when done) · Hidden Settings
✔ What is the prefix name for your hidden settings mints? The mint index will be appended at the end of the name. · D3PACK
✔ What is URI to be used for each mint? · https://arweave.net/mystery
✔ What upload method do you want to use? · Bundlr
✔ Do you want your NFTs to remain mutable? We HIGHLY recommend you choose yes. · yes

[2/2] 📝 Saving config file

Saving config to file: "config.json"

Successfully generated the config file. 🎉 

✅ Command successful.
```

### Configuration Options Explained

#### Number of NFTs (500)
- **Purpose**: Defines the total supply of NFTs that can be minted from this Candy Machine
- **Our Use Case**: Each box has a fixed supply (e.g., 500 packs available)
- **Note**: This cannot be changed after deployment

#### Symbol (D3PACK)
- **Purpose**: Short identifier for your collection (similar to stock ticker)
- **Format**: Typically 3-10 uppercase characters
- **Our Use Case**: Unique identifier for each box type

#### Seller Fee Basis Points (0)
- **Purpose**: Royalty percentage paid to creators on secondary sales
- **Calculation**: 1 basis point = 0.01%, so 500 = 5%
- **Our Use Case**: Set to 0 for packs (royalties may be configured per skin later)

#### Sequential Mint Index Generation (No)
- **Purpose**: Controls how mint indices are generated
- **Sequential (Yes)**: Predictable order (0, 1, 2, 3...)
- **Non-Sequential (No)**: Random order (recommended for fairness)
- **Our Use Case**: Non-sequential ensures fair distribution and prevents gaming

#### Creator Wallets (1)
- **Purpose**: Wallet addresses that receive royalties
- **Limit**: Maximum 4 creators per collection
- **Our Use Case**: Single admin wallet receives all royalties
- **Royalty Share**: 100% to the single creator

#### Hidden Settings (Enabled)
- **Purpose**: Allows minting NFTs with placeholder metadata that can be revealed later
- **How It Works**: 
  - All NFTs are minted with the same placeholder name and URI
  - A hash is generated to verify the reveal process
  - Metadata can be updated later (if NFTs are mutable)
- **Our Use Case**: Essential for pack opening - users mint mystery NFTs that are revealed when they open packs

#### Hidden Settings Prefix (D3PACK)
- **Purpose**: Base name for all placeholder NFTs
- **Format**: `{prefix}#{mint_index}` (e.g., "D3PACK#123")
- **Our Use Case**: Identifies NFTs as belonging to this specific box

#### Hidden Settings URI (https://arweave.net/mystery)
- **Purpose**: Placeholder metadata URI used for all NFTs before reveal
- **Our Use Case**: Temporary URI that will be replaced during reveal process
- **Note**: This URI should point to a generic "mystery" metadata file

#### Upload Method (Bundlr)
- **Purpose**: Service used to upload assets to Arweave (decentralized storage)
- **Options**: Bundlr, AWS S3, IPFS, NFT Storage
- **Our Use Case**: Bundlr is the recommended method for Metaplex projects
- **Note**: Requires funding the Bundlr account with SOL

#### Mutable NFTs (Yes)
- **Purpose**: Allows updating NFT metadata after minting
- **Why Required**: Essential for reveal functionality - we update metadata when users open packs
- **Security**: Only the update authority can modify metadata
- **Our Use Case**: Must be `true` to enable our reveal service

### Output

This command creates a `config.json` file in your project root with all the configuration settings. This file is used by subsequent Sugar commands.

---

## Step 2: Upload Assets

### Command

```bash
sugar upload
```

This command uploads your collection assets (collection.json and collection.png) to decentralized storage (Arweave via Bundlr).

### Upload Process

```bash
❯ sugar upload

[1/4] 🗂  Loading assets
Found 1 asset pair(s), uploading files:
+--------------------+
| images    |      1 |
| metadata  |      1 |
+--------------------+

[2/4] 🖥  Initializing upload
▪▪▪▪▪ Connected
Funding address:
  -> pubkey: J9MDQqcqkfFWS1gVVrayHmrPDWbWMZKRdXtQ8rgGxfGq
  -> lamports: 38920 (◎ 0.00003892)
Signature: Tds3EgGozsCmBD8qzRyatLHtWbMRvQpoujKPme4TBbEz6TLbf91ksP4sZiGu4NJxydwEHLQExeEczVrNwX3rX6n

[3/4] 📤 Uploading image files 

Sending data: (Ctrl+C to abort)
[00:00:00] Upload successful █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████ 1/1

[4/4] 📤 Uploading metadata files 

Sending data: (Ctrl+C to abort)
[00:00:00] Upload successful █████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████ 1/1

1/1 asset pair(s) uploaded.

✅ Command successful.
```

### Process Explanation

1. **Loading Assets**: Sugar scans the assets folder and identifies files to upload
2. **Initializing Upload**: 
   - Connects to Bundlr network
   - Funds the Bundlr account with SOL (if needed)
   - Creates a funding transaction
3. **Uploading Images**: Uploads collection.png to Arweave
4. **Uploading Metadata**: Uploads collection.json to Arweave

### Important Notes

- **Funding**: Bundlr requires SOL to pay for Arweave storage. The amount is automatically calculated based on file sizes.
- **Permanence**: Once uploaded to Arweave, files are permanently stored (cannot be deleted).
- **Hidden Settings**: With hidden settings enabled, only collection assets are uploaded. Individual NFT assets are uploaded later during reveal.

---

## Step 3: Deploy Candy Machine

### Command

```bash
sugar deploy
```

This command creates the Candy Machine on-chain and the collection NFT that groups all NFTs from this machine.

### Deployment Process

```bash
❯ sugar deploy

Warning: Number of items (500) do not match cache items (0). 
                500 items are missing. Revealing will not work correctly.

[1/2] 📦 Creating collection NFT for candy machine
Collection mint ID: 8Tk8NvvcsawSZ1tyeZ2ztEfHy6wckVAJBPznrMUosNVu

[2/2] 🍬 Creating candy machine
Candy machine ID: 8EHx9aKgCrh2ckoD5bZCWHhCXtyGbDdmbooJfExiqC6x

Candy machine with hidden settings deployed.

Hidden settings hash: 2p4vDvyHHhLtGXYRdpqUnUYKiwgJNRk8

Updating candy machine state with new hash value:

[1/2] 🔍 Loading candy machine
Candy machine ID: 8EHx9aKgCrh2ckoD5bZCWHhCXtyGbDdmbooJfExiqC6x
▪▪▪▪▪ Done

[2/2] 🖥  Updating configuration
▪▪▪▪▪ Update signature: 2JqYugm4a6LAa9EiHbKHW2UE2Aym4PBQhVaa7xNma5WJ6vFi4HGq2TX7F8E8cLruuosHRYxMiLv6ZpKjh4mMQtk7

✅ Command successful.
```

### Process Explanation

#### 1. Creating Collection NFT
- **Purpose**: Creates a master NFT that represents the entire collection
- **Collection Mint ID**: `8Tk8NvvcsawSZ1tyeZ2ztEfHy6wckVAJBPznrMUosNVu`
- **Function**: All NFTs minted from this Candy Machine will be verified against this collection NFT
- **Our Use Case**: Each box has its own collection NFT for organization and verification

#### 2. Creating Candy Machine
- **Purpose**: Deploys the Candy Machine program account on Solana
- **Candy Machine ID**: `8EHx9aKgCrh2ckoD5bZCWHhCXtyGbDdmbooJfExiqC6x`
- **On-Chain State**: Stores configuration, supply, and minting rules
- **Our Use Case**: This is the contract that handles all pack purchases and NFT minting

#### 3. Hidden Settings Hash
- **Purpose**: Cryptographic hash used to verify reveal authenticity
- **Hash**: `2p4vDvyHHhLtGXYRdpqUnUYKiwgJNRk8`
- **Function**: Ensures that revealed metadata matches the original hidden settings configuration
- **Our Use Case**: Used by our reveal service to validate that reveals are legitimate

#### 4. Updating Configuration
- **Purpose**: Finalizes the Candy Machine state with the hidden settings hash
- **Transaction**: Updates the on-chain configuration

### Warning Explanation

**"Number of items (500) do not match cache items (0)"**

This warning appears because:
- The config specifies 500 items
- But no individual NFT assets were uploaded (hidden settings mode)
- This is **expected and normal** for hidden settings configuration
- The warning can be safely ignored - revealing will work correctly through our reveal service

### Important IDs to Save

After deployment, save these IDs in your database (Box entity):
- **Candy Machine ID**: `8EHx9aKgCrh2ckoD5bZCWHhCXtyGbDdmbooJfExiqC6x`
- **Collection Mint ID**: `8Tk8NvvcsawSZ1tyeZ2ztEfHy6wckVAJBPznrMUosNVu`
- **Hidden Settings Hash**: `2p4vDvyHHhLtGXYRdpqUnUYKiwgJNRk8`

These are required for:
- Frontend minting operations
- Backend reveal service
- Collection verification

---

## Step 4: Add Candy Guard

### Command

```bash
sugar guard add
```

Candy Guard is Metaplex's access control system that manages who can mint NFTs and under what conditions. It wraps the Candy Machine and becomes the mint authority.

### Guard Setup Process

```bash
❯ sugar guard add

[1/3] 🔍 Looking up candy machine

Candy machine ID: 8EHx9aKgCrh2ckoD5bZCWHhCXtyGbDdmbooJfExiqC6x

[2/3] 🛡  Initializing a candy guard
Signature: 4hKt8Zg2dC9W61yZA14DfDzW3jhwVm4eZhZZ3E9N6pKeXBaUmuybodjU9majT17NwQKmzqKo1rsjt27PMNyqsPNY

Candy guard ID: 76MUN9LQF2TezpcxNoLn5nYXYrzNjYy4ityZJFSP9S6c

[3/3] 📦 Wrapping
Signature: 5tnkrvP3iAtKaHpCmJ9rV3q8a51obwfAeg8yyhNQREDCxffCQ5uWDWLE4Xck33BhJNhsFfhkbncDj3v3YTDtdpYM

The candy guard is now the mint authority of the candy machine.

✅ Command successful.
```

### Process Explanation

#### 1. Looking Up Candy Machine
- Verifies the Candy Machine exists and is accessible
- Confirms the machine ID matches your configuration

#### 2. Initializing Candy Guard
- **Purpose**: Creates a new Candy Guard program account
- **Candy Guard ID**: `76MUN9LQF2TezpcxNoLn5nYXYrzNjYy4ityZJFSP9S6c`
- **Function**: Manages access control and minting rules
- **Our Use Case**: Controls who can mint packs and enforces payment rules

#### 3. Wrapping
- **Purpose**: Transfers mint authority from Candy Machine to Candy Guard
- **Result**: Candy Guard becomes the mint authority
- **Security**: All minting must now go through Candy Guard's rules
- **Our Use Case**: Enables payment processing and access control for pack purchases

### Why Candy Guard is Required

1. **Payment Processing**: Handles SOL/USDC payments for pack purchases
2. **Access Control**: Can restrict minting to specific wallets or conditions
3. **Rate Limiting**: Can limit mints per wallet or time period
4. **Flexibility**: Rules can be updated without redeploying the Candy Machine

### Important ID to Save

- **Candy Guard ID**: `76MUN9LQF2TezpcxNoLn5nYXYrzNjYy4ityZJFSP9S6c`
- Save this in your database (Box entity) - required for frontend minting operations

---

## Step 5: Verify Configuration

### Command

```bash
sugar show
```

This command displays the current state and configuration of your deployed Candy Machine.

### Output

```bash
❯ sugar show
[1/1] 🔍 Looking up candy machine

🍬 Candy machine ID: 8EHx9aKgCrh2ckoD5bZCWHhCXtyGbDdmbooJfExiqC6x
 :
 :.. authority: J9MDQqcqkfFWS1gVVrayHmrPDWbWMZKRdXtQ8rgGxfGq
 :.. mint authority: 76MUN9LQF2TezpcxNoLn5nYXYrzNjYy4ityZJFSP9S6c
 :.. collection mint: 8Tk8NvvcsawSZ1tyeZ2ztEfHy6wckVAJBPznrMUosNVu
 :.. account version: V2
 :.. token standard: NonFungible
 :.. features: none
 :.. max supply: 0
 :.. items redeemed: 0
 :.. items available: 500
 :.. symbol: D3PACK
 :.. seller fee basis points: 0% (0)
 :.. is mutable: true
 :.. creators: 
 :   :.. 1: J9MDQqcqkfFWS1gVVrayHmrPDWbWMZKRdXtQ8rgGxfGq (100%)
 :.. hidden settings: 
 :   :.. name: D3PACK
 :   :.. uri: https://arweave.net/mystery
 :   :.. hash: 2p4vDvyHHhLtGXYRdpqUnUYKiwgJNRk8
 :.. config line settings: none

✅ Command successful.
```

### Configuration Details Explained

#### Authority
- **Value**: `J9MDQqcqkfFWS1gVVrayHmrPDWbWMZKRdXtQ8rgGxfGq`
- **Purpose**: Wallet that can update Candy Machine configuration
- **Our Use Case**: Admin wallet that manages the box settings

#### Mint Authority
- **Value**: `76MUN9LQF2TezpcxNoLn5nYXYrzNjYy4ityZJFSP9S6c` (Candy Guard ID)
- **Purpose**: Program that controls minting permissions
- **Our Use Case**: Candy Guard handles all minting operations

#### Collection Mint
- **Value**: `8Tk8NvvcsawSZ1tyeZ2ztEfHy6wckVAJBPznrMUosNVu`
- **Purpose**: Master NFT representing the entire collection
- **Our Use Case**: Used for collection verification in our frontend

#### Account Version
- **Value**: V2
- **Purpose**: Candy Machine program version
- **Note**: V2 is the current standard version

#### Token Standard
- **Value**: NonFungible
- **Purpose**: Each NFT is unique (not fungible like tokens)
- **Our Use Case**: Each pack opening creates a unique skin NFT

#### Max Supply
- **Value**: 0
- **Purpose**: Unlimited supply (0 = no limit)
- **Note**: With hidden settings, this is typically 0

#### Items Redeemed
- **Value**: 0
- **Purpose**: Number of NFTs already minted
- **Our Use Case**: Tracks how many packs have been opened

#### Items Available
- **Value**: 500
- **Purpose**: Remaining NFTs that can be minted
- **Our Use Case**: Matches the box's total supply

#### Symbol
- **Value**: D3PACK
- **Purpose**: Collection identifier
- **Our Use Case**: Unique identifier for this box type

#### Seller Fee Basis Points
- **Value**: 0% (0)
- **Purpose**: Royalty percentage on secondary sales
- **Our Use Case**: No royalties configured at collection level

#### Is Mutable
- **Value**: true
- **Purpose**: Metadata can be updated after minting
- **Our Use Case**: **Critical** - Required for reveal functionality

#### Creators
- **Value**: `J9MDQqcqkfFWS1gVVrayHmrPDWbWMZKRdXtQ8rgGxfGq` (100%)
- **Purpose**: Wallet that receives creator royalties
- **Our Use Case**: Admin wallet receives all royalties

#### Hidden Settings
- **Name**: D3PACK (prefix for placeholder NFTs)
- **URI**: https://arweave.net/mystery (placeholder metadata)
- **Hash**: 2p4vDvyHHhLtGXYRdpqUnUYKiwgJNRk8 (verification hash)
- **Our Use Case**: All NFTs start with this placeholder, then get revealed

#### Config Line Settings
- **Value**: none
- **Purpose**: Individual NFT configuration (not used with hidden settings)
- **Our Use Case**: Hidden settings mode doesn't use config lines

---

## Step 6: Test Minting (Optional)

### Command

```bash
sugar mint
```

This command mints a test NFT from the Candy Machine. Useful for verifying the setup works correctly.

### When to Use

- **Testing**: Verify the Candy Machine is working before going live
- **Verification**: Confirm minting process works end-to-end
- **Debugging**: Troubleshoot any configuration issues

### Important Notes

- **Cost**: Each mint costs SOL (transaction fees + any payment configured in Candy Guard)
- **Limited Supply**: Each test mint reduces available supply
- **Devnet**: Use devnet for testing to avoid wasting real SOL
- **Production**: Only mint test NFTs on mainnet if absolutely necessary

---

## Integration with Our Application

### Database Storage

After completing the Candy Machine setup, store these values in your `Box` entity:

```typescript
{
  candyMachine: "8EHx9aKgCrh2ckoD5bZCWHhCXtyGbDdmbooJfExiqC6x",
  collectionMint: "8Tk8NvvcsawSZ1tyeZ2ztEfHy6wckVAJBPznrMUosNVu",
  candyGuard: "76MUN9LQF2TezpcxNoLn5nYXYrzNjYy4ityZJFSP9S6c",
  treasuryAddress: "J9MDQqcqkfFWS1gVVrayHmrPDWbWMZKRdXtQ8rgGxfGq"
}
```

### Frontend Usage

The frontend uses these IDs to:
- Display box information
- Initiate pack purchases
- Mint NFTs when users open packs
- Verify collection membership

### Backend Reveal Service

The reveal service uses:
- **Collection Mint**: To verify NFTs belong to the correct collection
- **Mutable Flag**: To update NFT metadata after minting
- **Hidden Settings Hash**: To validate reveal authenticity (optional)

### Workflow

1. **User Purchases Pack**: Frontend calls Candy Machine mint function
2. **NFT Minted**: NFT is created with placeholder metadata (D3PACK#123)
3. **Pack Opening**: User opens pack in our application
4. **Reveal Service**: Backend updates NFT metadata with actual skin details
5. **NFT Updated**: NFT now shows the revealed skin information

---

## Troubleshooting

### Common Issues

1. **"Insufficient funds"**: Ensure your wallet has enough SOL for transactions
2. **"Candy Machine not found"**: Verify you're on the correct network (devnet/mainnet)
3. **"Mint authority mismatch"**: Ensure Candy Guard is properly set up
4. **"Collection verification failed"**: Verify collection mint ID is correct

### Useful Commands

- `sugar show` - View current Candy Machine state
- `sugar verify` - Verify uploaded assets
- `sugar withdraw` - Withdraw funds from Candy Machine (if needed)
- `solana balance` - Check wallet SOL balance

---

## References

- [Metaplex Sugar Documentation](https://developers.metaplex.com/candy-machine/sugar)
- [Candy Machine Configuration Guide](https://developers.metaplex.com/candy-machine/sugar/configuration)
- [Hidden Settings Documentation](https://developers.metaplex.com/candy-machine/sugar/configuration#hidden-settings)
- [Candy Guard Documentation](https://developers.metaplex.com/candy-machine/guard)

---