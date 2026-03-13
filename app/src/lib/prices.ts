import type { Asset, PriceData } from "@/types";
import { ASSET_MINTS } from "@/types";

const PRICE_API =
    process.env.NEXT_PUBLIC_PRICE_API ?? "https://api.jup.ag/price/v2";

/** Cache for price data to avoid excessive API calls */
const priceCache: Map<Asset, PriceData> = new Map();
const CACHE_TTL_MS = 10_000; // 10 seconds

/** Fetch the current price for an asset from Jupiter Price API v2 */
export async function fetchPrice(asset: Asset): Promise<PriceData> {
    const cached = priceCache.get(asset);
    if (cached && Date.now() - cached.lastUpdated < CACHE_TTL_MS) {
        return cached;
    }

    const mintAddress = ASSET_MINTS[asset];

    const response = await fetch(`${PRICE_API}?ids=${mintAddress}`, {
        headers: { Accept: "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch price for ${asset}: ${response.statusText}`);
    }

    const data = await response.json();
    const priceInfo = data.data?.[mintAddress];

    if (!priceInfo?.price) {
        throw new Error(`No price data returned for ${asset}`);
    }

    const priceData: PriceData = {
        asset,
        price: parseFloat(priceInfo.price),
        lastUpdated: Date.now(),
    };

    priceCache.set(asset, priceData);
    return priceData;
}

/** Fetch prices for all supported assets */
export async function fetchAllPrices(): Promise<Map<Asset, PriceData>> {
    const assets: Asset[] = ["SOL-PERP", "BTC-PERP", "ETH-PERP"];
    const mintIds = assets.map((a) => ASSET_MINTS[a]).join(",");

    const response = await fetch(`${PRICE_API}?ids=${mintIds}`, {
        headers: { Accept: "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.statusText}`);
    }

    const data = await response.json();
    const result = new Map<Asset, PriceData>();

    for (const asset of assets) {
        const mint = ASSET_MINTS[asset];
        const priceInfo = data.data?.[mint];
        if (priceInfo?.price) {
            const priceData: PriceData = {
                asset,
                price: parseFloat(priceInfo.price),
                lastUpdated: Date.now(),
            };
            priceCache.set(asset, priceData);
            result.set(asset, priceData);
        }
    }

    return result;
}

/** Format a price for display */
export function formatPrice(price: number): string {
    if (price >= 1000) {
        return price.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
    return price.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    });
}

/** Format PnL for display with sign */
export function formatPnl(pnl: number, isProfit: boolean): string {
    const formatted = Math.abs(pnl).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return isProfit ? `+${formatted}` : `-${formatted}`;
}
