# ShadowBid Frontend

React/Vite frontend for ShadowBid, a privacy-preserving blind auction app on Solana using Arcium for encrypted winner comparison.

## What the App Does

- Connects a Solana wallet on devnet
- Creates and starts auctions
- Lets users place one encrypted bid per auction
- Queues Arcium `compare_bids` finalization after an auction ends
- Shows pending Arcium comparison status with manual status refresh
- Displays friendly success/error notifications
- Shows winner, loser, and refund states
- Lets losing bidders claim refunds after Arcium finalization

## Arcium Flow in the UI

The frontend does not manually choose a winner. After an auction ends, the auction detail page exposes a **Finalize with Arcium** action for the supported two-bid demo path.

That action calls the SDK `queueCompareBids` flow, which queues the encrypted comparison and waits for the Solana program to close the auction from Arcium's verified callback. While the comparison is pending, the UI shows the queue transaction and computation offset so users can track what happened.

## Refund Flow

After Arcium closes an auction, losing bidders can claim their refund from either:

- The auction detail page
- The dashboard pending-refunds section

The UI hides refund actions once a bid has already been processed, and the Solana program rejects duplicate refunds.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Configuration

The frontend expects the deployed ShadowBid program ID and devnet RPC settings used by the SDK in `src/lib/shadowbid-sdk.ts` and related config files.

The currently deployed demo is available at:

```bash
https://shadowbid-beta.vercel.app/
```

## Current Constraints

- The finalizer currently supports the two-bid Arcium demo path.
- Bid comparison is protected through Arcium, but Solana escrow transfers still reveal collateral movement on-chain.
- Users should refresh auction status manually after a queued Arcium comparison if the callback has not appeared yet in the UI.
