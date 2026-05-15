# ShadowBid Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Prerequisites Check
```bash
# Verify installations
rust --version        # Should be 1.70+
solana --version      # Should be 1.17+
anchor --version      # Should be 0.29+
node --version        # Should be 18+
```

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/Ololadestephen/Shadowbid-Arcium
cd shadowbid

# 2. Install dependencies (Root and Frontend)
npm install
cd shadowbid-frontend && npm install

# 4. Build the program
anchor build
```

### Local Development
```bash
# Terminal 1: Start validator
solana-test-validator

# Terminal 2: Deploy and test
anchor deploy
anchor test --skip-local-validator
```

## 📝 Quick Example

### Create an Auction
```typescript
import { ShadowBidClient } from './lib/shadowbid-sdk';
import { NATIVE_MINT } from '@solana/spl-token';

const client = new ShadowBidClient(provider, programId);

// Create auction
const { auctionPda } = await client.createAuction({
  auctionId: 1,
  startTime: new Date(Date.now() + 3600000),
  endTime: new Date(Date.now() + 86400000),
  reservePrice: 100_000_000,
  itemName: "Cool NFT",
  itemDescription: "Very rare",
  tokenMint: NATIVE_MINT
});

console.log("Auction created:", auctionPda.toBase58());
```

### Place a Bid
```typescript
// Bid is automatically encrypted via Arcium
const { bidPda } = await client.placeBid({
  auctionPda,
  bidAmount: 150_000_000,
  tokenMint: NATIVE_MINT
});

console.log("Bid placed (encrypted):", bidPda.toBase58());
```

### Check Auction Status
```typescript
const auction = await client.getAuction(auctionPda);

console.log("Status:", auction.status);
console.log("Total bids:", auction.totalBids);
console.log("Winner:", auction.winner);
```

## 🎯 Key Files Reference

| File | Purpose |
|------|---------|
| `lib.rs` | Solana smart contract |
| `arcium_integration.rs` | Encryption & MPC |
| `sdk.ts` | TypeScript SDK |
| `tests/shadowbid.test.ts` | Test suite |
| `deploy.sh` | Deployment script |
| `README.md` | Full documentation |
| `API.md` | API reference |
| `ARCHITECTURE.md` | Architecture details |

## 🔗 Important Links

- **Anchor Docs**: https://www.anchor-lang.com/
- **Solana Docs**: https://docs.solana.com/
- **Arcium Docs**: https://docs.arcium.com/
- **SPL Token**: https://spl.solana.com/token

## 🆘 Common Issues

### Issue: "insufficient funds"
```bash
# Solution: Airdrop SOL
solana airdrop 5
```

### Issue: "Program not deployed"
```bash
# Solution: Deploy program
anchor deploy
```

### Issue: "Account not found"
```bash
# Solution: Initialize account first
# Make sure auction is created before placing bids
```

## 📚 Learning Path

1. **Start Here**: Read `README.md`
2. **Understand**: Review `ARCHITECTURE.md`
3. **API Reference**: Study `API.md`
4. **Code**: Explore `lib.rs` and `sdk.ts`
5. **Test**: Run and modify `tests/shadowbid.test.ts`
6. **Deploy**: Use `deploy.sh` script

## 🎨 Frontend Integration

The backend is ready! To integrate with frontend:

```typescript
// 1. Install SDK
npm install @shadowbid/sdk

// 2. Initialize client
import { ShadowBidClient } from '@shadowbid/sdk';
const client = new ShadowBidClient(provider, programId);

// 3. Use SDK methods
const auctions = await client.getAllAuctions();
auctions.forEach(a => {
  // Display in UI
  console.log(a.account.itemName);
});

// 4. Subscribe to events
client.subscribeToAuctionEvents((event) => {
  // Update UI in real-time
  updateAuctionList();
});
```

## ✅ Project Status Checklist

- [x] Smart contract implemented
- [x] Arcium encrypted comparison circuit source
- [x] On-chain encrypted payload/proof validation
- [x] TypeScript SDK ready
- [x] Tests updated for close-result validation
- [x] Deployment script created
- [x] Documentation complete
- [x] Frontend Integrated & Functional
- [ ] Frontend Production Build Verified
- [x] Native SOL Support Added
- [x] Arcium queue/callback winner finalization for `compare_bids`

## 🎉 You're Ready!

ShadowBid is a working Solana blind-auction prototype with Arcium encrypted-instruction circuit source, on-chain validation for encrypted bid material, and `compare_bids` winner finalization through Arcium's queue/callback path. The remaining production milestone is making collateral/reserve handling fully private instead of mirroring escrowed amounts in SPL token transfers.

**Happy building! 🚀**
