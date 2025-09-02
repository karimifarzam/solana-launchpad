use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("8UvF1rHKk43GzFgtzLbtEQjVW6HyTZukfxyCDPziaMtH");

pub mod state;
pub mod instructions;
pub mod error;
pub mod utils;

use instructions::*;
use state::*;

#[program]
pub mod launchpad {
    use super::*;

    pub fn initialize_global_state(
        ctx: Context<InitializeGlobalState>,
        platform_fee_bps: u16,
    ) -> Result<()> {
        instructions::initialize_global_state::handler(ctx, platform_fee_bps)
    }

    pub fn create_launchpad(
        ctx: Context<CreateLaunchpad>,
        params: CreateLaunchpadParams,
    ) -> Result<()> {
        instructions::create_launchpad::handler(ctx, params)
    }

    pub fn buy_on_curve(
        ctx: Context<BuyOnCurve>,
        amount_sol: u64,
        min_tokens_out: u64,
        max_slippage_bps: u16,
    ) -> Result<()> {
        instructions::buy_on_curve::handler(ctx, amount_sol, min_tokens_out, max_slippage_bps)
    }

    pub fn sell_to_curve(
        ctx: Context<SellToCurve>,
        amount_tokens: u64,
        min_sol_out: u64,
        max_slippage_bps: u16,
    ) -> Result<()> {
        instructions::sell_to_curve::handler(ctx, amount_tokens, min_sol_out, max_slippage_bps)
    }

    pub fn graduate_launchpad(
        ctx: Context<GraduateLaunchpad>,
        meteora_config: MeteoraPoolConfig,
    ) -> Result<()> {
        instructions::graduate_launchpad::handler(ctx, meteora_config)
    }

