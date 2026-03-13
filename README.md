# 🔐 Private Perps

perps trading, but your positions are actually private. built on solana + arcium MPC.

the idea is simple — on every other perps dex, your positions, entries, leverage are all visible on-chain. that means:
- MEV bots front-run you
- people copy-trade your entries
- liquidation bots target your exact threshold

**private perps fixes this.** everything is encrypted before it hits the chain. nobody sees what you're trading.

---

## how it works

your browser encrypts the trade data locally (x25519 key exchange + RescueCipher). the encrypted blob goes to a solana program that queues it for arcium's MPC network. multiple nodes compute on the encrypted data — none of them see plaintext. when you close a position, only the final PnL gets decrypted back to you.

thats it. no trust assumptions beyond honest-majority MPC (1 honest node out of 4 = you're safe).

```
Browser (encrypt) → Solana Program (queue) → Arcium MPC (compute on ciphertexts) → Callback (result)
```

### what stays private
- position size ✗ never revealed
- entry price ✗ never revealed  
- leverage ✗ never revealed
- liquidation threshold ✗ only "safe" or "at risk" comes back
- realized pnl ✓ revealed to you when you close

---

## project structure

```
private-perps/
├── encrypted-ixs/            # arcis MPC circuits
│   ├── open_position.rs      # creates encrypted position state
│   ├── check_liquidation.rs  # private liq check (returns bool)
│   └── close_position.rs     # computes PnL privately
├── programs/private-perps/
│   └── src/lib.rs            # anchor program — 10 instructions, callbacks, events
├── tests/
│   └── private-perps.ts      # full integration test
└── app/                      # next.js 14 frontend
    └── src/
        ├── app/              # pages (landing, trade, positions, history)
        ├── components/       # TradeForm, PnlReveal, MpcStatus, etc
        ├── hooks/            # usePosition, usePnl, useLiquidation
        ├── lib/              # arcium client, encryption, prices
        └── types/            # typescript types
```

---

## getting started

### you'll need
- rust 1.75+
- solana cli 2.3.0 — `sh -c "$(curl -sSfL https://release.anza.xyz/v2.3.0/install)"`
- anchor 0.32.1 — `cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.32.1`
- arcium cli — `cargo install arcium-cli`
- node 18+
- yarn

### setup

```bash
git clone https://github.com/rajdeblol/private-perps.git
cd private-perps
yarn install

cd app && yarn install && cd ..
```

configure solana for devnet:
```bash
solana config set --url https://api.devnet.solana.com
solana-keygen new --outfile ~/.config/solana/id.json  # if you don't have one
solana airdrop 5
```

copy the env file and drop in your helius RPC key:
```bash
cp app/.env.example app/.env.local
```

---

## build & deploy

```bash
# builds the arcis circuits + anchor program
arcium build
```

```bash
# deploy to devnet
arcium deploy \
  --cluster-offset 456 \
  --recovery-set-size 4 \
  --keypair-path ~/.config/solana/id.json \
  --rpc-url https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

after deploying, grab the program ID and update `NEXT_PUBLIC_PROGRAM_ID` in `app/.env.local`.

then initialize the computation definitions (one-time thing):
```bash
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/private-perps.ts --grep "init"
```

---

## tests

```bash
yarn test
```

covers the full loop:
1. init protocol
2. init comp defs for all 3 circuits
3. open an encrypted long position
4. check if it's liquidatable (spoiler: it's not)
5. close position and reveal the PnL

---

## run the frontend

```bash
cd app
yarn dev
```

go to `http://localhost:3000`

| page | what it does |
|------|-------------|
| `/` | landing — "trade without revealing your hand" |
| `/trade` | open new positions (encrypted before submit) |
| `/positions` | your open positions (size & entry stay hidden) |
| `/history` | closed positions with revealed PnL |

deploy to vercel:
```bash
cd app && npx vercel --prod
```

---

## the circuits

three MPC circuits handle the core logic:

**open_position** — takes your encrypted side/size/entry/leverage → stores as `Enc<Mxe>` (only MPC can read it)

**check_liquidation** — takes encrypted position + current price → returns `Enc<Shared>` boolean (you can decrypt: safe or not)

**close_position** — takes encrypted position + exit price → returns `Enc<Shared>` PnL result (you decrypt the final number)

the key distinction: `Enc<Mxe, T>` = only the MPC network can touch it. `Enc<Shared, T>` = you can decrypt it client-side with your key.

---

## security

- everything encrypted client-side before it leaves your browser
- MPC nodes only see shares, never plaintext
- honest-majority: privacy holds with just 1 honest node out of 4
- on-chain = only ciphertexts, no cleartext position data
- minimum reveal: liquidation = boolean, close = PnL amount. nothing else.

---

## stack

rust + anchor 0.32.1 · arcis circuits · solana devnet · next.js 14 · tailwind · typescript · jupiter price api · phantom/solflare/backpack wallet support

---

MIT
