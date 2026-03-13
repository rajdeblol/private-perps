import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  getMXEPublicKeyWithRetry,
  RescueCipher,
  awaitComputationFinalization,
} from "@arcium-hq/client";
import { expect } from "chai";
import * as crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

interface PositionInput {
  side: number;
  sizeUsd: bigint;
  entryPrice: bigint;
  leverage: number;
}

// ============================================================================
// Helpers
// ============================================================================

const CLUSTER_OFFSET = 456;

function generateX25519Keypair(): {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
} {
  const keyPair = crypto.generateKeyPairSync("x25519");
  const publicKey = keyPair.publicKey.export({ type: "spki", format: "der" });
  const privateKey = keyPair.privateKey.export({
    type: "pkcs8",
    format: "der",
  });
  // Extract raw 32-byte keys from DER encoding
  return {
    publicKey: new Uint8Array(publicKey.subarray(publicKey.length - 32)),
    privateKey: new Uint8Array(privateKey.subarray(privateKey.length - 32)),
  };
}

function encryptU8(cipher: RescueCipher, value: number): Uint8Array {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(value, 0);
  return cipher.encrypt(buf);
}

function encryptU64(cipher: RescueCipher, value: bigint): Uint8Array {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value, 0);
  return cipher.encrypt(buf);
}

// ============================================================================
// Test Suite
// ============================================================================

