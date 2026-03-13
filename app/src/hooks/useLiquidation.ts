"use client";

import { useState, useCallback } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { createCipher, waitForComputation } from "@/lib/arcium";
import { encryptPrice, decryptLiquidationResult } from "@/lib/encryption";
import { getProgram } from "@/lib/program";
import { fetchPrice } from "@/lib/prices";
import type { Position, MpcState, LiquidationResult } from "@/types";

const IDL: Record<string, unknown> = {};

export function useLiquidation() {
    const wallet = useAnchorWallet();
    const [mpcState, setMpcState] = useState<MpcState>({
        stage: "idle",
        message: "",
    });
    const [result, setResult] = useState<LiquidationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    /** Check if a position is at risk of liquidation */
    const checkLiquidation = useCallback(
        async (position: Position) => {
            if (!wallet) throw new Error("Wallet not connected");

            setIsLoading(true);
            setResult(null);

            try {
                // Stage 1: Encrypt current price
                setMpcState({
                    stage: "encrypting",
                    message: "Securing your data with encryption...",
                });

                const priceData = await fetchPrice(position.asset);
                const { cipher, clientPublicKey, nonce } = await createCipher();
                const encryptedCurrentPrice = encryptPrice(
                    cipher,
                    priceData.price
                );

                // Stage 2: Submit liquidation check
                setMpcState({
                    stage: "submitting",
                    message: "Sending to Arcium's privacy network...",
                });

                const program = getProgram(wallet, IDL as never);
                const computationOffset = BigInt(Date.now());

                await program.methods
                    .checkLiquidation(
                        new BN(computationOffset.toString()),
                        Array.from(encryptedCurrentPrice),
                        Array.from(clientPublicKey),
                        new BN(nonce.toString())
                    )
                    .accounts({
                        trader: wallet.publicKey,
                        position: new PublicKey(position.address),
                    })
                    .rpc();

                // Stage 3: Wait for MPC
                setMpcState({
                    stage: "computing",
                    message: "MPC nodes are processing privately...",
                });

                const compResult = await waitForComputation(computationOffset);

                // Stage 4: Decrypt
                setMpcState({
                    stage: "decrypting",
                    message: "Unlocking your results...",
                });

                const isLiquidatable = decryptLiquidationResult(
                    cipher,
                    compResult.ciphertexts[0],
                    compResult.nonce
                );

                setResult({ isLiquidatable });

                setMpcState({
                    stage: "complete",
                    message: isLiquidatable
                        ? "Warning: Position at risk!"
                        : "Position is safe.",
                });

                // Auto-reset after 5 seconds
                setTimeout(() => {
                    setMpcState({ stage: "idle", message: "" });
                }, 5000);
            } catch (error) {
                setMpcState({
                    stage: "error",
                    message:
                        error instanceof Error
                            ? error.message
                            : "Something went wrong. Please try again.",
                });
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [wallet]
    );

    return {
        checkLiquidation,
        result,
        mpcState,
        isLoading,
    };
}
