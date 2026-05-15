# ShadowBid - Privacy-Preserving Blind Auctions on Solana

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solana](https://img.shields.io/badge/Solana-1.17-purple.svg)
![Anchor](https://img.shields.io/badge/Anchor-0.29-red.svg)

**ShadowBid** is a decentralized blind auction platform built on Solana, leveraging **Arcium's Multi-Party Computation (MPC)** network to provide privacy-preserving, MEV-resistant auctions with fair price discovery.

## 🎯 Problem Statement

Traditional on-chain auctions suffer from:
- **Bid Visibility**: All bids are publicly visible, enabling bid manipulation
- **MEV Exploitation**: Frontrunning and sandwich attacks extract value from bidders
- **Collusion**: Bidders can coordinate to artificially lower prices
- **Unfair Price Discovery**: Information asymmetry favors sophisticated players

## ✨ Solution: Encrypted Blind Auctions

ShadowBid eliminates these issues using **Arcium's MPC** to:
1. **Encrypt all bids** before submission to the blockchain
2. **Process bids privately** through secure multi-party computation
3. **Reveal only the winner** and winning amount, keeping all other bids private
4. **Provide cryptographic proofs** that results are correct without exposing private data

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│  Arcium Client  │◄────►│  Arcium MPC     │
│  (Encryption)   │      │  Network        │
└────────┬────────┘      └─────────────────┘
         │                        │
         │                        │ Secure Computation
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│  TypeScript SDK │      │   Smart         │
│                 │◄────►│   Contract      │
└─────────────────┘      │   (Solana)      │
                         └─────────────────┘
```

### Key Components

1. **Solana Smart Contract** (`lib.rs`)
   - Manages auction lifecycle (create, start, close, settle)
   - Handles escrow and fund distribution
   - Validates encrypted bids and cryptographic proofs
   - Emits events for transparency

2. **Arcium Integration** (`arcium_integration.rs`)
   - Client-side encryption of bid amounts
   - Zero-knowledge proof generation for bid validity
   - MPC computation coordination for winner determination
   - Proof verification for result authenticity

3. **TypeScript SDK** (`sdk.ts`)
   - High-level API for frontend integration
   - Wallet management and transaction building
   - Event subscription and state management
   - Arcium client wrapper

## 🔐 Privacy Features

### 1. Bid Confidentiality
- All bid amounts encrypted client-side using Arcium
- Only ciphertext stored on-chain
- Smart contract never sees actual bid amounts

### 2. Collusion Resistance
- Bidders cannot see competing bids
- Auction creator cannot see bids until close
- Prevents bid sniping and price manipulation

### 3. MEV Protection
- No information leakage in mempool
- Encrypted bids prevent frontrunning
- MPC computation prevents value extraction

### 4. Fair Price Discovery
- All bids remain hidden until reveal
- Winner determined by MPC without revealing losers
- Only winning bid amount disclosed

### 5. Verifiable Computation
- Zero-knowledge proofs ensure bid validity
- MPC attestations prove correct winner selection
- Anyone can verify results without accessing private data

## 🚀 Why Arcium?

ShadowBid leverages the Arcium MPC network to solve the most critical problems in decentralized auctions:

### 1. Zero Bid Visibility
Current Solana auctions expose bid amounts in the mempool or on-chain state, allowing others to snipe bids or collude. ShadowBid includes an Arcium encrypted-instruction circuit for private bid comparison, stores Arcium ciphertext/proof material with each bid, and queues the `compare_bids` computation through Arcium before closing. The current SPL escrow implementation still records the escrowed collateral amount on-chain, so the next production hardening step is encrypting collateral sizing/reserve handling as well.

### 2. MEV Resistance
By encrypting bids client-side, we eliminate the metadata that Searchers and Validators use to frontrun or sandwich transactions. Your bid is a "shadow" that only reveals its value when the auction effectively closes.

### 3. Fair Price Discovery
Without knowing competing bids, users are incentivized to bid their true valuation. The `encrypted-ixs` crate defines an Arcium circuit that compares encrypted `BidInput` values and reveals only the winning bidder and amount.

### 4. Cryptographic Integrity
Bid submissions carry encrypted bid data, an Arcium public key, and proof bytes. The on-chain program rejects malformed encrypted payloads/proofs, queues encrypted bid pairs into Arcium, and only closes from a signed Arcium callback whose winner matches one of the compared bid accounts.

## 🚀 How Arcium is Used

### Client-Side (Before Blockchain)
```typescript
// 1. User places bid
const bidAmount = 1_000_000_000; // 1 SOL (in lamports)

// 2. Encrypt bid using Arcium client helpers (happens internally in SDK)
// The SDK generates an ephemeral Arcium public key for each bid
// and produces encrypted bid data plus proof/commitment bytes.

// 3. Submit encrypted bid to blockchain
await shadowbidClient.placeBid({
  auctionPda,
  bidAmount, // Escrow collateral amount for the SPL token transfer
  tokenMint: NATIVE_MINT // Native SOL
});
// Internally the SDK calls:
// program.methods.placeBid(
//   new BN(bidAmount), 
//   encryptedBid, 
//   arciumProof, 
//   Buffer.from(arciumPublicKey)
// )
```

### On-Chain (Smart Contract)
```rust
// Smart contract receives encrypted bid
pub fn place_bid(
    ctx: Context<PlaceBid>,
    amount: u64,               // Escrow collateral amount
    encrypted_bid: Vec<u8>,    // Serialized Arcium SharedEncryptedStruct<33>
    arcium_proof: Vec<u8>,     // ZK proof
) -> Result<()> {
    // Reject malformed encrypted bid/proof material
    require!(encrypted_bid.len() == 1104, ErrorCode::InvalidEncryptedBid);
    require!(arcium_proof.len() >= 32, ErrorCode::InvalidProof);
    
    // Store encrypted bid in escrow
    let bid = &mut ctx.accounts.bid;
    bid.encrypted_bid_data = encrypted_bid;
    
    // Transfer funds to escrow
    token::transfer(cpi_ctx, bid_amount)?;
    
    Ok(())
}
```

### Winner Computation (Arcium MPC)
```typescript
// When auction closes, queue a comparison between encrypted bid accounts.
// The Arcium network calls compare_bids_callback with a signed output.
await shadowbidClient.queueCompareBids({
  auctionPda,
  bidAPda,
  bidBPda,
  waitForCallback: true
});
```

The legacy SDK-side winner fallback has been disabled. `closeAuction` no longer accepts a client-selected winner; direct close attempts return `ArciumCallbackRequired`.

## ✅ Current Working Demo Flow

ShadowBid currently supports the full blind-auction lifecycle on Solana devnet:

1. **Create auction** - A creator opens a new auction with item metadata, timing, and reserve information.
2. **Start auction** - The auction becomes active and accepts encrypted bids.
3. **Place encrypted bid** - A bidder locks funds in escrow while the bid comparison payload is stored as Arcium encrypted data.
4. **Finalize with Arcium** - After the auction ends, the frontend queues the `compare_bids` computation through Arcium instead of allowing manual winner selection.
5. **Verified callback closes auction** - Arcium returns the comparison result through the callback path, and the Solana program closes the auction using the verified winner result.
6. **Claim or refund** - The winner can claim the auction outcome, and losing bidders can reclaim their escrowed funds through the refund flow.

The frontend includes user-facing notifications for successful bids, Arcium finalization status, winner/loser outcomes, and pending refunds.

## 🔁 Refund Flow

Losing bidders are not automatically paid back at close. After Arcium finalizes the auction, each losing bidder can claim their own refund from the frontend dashboard or auction detail page.

The program protects refund safety by:

- Rejecting refunds for the winning bid
- Rejecting duplicate refunds for already processed bids
- Returning escrowed funds only to the original bidder
- Updating the bid status after a successful refund

This keeps the auction close path focused on verified winner selection while allowing each losing bidder to recover funds independently.

## ⚠️ Known Privacy Boundary

ShadowBid uses Arcium to protect bid comparison and avoid client-side winner selection. Bid comparison inputs are encrypted and the Solana program no longer accepts an SDK-selected winner.

The current devnet implementation still uses visible Solana escrow transfers for bid collateral. That means observers can see escrow movement on-chain even though the winner comparison is handled through Arcium. A production version should further harden collateral sizing and reserve handling so less economic metadata is visible before finalization.

### Circuit Upload

The repo includes Arcium circuit interface artifacts under `build/` and the source circuit in `encrypted-ixs/`. If `arcium build --skip-program` cannot emit a `.arcis` artifact in your environment, build the circuit in an Arcium-enabled environment and copy the generated files back into `build/`, especially:

```bash
build/compare_bids.arcis
build/compare_bids.idarc
build/compare_bids.hash
build/compare_bids.weight
```

The `compare_bids` circuit is served as a static artifact at:

```bash
https://shadowbid-beta.vercel.app/arcium/compare_bids.arcis
```

After deploying the Solana program, initialize the Arcium computation definition once:

```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=/path/to/wallet.json \
SHADOWBID_PROGRAM_ID=EkfGifLr2z1zyVsqBWekmRnzGcfy45KzdNpSZbFm4yuy \
npm run arcium:init-compare-bids
```

## 📦 Installation

### Prerequisites
- Rust 1.70+
- Solana CLI 1.17+
- Anchor CLI 0.29+
- Node.js 18+
- Yarn or npm

### Setup

# 1. Clone repository
```bash
git clone https://github.com/Ololadestephen/Shadowbid-Arcium
cd shadowbid
```

# 2. Install dependencies
npm install
cd shadowbid-frontend && npm install

3. **Configure Solana**
```bash
# Set network (localnet/devnet/mainnet)
solana config set --url localhost

# Generate keypair (if needed)
solana-keygen new
```

4. **Build program**
```bash
anchor build
```

5. **Deploy program**
```bash
anchor deploy
```

6. **Run tests**
```bash
anchor test
```

## 🎮 Usage Examples

### Create Auction
```typescript
import { ShadowBidClient } from './sdk';
import { NATIVE_MINT } from '@solana/spl-token';

const client = new ShadowBidClient(provider, programId);

const { signature, auctionPda } = await client.createAuction({
  auctionId: 1,
  startTime: new Date(Date.now() + 3600000), // 1 hour from now
  endTime: new Date(Date.now() + 86400000),  // 24 hours from now
  reservePrice: 100_000_000, // 0.1 SOL (in lamports)
  itemName: "Rare NFT",
  itemDescription: "Limited edition digital artwork",
  tokenMint: NATIVE_MINT // Native SOL
});

console.log('Auction created:', signature);
```

### Place Bid
```typescript
const { signature, bidPda } = await client.placeBid({
  auctionPda,
  bidAmount: 150_000_000, // 0.15 SOL
  tokenMint: NATIVE_MINT
});

console.log('Bid placed (encrypted):', signature);
```

### Finalize with Arcium
```typescript
const { signature, finalizeSignature } = await client.queueCompareBids({
  auctionPda,
  bidAPda,
  bidBPda,
  waitForCallback: true
});

console.log('Comparison queued:', signature);
console.log('Arcium callback finalized:', finalizeSignature);
```

The frontend shows the queued transaction and computation offset while the comparison is pending. Users can refresh auction status to confirm whether the verified callback has closed the auction.

### Settle Auction
```typescript
// Winner's bid transferred to auction creator
const signature = await client.settleAuction({
  auctionPda,
  tokenMint: NATIVE_MINT
});

console.log('Auction settled:', signature);
```

### Refund Losing Bids
```typescript
// Each losing bidder can claim refund
const signature = await client.refundBid({
  auctionPda,
  bidderPubkey: loserPublicKey,
  tokenMint: NATIVE_MINT
});

console.log('Bid refunded:', signature);
```

## 🧪 Testing

### Run Unit Tests
```bash
anchor test
```

### Run Integration Tests
```bash
# Start local validator
solana-test-validator

# Run tests in another terminal
anchor test --skip-local-validator
```

### Test Coverage
```bash
cargo tarpaulin --out Html
```

## 📊 Program Structure

### Accounts
- `Auction` - Main auction state (metadata, timing, status)
- `Bid` - Individual encrypted bid with proof
- `Escrow` - Token account holding bid funds

### Instructions
1. `create_auction` - Initialize new auction
2. `place_bid` - Submit encrypted bid
3. `start_auction` - Activate pending auction
4. `compare_bids` - Queue encrypted bid comparison through Arcium
5. `compare_bids_callback` - Close auction from the verified Arcium callback
6. `settle_auction` - Transfer winning bid to creator
7. `refund_bid` - Return funds to losing bidders
8. `cancel_auction` - Cancel auction (if no bids)

### Events
- `AuctionCreated` - New auction initialized
- `AuctionStarted` - Auction activated
- `BidPlaced` - New encrypted bid submitted
- `AuctionClosed` - Winner determined
- `AuctionSettled` - Funds transferred
- `BidRefunded` - Losing bid returned
- `AuctionCancelled` - Auction cancelled

## 🔧 Configuration

### Program ID
Update in `Anchor.toml` and `lib.rs`:
```toml
[programs.localnet]
shadowbid = "EkfGifLr2z1zyVsqBWekmRnzGcfy45KzdNpSZbFm4yuy"
```

### Arcium Endpoint
Configure in SDK initialization:
```typescript
const client = new ShadowBidClient(
  provider,
  new PublicKey('EkfGifLr2z1zyVsqBWekmRnzGcfy45KzdNpSZbFm4yuy')
);
```



## 🛣️ Roadmap

### Phase 1: Core Functionality ✅
- [x] Smart contract development
- [x] Arcium encrypted comparison circuit source
- [x] On-chain encrypted payload/proof validation
- [x] TypeScript SDK
- [x] Unit tests
- [x] Native SOL Support (WSOL Auto-wrapping)

### Phase 2: UX & Frontend ✅
- [x] React web application
- [x] Wallet integration
- [x] Real-time auction dashboard
- [x] **Smart Notifications**: Instant alerts for Wins and Pending Refunds
- [x] **Dashboard 2.0**: Integrated "Pending Refunds" and "Claim Funds" center
- [x] **Rich Media**: Image URL support for all auctions
- [x] Mobile-responsive design

### Phase 3: Advanced Features
- [x] Arcium queue/callback winner finalization for `compare_bids`
- [ ] Multi-token support (SPL Tokens)
- [ ] Batch auctions
- [ ] Reserve price encryption
- [ ] Auction templates

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Arcium** - For providing privacy-preserving MPC infrastructure
- **Solana Foundation** - For the high-performance blockchain
- **Anchor Framework** - For smart contract development tools

## 📞 Contact

- **GitHub**: [@OloladeStephen](https://github.com/Ololadestephen)
- **Twitter**: [@Stephenololade](https://x.com/Stephenololade)

## 🔗 Links

- [Documentation](https://docs.shadowbid.io)
- [Demo Video](https://youtu.be/demo)
- [Arcium Docs](https://docs.arcium.com)
- [Solana Docs](https://docs.solana.com)

---

Built with ❤️ for the Solana ecosystem
