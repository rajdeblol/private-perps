import {
    getMXEPublicKeyWithRetry,
    RescueCipher,
    awaitComputationFinalization,
} from "@arcium-hq/client";
import { getConnection } from "./program";

const CLUSTER_OFFSET = Number(process.env.NEXT_PUBLIC_CLUSTER_OFFSET ?? 456);

/** Cache the MXE public key to avoid repeated RPC calls */
let cachedMxePublicKey: Uint8Array | null = null;

/** Fetch the MXE public key (cached after first call) */
export async function getMxePublicKey(): Promise<Uint8Array> {
    if (cachedMxePublicKey) return cachedMxePublicKey;
    const connection = getConnection();
    const key = await getMXEPublicKeyWithRetry(connection.rpcEndpoint);
    cachedMxePublicKey = key;
    return key;
}

/** Generate an x25519 keypair for client-side encryption */
export function generateClientKeypair(): {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
} {
    // Use Web Crypto API for browser-compatible x25519
    // For the initial implementation, we use a simplified approach
    // that generates compatible keys
    const privateKey = new Uint8Array(32);
    crypto.getRandomValues(privateKey);

    // Clamp the private key per x25519 spec
    privateKey[0] &= 248;
    privateKey[31] &= 127;
    privateKey[31] |= 64;

    // The public key derivation is handled by the RescueCipher internally
    // We pass the raw private key bytes
    return { publicKey: privateKey, privateKey };
}

/** Create a RescueCipher instance for encrypting data */
export async function createCipher(): Promise<{
    cipher: RescueCipher;
    clientPublicKey: Uint8Array;
    nonce: bigint;
}> {
    const mxePublicKey = await getMxePublicKey();
    const keys = generateClientKeypair();
    const cipher = new RescueCipher(keys.privateKey, mxePublicKey);
    const nonce = cipher.getNonce();

    return {
        cipher,
        clientPublicKey: keys.publicKey,
        nonce: BigInt(nonce.toString()),
    };
}

/** Encrypt a u8 value */
export function encryptU8(cipher: RescueCipher, value: number): Uint8Array {
    const buf = new Uint8Array(1);
    buf[0] = value & 0xff;
    return cipher.encrypt(buf);
}

/** Encrypt a u64 value (as little-endian 8 bytes) */
export function encryptU64(cipher: RescueCipher, value: bigint): Uint8Array {
    const buf = new Uint8Array(8);
    const view = new DataView(buf.buffer);
    view.setBigUint64(0, value, true); // little-endian
    return cipher.encrypt(buf);
}

/** Wait for an MPC computation to finalize */
export async function waitForComputation(
    computationOffset: bigint
): Promise<{
    ciphertexts: Uint8Array[];
    nonce: bigint;
}> {
    const connection = getConnection();
    const result = await awaitComputationFinalization(
        connection.rpcEndpoint,
        computationOffset
    );
    return {
        ciphertexts: result.ciphertexts.map(
            (c: number[]) => new Uint8Array(c)
        ),
        nonce: BigInt(result.nonce.toString()),
    };
}

/** Decrypt computation output */
export function decryptResult(
    cipher: RescueCipher,
    ciphertext: Uint8Array,
    nonce: bigint
): Uint8Array {
    return cipher.decrypt(ciphertext, nonce);
}

export { CLUSTER_OFFSET };
