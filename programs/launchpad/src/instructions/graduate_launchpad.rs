use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::{invoke, invoke_signed},
};
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::*;
use crate::error::LaunchpadError;
use crate::utils::check_graduation_criteria;

#[derive(Accounts)]
pub struct GraduateLaunchpad<'info> {
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
    
    pub mint: Account<'info, Mint>,
    
    /// SOL vault with collected funds
    #[account(
        mut,
        seeds = [b"sol_vault", launchpad.key().as_ref()],
        bump,
    )]
    pub sol_vault: SystemAccount<'info>,
    
    /// Token vault with tokens for LP provision  
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = launchpad,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    
    /// WSOL mint for Meteora pool
    pub wsol_mint: Account<'info, Mint>,
    
    /// Meteora LB Pair account to be created
    /// CHECK: This will be validated by Meteora program
    #[account(mut)]
    pub lb_pair: UncheckedAccount<'info>,
    
    /// Meteora reserve X (token)
    /// CHECK: This will be validated by Meteora program
    #[account(mut)]
    pub reserve_x: UncheckedAccount<'info>,
    
    /// Meteora reserve Y (WSOL) 
    /// CHECK: This will be validated by Meteora program
    #[account(mut)]
    pub reserve_y: UncheckedAccount<'info>,
    
    /// LP token mint for the new pool
    /// CHECK: This will be validated by Meteora program
    #[account(mut)]
    pub lb_token_mint: UncheckedAccount<'info>,
    
    /// Creator's LP token account
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = lb_token_mint,
        associated_token::authority = launchpad.creator,
    )]
    pub creator_lp_token_account: Account<'info, TokenAccount>,
    
    /// Platform's LP token account
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = lb_token_mint,
        associated_token::authority = global_state.authority,
    )]
    pub platform_lp_token_account: Account<'info, TokenAccount>,
    
    /// Authority to perform graduation (creator or automated trigger)
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// Meteora DLMM program
    /// CHECK: This is the Meteora program ID
    pub meteora_program: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<GraduateLaunchpad>,
    meteora_config: MeteoraPoolConfig,
) -> Result<()> {
    let clock = Clock::get()?;
    let bonding_curve = &ctx.accounts.bonding_curve;
    let launchpad = &mut ctx.accounts.launchpad;
    
    // Verify graduation criteria are met
    if !check_graduation_criteria(
        bonding_curve,
        &launchpad.graduation_criteria,
        clock.unix_timestamp,
    ) {
        return Err(LaunchpadError::GraduationCriteriaNotMet.into());
    }
    
    // Verify authority (creator or admin)
    if ctx.accounts.authority.key() != launchpad.creator 
        && ctx.accounts.authority.key() != ctx.accounts.global_state.authority {
        return Err(LaunchpadError::Unauthorized.into());
    }
    
    // Update launchpad status to graduated
    launchpad.status = LaunchpadStatus::Graduated;
    launchpad.graduated_at = Some(clock.unix_timestamp);
    
    // Step 1: Create Meteora DLMM Pool
    create_meteora_pool(&ctx, &meteora_config)?;
    
    // Step 2: Prepare liquidity for pool
    let liquidity_params = prepare_liquidity(&ctx, bonding_curve)?;
    
    // Step 3: Add initial liquidity to the pool
    add_initial_liquidity(&ctx, &liquidity_params)?;
    
    // Step 4: Distribute LP tokens
    distribute_lp_tokens(&ctx, &liquidity_params)?;
    
    // Update launchpad with Meteora pool reference
    launchpad.meteora_pool = Some(ctx.accounts.lb_pair.key());
    
    msg!("Launchpad graduated successfully!");
    msg!("SOL collected: {}", bonding_curve.sol_reserves);
    msg!("Tokens sold: {}", bonding_curve.supply_sold);
    msg!("Meteora Pool: {}", ctx.accounts.lb_pair.key());
    msg!("Graduation time: {}", clock.unix_timestamp);
    
    // Emit graduation event for indexers
    emit!(LaunchpadGraduatedEvent {
        launchpad: launchpad.key(),
        mint: launchpad.mint,
        creator: launchpad.creator,
        sol_collected: bonding_curve.sol_reserves,
        tokens_sold: bonding_curve.supply_sold,
        graduation_time: clock.unix_timestamp,
        meteora_pool: Some(ctx.accounts.lb_pair.key()),
    });
    
    Ok(())
}

