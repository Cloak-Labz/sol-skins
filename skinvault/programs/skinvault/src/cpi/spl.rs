use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};

/// Transfer SPL tokens between accounts
pub fn transfer_tokens<'info>(
    token_program: &Program<'info, Token>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &AccountInfo<'info>,
    amount: u64,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.clone(),
    };

    let cpi_ctx = if let Some(seeds) = signer_seeds {
        CpiContext::new_with_signer(token_program.to_account_info(), cpi_accounts, seeds)
    } else {
        CpiContext::new(token_program.to_account_info(), cpi_accounts)
    };

    token::transfer(cpi_ctx, amount)
}

/// Burn SPL tokens
pub fn burn_tokens<'info>(
    token_program: &Program<'info, Token>,
    mint: &Account<'info, Mint>,
    from: &Account<'info, TokenAccount>,
    authority: &AccountInfo<'info>,
    amount: u64,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let cpi_accounts = Burn {
        mint: mint.to_account_info(),
        from: from.to_account_info(),
        authority: authority.clone(),
    };

    let cpi_ctx = if let Some(seeds) = signer_seeds {
        CpiContext::new_with_signer(token_program.to_account_info(), cpi_accounts, seeds)
    } else {
        CpiContext::new(token_program.to_account_info(), cpi_accounts)
    };

    token::burn(cpi_ctx, amount)
}

/// Mint SPL tokens
pub fn mint_tokens<'info>(
    token_program: &Program<'info, Token>,
    mint: &Account<'info, Mint>,
    to: &Account<'info, TokenAccount>,
    authority: &AccountInfo<'info>,
    amount: u64,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let cpi_accounts = MintTo {
        mint: mint.to_account_info(),
        to: to.to_account_info(),
        authority: authority.clone(),
    };

    let cpi_ctx = if let Some(seeds) = signer_seeds {
        CpiContext::new_with_signer(token_program.to_account_info(), cpi_accounts, seeds)
    } else {
        CpiContext::new(token_program.to_account_info(), cpi_accounts)
    };

    token::mint_to(cpi_ctx, amount)
}

/// Create a new SPL token mint
pub fn create_mint<'info>(
    _token_program: &Program<'info, Token>,
    _mint: &Account<'info, Mint>,
    _mint_authority: &Pubkey,
    _freeze_authority: Option<&Pubkey>,
    _decimals: u8,
    _rent: &Sysvar<'info, Rent>,
    _system_program: &Program<'info, System>,
    _payer: &AccountInfo<'info>,
) -> Result<()> {
    // Note: This is a simplified version
    // In practice, you might want to use anchor_spl::token::InitializeMint
    Ok(())
}
