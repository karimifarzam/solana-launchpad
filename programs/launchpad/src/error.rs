use anchor_lang::prelude::*;

#[error_code]
pub enum LaunchpadError {
    #[msg("Platform is currently paused")]
    PlatformPaused,
    
    #[msg("Launchpad is not active")]
    LaunchpadNotActive,
    
    #[msg("Launchpad has already graduated")]
    LaunchpadAlreadyGraduated,
    
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Invalid fee percentage - must be between 0-1000 basis points")]
    InvalidFeeBasisPoints,
    
    #[msg("Invalid creator fee - must be between 0-500 basis points")]
    InvalidCreatorFee,
    
    #[msg("Insufficient SOL amount")]
    InsufficientSolAmount,
    
    #[msg("Insufficient token amount")]
    InsufficientTokenAmount,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    
    #[msg("Minimum tokens output not met")]
    MinTokensNotMet,
    
    #[msg("Minimum SOL output not met")]
    MinSolNotMet,
    
    #[msg("Maximum supply exceeded")]
    MaxSupplyExceeded,
    
    #[msg("Graduation criteria not met")]
    GraduationCriteriaNotMet,
    
    #[msg("Invalid curve parameters")]
    InvalidCurveParams,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,
    
    #[msg("Division by zero")]
    DivisionByZero,
    
    #[msg("Price calculation failed")]
    PriceCalculationFailed,
    
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    
    #[msg("Invalid account owner")]
    InvalidAccountOwner,
    
    #[msg("Account not initialized")]
    AccountNotInitialized,
    
    #[msg("Invalid PDA derivation")]
    InvalidPDA,
    
    #[msg("Token name too long - max 32 characters")]
    TokenNameTooLong,
    
    #[msg("Token symbol too long - max 8 characters")]
    TokenSymbolTooLong,
    
    #[msg("Metadata URI too long - max 200 characters")]
    MetadataUriTooLong,
    
    #[msg("Invalid decimals - must be between 0-9")]
    InvalidDecimals,
    
    #[msg("Meteora pool creation failed")]
    MeteoraPoolCreationFailed,
    
    #[msg("Liquidity provision failed")]
    LiquidityProvisionFailed,
    
    #[msg("Invalid time limit - must be in the future")]
    InvalidTimeLimit,
}