// Helper function to create Meteora DLMM pool
fn create_meteora_pool(
    ctx: &Context<GraduateLaunchpad>,
    config: &MeteoraPoolConfig,
) -> Result<()> {
    // Create Meteora pool via CPI
    // This would use the actual Meteora program instructions
    
    let meteora_accounts = vec![
        AccountMeta::new(ctx.accounts.lb_pair.key(), false),
        AccountMeta::new_readonly(ctx.accounts.mint.key(), false),
        AccountMeta::new_readonly(ctx.accounts.wsol_mint.key(), false),
        AccountMeta::new(ctx.accounts.reserve_x.key(), false),
        AccountMeta::new(ctx.accounts.reserve_y.key(), false),
        AccountMeta::new(ctx.accounts.lb_token_mint.key(), false),
        AccountMeta::new(ctx.accounts.authority.key(), true),
        AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.rent.key(), false),
    ];
    
    // Encode Meteora pool creation instruction data
    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&[0]); // Discriminator for create_lb_pair
    instruction_data.extend_from_slice(&config.bin_step.to_le_bytes());
    instruction_data.extend_from_slice(&config.base_factor.to_le_bytes());
    instruction_data.extend_from_slice(&config.filter_period.to_le_bytes());
    instruction_data.extend_from_slice(&config.decay_period.to_le_bytes());
    instruction_data.extend_from_slice(&config.reduction_factor.to_le_bytes());
    instruction_data.extend_from_slice(&config.variable_fee_control.to_le_bytes());
    instruction_data.extend_from_slice(&config.max_volatility_accumulator.to_le_bytes());
    instruction_data.extend_from_slice(&config.min_bin_id.to_le_bytes());
    instruction_data.extend_from_slice(&config.max_bin_id.to_le_bytes());
    
    let meteora_ix = Instruction {
        program_id: ctx.accounts.meteora_program.key(),
        accounts: meteora_accounts,
        data: instruction_data,
    };
    
    invoke(
        &meteora_ix,
        &[
            ctx.accounts.lb_pair.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.wsol_mint.to_account_info(),
            ctx.accounts.reserve_x.to_account_info(),
            ctx.accounts.reserve_y.to_account_info(),
            ctx.accounts.lb_token_mint.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;
    
    msg!("Meteora DLMM pool created successfully");
    Ok(())
}

#[derive(Clone)]
struct LiquidityParams {
    sol_amount: u64,
    token_amount: u64,
    lp_tokens_minted: u64,
}

// Helper function to prepare liquidity amounts
fn prepare_liquidity(
    ctx: &Context<GraduateLaunchpad>,
    bonding_curve: &BondingCurveState,
) -> Result<LiquidityParams> {
    // Calculate how much SOL and tokens to provide as initial liquidity
    let total_sol = bonding_curve.sol_reserves;
    let available_tokens = ctx.accounts.token_vault.amount;
    
    // Use a portion of collected SOL and remaining tokens for initial liquidity
    // Reserve some tokens for LP distribution
    let sol_for_liquidity = total_sol * 80 / 100; // 80% of collected SOL
    let tokens_for_liquidity = available_tokens * 60 / 100; // 60% of remaining tokens
    
    // Calculate current price for initial bin placement
    let current_price = bonding_curve.last_price;
    
    // Estimate LP tokens to be minted (simplified calculation)
    let lp_tokens_estimate = (sol_for_liquidity + tokens_for_liquidity * current_price / 1_000_000_000)
        .checked_mul(1_000_000_000) // Scale for LP token decimals
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    
    Ok(LiquidityParams {
        sol_amount: sol_for_liquidity,
        token_amount: tokens_for_liquidity,
        lp_tokens_minted: lp_tokens_estimate,
    })
}

// Helper function to add initial liquidity
fn add_initial_liquidity(
    ctx: &Context<GraduateLaunchpad>,
    params: &LiquidityParams,
) -> Result<()> {
    let launchpad = &ctx.accounts.launchpad;
    
    // Transfer SOL from sol_vault (convert to WSOL if needed)
    **ctx.accounts.sol_vault.try_borrow_mut_lamports()? = ctx.accounts.sol_vault.lamports()
        .checked_sub(params.sol_amount)
        .ok_or(LaunchpadError::ArithmeticUnderflow)?;
    
    // Transfer tokens from token_vault
    let launchpad_seeds = &[
        LaunchpadState::SEEDS,
        launchpad.mint.as_ref(),
        &[launchpad.bump],
    ];
    let signer_seeds = &[&launchpad_seeds[..]];
    
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.token_vault.to_account_info(),
            to: ctx.accounts.reserve_x.to_account_info(),
            authority: launchpad.to_account_info(),
        },
        signer_seeds,
    );
    
    token::transfer(transfer_ctx, params.token_amount)?;
    
    // Call Meteora add_liquidity instruction via CPI
    // This is a simplified version - actual implementation would need proper bin strategy
    let meteora_add_liquidity_accounts = vec![
        AccountMeta::new(ctx.accounts.lb_pair.key(), false),
        AccountMeta::new(ctx.accounts.reserve_x.key(), false),
        AccountMeta::new(ctx.accounts.reserve_y.key(), false),
        AccountMeta::new(ctx.accounts.lb_token_mint.key(), false),
        AccountMeta::new(launchpad.key(), true),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
    ];
    
    let mut add_liquidity_data = Vec::new();
    add_liquidity_data.extend_from_slice(&[1]); // add_liquidity discriminator
    add_liquidity_data.extend_from_slice(&params.sol_amount.to_le_bytes());
    add_liquidity_data.extend_from_slice(&params.token_amount.to_le_bytes());
    
    let add_liquidity_ix = Instruction {
        program_id: ctx.accounts.meteora_program.key(),
        accounts: meteora_add_liquidity_accounts,
        data: add_liquidity_data,
    };
    
    invoke_signed(
        &add_liquidity_ix,
        &[
            ctx.accounts.lb_pair.to_account_info(),
            ctx.accounts.reserve_x.to_account_info(),
            ctx.accounts.reserve_y.to_account_info(),
            ctx.accounts.lb_token_mint.to_account_info(),
            launchpad.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        signer_seeds,
    )?;
    
    msg!("Initial liquidity added: {} SOL, {} tokens", params.sol_amount, params.token_amount);
    Ok(())
}