describe("private-perps", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrivatePerps as Program;
  const trader = provider.wallet as anchor.Wallet;
  let computationOffset = BigInt(Date.now());

  // PDAs
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    program.programId
  );

  // ========================================================================
  // Initialize Protocol
  // ========================================================================

  it("Initializes the protocol", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        authority: trader.publicKey,
        globalState: globalStatePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("    ✓ Protocol initialized:", tx);

    const state = await program.account.globalState.fetch(globalStatePda);
    expect(state.authority.toBase58()).to.equal(
      trader.publicKey.toBase58()
    );
    expect(state.positionCount.toNumber()).to.equal(0);
  });

  // ========================================================================
  // Initialize Computation Definitions
  // ========================================================================

  it("Initializes open_position comp def", async () => {
    const tx = await program.methods
      .initOpenPositionCompDef()
      .rpc();

    console.log("    ✓ open_position comp def initialized:", tx);
  });

  it("Initializes check_liquidation comp def", async () => {
    const tx = await program.methods
      .initCheckLiquidationCompDef()
      .rpc();

    console.log("    ✓ check_liquidation comp def initialized:", tx);
  });

  it("Initializes close_position comp def", async () => {
    const tx = await program.methods
      .initClosePositionCompDef()
      .rpc();

    console.log("    ✓ close_position comp def initialized:", tx);
  });

  // ========================================================================
  // Open Position
  // ========================================================================

  it("Opens a long SOL-PERP position", async () => {
    const rpcUrl = provider.connection.rpcEndpoint;

    // Get MXE public key for encryption
    const mxePublicKey = await getMXEPublicKeyWithRetry(rpcUrl);

    // Generate client X25519 keypair
    const clientKeys = generateX25519Keypair();

    // Derive shared secret
    const cipher = new RescueCipher(clientKeys.privateKey, mxePublicKey);

    // Position params: Long 1000 USD SOL at $150, 10x leverage
    const input: PositionInput = {
      side: 0, // long
      sizeUsd: BigInt(1000_000_000), // $1000 scaled 1e6
      entryPrice: BigInt(150_000_000), // $150 scaled 1e6
      leverage: 10,
    };

    // Encrypt inputs
    const encryptedSide = encryptU8(cipher, input.side);
    const encryptedSizeUsd = encryptU64(cipher, input.sizeUsd);
    const encryptedEntryPrice = encryptU64(cipher, input.entryPrice);
    const encryptedLeverage = encryptU8(cipher, input.leverage);
    const nonce = cipher.getNonce();

    computationOffset = BigInt(Date.now());

    const positionCount = (
      await program.account.globalState.fetch(globalStatePda)
    ).positionCount.toNumber();

    const [positionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        trader.publicKey.toBuffer(),
        Buffer.from(
          new Uint8Array(
            new BigUint64Array([BigInt(positionCount)]).buffer
          )
        ),
      ],
      program.programId
    );

    const tx = await program.methods
      .openPosition(
        new anchor.BN(computationOffset.toString()),
        0, // SOL
        0, // long
        Array.from(encryptedSide) as number[],
        Array.from(encryptedSizeUsd) as number[],
        Array.from(encryptedEntryPrice) as number[],
        Array.from(encryptedLeverage) as number[],
        Array.from(clientKeys.publicKey) as number[],
        new anchor.BN(nonce.toString())
      )
      .accounts({
        trader: trader.publicKey,
        globalState: globalStatePda,
        position: positionPda,
      })
      .rpc();

    console.log("    ✓ Position opened (MPC computing...):", tx);

    // Wait for MPC computation to complete
    const result = await awaitComputationFinalization(
      rpcUrl,
      computationOffset
    );

    console.log("    ✓ MPC computation finalized");

    // Verify position account
    const position = await program.account.positionAccount.fetch(positionPda);
    expect(position.isOpen).to.be.true;
    expect(position.owner.toBase58()).to.equal(
      trader.publicKey.toBase58()
    );
    expect(position.asset).to.equal(0);
    expect(position.side).to.equal(0);

    console.log(
      "    ✓ Position verified — encrypted state stored on-chain"
    );
  });

  // ========================================================================
  // Check Liquidation
  // ========================================================================

  it("Checks liquidation risk for position #0", async () => {
    const rpcUrl = provider.connection.rpcEndpoint;
    const mxePublicKey = await getMXEPublicKeyWithRetry(rpcUrl);
    const clientKeys = generateX25519Keypair();
    const cipher = new RescueCipher(clientKeys.privateKey, mxePublicKey);

    // Current price: $145 (SOL dipped slightly)
    const currentPrice = BigInt(145_000_000);
    const encryptedCurrentPrice = encryptU64(cipher, currentPrice);
    const nonce = cipher.getNonce();

    computationOffset = BigInt(Date.now());

    const [positionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        trader.publicKey.toBuffer(),
        Buffer.from(new Uint8Array(new BigUint64Array([BigInt(0)]).buffer)),
      ],
      program.programId
    );

    const tx = await program.methods
      .checkLiquidation(
        new anchor.BN(computationOffset.toString()),
        Array.from(encryptedCurrentPrice) as number[],
        Array.from(clientKeys.publicKey) as number[],
        new anchor.BN(nonce.toString())
      )
      .accounts({
        trader: trader.publicKey,
        position: positionPda,
      })
      .rpc();

    console.log("    ✓ Liquidation check submitted:", tx);

    const result = await awaitComputationFinalization(
      rpcUrl,
      computationOffset
    );

    // Decrypt the result
    const decrypted = cipher.decrypt(
      new Uint8Array(result.ciphertexts[0]),
      result.nonce
    );
    const isLiquidatable = decrypted[0];

    console.log(
      `    ✓ Liquidation result: ${isLiquidatable === 1 ? "LIQUIDATABLE" : "SAFE"}`
    );

    // At $145 with 10x leverage on $150 entry, threshold is $135 — should be safe
    expect(isLiquidatable).to.equal(0);
  });

  // ========================================================================
  // Close Position
  // ========================================================================

  it("Closes position #0 with profit", async () => {
    const rpcUrl = provider.connection.rpcEndpoint;
    const mxePublicKey = await getMXEPublicKeyWithRetry(rpcUrl);
    const clientKeys = generateX25519Keypair();
    const cipher = new RescueCipher(clientKeys.privateKey, mxePublicKey);

    // Exit price: $165 (profit for our long)
    const exitPrice = BigInt(165_000_000);
    const encryptedExitPrice = encryptU64(cipher, exitPrice);
    const nonce = cipher.getNonce();

    computationOffset = BigInt(Date.now());

    const [positionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        trader.publicKey.toBuffer(),
        Buffer.from(new Uint8Array(new BigUint64Array([BigInt(0)]).buffer)),
      ],
      program.programId
    );

    const tx = await program.methods
      .closePosition(
        new anchor.BN(computationOffset.toString()),
        Array.from(encryptedExitPrice) as number[],
        Array.from(clientKeys.publicKey) as number[],
        new anchor.BN(nonce.toString())
      )
      .accounts({
        trader: trader.publicKey,
        position: positionPda,
      })
      .rpc();

    console.log("    ✓ Close position submitted:", tx);

    const result = await awaitComputationFinalization(
      rpcUrl,
      computationOffset
    );

    // Decrypt PnL result
    const pnlBytes = cipher.decrypt(
      new Uint8Array(result.ciphertexts[0]),
      result.nonce
    );
    const realizedPnl = Buffer.from(pnlBytes.subarray(0, 8)).readBigUInt64LE(0);
    const isProfit = pnlBytes[8];

    const pnlUsd = Number(realizedPnl) / 1_000_000;
    console.log(
      `    ✓ PnL Revealed: ${isProfit ? "+" : "-"}$${pnlUsd.toFixed(2)}`
    );

    // Expected: Long $1000 at $150, exit $165, 10x lev
    // PnL = 1000 * 10 * (165-150)/150 = $1000 profit
    expect(isProfit).to.equal(1);

    // Verify position is closed
    const position = await program.account.positionAccount.fetch(positionPda);
    expect(position.isOpen).to.be.false;

    console.log("    ✓ Position closed and marked as not open");
  });
});
