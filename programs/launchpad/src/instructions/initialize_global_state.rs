use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::*;
use crate::error::LaunchpadError;
use crate::utils::find_global_state_pda;

#[derive(Accounts)]
pub struct InitializeGlobalState<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalState::LEN,
        seeds = [GlobalState::SEEDS],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        init,
        payer = authority,
        token::mint = wsol_mint,
        token::authority = global_state,
    )]
    pub fee_vault: Account<'info, TokenAccount>,
    
    /// WSOL mint for fee collection
    pub wsol_mint: Account<'info, anchor_spl::token::Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeGlobalState>, platform_fee_bps: u16) -> Result<()> {
    // Validate platform fee
    if platform_fee_bps > 1000 {
        return Err(LaunchpadError::InvalidFeeBasisPoints.into());
    }
    
    let global_state = &mut ctx.accounts.global_state;
    let clock = Clock::get()?;
    
    // Initialize global state
    global_state.authority = ctx.accounts.authority.key();
    global_state.platform_fee_bps = platform_fee_bps;
    global_state.fee_vault = ctx.accounts.fee_vault.key();
    global_state.paused = false;
    global_state.upgrade_authority = ctx.accounts.authority.key();
    global_state.bump = ctx.bumps.global_state;
    
    msg!("Global state initialized with platform fee: {} bps", platform_fee_bps);
    msg!("Fee vault: {}", ctx.accounts.fee_vault.key());
    msg!("Authority: {}", ctx.accounts.authority.key());
    
    Ok(())
}