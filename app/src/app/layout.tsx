"use client";

import { useMemo } from "react";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    BackpackWalletAdapter,
} from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";

import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";

const RPC_URL =
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            new BackpackWalletAdapter(),
        ],
        []
    );

    return (
        <html lang="en" className="dark">
            <head>
                <title>Private Perps — Trade Without Revealing Your Hand</title>
                <meta
                    name="description"
                    content="Privacy-preserving perpetuals trading on Solana. Your positions, entries, and leverage stay encrypted end-to-end with Arcium MPC."
                />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔐</text></svg>" />
            </head>
            <body className="min-h-screen bg-surface-900">
                <ConnectionProvider endpoint={RPC_URL}>
                    <WalletProvider wallets={wallets} autoConnect>
                        <WalletModalProvider>
                            {/* Navigation */}
                            <nav className="fixed top-0 left-0 right-0 z-40 bg-surface-900/80 backdrop-blur-xl border-b border-surface-700/30">
                                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                                    <div className="flex items-center justify-between h-16">
                                        {/* Logo */}
                                        <Link
                                            href="/"
                                            className="flex items-center gap-2.5 group"
                                        >
                                            <span className="text-xl">🔐</span>
                                            <span className="font-bold text-lg text-surface-100 group-hover:text-accent transition-colors">
                                                Private Perps
                                            </span>
                                        </Link>

                                        {/* Nav Links */}
                                        <div className="hidden sm:flex items-center gap-1">
                                            <NavLink href="/trade">Trade</NavLink>
                                            <NavLink href="/positions">Positions</NavLink>
                                            <NavLink href="/history">History</NavLink>
                                        </div>

                                        {/* Wallet */}
                                        <WalletButton />
                                    </div>
                                </div>

                                {/* Mobile Nav */}
                                <div className="sm:hidden border-t border-surface-700/20">
                                    <div className="flex justify-around py-2">
                                        <NavLink href="/trade" mobile>
                                            Trade
                                        </NavLink>
                                        <NavLink href="/positions" mobile>
                                            Positions
                                        </NavLink>
                                        <NavLink href="/history" mobile>
                                            History
                                        </NavLink>
                                    </div>
                                </div>
                            </nav>

                            {/* Main Content */}
                            <main className="pt-16 sm:pt-16 min-h-screen">{children}</main>
                        </WalletModalProvider>
                    </WalletProvider>
                </ConnectionProvider>
            </body>
        </html>
    );
}

function NavLink({
    href,
    children,
    mobile,
}: {
    href: string;
    children: React.ReactNode;
    mobile?: boolean;
}) {
    return (
        <Link
            href={href}
            className={`
        font-medium transition-all duration-200
        ${mobile
                    ? "text-sm text-surface-400 hover:text-surface-100 py-1 px-3"
                    : "text-sm text-surface-400 hover:text-surface-100 px-3 py-2 rounded-lg hover:bg-surface-700/30"
                }
      `}
        >
            {children}
        </Link>
    );
}
