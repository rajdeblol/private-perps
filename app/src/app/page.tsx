"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function LandingPage() {
    const { connected } = useWallet();
    const { setVisible } = useWalletModal();

    return (
        <div className="relative">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-profit/5 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
            </div>

            {/* Hero */}
            <section className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-20">
                <div className="text-center space-y-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium animate-fade-in">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        Powered by Arcium MPC on Solana
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-surface-50 leading-[1.1] animate-fade-in">
                        Trade without
                        <br />
                        <span className="bg-gradient-to-r from-accent via-violet-400 to-indigo-300 bg-clip-text text-transparent">
                            revealing your hand
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="max-w-2xl mx-auto text-lg sm:text-xl text-surface-300 leading-relaxed animate-fade-in">
                        The first perpetuals exchange where your positions, entries, and
                        leverage stay{" "}
                        <span className="text-accent font-semibold">
                            encrypted end-to-end
                        </span>
                        . No front-running. No copy-trading. No targeted liquidations.
                    </p>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
                        {connected ? (
                            <Link
                                href="/trade"
                                className="
                  px-8 py-4 rounded-2xl font-bold text-base
                  bg-gradient-to-r from-accent to-accent-hover text-white
                  shadow-xl shadow-accent/25
                  hover:shadow-accent/40 hover:scale-[1.02]
                  transition-all duration-300
                "
                            >
                                Start Trading →
                            </Link>
                        ) : (
                            <button
                                onClick={() => setVisible(true)}
                                className="
                  px-8 py-4 rounded-2xl font-bold text-base
                  bg-gradient-to-r from-accent to-accent-hover text-white
                  shadow-xl shadow-accent/25
                  hover:shadow-accent/40 hover:scale-[1.02]
                  transition-all duration-300
                "
                            >
                                Get Started →
                            </button>
                        )}
                        <a
                            href="https://arcium.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                px-6 py-4 rounded-2xl font-medium text-sm
                text-surface-300 hover:text-surface-100
                border border-surface-600/30 hover:border-surface-500/50
                transition-all duration-200
              "
                        >
                            Learn about Arcium
                        </a>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20">
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-surface-100 mb-12">
                    How privacy works
                </h2>

                <div className="grid sm:grid-cols-3 gap-6">
                    {[
                        {
                            icon: "🔐",
                            title: "You encrypt",
                            desc: "Position size, entry price, and leverage are encrypted on your device before anything touches the blockchain.",
                        },
                        {
                            icon: "⚡",
                            title: "MPC nodes compute",
                            desc: "Arcium's distributed nodes process your trade on encrypted data. No single node ever sees your position.",
                        },
                        {
                            icon: "🎯",
                            title: "Only results revealed",
                            desc: "When you close a position, only your final profit or loss is decrypted. Everything else stays private forever.",
                        },
                    ].map((step, i) => (
                        <div
                            key={i}
                            className="
                group bg-surface-800/30 backdrop-blur border border-surface-600/20
                rounded-2xl p-6 space-y-4
                hover:border-accent/20 hover:bg-surface-800/50
                transition-all duration-300
                animate-slide-up
              "
                            style={{ animationDelay: `${i * 150}ms` }}
                        >
                            <span className="text-4xl">{step.icon}</span>
                            <h3 className="text-lg font-bold text-surface-100">
                                {step.title}
                            </h3>
                            <p className="text-sm text-surface-400 leading-relaxed">
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Why It Matters */}
            <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20">
                <div className="bg-surface-800/30 backdrop-blur border border-surface-600/20 rounded-3xl p-8 sm:p-12">
                    <h2 className="text-2xl sm:text-3xl font-bold text-surface-100 mb-6">
                        Why does trading privacy matter?
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {[
                            {
                                problem: "Front-running",
                                solution:
                                    "Nobody sees your order before it executes. MEV bots can't extract value from you.",
                            },
                            {
                                problem: "Copy-trading",
                                solution:
                                    "Whales can't track your positions. Your alpha stays yours.",
                            },
                            {
                                problem: "Targeted liquidation",
                                solution:
                                    "Liquidation bots can't see your threshold. They can't push prices to hunt you.",
                            },
                            {
                                problem: "Information leakage",
                                solution:
                                    "Competitors and adversaries learn nothing from watching the chain.",
                            },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-loss/10 border border-loss/20 flex items-center justify-center">
                                    <svg
                                        className="w-4 h-4 text-loss"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-surface-100 mb-1">
                                        No {item.problem}
                                    </h4>
                                    <p className="text-sm text-surface-400">{item.solution}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-surface-100 mb-4">
                    Ready to trade privately?
                </h2>
                <p className="text-surface-400 mb-8 max-w-lg mx-auto">
                    Connect your wallet and open your first encrypted perpetual position
                    on Solana devnet.
                </p>
                {connected ? (
                    <Link
                        href="/trade"
                        className="
              inline-block px-8 py-4 rounded-2xl font-bold text-base
              bg-gradient-to-r from-accent to-accent-hover text-white
              shadow-xl shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02]
              transition-all duration-300
            "
                    >
                        Open Trading Terminal →
                    </Link>
                ) : (
                    <button
                        onClick={() => setVisible(true)}
                        className="
              px-8 py-4 rounded-2xl font-bold text-base
              bg-gradient-to-r from-accent to-accent-hover text-white
              shadow-xl shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02]
              transition-all duration-300
            "
                    >
                        Get Started →
                    </button>
                )}
            </section>

            {/* Footer */}
            <footer className="border-t border-surface-700/30 py-8">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span>🔐</span>
                        <span className="text-sm text-surface-400">Private Perps</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-surface-500">
                        <span>Built on Solana</span>
                        <span>·</span>
                        <span>Powered by Arcium</span>
                        <span>·</span>
                        <span>Devnet</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
