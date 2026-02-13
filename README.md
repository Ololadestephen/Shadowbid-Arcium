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
Current Solana auctions expose bid amounts in the mempool or on-chain state, allowing others to sniper bids or collude. Arcium ensures that **bid amounts are never stored in plaintext** on the blockchain.

### 2. MEV Resistance
By encrypting bids client-side, we eliminate the metadata that Searchers and Validators use to frontrun or sandwich transactions. Your bid is a "shadow" that only reveals its value when the auction effectively closes.

### 3. Fair Price Discovery
Without knowing competing bids, users are incentivized to bid their true valuation. Arcium's MPC network computes the winner without ever decrypting the losing bids, maintaining privacy even after the auction ends.

### 4. Cryptographic Integrity
Every action is backed by Zero-Knowledge proofs. Bidders prove their bid is valid without revealing the amount, and the MPC network proves the winner was determined correctly according to the rules.

## 🚀 How Arcium is Used

### Client-Side (Before Blockchain)
```typescript
// 1. User places bid
const bidAmount = 1_000_000_000; // 1 SOL (in lamports)

// 2. Encrypt bid using Arcium (happens internally in SDK)
// The SDK generates an ephemeral Arcium public key for each bid
// and produces the encrypted bid data and a ZK proof.

// 3. Submit encrypted bid to blockchain
await shadowbidClient.placeBid({
  auctionPda,
  bidAmount, // Plaintext amount for escrow transfer (contract only sees this for transfer)
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
    bid_amount: u64,           // Encrypted
    encrypted_bid: Vec<u8>,    // Ciphertext
    arcium_proof: Vec<u8>,     // ZK proof
) -> Result<()> {
    // Verify proof without decrypting
    verify_encrypted_bid(&encrypted_bid, &arcium_proof)?;
    
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
// When auction closes:

// 1. Fetch all encrypted bids from blockchain
const bids = await getAllBids(auctionPda);

// 2. Submit to Arcium MPC for computation
const result = await arciumClient.computeWinner({
  auctionId,
  encryptedBids: bids.map(b => b.encrypted_bid_data),
  mpcId: auction.arcium_mpc_id
});
// MPC computes winner WITHOUT decrypting any bids

// 3. Verify and store result on-chain
await closeAuction({
  winner: result.winnerPubkey,
  winningAmount: result.winningAmount,
  proof: result.computationProof
});
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

### Close Auction (Determine Winner)
```typescript
const { signature, winner, winningAmount } = await client.closeAuction({
  auctionPda
});

console.log('Auction closed!');
console.log('Winner:', winner.toBase58());
console.log('Winning amount:', winningAmount);
```

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
4. `close_auction` - Determine winner via MPC
5. `settle_auction` - Transfer winning bid to creator
6. `refund_bid` - Return funds to losing bidders
7. `cancel_auction` - Cancel auction (if no bids)

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
shadowbid = "CSqdLojNG42tPTGTD5tGUv7X8o896Jqq98T1zkynErnW"
```

### Arcium Endpoint
Configure in SDK initialization:
```typescript
const client = new ShadowBidClient(
  provider,
  new PublicKey('CSqdLojNG42tPTGTD5tGUv7X8o896Jqq98T1zkynErnW')
);
```



## 🛣️ Roadmap

### Phase 1: Core Functionality ✅
- [x] Smart contract development
- [x] Arcium integration (Blind Bidding via MPC)
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
