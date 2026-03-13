use arcis::prelude::*;

/// Position state encrypted under MXE — matches open_position output.
pub struct PositionState {
    pub side: u8,
    pub size_usd: u64,
    pub entry_price: u64,
    pub leverage: u8,
}

/// Current market price input from the oracle.
pub struct LiquidationInput {
    pub current_price: u64,
}

/// Output: 1 = liquidatable, 0 = safe.
/// Encrypted under Shared so the client can decrypt it.
pub struct LiquidationResult {
    pub is_liquidatable: u8,
}

#[encrypted]
mod check_liquidation {
    use super::*;

    /// Checks if a position should be liquidated at the current price.
    ///
    /// Liquidation formula:
    /// - Long: liquidated if current_price <= entry_price * (1 - 1/leverage)
    ///   i.e. price dropped enough to wipe out the margin
    /// - Short: liquidated if current_price >= entry_price * (1 + 1/leverage)
    ///   i.e. price rose enough to wipe out the margin
    ///
    /// All computation happens inside MPC — the position details are never
    /// revealed. Only a boolean result (liquidatable or not) is output.
    #[instruction]
    pub fn check_liquidation(
        position: Enc<Mxe, PositionState>,
        input: Enc<Shared, LiquidationInput>,
    ) -> Enc<Shared, LiquidationResult> {
        let pos = position.to_arcis();
        let inp = input.to_arcis();

        // Use integer math to avoid floating point:
        // For long: liquidation when current_price * leverage <= entry_price * (leverage - 1)
        // For short: liquidation when current_price * leverage >= entry_price * (leverage + 1)
        let leverage = pos.leverage as u64;
        let current_scaled = inp.current_price * leverage;
        let entry = pos.entry_price;

        let is_liquidatable = if pos.side == 0 {
            // Long position
            let threshold = entry * (leverage - 1);
            if current_scaled <= threshold { 1u8 } else { 0u8 }
        } else {
            // Short position
            let threshold = entry * (leverage + 1);
            if current_scaled >= threshold { 1u8 } else { 0u8 }
        };

        let result = LiquidationResult { is_liquidatable };
        Shared::from_arcis(result)
    }
}
