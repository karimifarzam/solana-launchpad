use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, InitializeMint};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::*;
use crate::error::LaunchpadError;
use crate::utils::{find_launchpad_pda, find_bonding_curve_pda, find_sol_vault_pda, find_token_vault_pda, validate_create_params};

#[derive(Accounts)]
#[instruction(params: CreateLaunchpadParams)]
pub struct CreateLaunchpad<'info> {
    #[account(
        seeds = [GlobalState::SEEDS],
        bump = global_state.bump,
        has_one = authority @ LaunchpadError::Unauthorized
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + LaunchpadState::LEN,
        seeds = [LaunchpadState::SEEDS, mint.key().as_ref()],
        bump
    )]
    pub launchpad: Account<'info, LaunchpadState>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurveState::LEN,
        seeds = [BondingCurveState::SEEDS, launchpad.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurveState>,
    
    #[account(
        init,
        payer = creator,
        mint::decimals = params.decimals,
        mint::authority = launchpad,
        mint::freeze_authority = launchpad,
    )]
    pub mint: Account<'info, Mint>,
    
    /// SOL vault for collecting payments
    #[account(
        mut,
        seeds = [b"sol_vault", launchpad.key().as_ref()],
        bump,
    )]
    pub sol_vault: SystemAccount<'info>,
    
    /// Token vault for holding tokens for LP provision
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = launchpad,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreateLaunchpad>, params: CreateLaunchpadParams) -> Result<()> {
    // Validate platform is not paused
    if ctx.accounts.global_state.paused {
        return Err(LaunchpadError::PlatformPaused.into());
    }
    
    // Validate parameters
    validate_create_params(&params)?;
    
    let clock = Clock::get()?;
    let launchpad = &mut ctx.accounts.launchpad;
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    
    // Initialize launchpad state
    launchpad.mint = ctx.accounts.mint.key();
    launchpad.creator = ctx.accounts.creator.key();
    launchpad.sol_vault = ctx.accounts.sol_vault.key();
    launchpad.token_vault = ctx.accounts.token_vault.key();
    launchpad.bonding_curve = ctx.accounts.bonding_curve.key();
    launchpad.status = LaunchpadStatus::Active;
    launchpad.creator_fee_bps = params.creator_fee_bps;
    launchpad.total_supply = params.total_supply;
    launchpad.graduation_criteria = params.graduation_criteria;
    launchpad.meteora_pool = None;
    launchpad.created_at = clock.unix_timestamp;
    launchpad.graduated_at = None;
    launchpad.bump = ctx.bumps.launchpad;
    
    // Initialize bonding curve state
    bonding_curve.launchpad = launchpad.key();
    bonding_curve.curve_type = params.curve_type;
    bonding_curve.curve_params = params.curve_params;
    bonding_curve.supply_sold = 0;
    bonding_curve.sol_reserves = 0;
    bonding_curve.virtual_sol_reserves = 0; // Can be set for initial liquidity feel
    bonding_curve.virtual_token_reserves = 0;
    bonding_curve.fee_collected = 0;
    bonding_curve.last_price = params.curve_params.base_price;
    bonding_curve.bump = ctx.bumps.bonding_curve;
    
    // Mint initial token supply to the token vault
    // This will be used for LP provision after graduation
    let launchpad_seeds = &[
        LaunchpadState::SEEDS,
        ctx.accounts.mint.key().as_ref(),
        &[launchpad.bump],
    ];
    let signer_seeds = &[&launchpad_seeds[..]];
    
    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: launchpad.to_account_info(),
        },
        signer_seeds,
    );
    
    token::mint_to(mint_ctx, params.total_supply)?;
    
    msg!("Launchpad created successfully");
    msg!("Mint: {}", ctx.accounts.mint.key());
    msg!("Creator: {}", ctx.accounts.creator.key());
    msg!("Token Name: {}", params.name);
    msg!("Token Symbol: {}", params.symbol);
    msg!("Total Supply: {}", params.total_supply);
    msg!("Curve Type: {:?}", params.curve_type);
    msg!("Base Price: {}", params.curve_params.base_price);
    msg!("Creator Fee: {} bps", params.creator_fee_bps);
    
    Ok(())
}