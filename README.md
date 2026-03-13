# 🔐 Private Perps

**Privacy-preserving perpetuals trading on Solana using Arcium MPC.**

> Trade without revealing your hand. Your positions, entries, and leverage stay encrypted end-to-end.

---

## What is Private Perps?

Private Perps is a perpetuals (perps) trading protocol where **trader intent stays private**. Traditional perps expose positions and orders on-chain — enabling front-running, copy-trading, and targeted liquidations. Private Perps eliminates these adversarial behaviors using Arcium's Multi-Party Computation (MPC) network:

- **Positions are submitted encrypted** — size, entry price, and leverage never appear on-chain in cleartext
- **Liquidation checks run inside MPC** — only a boolean "safe/at-risk" is revealed, never the threshold
- **PnL is computed privately** — only the final realized profit/loss is decrypted when a position closes
- **No single party sees your data** — Arcium distributes computation across multiple nodes

### How Arcium Provides Privacy

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  1. Generate x25519 keypair                                     │
│  2. Fetch MXE public key from Solana                            │
│  3. Derive shared secret via ECDH                               │
│  4. Encrypt inputs with RescueCipher                            │
│  5. Submit encrypted data to Solana program                     │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SOLANA PROGRAM (Anchor)                      │
│                                                                 │
│  • Stores encrypted position bytes in PositionAccount           │
│  • Queues computation via queue_computation()                   │
│  • Routes results via callback instructions                     │
│  • Emits events with encrypted ciphertexts                      │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    ARCIUM MPC NETWORK                            │
│                                                                 │
│  • 4+ nodes in the recovery set                                 │
│  • Each node holds a share of the encrypted data                │
│  • Computation happens on shares — no node sees plaintext       │
│  • Results re-encrypted and sent back via callback              │
│  • Honest-majority security guarantee                           │
└──────────────────────────────────────────────────────────────────┘
```

### Architecture

```
private-perps/
├── encrypted-ixs/           ← Arcis MPC circuits (Rust)
│   ├── open_position.rs     ← Encrypted position creation
│   ├── check_liquidation.rs ← Private liquidation threshold check
│   └── close_position.rs   ← Private PnL computation
├── programs/
│   └── private-perps/
│       └── src/lib.rs       ← Anchor Solana program
├── tests/
│   └── private-perps.ts     ← Integration test suite
└── app/                     ← Next.js 14 frontend
    └── src/
        ├── app/             ← Pages (landing, trade, positions, history)
        ├── components/      ← UI components (TradeForm, PnlReveal, etc.)
        ├── hooks/           ← React hooks (usePosition, usePnl, etc.)
        ├── lib/             ← Core modules (arcium, encryption, prices)
        └── types/           ← TypeScript type definitions
```

---

## Setup

### Prerequisites

- **Rust** (1.75+): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Solana CLI** (2.3.0): `sh -c "$(curl -sSfL https://release.anza.xyz/v2.3.0/install)"`
- **Anchor CLI** (0.32.1): `cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.32.1`
- **Arcium CLI**: `cargo install arcium-cli`
- **Node.js** (18+): `https://nodejs.org`
- **Yarn**: `npm install -g yarn`

### 1. Clone & Install

```bash
git clone <repo-url> private-perps
cd private-perps

# Install root dependencies (tests)
yarn install

# Install frontend dependencies
cd app && yarn install && cd ..
```

### 2. Configure Solana

```bash
# Set to devnet
solana config set --url https://api.devnet.solana.com

# Create a keypair (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Airdrop SOL for deployment
solana airdrop 5
```

### 3. Configure Environment

```bash
cp app/.env.example app/.env.local
# Edit app/.env.local with your Helius RPC URL
```

---

## Build & Deploy

### Build the Program

```bash
# Build Arcis circuits + Anchor program
arcium build
```

### Deploy to Devnet

```bash
arcium deploy \
  --cluster-offset 456 \
  --recovery-set-size 4 \
  --keypair-path ~/.config/solana/id.json \
  --rpc-url https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

After deployment, update `NEXT_PUBLIC_PROGRAM_ID` in `app/.env.local` with the deployed program ID.

### Initialize Computation Definitions

After deployment, initialize the three computation definitions (one-time setup):

```bash
# Run via the test suite or a custom script
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/private-perps.ts --grep "init"
```

---

## Run Tests

```bash
# Full integration test suite
yarn test

# Or directly:
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts
```

The test suite covers:
1. Protocol initialization
2. Computation definition initialization (3 circuits)
3. Opening an encrypted long position
4. Checking liquidation risk
5. Closing a position with PnL reveal

---

## Run Frontend

```bash
cd app
yarn dev
```

Open `http://localhost:3000` in your browser.

### Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — "Trade without revealing your hand" |
| `/trade` | Open new encrypted positions |
| `/positions` | View open positions (size & entry hidden) |
| `/history` | Closed positions with revealed P&L |

---

## Deploy Frontend

```bash
cd app
# Deploy to Vercel
npx vercel --prod
```

Or connect the `app/` directory to Vercel via the dashboard.

---

## MPC Circuits

| Circuit | Input | Output | Purpose |
|---------|-------|--------|---------|
| `open_position` | `Enc<Shared, PositionInput>` | `Enc<Mxe, PositionState>` | Creates encrypted position state |
| `check_liquidation` | `Enc<Mxe, PositionState>` + `Enc<Shared, LiquidationInput>` | `Enc<Shared, LiquidationResult>` | Boolean liquidation check |
| `close_position` | `Enc<Mxe, PositionState>` + `Enc<Shared, CloseInput>` | `Enc<Shared, PnlResult>` | Computes realized P&L |

### Encryption Types

- **`Enc<Shared, T>`**: Encrypted with a shared key between client and MXE — client can decrypt the output
- **`Enc<Mxe, T>`**: Encrypted under the MXE key — only the MPC network can access it (position internals)

---

## Security Model

- **Client-side encryption**: All sensitive data is encrypted before leaving the browser
- **MPC computation**: No single node ever sees plaintext values
- **Honest-majority guarantee**: Privacy holds as long as one node in the recovery set is honest
- **On-chain ciphertexts**: Only encrypted bytes are stored on Solana — no cleartext position data
- **Selective reveal**: Only the minimum necessary information is decrypted (boolean for liquidation, PnL for close)

---

## License

MIT
