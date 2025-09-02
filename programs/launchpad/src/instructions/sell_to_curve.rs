use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Burn, Transfer};
use crate::state::*;
use crate::error::LaunchpadError;
use crate::utils::{calculate_linear_cost, calculate_exponential_cost, calculate_fee, validate_slippage};

#[derive(Accounts)]
pub struct SellToCurve<'info> {
    #[account(
        seeds = [GlobalState::SEEDS],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        seeds = [LaunchpadState::SEEDS, launchpad.mint.as_ref()],
        bump = launchpad.bump,
        has_one = bonding_curve @ LaunchpadError::InvalidPDA,
        constraint = launchpad.status == LaunchpadStatus::Active @ LaunchpadError::LaunchpadNotActive
    )]
    pub launchpad: Account<'info, LaunchpadState>,
    
    #[account(
        mut,
        seeds = [BondingCurveState::SEEDS, launchpad.key().as_ref()],
        bump = bonding_curve.bump,
        has_one = launchpad @ LaunchpadError::InvalidPDA
    )]
    pub bonding_curve: Account<'info, BondingCurveState>,
    
    pub mint: Account<'info, anchor_spl::token::Mint>,
    
    /// SOL vault to send payment from
    #[account(
        mut,
        seeds = [b"sol_vault", launchpad.key().as_ref()],
        bump,
    )]
    pub sol_vault: SystemAccount<'info>,
    
    /// Trader's token account to burn tokens from
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = trader,
    )]
    pub trader_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub trader: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SellToCurve>,
    amount_tokens: u64,
    min_sol_out: u64,
    max_slippage_bps: u16,
) -> Result<()> {
    // Validate platform is not paused
    if ctx.accounts.global_state.paused {
        return Err(LaunchpadError::PlatformPaused.into());
    }
    
    // Validate minimum token amount
    if amount_tokens == 0 {
        return Err(LaunchpadError::InsufficientTokenAmount.into());
    }
    
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let launchpad = &mut ctx.accounts.launchpad;
    let global_state = &ctx.accounts.global_state;
    
    // Validate trader has enough tokens
    if ctx.accounts.trader_token_account.amount < amount_tokens {
        return Err(LaunchpadError::InsufficientTokenAmount.into());
    }
    
    // Check if we can sell this many tokens (don't go below 0 supply)
    if bonding_curve.supply_sold < amount_tokens {
        return Err(LaunchpadError::InsufficientTokenAmount.into());
    }
    
    // Calculate SOL amount to return
    let current_supply = bonding_curve.supply_sold;
    let new_supply = current_supply - amount_tokens;
    
    let sol_return_gross = calculate_sol_for_token_amount(
        amount_tokens,
        new_supply,
        current_supply,
        &bonding_curve.curve_type,
        &bonding_curve.curve_params,
    )?;
    
    // Calculate fees on the return amount
    let platform_fee = calculate_fee(sol_return_gross, global_state.platform_fee_bps)?;
    let creator_fee = calculate_fee(sol_return_gross, launchpad.creator_fee_bps)?;
    let total_fees = platform_fee.checked_add(creator_fee)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    
    let sol_return_net = sol_return_gross.checked_sub(total_fees)
        .ok_or(LaunchpadError::ArithmeticUnderflow)?;
    
    // Validate minimum SOL output
    if sol_return_net < min_sol_out {
        return Err(LaunchpadError::MinSolNotMet.into());
    }
    
    // Validate slippage
    validate_slippage(min_sol_out, sol_return_net, max_slippage_bps)?;
    
    // Check sol_vault has enough SOL
    if ctx.accounts.sol_vault.lamports() < sol_return_net {
        return Err(LaunchpadError::InsufficientSolAmount.into());
    }
    
    // Burn tokens from trader
    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.trader_token_account.to_account_info(),
            authority: ctx.accounts.trader.to_account_info(),
        },
    );
    
    token::burn(burn_ctx, amount_tokens)?;
    
    // Transfer SOL from sol_vault to trader
    **ctx.accounts.sol_vault.try_borrow_mut_lamports()? = ctx.accounts.sol_vault.lamports()
        .checked_sub(sol_return_net)
        .ok_or(LaunchpadError::ArithmeticUnderflow)?;
    
    **ctx.accounts.trader.try_borrow_mut_lamports()? = ctx.accounts.trader.lamports()
        .checked_add(sol_return_net)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    
    // Update bonding curve state
    bonding_curve.supply_sold = new_supply;
    bonding_curve.sol_reserves = bonding_curve.sol_reserves
        .checked_sub(sol_return_gross)
        .ok_or(LaunchpadError::ArithmeticUnderflow)?;
    
    // Update last price
    bonding_curve.last_price = if new_supply == 0 {
        bonding_curve.curve_params.base_price
    } else {
        calculate_current_price(
            new_supply,
            &bonding_curve.curve_type,
            &bonding_curve.curve_params,
        )?
    };
    
    msg!("Sell executed successfully");
    msg!("Tokens burned: {}", amount_tokens);
    msg!("SOL returned (gross): {}", sol_return_gross);
    msg!("SOL returned (net): {}", sol_return_net);
    msg!("New supply: {}", new_supply);
    msg!("Current price: {}", bonding_curve.last_price);
    
    Ok(())
}

fn calculate_sol_for_token_amount(
    token_amount: u64,
    supply_start: u64, // After sale (lower)
    supply_end: u64,   // Before sale (higher)
    curve_type: &CurveType,
    curve_params: &CurveParams,
) -> Result<u64> {
    match curve_type {
        CurveType::Linear => {
            calculate_linear_cost(
                supply_start,
                supply_end,
                curve_params.base_price,
                curve_params.slope,
            )
        }
        CurveType::Exponential => {
            calculate_exponential_cost(
                supply_start,
                supply_end,
                curve_params.base_price,
                curve_params.slope,
                curve_params.step,
            )
        }
        CurveType::Custom => {
            Err(LaunchpadError::InvalidCurveParams.into())
        }
    }
}

fn calculate_current_price(
    supply: u64,
    curve_type: &CurveType,
    curve_params: &CurveParams,
) -> Result<u64> {
    match curve_type {
        CurveType::Linear => {
            Ok(curve_params.base_price + curve_params.slope * supply)
        }
        CurveType::Exponential => {
            if curve_params.step == 0 {
                return Err(LaunchpadError::DivisionByZero.into());
            }
            // Simplified exponential calculation
            let exp_factor = supply / curve_params.step;
            let price = curve_params.base_price * curve_params.slope.pow(exp_factor as u32);
            Ok(price)
        }
        CurveType::Custom => {
            Err(LaunchpadError::InvalidCurveParams.into())
        }
    }
}