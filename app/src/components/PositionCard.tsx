"use client";

import type { Position } from "@/types";

interface PositionCardProps {
    position: Position;
    index: number;
    onCheckLiquidation: (position: Position) => void;
    onClosePosition: (position: Position) => void;
    isProcessing: boolean;
}

export function PositionCard({
    position,
    index,
    onCheckLiquidation,
    onClosePosition,
    isProcessing,
}: PositionCardProps) {
    const openedDate = new Date(position.openedAt * 1000);
    const timeAgo = getTimeAgo(openedDate);

    return (
        <div
            className="
        group bg-surface-800/40 backdrop-blur-xl border border-surface-600/20
        rounded-2xl p-5 transition-all duration-300
        hover:border-surface-500/30 hover:bg-surface-800/60
        animate-fade-in
      "
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {/* Privacy Shield Icon */}
                    <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <svg
                            className="w-5 h-5 text-accent"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold text-surface-100">
                            Position #{position.positionId + 1}
                        </h3>
                        <p className="text-xs text-surface-400">{timeAgo}</p>
                    </div>
                </div>

                {/* Side Badge */}
                <span
                    className={`
            px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider
            ${position.side === "long"
                            ? "bg-profit/15 text-profit border border-profit/20"
                            : "bg-loss/15 text-loss border border-loss/20"
                        }
          `}
                >
                    {position.side === "long" ? "↑ Long" : "↓ Short"}
                </span>
            </div>

            {/* Asset & Privacy Info */}
            <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-surface-400">Asset</span>
                    <span className="text-sm font-semibold text-surface-100">
                        {position.asset.replace("-PERP", "")}
                    </span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-sm text-surface-400">Size & Entry</span>
                    <div className="flex items-center gap-1.5">
                        <svg
                            className="w-3.5 h-3.5 text-accent"
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
                        <span className="text-sm font-medium text-accent">
                            Private
                        </span>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-sm text-surface-400">Leverage</span>
                    <div className="flex items-center gap-1.5">
                        <svg
                            className="w-3.5 h-3.5 text-accent"
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
                        <span className="text-sm font-medium text-accent">
                            Private
                        </span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={() => onCheckLiquidation(position)}
                    disabled={isProcessing}
                    className="
            flex-1 py-2.5 rounded-xl text-sm font-medium
            bg-surface-700/40 border border-surface-500/20 text-surface-300
            hover:bg-surface-700/60 hover:text-surface-100 hover:border-surface-400/30
            transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
          "
                >
                    Check Risk
                </button>
                <button
                    onClick={() => onClosePosition(position)}
                    disabled={isProcessing}
                    className="
            flex-1 py-2.5 rounded-xl text-sm font-medium
            bg-accent/10 border border-accent/20 text-accent
            hover:bg-accent/20 hover:border-accent/30
            transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
          "
                >
                    Close Position
                </button>
            </div>
        </div>
    );
}

function getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
