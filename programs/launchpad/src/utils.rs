use anchor_lang::prelude::*;
use crate::error::LaunchpadError;
use crate::state::*;

// ============================================================================
// PDA Derivation Functions
// ============================================================================

pub fn find_global_state_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[GlobalState::SEEDS], program_id)
}

pub fn find_launchpad_pda(mint: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[LaunchpadState::SEEDS, mint.as_ref()],
        program_id,
    )
}

pub fn find_bonding_curve_pda(launchpad: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[BondingCurveState::SEEDS, launchpad.as_ref()],
        program_id,
    )
}

pub fn find_creator_profile_pda(creator: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[CreatorProfile::SEEDS, creator.as_ref()],
        program_id,
    )
}

pub fn find_sol_vault_pda(launchpad: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"sol_vault", launchpad.as_ref()],
        program_id,
    )
}

pub fn find_token_vault_pda(launchpad: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"token_vault", launchpad.as_ref()],
        program_id,
    )
}

// ============================================================================
// Fixed-Point Arithmetic Utilities (Q32.32)
// ============================================================================

pub const PRECISION: u64 = 1u64 << 32; // 2^32 for Q32.32 fixed point
pub const MAX_Q32_32: u64 = u64::MAX >> 32; // Maximum value for Q32.32

pub fn to_fixed(value: u64) -> Result<u64> {
    value
        .checked_mul(PRECISION)
        .ok_or(LaunchpadError::ArithmeticOverflow.into())
}

pub fn from_fixed(fixed_value: u64) -> u64 {
    fixed_value / PRECISION
}

pub fn mul_fixed(a: u64, b: u64) -> Result<u64> {
    let a_u128 = a as u128;
    let b_u128 = b as u128;
    let result = a_u128.checked_mul(b_u128)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    
    // Divide by PRECISION to maintain Q32.32 format
    let final_result = result / (PRECISION as u128);
    
    if final_result > u64::MAX as u128 {
        return Err(LaunchpadError::ArithmeticOverflow.into());
    }
    
    Ok(final_result as u64)
}

pub fn div_fixed(a: u64, b: u64) -> Result<u64> {
    if b == 0 {
        return Err(LaunchpadError::DivisionByZero.into());
    }
    
    let a_u128 = (a as u128).checked_mul(PRECISION as u128)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    let result = a_u128 / (b as u128);
    
    if result > u64::MAX as u128 {
        return Err(LaunchpadError::ArithmeticOverflow.into());
    }
    
    Ok(result as u64)
}

pub fn pow_fixed(base: u64, exp: u64) -> Result<u64> {
    if exp == 0 {
        return Ok(to_fixed(1)?);
    }
    if base == 0 {
        return Ok(0);
    }
    
    let mut result = to_fixed(1)?;
    let mut base_power = base;
    let mut exp_remaining = from_fixed(exp);
    
    // Binary exponentiation with fixed-point arithmetic
    while exp_remaining > 0 {
        if exp_remaining & 1 == 1 {
            result = mul_fixed(result, base_power)?;
        }
        base_power = mul_fixed(base_power, base_power)?;
        exp_remaining >>= 1;
    }
    
    Ok(result)
}

// ============================================================================
// Bonding Curve Mathematics
// ============================================================================

pub fn calculate_linear_price(supply: u64, base_price: u64, slope: u64) -> Result<u64> {
    // P(S) = base_price + slope * S
    let slope_term = supply.checked_mul(slope)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    
    base_price.checked_add(slope_term)
        .ok_or(LaunchpadError::ArithmeticOverflow.into())
}

pub fn calculate_linear_cost(
    supply_start: u64,
    supply_end: u64,
    base_price: u64,
    slope: u64,
) -> Result<u64> {
    // Integral: Cost = base_price * ΔS + slope * (S_end² - S_start²) / 2
    if supply_end <= supply_start {
        return Ok(0);
    }
    
    let delta_supply = supply_end - supply_start;
    
    // Base cost: base_price * ΔS
    let base_cost = base_price.checked_mul(delta_supply)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    
    // Slope cost: slope * (S_end² - S_start²) / 2
    let end_squared = supply_end.checked_mul(supply_end)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    let start_squared = supply_start.checked_mul(supply_start)
        .ok_or(LaunchpadError::ArithmeticOverflow)?;
    let delta_squared = end_squared.checked_sub(start_squared)
        .ok_or(LaunchpadError::ArithmeticUnderflow)?;
    let slope_cost = slope.checked_mul(delta_squared)
        .ok_or(LaunchpadError::ArithmeticOverflow)?
        .checked_div(2)
        .ok_or(LaunchpadError::DivisionByZero)?;
    
    base_cost.checked_add(slope_cost)
        .ok_or(LaunchpadError::ArithmeticOverflow.into())
}

