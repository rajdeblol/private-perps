"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PositionCard } from "@/components/PositionCard";
import { MpcStatus } from "@/components/MpcStatus";
import { PnlReveal } from "@/components/PnlReveal";
import { usePosition } from "@/hooks/usePosition";
import { usePnl } from "@/hooks/usePnl";
import { useLiquidation } from "@/hooks/useLiquidation";
import type { Position } from "@/types";

export default function PositionsPage() {
    const { connected } = useWallet();
    const { setVisible } = useWalletModal();
    const { positions, loadPositions } = usePosition();
    const {
        closePosition,
        pnlResult,
        resetPnl,
        mpcState: closeMpcState,
        isLoading: closeLoading,
    } = usePnl();
    const {
        checkLiquidation,
        mpcState: liqMpcState,
        isLoading: liqLoading,
    } = useLiquidation();

    const [initialLoad, setInitialLoad] = useState(false);

    useEffect(() => {
        if (connected && !initialLoad) {
            loadPositions();
            setInitialLoad(true);
        }
    }, [connected, initialLoad, loadPositions]);

    const openPositions = positions.filter((p) => p.isOpen);
    const isProcessing = closeLoading || liqLoading;

    // Determine which MPC state to show
    const activeMpcState =
        closeMpcState.stage !== "idle" ? closeMpcState : liqMpcState;

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
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-surface-100">
                    View your positions
                </h1>
                <p className="text-surface-400">
                    Connect your wallet to see your open encrypted positions.
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
            {/* PnL Reveal Modal */}
            {pnlResult && <PnlReveal result={pnlResult} onDismiss={resetPnl} />}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100 mb-1">
                        Open Positions
                    </h1>
                    <p className="text-sm text-surface-400">
                        {openPositions.length} active{" "}
                        {openPositions.length === 1 ? "position" : "positions"}
                    </p>
                </div>
                <button
                    onClick={loadPositions}
                    className="
            p-2.5 rounded-xl bg-surface-700/30 border border-surface-600/20
            text-surface-400 hover:text-surface-100 hover:bg-surface-700/50
            transition-all duration-200
          "
                    title="Refresh positions"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </button>
            </div>

            {/* MPC Status */}
            <MpcStatus state={activeMpcState} />

            {/* Positions Grid */}
            {openPositions.length === 0 ? (
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
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-surface-300">
                        No open positions
                    </h3>
                    <p className="text-sm text-surface-500">
                        Open your first encrypted position from the trading page.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {openPositions.map((position, index) => (
                        <PositionCard
                            key={position.positionId}
                            position={position}
                            index={index}
                            onCheckLiquidation={(p: Position) => checkLiquidation(p)}
                            onClosePosition={(p: Position) => closePosition(p)}
                            isProcessing={isProcessing}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
