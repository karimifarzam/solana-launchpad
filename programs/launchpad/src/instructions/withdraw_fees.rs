use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::error::LaunchpadError;

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        seeds = [GlobalState::SEEDS],
        bump = global_state.bump,
        has_one = authority @ LaunchpadError::Unauthorized,
        has_one = fee_vault @ LaunchpadError::InvalidAccountOwner
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        constraint = fee_vault.key() == global_state.fee_vault @ LaunchpadError::InvalidAccountOwner
    )]
    pub fee_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = fee_vault.mint,
        token::authority = authority,
    )]
    pub destination: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<WithdrawFees>) -> Result<()> {
    let fee_vault = &ctx.accounts.fee_vault;
    let amount = fee_vault.amount;
    
    if amount == 0 {
        msg!("No fees to withdraw");
        return Ok(());
    }
    
    // Transfer all fees from vault to destination
    let global_state = &ctx.accounts.global_state;
    let global_seeds = &[
        GlobalState::SEEDS,
        &[global_state.bump],
    ];
    let signer_seeds = &[&global_seeds[..]];
    
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.fee_vault.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: global_state.to_account_info(),
        },
        signer_seeds,
    );
    
    token::transfer(transfer_ctx, amount)?;
    
    msg!("Fees withdrawn successfully: {} tokens", amount);
    
    Ok(())
}