# ShadowBid API Documentation

## Table of Contents
1. [Smart Contract API](#smart-contract-api)
2. [TypeScript SDK](#typescript-sdk)
3. [Arcium Integration](#arcium-integration)
4. [Events](#events)
5. [Error Codes](#error-codes)

---

## Smart Contract API

### Instructions

#### 1. Create Auction

Creates a new blind auction with encrypted bids.

**Parameters:**
- `auction_id` (u64): Unique identifier for the auction
- `start_time` (i64): Unix timestamp when bidding starts
- `end_time` (i64): Unix timestamp when bidding ends
- `reserve_price` (u64): Minimum acceptable bid amount (in lamports)
- `item_name` (String): Name of item being auctioned (max 64 chars)
- `item_description` (String): Description of item (max 256 chars)
- `arcium_mpc_id` ([u8; 32]): Arcium MPC computation identifier

**Accounts:**
- `auction` (mut, signer): Auction PDA to be created
- `authority` (signer): Auction creator's wallet
- `system_program`: Solana System Program

**Returns:** Transaction signature

**Example:**
```rust
create_auction(
    ctx,
    1,
    1704067200, // Jan 1, 2024
    1704153600, // Jan 2, 2024
    100_000_000, // 0.1 SOL
    "Rare NFT".to_string(),
    "Limited edition artwork".to_string(),
    [0u8; 32],
)
```

---

#### 2. Place Bid

Submit an encrypted bid to an active auction.

**Parameters:**
- `amount` (u64): Plaintext amount for token transfer (matches escrow)
- `encrypted_bid` (Vec<u8>): Encrypted bid data from Arcium
- `arcium_proof` (Vec<u8>): Zero-knowledge proof of bid validity
- `arcium_public_key` ([u8; 32]): Ephemeral public key for Arcium encryption

**Accounts:**
- `auction` (mut): Auction PDA
- `bid` (mut, signer): Bid PDA to be created
- `bidder` (signer): Bidder's wallet
- `bidder_token_account` (mut): Bidder's token account
- `escrow_token_account` (mut): Escrow token account
- `token_program`: SPL Token Program
- `system_program`: Solana System Program

**Returns:** Transaction signature

**Constraints:**
- Auction must be Active
- Current time must be between start_time and end_time
- Bid must be >= reserve_price
- Bidder can only place one bid per auction

---

#### 3. Start Auction

Activate a pending auction when start time is reached.

**Parameters:** None

**Accounts:**
- `auction` (mut): Auction PDA
- `authority` (signer): Auction creator

**Returns:** Transaction signature

**Constraints:**
- Auction status must be Pending
- Current time >= start_time

---

#### 4. Close Auction

Close auction and determine winner via Arcium MPC computation.

**Parameters:**
- `winner_pubkey` (Pubkey): Winner's public key from MPC
- `winning_bid_amount` (u64): Winning bid amount
- `arcium_result_proof` (Vec<u8>): Proof of correct MPC computation

**Accounts:**
- `auction` (mut): Auction PDA
- `authority` (signer): Auction creator

**Returns:** Transaction signature

**Constraints:**
- Auction status must be Active
- Current time >= end_time
- Winning bid >= reserve_price

---

#### 5. Settle Auction

Transfer winning bid to auction creator.

**Parameters:** None

**Accounts:**
- `auction`: Auction PDA
- `winner`: Winner's public key
- `authority_token_account` (mut): Creator's token account
- `escrow_token_account` (mut): Escrow token account
- `escrow_authority`: Escrow PDA
- `token_program`: SPL Token Program

**Returns:** Transaction signature

**Constraints:**
- Auction status must be Closed
- Caller must be winner

---

#### 6. Refund Bid

Return funds to a losing bidder.

**Parameters:** None

**Accounts:**
- `auction`: Auction PDA
- `bid` (mut): Bid PDA
- `bidder`: Bidder's public key
- `bidder_token_account` (mut): Bidder's token account
- `escrow_token_account` (mut): Escrow token account
- `escrow_authority`: Escrow PDA
- `token_program`: SPL Token Program

**Returns:** Transaction signature

**Constraints:**
- Auction status must be Closed
- Bid status must be Active
- Bidder must not be the winner

---

#### 7. Cancel Auction

Cancel an auction that has no bids.

**Parameters:** None

**Accounts:**
- `auction` (mut): Auction PDA
- `authority` (signer): Auction creator

**Returns:** Transaction signature

**Constraints:**
- Total bids must be 0
- Status must be Pending or Active

---

## TypeScript SDK

### Installation

```bash
npm install @shadowbid/sdk
```

### Basic Usage

```typescript
import { ShadowBidClient } from './lib/shadowbid-sdk';
import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

// Setup
const connection = new Connection('https://api.devnet.solana.com');
const wallet = Keypair.generate();
const provider = new AnchorProvider(connection, wallet, {});
const programId = new PublicKey('YOUR_PROGRAM_ID');

const client = new ShadowBidClient(provider, programId);
```

### Methods

#### createAuction

```typescript
const result = await client.createAuction({
  auctionId: 1,
  startTime: new Date(Date.now() + 3600000),
  endTime: new Date(Date.now() + 86400000),
  reservePrice: 100_000_000,
  itemName: "Rare NFT",
  itemDescription: "Limited edition",
  tokenMint: USDC_MINT
});

console.log('Signature:', result.signature);
console.log('Auction PDA:', result.auctionPda.toBase58());
```

#### placeBid

```typescript
const result = await client.placeBid({
  auctionPda,
  bidAmount: 150_000_000,
  tokenMint: USDC_MINT
});

console.log('Bid placed:', result.signature);
```

#### closeAuction

```typescript
const result = await client.closeAuction({
  auctionPda
});

console.log('Winner:', result.winner.toBase58());
console.log('Amount:', result.winningAmount);
```

#### getAuction

```typescript
const auction = await client.getAuction(auctionPda);

console.log('Status:', auction.status);
console.log('Total bids:', auction.totalBids);
console.log('Reserve:', auction.reservePrice);
```

#### getAllAuctions

```typescript
const auctions = await client.getAllAuctions();

auctions.forEach(a => {
  console.log('Auction:', a.account.itemName);
  console.log('Bids:', a.account.totalBids);
});
```

#### getAuctionsByStatus

```typescript
const activeAuctions = await client.getAuctionsByStatus('active');
const closedAuctions = await client.getAuctionsByStatus('closed');
```

#### getUserBids

```typescript
const userBids = await client.getUserBids(userPublicKey);

userBids.forEach(b => {
  console.log('Auction:', b.account.auction.toBase58());
  console.log('Status:', b.account.status);
});
```

### Event Subscriptions

```typescript
// Subscribe to auction events
const auctionListener = client.subscribeToAuctionEvents((event) => {
  console.log('Auction created:', event);
});

// Subscribe to bid events
const bidListener = client.subscribeToBidEvents((event) => {
  console.log('Bid placed:', event);
});

// Cleanup
await client.unsubscribe(auctionListener);
await client.unsubscribe(bidListener);
```

---

## Arcium Integration

### Encryption Flow

```typescript
import { ShadowBidClient } from './lib/shadowbid-sdk';

const arcium = new ArciumClient({
  mpc_endpoint: 'https://mpc.arcium.com/v1',
  encryption_pubkey: [...],
  network_id: 'devnet'
});

// Encrypt bid
const encrypted = await arcium.encrypt_bid(
  1000, // bid amount
  bidderPubkey,
  'auction_123'
);

// encrypted.ciphertext - encrypted bid data
// encrypted.nonce - encryption nonce
// encrypted.validity_proof - ZK proof
```

### Winner Computation

```typescript
// Collect all encrypted bids
const bids = await client.getAuctionBids(auctionPda);

// Submit to Arcium MPC
const result = await arcium.compute_winner({
  auction_id: 'auction_123',
  encrypted_bids: bids,
  reserve_price_encrypted: [...],
  mpc_id: auction.arcium_mpc_id
});

// Result contains winner without revealing other bids
// result.winner_pubkey
// result.winning_amount
// result.computation_proof
```

### Proof Verification

```typescript
const isValid = await arcium.verify_computation_proof(
  result,
  'auction_123'
);

if (isValid) {
  // Submit winner to blockchain
  await client.closeAuction({
    auctionPda,
    winner: result.winner_pubkey,
    winningAmount: result.winning_amount,
    proof: result.computation_proof
  });
}
```

---

## Events

### AuctionCreated

Emitted when a new auction is initialized.

```typescript
{
  auction_id: number,
  authority: PublicKey,
  start_time: number,
  end_time: number,
  arcium_mpc_id: number[]
}
```

### AuctionStarted

Emitted when an auction becomes active.

```typescript
{
  auction_id: number,
  timestamp: number
}
```

### BidPlaced

Emitted when an encrypted bid is submitted.

```typescript
{
  auction_id: number,
  bidder: PublicKey,
  encrypted_bid_hash: number[], // Hash of encrypted data
  timestamp: number
}
```

### AuctionClosed

Emitted when auction closes and winner is determined.

```typescript
{
  auction_id: number,
  winner: PublicKey,
  winning_amount: number,
  total_bids: number
}
```

### AuctionSettled

Emitted when winning bid is transferred to creator.

```typescript
{
  auction_id: number,
  winner: PublicKey,
  amount: number
}
```

### BidRefunded

Emitted when a losing bid is refunded.

```typescript
{
  auction_id: number,
  bidder: PublicKey,
  amount: number
}
```

### AuctionCancelled

Emitted when an auction is cancelled.

```typescript
{
  auction_id: number
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 6000 | InvalidTimeRange | End time must be after start time |
| 6001 | StartTimeInPast | Start time cannot be in the past |
| 6002 | NameTooLong | Item name exceeds 64 characters |
| 6003 | DescriptionTooLong | Description exceeds 256 characters |
| 6004 | AuctionNotActive | Auction is not in active state |
| 6005 | AuctionNotStarted | Auction has not started yet |
| 6006 | AuctionEnded | Auction has already ended |
| 6007 | InvalidEncryptedBid | Encrypted bid data is invalid |
| 6008 | InvalidProof | Cryptographic proof is invalid |
| 6009 | BidBelowReserve | Bid amount is below reserve price |
| 6010 | AuctionAlreadyStarted | Auction has already been started |
| 6011 | TooEarlyToStart | Current time before start time |
| 6012 | AuctionNotEnded | Auction has not reached end time |
| 6013 | NoValidBids | No bids meet reserve price |
| 6014 | AuctionNotClosed | Auction must be closed first |
| 6015 | NotWinner | Caller is not the auction winner |
| 6016 | BidAlreadyProcessed | Bid has already been refunded |
| 6017 | CannotRefundWinner | Cannot refund winning bid |
| 6018 | CannotCancelWithBids | Cannot cancel auction with bids |
| 6019 | CannotCancelClosed | Cannot cancel closed auction |

---

## Rate Limits

### API Endpoints
- Arcium MPC: 100 requests/minute
- Solana RPC: 40 requests/second (devnet)

### Recommendations
- Batch bid submissions where possible
- Cache auction data locally
- Use websocket subscriptions for real-time updates

---

## Best Practices

### Security
1. Always verify Arcium proofs before accepting results
2. Use hardware wallets for auction authority keys
3. Set reasonable reserve prices to prevent spam
4. Monitor auction activity for suspicious patterns

### Performance
1. Pre-compute PDAs to reduce RPC calls
2. Use commitment level "confirmed" for faster UX
3. Implement retry logic for failed transactions
4. Cache frequently accessed auction data

### Privacy
1. Never log unencrypted bid amounts
2. Use separate wallets for different auctions
3. Rotate Arcium MPC IDs periodically
4. Clear encrypted data after auction completion

---

## Support

- **Documentation**: https://docs.shadowbid.io
- **Discord**: https://discord.gg/shadowbid
- **GitHub**: https://github.com/yourusername/shadowbid
- **Email**: support@shadowbid.io