    pub fn pause_launchpad(ctx: Context<PauseLaunchpad>) -> Result<()> {
        instructions::pause_launchpad::handler(ctx)
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        instructions::withdraw_fees::handler(ctx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::*;
    use crate::state::*;

    #[test]
    fn test_linear_curve_pricing() {
        // P(S) = base_price + slope * S
        let base_price = 1000u64; // 1000 lamports base price
        let slope = 10u64;        // 10 lamports per token increment
        
        // Test pricing at different supply levels
        let price_0 = calculate_linear_price(0, base_price, slope).unwrap();
        assert_eq!(price_0, 1000);
        
        let price_100 = calculate_linear_price(100, base_price, slope).unwrap();
        assert_eq!(price_100, 2000); // 1000 + 10 * 100
        
        let price_1000 = calculate_linear_price(1000, base_price, slope).unwrap();
        assert_eq!(price_1000, 11000); // 1000 + 10 * 1000
    }

    #[test]
    fn test_linear_curve_cost_calculation() {
        let base_price = 1000u64;
        let slope = 10u64;
        
        // Cost to buy first 100 tokens (supply 0 -> 100)
        let cost_0_to_100 = calculate_linear_cost(0, 100, base_price, slope).unwrap();
        // Expected: 1000 * 100 + 10 * (100² - 0²) / 2 = 100000 + 50000 = 150000
        assert_eq!(cost_0_to_100, 150000);
        
        // Cost to buy next 100 tokens (supply 100 -> 200)
        let cost_100_to_200 = calculate_linear_cost(100, 200, base_price, slope).unwrap();
        // Expected: 1000 * 100 + 10 * (200² - 100²) / 2 = 100000 + 10 * 30000 / 2 = 250000
        assert_eq!(cost_100_to_200, 250000);
    }

    #[test]
    fn test_fee_calculations() {
        let amount = 10000u64; // 10000 lamports
        
        // Test 1% fee (100 bps)
        let fee_1_percent = calculate_fee(amount, 100).unwrap();
        assert_eq!(fee_1_percent, 100); // 10000 * 100 / 10000 = 100
        
        // Test 5% fee (500 bps)
        let fee_5_percent = calculate_fee(amount, 500).unwrap();
        assert_eq!(fee_5_percent, 500);
        
        // Test net amount after fee
        let net_amount = calculate_net_amount(amount, 500).unwrap();
        assert_eq!(net_amount, 9500);
    }

    #[test]
    fn test_fixed_point_arithmetic() {
        // Test basic fixed-point conversion
        let value = 100u64;
        let fixed_value = to_fixed(value).unwrap();
        assert_eq!(fixed_value, 100u64 << 32);
        
        let converted_back = from_fixed(fixed_value);
        assert_eq!(converted_back, value);
        
        // Test multiplication
        let a = to_fixed(5).unwrap();
        let b = to_fixed(3).unwrap();
        let result = mul_fixed(a, b).unwrap();
        let result_normal = from_fixed(result);
        assert_eq!(result_normal, 15);
        
        // Test division
        let dividend = to_fixed(15).unwrap();
        let divisor = to_fixed(3).unwrap();
        let quotient = div_fixed(dividend, divisor).unwrap();
        let quotient_normal = from_fixed(quotient);
        assert_eq!(quotient_normal, 5);
    }

    #[test]
    fn test_graduation_criteria() {
        let mut curve_state = BondingCurveState {
            launchpad: Pubkey::default(),
            curve_type: CurveType::Linear,
            curve_params: CurveParams {
                base_price: 1000,
                slope: 10,
                step: 1,
                max_supply: 1000000,
                reserved: [0; 4],
            },
            supply_sold: 50000,
            sol_reserves: 5000000, // 5M lamports = 0.005 SOL
            virtual_sol_reserves: 0,
            virtual_token_reserves: 0,
            fee_collected: 100000,
            last_price: 1500,
            bump: 255,
        };

        // Test SOL raised criteria
        let criteria_sol = GraduationCriteria {
            min_sol_raised: Some(4000000), // 4M lamports
            min_supply_sold: None,
            time_limit: None,
            custom_logic: None,
        };
        
        let meets_criteria = check_graduation_criteria(&curve_state, &criteria_sol, 0);
        assert!(meets_criteria); // 5M > 4M, should pass
        
        // Test supply sold criteria
        let criteria_supply = GraduationCriteria {
            min_sol_raised: None,
            min_supply_sold: Some(60000), // 60k tokens
            time_limit: None,
            custom_logic: None,
        };
        
        let meets_criteria = check_graduation_criteria(&curve_state, &criteria_supply, 0);
        assert!(!meets_criteria); // 50k < 60k, should fail
        
        // Test time-based criteria
        let criteria_time = GraduationCriteria {
            min_sol_raised: None,
            min_supply_sold: None,
            time_limit: Some(1000), // Unix timestamp 1000
            custom_logic: None,
        };
        
        let meets_criteria = check_graduation_criteria(&curve_state, &criteria_time, 1500);
        assert!(meets_criteria); // Current time 1500 > limit 1000, should pass
    }

    #[test]
    fn test_slippage_validation() {
        let expected_amount = 1000u64;
        let actual_amount = 950u64;
        
        // Test with 5% slippage tolerance (500 bps)
        let result = validate_slippage(expected_amount, actual_amount, 500);
        assert!(result.is_ok()); // 5% slippage allows 950 (5% of 1000 = 50, so min = 950)
        
        // Test with 3% slippage tolerance (300 bps)
        let result = validate_slippage(expected_amount, actual_amount, 300);
        assert!(result.is_err()); // 3% slippage only allows down to 970, but we got 950
        
        // Test with exact match requirement
        let result = validate_slippage(expected_amount, expected_amount, 0);
        assert!(result.is_ok()); // Exact match should pass
        
        let result = validate_slippage(expected_amount, actual_amount, 0);
        assert!(result.is_err()); // No slippage tolerance, should fail
    }

    #[test]
    fn test_parameter_validation() {
        let valid_params = CreateLaunchpadParams {
            name: "Test Token".to_string(),
            symbol: "TEST".to_string(),
            uri: "https://example.com/metadata.json".to_string(),
            decimals: 9,
            total_supply: 1000000,
            curve_type: CurveType::Linear,
            curve_params: CurveParams {
                base_price: 1000,
                slope: 10,
                step: 1,
                max_supply: 500000,
                reserved: [0; 4],
            },
            creator_fee_bps: 300,
            graduation_criteria: GraduationCriteria {
                min_sol_raised: Some(1000000),
                min_supply_sold: None,
                time_limit: None,
                custom_logic: None,
            },
        };
        
        // Valid parameters should pass
        assert!(validate_create_params(&valid_params).is_ok());
        
        // Test invalid name (too long)
        let mut invalid_params = valid_params.clone();
        invalid_params.name = "A".repeat(35); // 35 chars > 32 limit
        assert!(validate_create_params(&invalid_params).is_err());
        
        // Test invalid creator fee (too high)
        let mut invalid_params = valid_params.clone();
        invalid_params.creator_fee_bps = 600; // 6% > 5% limit
        assert!(validate_create_params(&invalid_params).is_err());
        
        // Test invalid decimals
        let mut invalid_params = valid_params.clone();
        invalid_params.decimals = 15; // > 9 limit
        assert!(validate_create_params(&invalid_params).is_err());
    }
}