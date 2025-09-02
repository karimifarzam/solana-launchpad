use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::LaunchpadError;

#[derive(Accounts)]
pub struct PauseLaunchpad<'info> {
    #[account(
        mut,
        seeds = [GlobalState::SEEDS],
        bump = global_state.bump,
        has_one = authority @ LaunchpadError::Unauthorized
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        seeds = [LaunchpadState::SEEDS, launchpad.mint.as_ref()],
        bump = launchpad.bump
    )]
    pub launchpad: Account<'info, LaunchpadState>,
    
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<PauseLaunchpad>) -> Result<()> {
    let launchpad = &mut ctx.accounts.launchpad;
    
    // Toggle pause state
    match launchpad.status {
        LaunchpadStatus::Active => {
            launchpad.status = LaunchpadStatus::Paused;
            msg!("Launchpad paused: {}", launchpad.key());
        }
        LaunchpadStatus::Paused => {
            launchpad.status = LaunchpadStatus::Active;
            msg!("Launchpad unpaused: {}", launchpad.key());
        }
        LaunchpadStatus::Graduated => {
            return Err(LaunchpadError::LaunchpadAlreadyGraduated.into());
        }
    }
    
    Ok(())
}