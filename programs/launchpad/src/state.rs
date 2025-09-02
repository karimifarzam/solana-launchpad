use anchor_lang::prelude::*;

// ============================================================================
// Global State Account
// ============================================================================

#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub platform_fee_bps: u16,    // Platform fee in basis points (0-1000 = 0%-10%)
    pub fee_vault: Pubkey,         // Platform fee collection vault
    pub paused: bool,              // Emergency pause state
    pub upgrade_authority: Pubkey, // Program upgrade authority
    pub bump: u8,                  // PDA bump
}

impl GlobalState {
    pub const LEN: usize = 32 + 2 + 32 + 1 + 32 + 1;
    pub const SEEDS: &'static [u8] = b"global_state";
}

// ============================================================================
// Launchpad State Account
// ============================================================================

#[account]
pub struct LaunchpadState {
    pub mint: Pubkey,                    // Token mint
    pub creator: Pubkey,                 // Creator authority
    pub sol_vault: Pubkey,               // SOL collection vault
    pub token_vault: Pubkey,             // Token vault for initial LP
    pub bonding_curve: Pubkey,           // Associated bonding curve PDA
    pub status: LaunchpadStatus,         // Current status
    pub creator_fee_bps: u16,            // Creator fee in basis points
    pub total_supply: u64,               // Total token supply
    pub graduation_criteria: GraduationCriteria, // When to graduate
    pub meteora_pool: Option<Pubkey>,    // Meteora pool address (post-graduation)
    pub created_at: i64,                 // Creation timestamp
    pub graduated_at: Option<i64>,       // Graduation timestamp
    pub bump: u8,                        // PDA bump
}

impl LaunchpadState {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 32 + 1 + 2 + 8 + 64 + 33 + 8 + 9 + 1;
    pub const SEEDS: &'static [u8] = b"launchpad";
}

// ============================================================================
// Bonding Curve State Account  
// ============================================================================

#[account]
pub struct BondingCurveState {
    pub launchpad: Pubkey,          // Parent launchpad
    pub curve_type: CurveType,      // Linear, Exponential, etc.
    pub curve_params: CurveParams,  // Parameters for curve calculation
    pub supply_sold: u64,           // Tokens sold via curve
    pub sol_reserves: u64,          // SOL collected from sales
    pub virtual_sol_reserves: u64,  // Virtual reserves for pricing
    pub virtual_token_reserves: u64,// Virtual token reserves
    pub fee_collected: u64,         // Total fees collected
    pub last_price: u64,            // Last calculated price (cached)
    pub bump: u8,                   // PDA bump
}

impl BondingCurveState {
    pub const LEN: usize = 32 + 1 + 64 + 8 + 8 + 8 + 8 + 8 + 8 + 1;
    pub const SEEDS: &'static [u8] = b"bonding_curve";
}

// ============================================================================
// Enums and Structs
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LaunchpadStatus {
    Active,
    Graduated,
    Paused,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CurveType {
    Linear,
    Exponential,
    Custom, // Future extension
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CurveParams {
    // Linear: P(S) = base_price + slope * S
    // Exponential: P(S) = base_price * multiplier^(S/step)
    pub base_price: u64,      // Base price in lamports per token
    pub slope: u64,           // Linear slope or exponential multiplier (Q32.32)
    pub step: u64,            // Step size for exponential (tokens)
    pub max_supply: u64,      // Maximum supply that can be sold
    pub reserved: [u64; 4],   // Reserved for future parameters
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GraduationCriteria {
    pub min_sol_raised: Option<u64>,      // Minimum SOL to raise
    pub min_supply_sold: Option<u64>,     // Minimum tokens to sell
    pub time_limit: Option<i64>,          // Unix timestamp deadline
    pub custom_logic: Option<Pubkey>,     // Future: custom graduation program
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateLaunchpadParams {
    pub name: String,                     // Token name (max 32 chars)
    pub symbol: String,                   // Token symbol (max 8 chars)
    pub uri: String,                      // Metadata URI (max 200 chars)
    pub decimals: u8,                     // Token decimals
    pub total_supply: u64,                // Total token supply
    pub curve_type: CurveType,            // Bonding curve type
    pub curve_params: CurveParams,        // Curve parameters
    pub creator_fee_bps: u16,             // Creator fee (0-500 = 0%-5%)
    pub graduation_criteria: GraduationCriteria, // Graduation rules
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MeteoraPoolConfig {
    pub bin_step: u16,                    // DLMM bin step (e.g., 25 = 0.25%)
    pub base_factor: u16,                 // Base fee factor
    pub filter_period: u16,               // Volatility filter period
    pub decay_period: u16,                // Fee decay period
    pub reduction_factor: u16,            // Fee reduction factor
    pub variable_fee_control: u32,        // Variable fee control
    pub max_volatility_accumulator: u32,  // Max volatility accumulator
    pub min_bin_id: i32,                  // Minimum bin ID
    pub max_bin_id: i32,                  // Maximum bin ID
}

// ============================================================================
// Creator Profile (Optional Feature)
// ============================================================================

#[account]
pub struct CreatorProfile {
    pub creator: Pubkey,         // Creator wallet
    pub launches_count: u32,     // Total launches created
    pub successful_launches: u32,// Launches that graduated
    pub total_volume: u64,       // Total trading volume
    pub verified: bool,          // Verified creator status
    pub reputation_score: u16,   // Reputation (0-1000)
    pub created_at: i64,         // Profile creation time
    pub bump: u8,                // PDA bump
}

impl CreatorProfile {
    pub const LEN: usize = 32 + 4 + 4 + 8 + 1 + 2 + 8 + 1;
    pub const SEEDS: &'static [u8] = b"creator_profile";
}