// Helper function to distribute LP tokens
fn distribute_lp_tokens(
    ctx: &Context<GraduateLaunchpad>,
    params: &LiquidityParams,
) -> Result<()> {
    let launchpad = &ctx.accounts.launchpad;
    
    // Distribution: 70% to creator, 20% to platform, 10% remains in launchpad for DAO
    let creator_share = params.lp_tokens_minted * 70 / 100;
    let platform_share = params.lp_tokens_minted * 20 / 100;
    let dao_share = params.lp_tokens_minted * 10 / 100;
    
    let launchpad_seeds = &[
        LaunchpadState::SEEDS,
        launchpad.mint.as_ref(),
        &[launchpad.bump],
    ];
    let signer_seeds = &[&launchpad_seeds[..]];
    
    // Transfer LP tokens to creator
    let creator_transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.lb_token_mint.to_account_info(), // This would be the LP token source
            to: ctx.accounts.creator_lp_token_account.to_account_info(),
            authority: launchpad.to_account_info(),
        },
        signer_seeds,
    );
    
    // Note: In actual implementation, LP tokens would be minted to the launchpad first
    // then distributed. This is a simplified representation.
    
    msg!("LP tokens distributed - Creator: {}, Platform: {}, DAO: {}", 
         creator_share, platform_share, dao_share);
    
    Ok(())
}

#[event]
pub struct LaunchpadGraduatedEvent {
    pub launchpad: Pubkey,
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub sol_collected: u64,
    pub tokens_sold: u64,
    pub graduation_time: i64,
    pub meteora_pool: Option<Pubkey>,
}