pub fn calculate_exponential_price(
    supply: u64,
    base_price: u64,
    multiplier: u64,
    step: u64,
) -> Result<u64> {
    // P(S) = base_price * multiplier^(S/step)
    if step == 0 {
        return Err(LaunchpadError::DivisionByZero.into());
    }
    
    let exponent = div_fixed(to_fixed(supply)?, to_fixed(step)?)?;
    let multiplier_pow = pow_fixed(multiplier, exponent)?;
    mul_fixed(to_fixed(base_price)?, multiplier_pow)
}

pub fn calculate_exponential_cost(
    supply_start: u64,
    supply_end: u64,
    base_price: u64,
    multiplier: u64,
    step: u64,
) -> Result<u64> {
    // Integral approximation using trapezoidal rule for simplicity
    // More sophisticated integration can be implemented later
    if supply_end <= supply_start || step == 0 {
        return Ok(0);
    }
    
    let price_start = calculate_exponential_price(supply_start, base_price, multiplier, step)?;
    let price_end = calculate_exponential_price(supply_end, base_price, multiplier, step)?;
    let avg_price = (price_start + price_end) / 2;
    let delta_supply = supply_end - supply_start;
    
    avg_price.checked_mul(delta_supply)
        .ok_or(LaunchpadError::ArithmeticOverflow.into())
}

// ============================================================================
// Fee Calculation Utilities
// ============================================================================

pub fn calculate_fee(amount: u64, fee_bps: u16) -> Result<u64> {
    if fee_bps == 0 {
        return Ok(0);
    }
    
    if fee_bps > 10000 {
        return Err(LaunchpadError::InvalidFeeBasisPoints.into());
    }
    
    amount.checked_mul(fee_bps as u64)
        .ok_or(LaunchpadError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(LaunchpadError::DivisionByZero.into())
}

pub fn calculate_net_amount(amount: u64, fee_bps: u16) -> Result<u64> {
    let fee = calculate_fee(amount, fee_bps)?;
    amount.checked_sub(fee)
        .ok_or(LaunchpadError::ArithmeticUnderflow.into())
}

// ============================================================================
// Graduation Criteria Validation
// ============================================================================

pub fn check_graduation_criteria(
    curve_state: &BondingCurveState,
    criteria: &GraduationCriteria,
    current_time: i64,
) -> bool {
    // Check SOL raised threshold
    if let Some(min_sol) = criteria.min_sol_raised {
        if curve_state.sol_reserves < min_sol {
            return false;
        }
    }
    
    // Check supply sold threshold
    if let Some(min_supply) = criteria.min_supply_sold {
        if curve_state.supply_sold < min_supply {
            return false;
        }
    }
    
    // Check time limit
    if let Some(time_limit) = criteria.time_limit {
        if current_time < time_limit {
            return false;
        }
    }
    
    // If we reach here, all criteria are met
    true
}

// ============================================================================
// Validation Helpers
// ============================================================================

pub fn validate_create_params(params: &CreateLaunchpadParams) -> Result<()> {
    // Validate name length
    if params.name.len() > 32 {
        return Err(LaunchpadError::TokenNameTooLong.into());
    }
    
    // Validate symbol length
    if params.symbol.len() > 8 {
        return Err(LaunchpadError::TokenSymbolTooLong.into());
    }
    
    // Validate URI length
    if params.uri.len() > 200 {
        return Err(LaunchpadError::MetadataUriTooLong.into());
    }
    
    // Validate decimals
    if params.decimals > 9 {
        return Err(LaunchpadError::InvalidDecimals.into());
    }
    
    // Validate creator fee
    if params.creator_fee_bps > 500 {
        return Err(LaunchpadError::InvalidCreatorFee.into());
    }
    
    // Validate curve parameters
    if params.curve_params.max_supply == 0 || params.curve_params.base_price == 0 {
        return Err(LaunchpadError::InvalidCurveParams.into());
    }
    
    // Validate time limit if set
    if let Some(time_limit) = params.graduation_criteria.time_limit {
        let current_time = Clock::get()?.unix_timestamp;
        if time_limit <= current_time {
            return Err(LaunchpadError::InvalidTimeLimit.into());
        }
    }
    
    Ok(())
}

pub fn validate_slippage(
    expected_amount: u64,
    actual_amount: u64,
    max_slippage_bps: u16,
) -> Result<()> {
    if max_slippage_bps == 0 {
        // No slippage tolerance - amounts must match exactly
        if expected_amount != actual_amount {
            return Err(LaunchpadError::SlippageExceeded.into());
        }
        return Ok(());
    }
    
    let max_deviation = calculate_fee(expected_amount, max_slippage_bps)?;
    let min_acceptable = expected_amount.checked_sub(max_deviation)
        .ok_or(LaunchpadError::ArithmeticUnderflow)?;
    
    if actual_amount < min_acceptable {
        return Err(LaunchpadError::SlippageExceeded.into());
    }
    
    Ok(())
}