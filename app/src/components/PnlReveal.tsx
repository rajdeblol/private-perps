"use client";

import { useEffect, useState, useRef } from "react";
import type { PnlResult } from "@/types";

interface PnlRevealProps {
    result: PnlResult;
    onDismiss: () => void;
}

export function PnlReveal({ result, onDismiss }: PnlRevealProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        // Animate the PnL count
        const targetValue = result.realizedPnl;
        const duration = 1500; // 1.5s
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(targetValue * eased);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setIsRevealed(true);
            }
        };

        // Small delay before starting animation
        const timeout = setTimeout(() => {
            animationRef.current = requestAnimationFrame(animate);
        }, 300);

        return () => {
            clearTimeout(timeout);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [result.realizedPnl]);

    const formattedPnl = Math.abs(displayValue).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onDismiss}
            />

            {/* PnL Card */}
            <div
                className={`
          relative z-10 animate-slide-up
          w-full max-w-sm mx-4 p-8 rounded-3xl
          bg-surface-800/90 backdrop-blur-xl border
          ${result.isProfit
                        ? "border-profit/30 shadow-2xl shadow-profit/20"
                        : "border-loss/30 shadow-2xl shadow-loss/20"
                    }
        `}
            >
                {/* Glow */}
                <div
                    className={`
            absolute inset-0 rounded-3xl opacity-20 blur-3xl -z-10
            ${result.isProfit ? "bg-profit" : "bg-loss"}
          `}
                />

                {/* Result Icon */}
                <div className="text-center mb-6">
                    <div
                        className={`
              inline-flex items-center justify-center w-16 h-16 rounded-full mb-4
              ${result.isProfit ? "bg-profit/20" : "bg-loss/20"}
              animate-count-up
            `}
                    >
                        {result.isProfit ? (
                            <svg
                                className="w-8 h-8 text-profit"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-8 h-8 text-loss"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                                />
                            </svg>
                        )}
                    </div>

                    <p className="text-surface-400 text-sm font-medium mb-2">
                        {result.isProfit ? "Nice trade!" : "Better luck next time"}
                    </p>

                    {/* PnL Value */}
                    <div
                        className={`
              text-4xl font-bold tracking-tight
              ${result.isProfit ? "text-profit" : "text-loss"}
              ${isRevealed ? "animate-pulse-slow" : ""}
            `}
                    >
                        {result.isProfit ? "+" : "-"}
                        {formattedPnl}
                    </div>

                    <p className="text-surface-500 text-xs mt-3">
                        Realized P&L after position close
                    </p>
                </div>

                {/* Privacy Note */}
                <div className="bg-surface-900/40 rounded-xl p-3 mb-5">
                    <p className="text-xs text-surface-400 text-center leading-relaxed">
                        Only you can see this result. Your position details remain private
                        on the Arcium network.
                    </p>
                </div>

                {/* Dismiss */}
                <button
                    onClick={onDismiss}
                    className="
            w-full py-3 rounded-xl font-medium text-sm
            bg-surface-700/50 text-surface-200
            hover:bg-surface-700/70 transition-all duration-200
          "
                >
                    Got it
                </button>
            </div>
        </div>
    );
}
