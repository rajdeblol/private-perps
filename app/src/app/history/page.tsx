"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePosition } from "@/hooks/usePosition";
import { formatPnl } from "@/lib/prices";
import type { ClosedPosition } from "@/types";

export default function HistoryPage() {
    const { connected } = useWallet();
    const { setVisible } = useWalletModal();
    const { positions, loadPositions } = usePosition();
    const [initialLoad, setInitialLoad] = useState(false);

    useEffect(() => {
        if (connected && !initialLoad) {
            loadPositions();
            setInitialLoad(true);
        }
    }, [connected, initialLoad, loadPositions]);

    const closedPositions = positions.filter((p) => !p.isOpen);

    if (!connected) {
        return (
            <div className="max-w-lg mx-auto px-4 pt-24 pb-12 text-center space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto">
                    <svg
                        className="w-10 h-10 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-surface-100">
                    Trade history
                </h1>
                <p className="text-surface-400">
                    Connect your wallet to view your closed positions and realized P&L.
                </p>
                <button
                    onClick={() => setVisible(true)}
                    className="
            px-8 py-3.5 rounded-xl font-bold
            bg-gradient-to-r from-accent to-accent-hover text-white
            shadow-lg shadow-accent/20 hover:shadow-accent/40
            hover:scale-[1.02] transition-all duration-300
          "
                >
                    Connect Wallet
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-100 mb-1">
                    Trade History
                </h1>
                <p className="text-sm text-surface-400">
                    Closed positions with revealed P&L
                </p>
            </div>

            {/* History List */}
            {closedPositions.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-surface-800/50 border border-surface-600/20 flex items-center justify-center mx-auto">
                        <svg
                            className="w-8 h-8 text-surface-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-surface-300">
                        No closed positions yet
                    </h3>
                    <p className="text-sm text-surface-500">
                        Close a position to see your realized P&L here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {closedPositions.map((position, index) => {
                        const closed = position as unknown as ClosedPosition;
                        const hasResolvedPnl =
                            closed.realizedPnl !== undefined;

                        return (
                            <div
                                key={position.positionId}
                                className="
                  bg-surface-800/30 backdrop-blur border border-surface-600/20
                  rounded-2xl p-5 animate-fade-in
                "
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`
                        w-10 h-10 rounded-xl flex items-center justify-center
                        ${position.side === "long"
                                                    ? "bg-profit/10 border border-profit/20"
                                                    : "bg-loss/10 border border-loss/20"
                                                }
                      `}
                                        >
                                            <span
                                                className={`
                          text-sm font-bold
                          ${position.side === "long" ? "text-profit" : "text-loss"}
                        `}
                                            >
                                                {position.side === "long" ? "↑" : "↓"}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-surface-100 text-sm">
                                                Position #{position.positionId + 1} ·{" "}
                                                {position.asset.replace("-PERP", "")}
                                            </h3>
                                            <p className="text-xs text-surface-500">
                                                Opened{" "}
                                                {new Date(
                                                    position.openedAt * 1000
                                                ).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* PnL */}
                                    <div className="text-right">
                                        {hasResolvedPnl ? (
                                            <p
                                                className={`
                          text-lg font-bold
                          ${closed.isProfit ? "text-profit" : "text-loss"}
                        `}
                                            >
                                                {formatPnl(closed.realizedPnl, closed.isProfit)}
                                            </p>
                                        ) : (
                                            <span className="text-sm text-surface-500">
                                                Closed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
