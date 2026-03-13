use arcis::prelude::*;

/// Encrypted position state — stored on-chain as ciphertexts.
/// Only MPC nodes ever see these values in cleartext during computation.
pub struct PositionState {
    /// 0 = long, 1 = short
    pub side: u8,
    /// Position size in USD (scaled by 1e6 for precision)
    pub size_usd: u64,
    /// Entry price of the asset (scaled by 1e6)
    pub entry_price: u64,
    /// Leverage multiplier (1–100)
    pub leverage: u8,
}

/// Input from the trader — encrypted before submission.
pub struct PositionInput {
    pub side: u8,
    pub size_usd: u64,
    pub entry_price: u64,
    pub leverage: u8,
}

#[encrypted]
mod open_position {
    use super::*;

    /// Takes encrypted trader inputs and produces an encrypted PositionState
    /// stored under MXE encryption — only the MPC network can access it.
    #[instruction]
    pub fn open_position(
        input: Enc<Shared, PositionInput>,
    ) -> Enc<Mxe, PositionState> {
        let input = input.to_arcis();

        let position = PositionState {
            side: input.side,
            size_usd: input.size_usd,
            entry_price: input.entry_price,
            leverage: input.leverage,
        };

        Mxe::from_arcis(position)
    }
}
