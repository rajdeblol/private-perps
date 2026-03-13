// ============================================================================
// Types — Private Perps
// ============================================================================

/** Supported perpetual assets */
export type Asset = "SOL-PERP" | "BTC-PERP" | "ETH-PERP";

/** Position side */
export type Side = "long" | "short";

/** Asset ID mapping for on-chain representation */
export const ASSET_IDS: Record<Asset, number> = {
    "SOL-PERP": 0,
    "BTC-PERP": 1,
    "ETH-PERP": 2,
};

/** Side ID mapping for on-chain representation */
export const SIDE_IDS: Record<Side, number> = {
    long: 0,
    short: 1,
};

/** Token mint addresses for price fetching (mainnet, used for price feeds) */
export const ASSET_MINTS: Record<Asset, string> = {
    "SOL-PERP": "So11111111111111111111111111111111111111112",
    "BTC-PERP": "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    "ETH-PERP": "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
};

/** Position as displayed in the UI */
export interface Position {
    /** On-chain position ID */
    positionId: number;
    /** Owner wallet address */
    owner: string;
    /** Asset being traded */
    asset: Asset;
    /** Long or short */
    side: Side;
    /** Unix timestamp when opened */
    openedAt: number;
    /** Whether position is currently open */
    isOpen: boolean;
    /** PDA address of the position account */
    address: string;
}

/** Closed position with revealed PnL */
export interface ClosedPosition extends Position {
    /** Realized PnL in USD */
    realizedPnl: number;
    /** Whether the position was profitable */
    isProfit: boolean;
    /** When the position was closed */
    closedAt: number;
}

/** MPC computation status */
export type MpcStage =
    | "idle"
    | "encrypting"
    | "submitting"
    | "computing"
    | "decrypting"
    | "complete"
    | "error";

/** MPC computation state for UI display */
export interface MpcState {
    stage: MpcStage;
    message: string;
}

/** Stage messages for user-friendly display */
export const MPC_MESSAGES: Record<MpcStage, string> = {
    idle: "",
    encrypting: "Securing your data with encryption...",
    submitting: "Sending to Arcium's privacy network...",
    computing: "MPC nodes are processing privately...",
    decrypting: "Unlocking your results...",
    complete: "Done!",
    error: "Something went wrong. Please try again.",
};

/** Price data from oracle */
export interface PriceData {
    asset: Asset;
    price: number;
    lastUpdated: number;
}

/** Trade form input */
export interface TradeInput {
    asset: Asset;
    side: Side;
    sizeUsd: number;
    leverage: number;
}

/** PnL reveal result after decryption */
export interface PnlResult {
    realizedPnl: number;
    isProfit: boolean;
}

/** Liquidation check result after decryption */
export interface LiquidationResult {
    isLiquidatable: boolean;
}
