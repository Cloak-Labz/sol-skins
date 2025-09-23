use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use solana_program::keccak;

declare_id!("F6u8iKAKRFTYCmZU2uK2QDQqa9bbhfZ1YMHMNXZPp71m");

#[program]
pub mod phygibox {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        admin_multisig: Pubkey,
        oracle_pubkey: Pubkey,
        treasury_vault_ata: Pubkey,
        vrf_authority: Pubkey,
    ) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.admin_multisig = admin_multisig;
        global_state.oracle_pubkey = oracle_pubkey;
        global_state.treasury_vault_ata = treasury_vault_ata;
        global_state.vrf_authority = vrf_authority;
        global_state.bump = ctx.bumps.global_state;
        Ok(())
    }

    pub fn publish_merkle_root(
        ctx: Context<PublishMerkleRoot>,
        batch_id: String,
        merkle_root: [u8; 32],
        snapshot_time: i64,
        operator_sig: [u8; 64],
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        batch.batch_id = batch_id;
        batch.merkle_root = merkle_root;
        batch.supply_total = 0;
        batch.supply_opened = 0;
        batch.collection_mint = None;
        batch.bump = ctx.bumps.batch;
        Ok(())
    }

    pub fn mint_box(
        ctx: Context<MintBox>,
        batch_id: String,
        metadata_uri: String,
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        batch.supply_total = batch.supply_total.checked_add(1).unwrap();
        Ok(())
    }

    pub fn open_box(ctx: Context<OpenBox>) -> Result<()> {
        // Request VRF - this would integrate with Switchboard or Pyth VRF
        // For now, we'll emit an event that the worker can listen to
        emit!(BoxOpenedEvent {
            nft_mint: ctx.accounts.nft_mint.key(),
            randomness: [0u8; 32], // Will be filled by VRF callback
            batch_id: ctx.accounts.batch.batch_id.clone(),
        });
        Ok(())
    }

    pub fn vrf_callback(
        ctx: Context<VrfCallback>,
        randomness: [u8; 32],
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        batch.supply_opened = batch.supply_opened.checked_add(1).unwrap();

        emit!(BoxOpenedEvent {
            nft_mint: ctx.accounts.nft_mint.key(),
            randomness,
            batch_id: batch.batch_id.clone(),
        });
        Ok(())
    }

    pub fn assign(
        ctx: Context<Assign>,
        inventory_id: [u8; 32],
        backend_sig: [u8; 64],
        merkle_proof_hash: [u8; 32],
    ) -> Result<()> {
        let assignment = &mut ctx.accounts.assignment;
        assignment.nft_mint = ctx.accounts.nft_mint.key();
        assignment.inventory_id_hash = inventory_id;
        assignment.proof_hash = merkle_proof_hash;
        assignment.assigned_at = Clock::get()?.unix_timestamp;
        assignment.redeemed = false;
        assignment.buybacked = false;
        assignment.bump = ctx.bumps.assignment;

        emit!(AssignedEvent {
            nft_mint: ctx.accounts.nft_mint.key(),
            inventory_id_hash: inventory_id,
        });
        Ok(())
    }

    pub fn sell_back(
        ctx: Context<SellBack>,
        min_acceptable_price: u64,
        price_data: PriceData,
    ) -> Result<()> {
        // Verify oracle signature
        require!(
            price_data.pubkey == ctx.accounts.global_state.oracle_pubkey,
            ErrorCode::InvalidOracle
        );

        // Verify price signature (simplified - in production use proper Ed25519 verification)
        let price_hash = keccak::hash(&[
            &price_data.inventory_id,
            &price_data.price.to_le_bytes(),
            &price_data.timestamp.to_le_bytes(),
        ]);
        // In production, verify the signature against the hash

        // Apply fees and spreads
        let fee = price_data.price.checked_mul(2).unwrap() / 100; // 2% fee
        let spread = price_data.price.checked_mul(1).unwrap() / 100; // 1% spread
        let effective_price = price_data.price.checked_sub(fee).unwrap().checked_sub(spread).unwrap();

        require!(
            effective_price >= min_acceptable_price,
            ErrorCode::PriceTooLow
        );

        // Check circuit breaker
        let treasury_balance = ctx.accounts.treasury_vault.amount;
        let min_treasury = 1_000_000; // 1 USDC minimum
        require!(
            treasury_balance >= min_treasury,
            ErrorCode::TreasuryTooLow
        );

        // Transfer USDC to user
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.treasury_vault_authority.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, effective_price)?;

        // Mark as buybacked
        let assignment = &mut ctx.accounts.assignment;
        assignment.buybacked = true;

        emit!(BuybackEvent {
            nft_mint: ctx.accounts.nft_mint.key(),
            amount: effective_price,
        });
        Ok(())
    }

    pub fn deposit_treasury(ctx: Context<DepositTreasury>, amount: u64) -> Result<()> {
        // Only admin multisig can deposit
        // Transfer logic would go here
        Ok(())
    }

    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        // Only admin multisig can withdraw
        // Transfer logic would go here
        Ok(())
    }

    pub fn set_oracle(ctx: Context<SetOracle>, new_oracle: Pubkey) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.oracle_pubkey = new_oracle;
        Ok(())
    }

    pub fn set_vrf_authority(ctx: Context<SetVrfAuthority>, new_authority: Pubkey) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.vrf_authority = new_authority;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + GlobalState::LEN,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(batch_id: String)]
