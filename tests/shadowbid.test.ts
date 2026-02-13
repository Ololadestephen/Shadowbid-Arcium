import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Shadowbid } from "../target/types/shadowbid";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("ShadowBid Blind Auctions", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Shadowbid as Program<Shadowbid>;

  // Test accounts
  let authority: Keypair;
  let bidder1: Keypair;
  let bidder2: Keypair;
  let bidder3: Keypair;

  // Token accounts
  let mint: PublicKey;
  let authorityTokenAccount: PublicKey;
  let bidder1TokenAccount: PublicKey;
  let bidder2TokenAccount: PublicKey;
  let bidder3TokenAccount: PublicKey;

  // Test data
  const auctionId = new anchor.BN(Date.now());
  let auctionPda: PublicKey;
  let escrowPda: PublicKey;

  before(async () => {
    // Initialize test accounts
    authority = Keypair.generate();
    bidder1 = Keypair.generate();
    bidder2 = Keypair.generate();
    bidder3 = Keypair.generate();

    // Airdrop SOL to test accounts
    await Promise.all([
      provider.connection.requestAirdrop(authority.publicKey, 10 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(bidder1.publicKey, 10 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(bidder2.publicKey, 10 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(bidder3.publicKey, 10 * LAMPORTS_PER_SOL),
    ]);

    // Wait for confirmations
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create test token mint
    mint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      9 // 9 decimals
    );

    // Create token accounts
    authorityTokenAccount = await createAccount(
      provider.connection,
      authority,
      mint,
      authority.publicKey
    );

    bidder1TokenAccount = await createAccount(
      provider.connection,
      bidder1,
      mint,
      bidder1.publicKey
    );

    bidder2TokenAccount = await createAccount(
      provider.connection,
      bidder2,
      mint,
      bidder2.publicKey
    );

    bidder3TokenAccount = await createAccount(
      provider.connection,
      bidder3,
      mint,
      bidder3.publicKey
    );

    // Mint tokens to bidders
    await Promise.all([
      mintTo(
        provider.connection,
        authority,
        mint,
        bidder1TokenAccount,
        authority,
        1000 * LAMPORTS_PER_SOL
      ),
      mintTo(
        provider.connection,
        authority,
        mint,
        bidder2TokenAccount,
        authority,
        1000 * LAMPORTS_PER_SOL
      ),
      mintTo(
        provider.connection,
        authority,
        mint,
        bidder3TokenAccount,
        authority,
        1000 * LAMPORTS_PER_SOL
      ),
    ]);

    // Derive PDAs
    [auctionPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        authority.publicKey.toBuffer(),
        auctionId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    [escrowPda] = await PublicKey.findProgramAddress(
      [Buffer.from("escrow"), auctionPda.toBuffer()],
      program.programId
    );
  });

  describe("Auction Creation", () => {
    it("Creates a new auction", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = new anchor.BN(now); // Start immediately
      const endTime = new anchor.BN(now + 5); // End in 5 seconds
      const reservePrice = new anchor.BN(100 * LAMPORTS_PER_SOL);
      const arciumMpcId = Array(32).fill(0);

      const tx = await program.methods
        .createAuction(
          auctionId,
          startTime,
          endTime,
          reservePrice,
          "Test NFT",
          "A test NFT for blind auction",
          arciumMpcId
        )
        .accounts({
          auction: auctionPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      console.log("Auction created:", tx);

      // Verify auction account
      const auction = await program.account.auction.fetch(auctionPda);
      expect(auction.auctionId.toString()).to.equal(auctionId.toString());
      expect(auction.authority.toString()).to.equal(authority.publicKey.toString());
      expect(auction.reservePrice.toString()).to.equal(reservePrice.toString());
      expect(auction.itemName).to.equal("Test NFT");
      expect(auction.totalBids).to.equal(0);
    });

    it("Fails to create auction with invalid time range", async () => {
      const now = Math.floor(Date.now() / 1000);
      const startTime = new anchor.BN(now + 3600);
      const endTime = new anchor.BN(now + 60); // End before start!

      try {
        await program.methods
          .createAuction(
            new anchor.BN(Date.now()),
            startTime,
            endTime,
            new anchor.BN(100),
            "Test",
            "Test",
            Array(32).fill(0)
          )
          .accounts({
            auction: Keypair.generate().publicKey,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([authority])
          .rpc();

        expect.fail("Should have thrown error");
      } catch (err) {
        expect(err.message).to.include("InvalidTimeRange");
      }
    });
  });

  describe("Starting Auction", () => {
    it("Starts the auction", async () => {
      // Wait for start time
      await new Promise(resolve => setTimeout(resolve, 2000));

      const tx = await program.methods
        .startAuction()
        .accounts({
          auction: auctionPda,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      console.log("Auction started:", tx);

      const auction = await program.account.auction.fetch(auctionPda);
      expect(Object.keys(auction.status)[0]).to.equal("active");
    });
  });

  describe("Placing Bids", () => {
    it("Bidder 1 places encrypted bid", async () => {
      const bidAmount = new anchor.BN(150 * LAMPORTS_PER_SOL);
      const encryptedBid = Buffer.from(Array(32).fill(1));
      const proof = Buffer.from(Array(32).fill(2));
      const arciumPublicKey = Array(32).fill(0);

      const [bidPda] = await PublicKey.findProgramAddress(
        [Buffer.from("bid"), auctionPda.toBuffer(), bidder1.publicKey.toBuffer()],
        program.programId
      );

      // Create escrow ATA for the PDA
      const escrowTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        authority,
        mint,
        escrowPda,
        true // allowOwnerOffCurve
      );
      const escrowTokenAccount = escrowTokenAccountInfo.address;

      const tx = await program.methods
        .placeBid(bidAmount, encryptedBid, proof, arciumPublicKey)
        .accounts({
          auction: auctionPda,
          bid: bidPda,
          bidder: bidder1.publicKey,
          bidderTokenAccount: bidder1TokenAccount,
          escrowTokenAccount,
          tokenMint: mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([bidder1])
        .rpc();

      console.log("Bid placed by bidder1:", tx);

      // Verify bid account
      const bid = await program.account.bid.fetch(bidPda);
      expect(bid.bidder.toString()).to.equal(bidder1.publicKey.toString());

      // Verify auction updated
      const auction = await program.account.auction.fetch(auctionPda);
      expect(auction.totalBids).to.equal(1);
    });

    it("Bidder 2 places higher encrypted bid", async () => {
      const bidAmount = new anchor.BN(200 * LAMPORTS_PER_SOL);
      const encryptedBid = Buffer.from(Array(32).fill(3));
      const proof = Buffer.from(Array(32).fill(4));
      const arciumPublicKey = Array(32).fill(0);

      const [bidPda] = await PublicKey.findProgramAddress(
        [Buffer.from("bid"), auctionPda.toBuffer(), bidder2.publicKey.toBuffer()],
        program.programId
      );

      const escrowTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        authority,
        mint,
        escrowPda,
        true
      );
      const escrowTokenAccount = escrowTokenAccountInfo.address;

      const tx = await program.methods
        .placeBid(bidAmount, encryptedBid, proof, arciumPublicKey)
        .accounts({
          auction: auctionPda,
          bid: bidPda,
          bidder: bidder2.publicKey,
          bidderTokenAccount: bidder2TokenAccount,
          escrowTokenAccount,
          tokenMint: mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([bidder2])
        .rpc();

      console.log("Bid placed by bidder2:", tx);

      const auction = await program.account.auction.fetch(auctionPda);
      expect(auction.totalBids).to.equal(2);
    });

    it("Fails to place bid below reserve price", async () => {
      const bidAmount = new anchor.BN(50 * LAMPORTS_PER_SOL); // Below reserve

      // We need escrowTokenAccount for the failing call too, or at least a dummy
      const escrowTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        authority,
        mint,
        escrowPda,
        true
      );
      const escrowTokenAccount = escrowTokenAccountInfo.address;

      try {
        await program.methods
          .placeBid(
            bidAmount,
            Buffer.from(Array(32).fill(5)),
            Buffer.from(Array(32).fill(6)),
            Array(32).fill(0)
          )
          .accounts({
            auction: auctionPda,
            bid: Keypair.generate().publicKey,
            bidder: bidder3.publicKey,
            bidderTokenAccount: bidder3TokenAccount,
            escrowTokenAccount,
            tokenMint: mint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([bidder3])
          .rpc();

        expect.fail("Should have thrown error");
      } catch (err) {
        expect(err.message).to.include("BidBelowReserve");
      }
    });
  });

  describe("Closing Auction", () => {
    it("Closes auction and determines winner", async () => {
      // Wait for auction to end
      await new Promise(resolve => setTimeout(resolve, 6000));

      // In production, Arcium MPC would compute winner
      // For testing, we manually set winner to bidder2 (highest bid)
      const winner = bidder2.publicKey;
      const winningAmount = new anchor.BN(200 * LAMPORTS_PER_SOL);
      const proof = Buffer.from(Array(64).fill(7)); // MPC computation proof

      const tx = await program.methods
        .closeAuction(winner, winningAmount, proof)
        .accounts({
          auction: auctionPda,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      console.log("Auction closed:", tx);

      const auction = await program.account.auction.fetch(auctionPda);
      expect(Object.keys(auction.status)[0]).to.equal("closed");
      expect(auction.winner.toString()).to.equal(winner.toString());
      expect(auction.highestBidAmount.toString()).to.equal(winningAmount.toString());
    });
  });

  describe("Settlement and Refunds", () => {
    it("Settles winning bid", async () => {
      const escrowTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        authority,
        mint,
        escrowPda,
        true
      );
      const escrowTokenAccount = escrowTokenAccountInfo.address;

      const balanceBefore = await getAccount(provider.connection, authorityTokenAccount);

      const tx = await program.methods
        .settleAuction()
        .accounts({
          auction: auctionPda,
          winner: bidder2.publicKey,
          authorityTokenAccount,
          escrowTokenAccount,
          escrowAuthority: escrowPda,
          tokenMint: mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Auction settled:", tx);

      const balanceAfter = await getAccount(provider.connection, authorityTokenAccount);
      expect(Number(balanceAfter.amount) - Number(balanceBefore.amount))
        .to.equal(200 * LAMPORTS_PER_SOL);
    });

    it("Refunds losing bid", async () => {
      const [bidPda] = await PublicKey.findProgramAddress(
        [Buffer.from("bid"), auctionPda.toBuffer(), bidder1.publicKey.toBuffer()],
        program.programId
      );

      const escrowTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        authority,
        mint,
        escrowPda,
        true
      );
      const escrowTokenAccount = escrowTokenAccountInfo.address;

      const balanceBefore = await getAccount(provider.connection, bidder1TokenAccount);

      const tx = await program.methods
        .refundBid()
        .accounts({
          auction: auctionPda,
          bid: bidPda,
          bidder: bidder1.publicKey,
          bidderTokenAccount: bidder1TokenAccount,
          escrowTokenAccount,
          escrowAuthority: escrowPda,
          tokenMint: mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Bid refunded:", tx);

      const balanceAfter = await getAccount(provider.connection, bidder1TokenAccount);
      expect(Number(balanceAfter.amount) - Number(balanceBefore.amount))
        .to.equal(150 * LAMPORTS_PER_SOL);

      const bid = await program.account.bid.fetch(bidPda);
      expect(Object.keys(bid.status)[0]).to.equal("refunded");
    });
  });
});
