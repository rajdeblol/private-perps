"use client";

import { useState, useCallback } from "react";
import type { Asset, Side, TradeInput } from "@/types";

interface TradeFormProps {
    onSubmit: (input: TradeInput) => Promise<void>;
    isLoading: boolean;
    isConnected: boolean;
}

const ASSETS: { id: Asset; label: string; icon: string }[] = [
    { id: "SOL-PERP", label: "SOL", icon: "◎" },
    { id: "BTC-PERP", label: "BTC", icon: "₿" },
    { id: "ETH-PERP", label: "ETH", icon: "Ξ" },
];

export function TradeForm({ onSubmit, isLoading, isConnected }: TradeFormProps) {
    const [asset, setAsset] = useState<Asset>("SOL-PERP");
    const [side, setSide] = useState<Side>("long");
    const [sizeUsd, setSizeUsd] = useState<string>("100");
    const [leverage, setLeverage] = useState<number>(5);

    const handleSubmit = useCallback(async () => {
        const size = parseFloat(sizeUsd);
        if (isNaN(size) || size <= 0) return;

        await onSubmit({
            asset,
            side,
            sizeUsd: size,
            leverage,
        });
    }, [asset, side, sizeUsd, leverage, onSubmit]);

    const effectiveSize = parseFloat(sizeUsd || "0") * leverage;

    return (
        <div className="bg-surface-800/50 backdrop-blur-xl border border-surface-600/30 rounded-2xl p-6 space-y-6">
            {/* Asset Selector */}
            <div>
                <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">
                    Asset
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {ASSETS.map((a) => (
                        <button
                            key={a.id}
                            onClick={() => setAsset(a.id)}
                            className={`
                py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200
                ${asset === a.id
                                    ? "bg-accent/20 border-2 border-accent text-accent shadow-lg shadow-accent/10"
                                    : "bg-surface-700/40 border-2 border-transparent text-surface-300 hover:bg-surface-700/60 hover:text-surface-100"
                                }
              `}
                        >
                            <span className="text-lg">{a.icon}</span>
                            <span className="ml-1.5">{a.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Side Selector */}
            <div>
                <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">
                    Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setSide("long")}
                        className={`
              py-3.5 rounded-xl font-semibold text-sm transition-all duration-200
              ${side === "long"
                                ? "bg-profit/20 border-2 border-profit text-profit shadow-lg shadow-profit/10"
                                : "bg-surface-700/40 border-2 border-transparent text-surface-300 hover:bg-surface-700/60"
                            }
            `}
                    >
                        ↑ Long
                    </button>
                    <button
                        onClick={() => setSide("short")}
                        className={`
              py-3.5 rounded-xl font-semibold text-sm transition-all duration-200
              ${side === "short"
                                ? "bg-loss/20 border-2 border-loss text-loss shadow-lg shadow-loss/10"
                                : "bg-surface-700/40 border-2 border-transparent text-surface-300 hover:bg-surface-700/60"
                            }
            `}
                    >
                        ↓ Short
                    </button>
                </div>
            </div>

            {/* Size Input */}
            <div>
                <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">
                    Size (USD)
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 text-lg font-medium">
                        $
                    </span>
                    <input
                        type="number"
                        value={sizeUsd}
                        onChange={(e) => setSizeUsd(e.target.value)}
                        min="1"
                        max="1000000"
                        step="1"
                        placeholder="100"
                        className="
              w-full pl-9 pr-4 py-3.5 rounded-xl text-lg font-medium
              bg-surface-900/60 border-2 border-surface-600/30 text-surface-100
              placeholder:text-surface-500
              focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10
              transition-all duration-200
            "
                    />
                </div>
                {/* Quick size buttons */}
                <div className="flex gap-2 mt-2">
                    {[100, 500, 1000, 5000].map((size) => (
                        <button
                            key={size}
                            onClick={() => setSizeUsd(size.toString())}
                            className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-surface-700/30 text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-all"
                        >
                            ${size.toLocaleString()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leverage Slider */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                        Leverage
                    </label>
                    <span className="text-accent font-bold text-lg">{leverage}x</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={leverage}
                    onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
                    className="
            w-full h-2 rounded-full appearance-none cursor-pointer
            bg-surface-700
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-accent
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-accent/30
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:hover:scale-110
          "
                />
                <div className="flex justify-between text-xs text-surface-500 mt-1">
                    <span>1x</span>
                    <span>25x</span>
                    <span>50x</span>
                </div>
            </div>

            {/* Effective Size */}
            <div className="bg-surface-900/40 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-surface-400">Effective Position</span>
                    <span className="text-surface-100 font-semibold">
                        ${effectiveSize.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-surface-400">Margin Required</span>
                    <span className="text-surface-100 font-semibold">
                        ${parseFloat(sizeUsd || "0").toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            {/* Privacy Note */}
            <div className="flex items-start gap-2.5 bg-accent/5 border border-accent/10 rounded-xl p-3.5">
                <svg
                    className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                </svg>
                <p className="text-xs text-surface-300 leading-relaxed">
                    Your position size, entry price, and leverage are{" "}
                    <span className="text-accent font-semibold">encrypted end-to-end</span>.
                    No one — not even validators — can see your trading details.
                </p>
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={isLoading || !isConnected || !sizeUsd || parseFloat(sizeUsd) <= 0}
                className={`
          w-full py-4 rounded-xl font-bold text-base
          transition-all duration-300 ease-out
          ${side === "long"
                        ? "bg-gradient-to-r from-profit to-emerald-400 hover:shadow-lg hover:shadow-profit/25"
                        : "bg-gradient-to-r from-loss to-red-400 hover:shadow-lg hover:shadow-loss/25"
                    }
          text-white
          hover:scale-[1.01]
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
        `}
            >
                {isLoading
                    ? "Processing..."
                    : !isConnected
                        ? "Connect wallet to trade"
                        : `Open ${side === "long" ? "Long" : "Short"} — $${parseFloat(sizeUsd || "0").toLocaleString()}`}
            </button>
        </div>
    );
}
