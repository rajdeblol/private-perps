"use client";

import { useState, useCallback } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { createCipher, waitForComputation } from "@/lib/arcium";
import { encryptPositionInputs } from "@/lib/encryption";
import { getProgram, getGlobalStatePda, getPositionPda } from "@/lib/program";
import { fetchPrice } from "@/lib/prices";
import type { TradeInput, MpcState, Position, Asset } from "@/types";
import { ASSET_IDS, SIDE_IDS } from "@/types";

/** IDL placeholder — in production, import the generated IDL */
const IDL: Record<string, unknown> = {};

/** Asset ID to asset name mapping */
const ASSET_NAMES: Record<number, Asset> = {
    0: "SOL-PERP",
    1: "BTC-PERP",
    2: "ETH-PERP",
};

export function usePosition() {
    const wallet = useAnchorWallet();
    const [mpcState, setMpcState] = useState<MpcState>({
        stage: "idle",
        message: "",
    });
    const [positions, setPositions] = useState<Position[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    /** Open a new perpetual position */
    const openPosition = useCallback(
        async (input: TradeInput) => {
            if (!wallet) throw new Error("Wallet not connected");

            setIsLoading(true);
            try {
                // Stage 1: Encrypt
                setMpcState({
                    stage: "encrypting",
                    message: "Securing your data with encryption...",
                });

                const priceData = await fetchPrice(input.asset);
                const { cipher, clientPublicKey, nonce } = await createCipher();
                const encrypted = encryptPositionInputs(
                    cipher,
                    input,
                    priceData.price
                );

                // Stage 2: Submit
                setMpcState({
                    stage: "submitting",
                    message: "Sending to Arcium's privacy network...",
                });

                const program = getProgram(wallet, IDL as never);
                const globalStatePda = getGlobalStatePda();

                const globalState = await program.account.globalState.fetch(
                    globalStatePda
                );
                const positionIndex = (globalState as { positionCount: BN })
                    .positionCount.toNumber();
                const positionPda = getPositionPda(
                    wallet.publicKey,
                    positionIndex
                );

                const computationOffset = BigInt(Date.now());

                await program.methods
                    .openPosition(
                        new BN(computationOffset.toString()),
                        ASSET_IDS[input.asset],
                        SIDE_IDS[input.side],
                        Array.from(encrypted.encryptedSide),
                        Array.from(encrypted.encryptedSizeUsd),
                        Array.from(encrypted.encryptedEntryPrice),
                        Array.from(encrypted.encryptedLeverage),
                        Array.from(clientPublicKey),
                        new BN(nonce.toString())
                    )
                    .accounts({
                        trader: wallet.publicKey,
                        globalState: globalStatePda,
                        position: positionPda,
                    })
                    .rpc();

                // Stage 3: MPC Computing
                setMpcState({
                    stage: "computing",
                    message: "MPC nodes are processing privately...",
                });

                await waitForComputation(computationOffset);

                // Stage 4: Complete
                setMpcState({ stage: "complete", message: "Position opened!" });

                // Refresh positions
                await loadPositions();

                // Reset after delay
                setTimeout(() => {
                    setMpcState({ stage: "idle", message: "" });
                }, 3000);
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

    /** Load all positions for the connected wallet */
    const loadPositions = useCallback(async () => {
        if (!wallet) return;

        const program = getProgram(wallet, IDL as never);
        const globalStatePda = getGlobalStatePda();

        try {
            const globalState = await program.account.globalState.fetch(
                globalStatePda
            );
            const count = (globalState as { positionCount: BN })
                .positionCount.toNumber();
            const loaded: Position[] = [];

            for (let i = 0; i < count; i++) {
                const pda = getPositionPda(wallet.publicKey, i);
                try {
                    const account = await program.account.positionAccount.fetch(pda);
                    const posData = account as {
                        positionId: BN;
                        owner: { toBase58(): string };
                        asset: number;
                        side: number;
                        openedAt: BN;
                        isOpen: boolean;
                    };

                    if (posData.owner.toBase58() === wallet.publicKey.toBase58()) {
                        loaded.push({
                            positionId: posData.positionId.toNumber(),
                            owner: posData.owner.toBase58(),
                            asset: ASSET_NAMES[posData.asset] ?? "SOL-PERP",
                            side: posData.side === 0 ? "long" : "short",
                            openedAt: posData.openedAt.toNumber(),
                            isOpen: posData.isOpen,
                            address: pda.toBase58(),
                        });
                    }
                } catch {
                    // Position account may not exist yet (callback pending)
                    continue;
                }
            }

            setPositions(loaded);
        } catch {
            // Global state may not be initialized yet
            setPositions([]);
        }
    }, [wallet]);

    return {
        openPosition,
        loadPositions,
        positions,
        mpcState,
        isLoading,
    };
}