pub struct PublishMerkleRoot<'info> {
    #[account(
        init,
        payer = operator,
        space = 8 + Batch::LEN,
        seeds = [b"batch", batch_id.as_bytes()],
        bump
    )]
    pub batch: Account<'info, Batch>,
    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(batch_id: String)]
pub struct MintBox<'info> {
    #[account(
        mut,
        seeds = [b"batch", batch_id.as_bytes()],
        bump
    )]
    pub batch: Account<'info, Batch>,
    #[account(mut)]
    pub minter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenBox<'info> {
    #[account(mut)]
    pub nft_mint: AccountInfo<'info>,
    #[account(mut)]
    pub batch: Account<'info, Batch>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct VrfCallback<'info> {
    #[account(mut)]
    pub nft_mint: AccountInfo<'info>,
    #[account(mut)]
    pub batch: Account<'info, Batch>,
    pub vrf_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Assign<'info> {
    #[account(
        init,
        payer = backend,
        space = 8 + Assignment::LEN,
        seeds = [b"assignment", nft_mint.key().as_ref()],
        bump
    )]
    pub assignment: Account<'info, Assignment>,
    #[account(mut)]
    pub nft_mint: AccountInfo<'info>,
    #[account(mut)]
    pub backend: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellBack<'info> {
    #[account(
        mut,
        seeds = [b"assignment", nft_mint.key().as_ref()],
        bump
    )]
    pub assignment: Account<'info, Assignment>,
    #[account(mut)]
    pub nft_mint: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub treasury_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub treasury_vault_authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DepositTreasury<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    pub admin_multisig: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    pub admin_multisig: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetOracle<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    pub admin_multisig: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetVrfAuthority<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    pub admin_multisig: Signer<'info>,
}

#[account]
pub struct GlobalState {
    pub admin_multisig: Pubkey,
    pub oracle_pubkey: Pubkey,
    pub treasury_vault_ata: Pubkey,
    pub vrf_authority: Pubkey,
    pub bump: u8,
}

impl GlobalState {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 1;
}

#[account]
pub struct Batch {
    pub batch_id: String,
    pub merkle_root: [u8; 32],
    pub supply_total: u32,
    pub supply_opened: u32,
    pub collection_mint: Option<Pubkey>,
    pub bump: u8,
}

impl Batch {
    pub const LEN: usize = 4 + 256 + 32 + 4 + 4 + 1 + 32 + 1;
}

#[account]
pub struct Assignment {
    pub nft_mint: Pubkey,
    pub inventory_id_hash: [u8; 32],
    pub proof_hash: [u8; 32],
    pub assigned_at: i64,
    pub redeemed: bool,
    pub buybacked: bool,
    pub bump: u8,
}

impl Assignment {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 1 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PriceData {
    pub inventory_id: [u8; 32],
    pub price: u64,
    pub timestamp: i64,
    pub signature: [u8; 64],
    pub pubkey: Pubkey,
}

#[event]
pub struct BoxOpenedEvent {
    pub nft_mint: Pubkey,
    pub randomness: [u8; 32],
    pub batch_id: String,
}

#[event]
pub struct AssignedEvent {
    pub nft_mint: Pubkey,
    pub inventory_id_hash: [u8; 32],
}

#[event]
pub struct BuybackEvent {
    pub nft_mint: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid oracle signature")]
    InvalidOracle,
    #[msg("Price too low for buyback")]
    PriceTooLow,
    #[msg("Treasury balance too low for buyback")]
    TreasuryTooLow,
    #[msg("Invalid merkle proof")]
    InvalidMerkleProof,
    #[msg("Assignment already exists")]
    AssignmentExists,
    #[msg("Assignment not found")]
    AssignmentNotFound,
    #[msg("Invalid VRF authority")]
    InvalidVrfAuthority,
}
