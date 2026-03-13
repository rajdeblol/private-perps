"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCallback, useMemo } from "react";

export function WalletButton() {
    const { publicKey, disconnect, connecting, connected } = useWallet();
    const { setVisible } = useWalletModal();

    const truncatedAddress = useMemo(() => {
        if (!publicKey) return "";
        const base58 = publicKey.toBase58();
        return `${base58.slice(0, 4)}...${base58.slice(-4)}`;
    }, [publicKey]);

    const handleClick = useCallback(() => {
        if (connected) {
            disconnect();
        } else {
            setVisible(true);
        }
    }, [connected, disconnect, setVisible]);

    return (
        <button
            onClick={handleClick}
            disabled={connecting}
            className={`
        relative group px-5 py-2.5 rounded-xl font-medium text-sm
        transition-all duration-300 ease-out
        ${connected
                    ? "bg-surface-700/60 border border-surface-500/30 text-surface-100 hover:border-accent/50 hover:bg-surface-700/80"
                    : "bg-gradient-to-r from-accent to-accent-hover text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.02]"
                }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
        >
            {/* Glow effect for connect state */}
            {!connected && (
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent to-accent-hover opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
            )}

            <span className="relative flex items-center gap-2">
                {connecting ? (
                    <>
                        <svg
                            className="animate-spin h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                        Connecting...
                    </>
                ) : connected ? (
                    <>
                        <span className="w-2 h-2 rounded-full bg-profit animate-pulse" />
                        {truncatedAddress}
                    </>
                ) : (
                    <>
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
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                        Get Started
                    </>
                )}
            </span>
        </button>
    );
}
