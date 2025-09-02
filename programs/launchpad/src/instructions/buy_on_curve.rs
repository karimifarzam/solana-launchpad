use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, MintTo, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::*;
use crate::error::LaunchpadError;
use crate::utils::{calculate_linear_cost, calculate_exponential_cost, calculate_linear_price, calculate_exponential_price, calculate_fee, validate_slippage};

#[derive(Accounts)]
pub struct BuyOnCurve<'info> {
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
    
    /// SOL vault to receive payment
    #[account(
        mut,
        seeds = [b"sol_vault", launchpad.key().as_ref()],
        bump,
    )]
    pub sol_vault: SystemAccount<'info>,
    
    /// Platform fee vault
    #[account(
        mut,
        constraint = platform_fee_vault.key() == global_state.fee_vault @ LaunchpadError::InvalidAccountOwner
    )]
    pub platform_fee_vault: Account<'info, TokenAccount>,
    
    /// Trader's token account to receive tokens
    #[account(
        init_if_needed,
        payer = trader,
        associated_token::mint = mint,
        associated_token::authority = trader,
    )]
    pub trader_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub trader: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<BuyOnCurve>,
    amount_sol: u64,
    min_tokens_out: u64,
    max_slippage_bps: u16,
) -> Result<()> {
    // Validate platform is not paused
    if ctx.accounts.global_state.paused {
        return Err(LaunchpadError::PlatformPaused.into());
    }
    
    // Validate minimum SOL amount
    if amount_sol == 0 {
        return Err(LaunchpadError::InsufficientSolAmount.into());
    }
    
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let launchpad = &mut ctx.accounts.launchpad;
    let global_state = &ctx.accounts.global_state;
    
    // Calculate fees
    let platform_fee = calculate_fee(amount_sol, global_state.platform_fee_bps)?;
    let creator_fee = calculate_fee(amount_sol, launchpad.creator_fee_bps)?;
    let total_fees = platform_fee.checked_add(creator_fee)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    
    let net_sol_amount = amount_sol.checked_sub(total_fees)
        .ok_or(LaunchpadError::InsufficientSolAmount)?;
    
    // Calculate tokens to mint based on curve
    let current_supply = bonding_curve.supply_sold;
    let tokens_to_mint = calculate_tokens_for_sol_amount(
        net_sol_amount,
        current_supply,
        &bonding_curve.curve_type,
        &bonding_curve.curve_params,
    )?;
    
    // Validate minimum tokens output
    if tokens_to_mint < min_tokens_out {
        return Err(LaunchpadError::MinTokensNotMet.into());
    }
    
    // Validate slippage
    validate_slippage(min_tokens_out, tokens_to_mint, max_slippage_bps)?;
    
    // Check max supply constraint
    let new_supply = current_supply.checked_add(tokens_to_mint)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    if new_supply > bonding_curve.curve_params.max_supply {
        return Err(LaunchpadError::MaxSupplyExceeded.into());
    }
    
    // Transfer SOL from trader to sol_vault
    let transfer_instruction = anchor_lang::system_program::Transfer {
        from: ctx.accounts.trader.to_account_info(),
        to: ctx.accounts.sol_vault.to_account_info(),
    };
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        ),
        net_sol_amount,
    )?;
    
    // Mint tokens to trader
    let launchpad_seeds = &[
        LaunchpadState::SEEDS,
        launchpad.mint.as_ref(),
        &[launchpad.bump],
    ];
    let signer_seeds = &[&launchpad_seeds[..]];
    
    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.trader_token_account.to_account_info(),
            authority: launchpad.to_account_info(),
        },
        signer_seeds,
    );
    
    token::mint_to(mint_ctx, tokens_to_mint)?;
    
    // Update bonding curve state
    bonding_curve.supply_sold = new_supply;
    bonding_curve.sol_reserves = bonding_curve.sol_reserves
        .checked_add(net_sol_amount)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    bonding_curve.fee_collected = bonding_curve.fee_collected
        .checked_add(total_fees)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    
    // Update last price
    bonding_curve.last_price = calculate_current_price(
        new_supply,
        &bonding_curve.curve_type,
        &bonding_curve.curve_params,
    )?;
    
    // TODO: Handle platform fee distribution to fee_vault
    // This would require converting SOL to WSOL and transferring to the vault
    
    msg!("Buy executed successfully");
    msg!("SOL amount: {}", amount_sol);
    msg!("Net SOL (after fees): {}", net_sol_amount);
    msg!("Tokens minted: {}", tokens_to_mint);
    msg!("New supply: {}", new_supply);
    msg!("Current price: {}", bonding_curve.last_price);
    
    Ok(())
}

fn calculate_tokens_for_sol_amount(
    sol_amount: u64,
    current_supply: u64,
    curve_type: &CurveType,
    curve_params: &CurveParams,
) -> Result<u64> {
    match curve_type {
        CurveType::Linear => {
            // For linear curve: P(S) = base_price + slope * S
            // We need to solve: sol_amount = integral from current_supply to (current_supply + tokens)
            // This is a quadratic equation: slope/2 * tokens^2 + (base_price + slope*current_supply) * tokens - sol_amount = 0
            
            let base_price = curve_params.base_price;
            let slope = curve_params.slope;
            
            if slope == 0 {
                // Simple case: constant price
                return Ok(sol_amount / base_price);
            }
            
            let current_price = calculate_linear_price(current_supply, base_price, slope)?;
            let a = slope / 2; // coefficient of tokens^2
            let b = current_price; // coefficient of tokens
            let c = sol_amount; // constant term (negated)
            
            // Quadratic formula: tokens = (-b + sqrt(b^2 + 4*a*c)) / (2*a)
            let discriminant = b.checked_mul(b)
                .ok_or(LaunchpadError::ArithmeticOverflow)?
                .checked_add(4u64.checked_mul(a)
                    .ok_or(LaunchpadError::ArithmeticOverflow)?
                    .checked_mul(c)
                    .ok_or(LaunchpadError::ArithmeticOverflow)?)
                .ok_or(LaunchpadError::ArithmeticOverflow)?;
            
            let sqrt_discriminant = (discriminant as f64).sqrt() as u64;
            let tokens = sqrt_discriminant.checked_sub(b)
                .ok_or(LaunchpadError::ArithmeticUnderflow)?
                .checked_div(2 * a)
                .ok_or(LaunchpadError::DivisionByZero)?;
                
            Ok(tokens)
        }
        CurveType::Exponential => {
            // For exponential curves, we use iterative approximation
            // This is simplified - a more sophisticated implementation would use binary search
            let mut tokens = 0u64;
            let mut accumulated_cost = 0u64;
            let step_size = 1000; // tokens per iteration
            
            while accumulated_cost < sol_amount && tokens < curve_params.max_supply {
                let next_tokens = tokens + step_size;
                let step_cost = calculate_exponential_cost(
                    current_supply + tokens,
                    current_supply + next_tokens,
                    curve_params.base_price,
                    curve_params.slope, // multiplier
                    curve_params.step,
                )?;
                
                if accumulated_cost + step_cost <= sol_amount {
                    tokens = next_tokens;
                    accumulated_cost += step_cost;
                } else {
                    break;
                }
            }
            
            Ok(tokens)
        }
        CurveType::Custom => {
            // Future implementation
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
            calculate_linear_price(supply, curve_params.base_price, curve_params.slope)
        }
        CurveType::Exponential => {
            calculate_exponential_price(
                supply,
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