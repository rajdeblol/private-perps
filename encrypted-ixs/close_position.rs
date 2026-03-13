use arcis::prelude::*;

/// Position state encrypted under MXE — matches open_position output.
pub struct PositionState {
    pub side: u8,
    pub size_usd: u64,
    pub entry_price: u64,
    pub leverage: u8,
}

/// Exit price from oracle.
pub struct CloseInput {
    pub exit_price: u64,
}

/// PnL result — revealed to the trader after computation.
pub struct PnlResult {
    /// Absolute value of profit or loss in USD (scaled 1e6)
    pub realized_pnl: u64,
    /// 1 = profit, 0 = loss
    pub is_profit: u8,
}

#[encrypted]
mod close_position {
    use super::*;

    /// Closes a position and computes realized PnL.
    ///
    /// PnL formula (long):
    ///   pnl = size_usd * leverage * (exit_price - entry_price) / entry_price
    ///   profit if exit_price > entry_price
    ///
    /// PnL formula (short):
    ///   pnl = size_usd * leverage * (entry_price - exit_price) / entry_price
    ///   profit if exit_price < entry_price
    ///
    /// The position internals are never revealed — only the final PnL.
    #[instruction]
    pub fn close_position(
        position: Enc<Mxe, PositionState>,
        input: Enc<Shared, CloseInput>,
    ) -> Enc<Shared, PnlResult> {
        let pos = position.to_arcis();
        let inp = input.to_arcis();

        let leverage = pos.leverage as u64;
        let size = pos.size_usd;
        let entry = pos.entry_price;
        let exit = inp.exit_price;

        // Determine profit/loss direction and compute absolute PnL
        let (pnl_abs, is_profit) = if pos.side == 0 {
            // Long: profit when exit > entry
            if exit >= entry {
                let diff = exit - entry;
                let pnl = size * leverage * diff / entry;
                (pnl, 1u8)
            } else {
                let diff = entry - exit;
                let pnl = size * leverage * diff / entry;
                (pnl, 0u8)
            }
        } else {
            // Short: profit when exit < entry
            if exit <= entry {
                let diff = entry - exit;
                let pnl = size * leverage * diff / entry;
                (pnl, 1u8)
            } else {
                let diff = exit - entry;
                let pnl = size * leverage * diff / entry;
                (pnl, 0u8)
            }
        };

        let result = PnlResult {
            realized_pnl: pnl_abs,
            is_profit,
        };
        Shared::from_arcis(result)
    }
}
