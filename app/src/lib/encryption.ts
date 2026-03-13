import { RescueCipher } from "@arcium-hq/client";
import { encryptU8, encryptU64 } from "./arcium";
import type { TradeInput } from "@/types";
import { SIDE_IDS, ASSET_IDS } from "@/types";

/** Scale factor for USD amounts (6 decimal places) */
const USD_SCALE = 1_000_000n;

/** Scale factor for prices (6 decimal places) */
const PRICE_SCALE = 1_000_000n;

/** Scale a USD amount (float) to on-chain representation */
export function scaleUsd(amount: number): bigint {
    return BigInt(Math.round(amount * Number(USD_SCALE)));
}

/** Scale a price (float) to on-chain representation */
export function scalePrice(price: number): bigint {
    return BigInt(Math.round(price * Number(PRICE_SCALE)));
}

/** Unscale a USD amount from on-chain representation */
export function unscaleUsd(scaled: bigint): number {
    return Number(scaled) / Number(USD_SCALE);
}

/** Encrypt position inputs for the open_position circuit */
export function encryptPositionInputs(
    cipher: RescueCipher,
    input: TradeInput,
    entryPrice: number
): {
    encryptedSide: Uint8Array;
    encryptedSizeUsd: Uint8Array;
    encryptedEntryPrice: Uint8Array;
    encryptedLeverage: Uint8Array;
} {
    return {
        encryptedSide: encryptU8(cipher, SIDE_IDS[input.side]),
        encryptedSizeUsd: encryptU64(cipher, scaleUsd(input.sizeUsd)),
        encryptedEntryPrice: encryptU64(cipher, scalePrice(entryPrice)),
        encryptedLeverage: encryptU8(cipher, input.leverage),
    };
}

/** Encrypt a price value for liquidation check or close position */
export function encryptPrice(
    cipher: RescueCipher,
    price: number
): Uint8Array {
    return encryptU64(cipher, scalePrice(price));
}

/** Decrypt a PnL result from MPC output */
export function decryptPnlResult(
    cipher: RescueCipher,
    ciphertext: Uint8Array,
    nonce: bigint
): {
    realizedPnl: number;
    isProfit: boolean;
} {
    const decrypted = cipher.decrypt(ciphertext, nonce);
    const view = new DataView(decrypted.buffer, decrypted.byteOffset);
    const realizedPnlScaled = view.getBigUint64(0, true);
    const isProfit = decrypted[8] === 1;

    return {
        realizedPnl: unscaleUsd(realizedPnlScaled),
        isProfit,
    };
}

/** Decrypt a liquidation check result from MPC output */
export function decryptLiquidationResult(
    cipher: RescueCipher,
    ciphertext: Uint8Array,
    nonce: bigint
): boolean {
    const decrypted = cipher.decrypt(ciphertext, nonce);
    return decrypted[0] === 1;
}
