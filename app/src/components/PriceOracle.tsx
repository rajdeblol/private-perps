"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchAllPrices, formatPrice } from "@/lib/prices";
import type { Asset, PriceData } from "@/types";

export function PriceOracle() {
    const [prices, setPrices] = useState<Map<Asset, PriceData>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    const loadPrices = useCallback(async () => {
        try {
            const data = await fetchAllPrices();
            setPrices(data);
        } catch {
            // Silently fail — prices will retry on next interval
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPrices();
        const interval = setInterval(loadPrices, 10_000);
        return () => clearInterval(interval);
    }, [loadPrices]);

    const assets: {
        id: Asset;
        label: string;
        icon: string;
        color: string;
    }[] = [
            { id: "SOL-PERP", label: "SOL", icon: "◎", color: "from-violet-500 to-indigo-500" },
            { id: "BTC-PERP", label: "BTC", icon: "₿", color: "from-amber-500 to-orange-500" },
            { id: "ETH-PERP", label: "ETH", icon: "Ξ", color: "from-blue-400 to-cyan-400" },
        ];

    if (isLoading) {
        return (
            <div className="flex gap-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="flex-1 h-16 rounded-xl bg-surface-800/40 animate-pulse"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-3">
            {assets.map((asset) => {
                const priceData = prices.get(asset.id);
                return (
                    <div
                        key={asset.id}
                        className="
              flex-1 bg-surface-800/30 backdrop-blur border border-surface-600/20
              rounded-xl p-3.5 transition-all duration-300
              hover:border-surface-500/30
            "
                    >
                        <div className="flex items-center gap-2 mb-1.5">
                            <span
                                className={`
                  w-7 h-7 rounded-lg bg-gradient-to-br ${asset.color}
                  flex items-center justify-center text-white text-xs font-bold
                `}
                            >
                                {asset.icon}
                            </span>
                            <span className="text-sm font-medium text-surface-300">
                                {asset.label}
                            </span>
                        </div>
                        <p className="text-lg font-bold text-surface-100">
                            {priceData ? formatPrice(priceData.price) : "—"}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
