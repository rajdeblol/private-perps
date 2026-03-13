"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { TradeForm } from "@/components/TradeForm";
import { PriceOracle } from "@/components/PriceOracle";
import { MpcStatus } from "@/components/MpcStatus";
import { usePosition } from "@/hooks/usePosition";

export default function TradePage() {
    const { connected } = useWallet();
    const { setVisible } = useWalletModal();
    const { openPosition, mpcState, isLoading } = usePosition();

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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-surface-100">
                    Connect to start trading
                </h1>
                <p className="text-surface-400">
                    Link your Solana wallet to open encrypted perpetual positions.
                    Your trading data stays fully private.
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
                    Open Position
                </h1>
                <p className="text-sm text-surface-400">
                    Your position details are encrypted before they leave your device.
                </p>
            </div>

            {/* Live Prices */}
            <PriceOracle />

            {/* MPC Status */}
            <MpcStatus state={mpcState} />

            {/* Trade Form */}
            <TradeForm
                onSubmit={openPosition}
                isLoading={isLoading}
                isConnected={connected}
            />
        </div>
    );
}
