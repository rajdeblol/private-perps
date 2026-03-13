"use client";

import { useState, useCallback } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { createCipher, waitForComputation } from "@/lib/arcium";
import { encryptPrice, decryptPnlResult } from "@/lib/encryption";
import { getProgram } from "@/lib/program";
import { fetchPrice } from "@/lib/prices";
import type { Position, MpcState, PnlResult, Asset } from "@/types";

const IDL: Record<string, unknown> = {};

export function usePnl() {
    const wallet = useAnchorWallet();
    const [mpcState, setMpcState] = useState<MpcState>({
        stage: "idle",
        message: "",
    });
    const [pnlResult, setPnlResult] = useState<PnlResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    /** Close a position and reveal the PnL */
    const closePosition = useCallback(
        async (position: Position) => {
            if (!wallet) throw new Error("Wallet not connected");

            setIsLoading(true);
            setPnlResult(null);

            try {
                // Stage 1: Encrypt exit price
                setMpcState({
                    stage: "encrypting",
                    message: "Securing your data with encryption...",
                });

                const priceData = await fetchPrice(position.asset);
                const { cipher, clientPublicKey, nonce } = await createCipher();
                const encryptedExitPrice = encryptPrice(cipher, priceData.price);

                // Stage 2: Submit close position tx
                setMpcState({
                    stage: "submitting",
                    message: "Sending to Arcium's privacy network...",
                });

                const program = getProgram(wallet, IDL as never);
                const computationOffset = BigInt(Date.now());

                await program.methods
                    .closePosition(
                        new BN(computationOffset.toString()),
                        Array.from(encryptedExitPrice),
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

                const result = await waitForComputation(computationOffset);

                // Stage 4: Decrypt
                setMpcState({
                    stage: "decrypting",
                    message: "Unlocking your results...",
                });

                const pnl = decryptPnlResult(
                    cipher,
                    result.ciphertexts[0],
                    result.nonce
                );
                setPnlResult(pnl);

                setMpcState({ stage: "complete", message: "PnL revealed!" });
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

    /** Reset PnL state */
    const resetPnl = useCallback(() => {
        setPnlResult(null);
        setMpcState({ stage: "idle", message: "" });
    }, []);

    return {
        closePosition,
        resetPnl,
        pnlResult,
        mpcState,
        isLoading,
    };
}
