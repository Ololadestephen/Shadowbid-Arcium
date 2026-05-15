/**
 * ShadowBid TypeScript SDK
 * Client library for interacting with the ShadowBid blind auction program
 */

import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
} from "@solana/spl-token";
// Local types
import IDL from "../idl/shadowbid.json";

// Arcium MPC Client Imports
import {
  RescueCipher,
  x25519,
  awaitComputationFinalization,
  getArciumEnv,
  getArciumProgramId,
  getClockAccAddress,
  getClusterAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getFeePoolAccAddress,
  getMempoolAccAddress,
  getMXEAccAddress,
  getMXEPublicKey,
} from "@arcium-hq/client";

const BID_INPUT_CIPHERTEXTS = 33;
const ARCIUM_SHARED_BID_INPUT_LEN = 32 + 16 + BID_INPUT_CIPHERTEXTS * 32;

// Arcium encryption result interface
interface ArciumEncryptionResult {
  ciphertext: Buffer;
  nonce: Uint8Array;
  proof: Buffer;
  publicKey: Uint8Array; // Ephemeral public key for shared secret
}

export class ShadowBidClient {
  private program: Program<any>;
  private provider: AnchorProvider;

  constructor(
    provider: AnchorProvider,
    programId: PublicKey,
    _arciumEndpoint: string = "https://mpc.arcium.com/v1"
  ) {
    this.provider = provider;
    console.log("Initializing ShadowBidClient with IDL:", IDL);
    console.log("Program ID:", programId.toString());

    // Clone the IDL and override the address with the provided programId
    const idl = JSON.parse(JSON.stringify(IDL));
    idl.address = programId.toString();

    this.program = new Program<any>(idl as any, provider);
  }

  /**
   * Create a new blind auction
   */
  async createAuction(params: {
    auctionId: number;
    startTime: Date;
    endTime: Date;
    reservePrice: number;
    itemName: string;
    itemDescription: string;
    tokenMint: PublicKey;
  }): Promise<{ signature: string; auctionPda: PublicKey }> {
    const authority = this.provider.wallet.publicKey;

    // Derive auction PDA
    const [auctionPda, _auctionBump] = await this.getAuctionPDA(
      authority,
      params.auctionId
    );

    // Derive escrow PDA
    const [escrowPda, _escrowBump] = await this.getEscrowPDA(auctionPda);

    // Generate Arcium MPC ID
    const arciumMpcId = this.generateMpcId();

    const startTimestamp = new BN(
      Math.floor(params.startTime.getTime() / 1000)
    );
    const endTimestamp = new BN(Math.floor(params.endTime.getTime() / 1000));

    const tx = await (this.program.methods as any)
      .createAuction(
        new BN(params.auctionId),
        startTimestamp,
        endTimestamp,
        new BN(params.reservePrice),
        params.itemName,
        params.itemDescription,
        Array.from(arciumMpcId)
      )
      .accounts({
        auction: auctionPda,
        authority: authority,
        escrowAuthority: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      signature: tx,
      auctionPda,
    };
  }

  /**
   * Place an encrypted bid
   */
  async placeBid(params: {
    auctionPda: PublicKey;
    bidAmount: number;
    tokenMint: PublicKey;
  }): Promise<{ signature: string; bidPda: PublicKey }> {
    const bidder = this.provider.wallet.publicKey;

    // Encrypt bid using Arcium
    const encryptedBid = await this.encryptBidWithArcium(
      params.bidAmount,
      bidder,
      params.auctionPda
    );

    // Derive bid PDA
    const [bidPda, _bidBump] = await this.getBidPDA(params.auctionPda, bidder);

    // Derive escrow PDA
    const [escrowPda, _escrowBump] = await this.getEscrowPDA(params.auctionPda);

    // Get token accounts
    const bidderTokenAccount = await getAssociatedTokenAddress(
      params.tokenMint,
      bidder
    );

    const escrowTokenAccount = await getAssociatedTokenAddress(
      params.tokenMint,
      escrowPda,
      true
    );

    const preInstructions = [];

    // Check if handling Native SOL
    const isNativeSol = params.tokenMint.equals(NATIVE_MINT);

    // Create bidder token account if it doesn't exist
    const bidderAccountInfo = await this.provider.connection.getAccountInfo(
      bidderTokenAccount
    );

    if (!bidderAccountInfo) {
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          bidder,
          bidderTokenAccount,
          bidder,
          params.tokenMint
        )
      );
    }

    // Handing Native SOL Wrapping
    if (isNativeSol) {
      // 1. Transfer SOL to the WSOL account
      preInstructions.push(
        SystemProgram.transfer({
          fromPubkey: bidder,
          toPubkey: bidderTokenAccount,
          lamports: params.bidAmount + (bidderAccountInfo ? 0 : 0), // If creating, rent is paid by createIdempotent or similar, but here we just transfer the bid amount.
          // Actually, if we just created it, it has 0 lamports (rent exempted by creation usually, or we need to fund it).
          // creation pays rent. We just need to fund the *amount* to be wrapped.
        })
      );
      // 2. Sync Native to wrap it
      preInstructions.push(createSyncNativeInstruction(bidderTokenAccount));
    }

    // Create escrow token account if it doesn't exist
    const escrowAccountInfo = await this.provider.connection.getAccountInfo(
      escrowTokenAccount
    );
    if (!escrowAccountInfo) {
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          bidder,
          escrowTokenAccount,
          escrowPda,
          params.tokenMint
        )
      );
    }

    console.log("===== SHADOWBID SDK PLACE BID =====");
    console.log("Token Mint:", params.tokenMint.toString());
    console.log("Auction PDA:", params.auctionPda.toString());
    console.log("Escrow PDA:", escrowPda.toString());
    console.log("Escrow Token Account:", escrowTokenAccount.toString());
    console.log("Creating escrow ATA?", !escrowAccountInfo);
    console.log("Is Native SOL?", isNativeSol);
    console.log("=================================");

    try {
      const tx = await (this.program.methods as any)
        .placeBid(
          new BN(params.bidAmount),
          Buffer.from(encryptedBid.ciphertext),
          Buffer.from(encryptedBid.proof),
          Array.from(encryptedBid.publicKey)
        )
        .accounts({
          auction: params.auctionPda,
          bid: bidPda,
          bidder: bidder,
          bidderTokenAccount: bidderTokenAccount,
          escrowTokenAccount: escrowTokenAccount,
          escrowAuthority: escrowPda,
          tokenMint: params.tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: new PublicKey(
            "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
          ),
          systemProgram: SystemProgram.programId,
        })
        .preInstructions(preInstructions)
        .rpc();

      return {
        signature: tx,
        bidPda,
      };
    } catch (error) {
      console.error("Place Bid Error", error);
      // If it failed and we wrapped SOL, we might want to unwrap (close account) to return funds?
      // For now, let's keep it simple. The user will just have WSOL.
      throw error;
    }
  }

  /**
   * Start an auction (move from Pending to Active)
   */
  async startAuction(auctionPda: PublicKey): Promise<string> {
    const auction = await this.getAuction(auctionPda);

    const tx = await (this.program.methods as any)
      .startAuction()
      .accounts({
        auction: auctionPda,
        authority: auction.authority,
      })
      .rpc();

    return tx;
  }

  /**
   * Close auction and compute winner via Arcium MPC
   */
  async closeAuction(_params: {
    auctionPda: PublicKey;
  }): Promise<{ signature: string; winner: PublicKey; winningAmount: number }> {
    throw new Error(
      "closeAuction no longer performs SDK-side winner selection. Queue compare_bids with queueCompareBids and wait for the verified Arcium callback to close the auction."
    );
  }

  async queueCompareBids(params: {
    auctionPda: PublicKey;
    bidAPda: PublicKey;
    bidBPda: PublicKey;
    cuPriceMicro?: number;
    waitForCallback?: boolean;
  }): Promise<{ signature: string; computationOffset: BN; finalizeSignature?: string }> {
    const auction = await this.getAuction(params.auctionPda);
    const arciumEnv = getArciumEnv();
    const computationOffset = new BN(
      Buffer.from(crypto.getRandomValues(new Uint8Array(8))),
      "le"
    );
    const compDefOffset = Buffer.from(getCompDefAccOffset("compare_bids")).readUInt32LE();
    const [signPdaAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("ArciumSignerAccount")],
      this.program.programId
    );

    const tx = await (this.program.methods as any)
      .compareBids(
        computationOffset,
        new BN(params.cuPriceMicro ?? 0)
      )
      .accounts({
        auction: params.auctionPda,
        authority: auction.authority,
        bidA: params.bidAPda,
        bidB: params.bidBPda,
        mxeAccount: getMXEAccAddress(this.program.programId),
        signPdaAccount,
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        computationAccount: getComputationAccAddress(
          arciumEnv.arciumClusterOffset,
          computationOffset
        ),
        compDefAccount: getCompDefAccAddress(this.program.programId, compDefOffset),
        clusterAccount: getClusterAccAddress(arciumEnv.arciumClusterOffset),
        poolAccount: getFeePoolAccAddress(),
        clockAccount: getClockAccAddress(),
        systemProgram: SystemProgram.programId,
        arciumProgram: getArciumProgramId(),
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    let finalizeSignature: string | undefined;
    if (params.waitForCallback) {
      finalizeSignature = await awaitComputationFinalization(
        this.provider,
        computationOffset,
        this.program.programId,
        "confirmed"
      );
    }

    return { signature: tx, computationOffset, finalizeSignature };
  }

  /**
   * Settle auction (transfer winning bid to authority)
   */
  async settleAuction(params: {
    auctionPda: PublicKey;
    tokenMint: PublicKey;
  }): Promise<string> {
    const auction = await this.getAuction(params.auctionPda);

    const [escrowPda] = await this.getEscrowPDA(params.auctionPda);

    const authorityTokenAccount = await getAssociatedTokenAddress(
      params.tokenMint,
      auction.authority
    );

    const escrowTokenAccount = await getAssociatedTokenAddress(
      params.tokenMint,
      escrowPda,
      true
    );

    const tx = await (this.program.methods as any)
      .settleAuction()
      .accounts({
        auction: params.auctionPda,
        winner: auction.winner,
        authorityTokenAccount: authorityTokenAccount,
        escrowTokenAccount: escrowTokenAccount,
        escrowAuthority: escrowPda,
        tokenMint: params.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Refund a losing bid
   */
  async refundBid(params: {
    auctionPda: PublicKey;
    bidderPubkey: PublicKey;
    tokenMint: PublicKey;
  }): Promise<string> {
    const [bidPda] = await this.getBidPDA(
      params.auctionPda,
      params.bidderPubkey
    );
    const [escrowPda] = await this.getEscrowPDA(params.auctionPda);

    const bidderTokenAccount = await getAssociatedTokenAddress(
      params.tokenMint,
      params.bidderPubkey
    );

    const escrowTokenAccount = await getAssociatedTokenAddress(
      params.tokenMint,
      escrowPda,
      true
    );

    const tx = await (this.program.methods as any)
      .refundBid()
      .accounts({
        auction: params.auctionPda,
        bid: bidPda,
        bidder: params.bidderPubkey,
        bidderTokenAccount: bidderTokenAccount,
        escrowTokenAccount: escrowTokenAccount,
        escrowAuthority: escrowPda,
        tokenMint: params.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Cancel an auction
   */
  async cancelAuction(auctionPda: PublicKey): Promise<string> {
    const auction = await this.getAuction(auctionPda);

    const tx = await (this.program.methods as any)
      .cancelAuction()
      .accounts({
        auction: auctionPda,
        authority: auction.authority,
      })
      .rpc();

    return tx;
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get auction account data
   */
  async getAuction(auctionPda: PublicKey): Promise<any> {
    return await (this.program.account as any).auction.fetch(auctionPda);
  }

  /**
   * Get all auctions
   */
  async getAllAuctions(): Promise<any[]> {
    return await (this.program.account as any).auction.all();
  }

  /**
   * Get auctions by status
   */
  async getAuctionsByStatus(
    status: "pending" | "active" | "closed" | "cancelled"
  ): Promise<any[]> {
    const allAuctions = await this.getAllAuctions();
    return allAuctions.filter((a) => {
      const statusKey = Object.keys(a.account.status)[0];
      return statusKey === status;
    });
  }

  /**
   * Get all bids for an auction
   */
  async getAuctionBids(auctionPda: PublicKey): Promise<any[]> {
    const allBids = await (this.program.account as any).bid.all();
    return allBids.filter((b: any) => b.account.auction.equals(auctionPda));
  }

  /**
   * Get bid by bidder
   */
  async getBid(auctionPda: PublicKey, bidderPubkey: PublicKey): Promise<any> {
    const [bidPda] = await this.getBidPDA(auctionPda, bidderPubkey);
    return await (this.program.account as any).bid.fetch(bidPda);
  }

  /**
   * Get user's bids
   */
  async getUserBids(userPubkey: PublicKey): Promise<any[]> {
    const allBids = await (this.program.account as any).bid.all();
    return allBids.filter((b: any) => b.account.bidder.equals(userPubkey));
  }

  // ============================================================================
  // PDA Derivation
  // ============================================================================

  async getAuctionPDA(
    authority: PublicKey,
    auctionId: number
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from("auction"),
        authority.toBuffer(),
        new BN(auctionId).toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    );
  }

  async getBidPDA(
    auctionPda: PublicKey,
    bidder: PublicKey
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("bid"), auctionPda.toBuffer(), bidder.toBuffer()],
      this.program.programId
    );
  }

  async getEscrowPDA(auctionPda: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("escrow"), auctionPda.toBuffer()],
      this.program.programId
    );
  }

  // ============================================================================
  // Arcium Integration
  // ============================================================================

  private generateMpcId(): Uint8Array {
    // Generate unique MPC computation ID
    const id = new Uint8Array(32);
    crypto.getRandomValues(id);
    return id;
  }

  private async encryptBidWithArcium(
    bidAmount: number,
    _bidder: PublicKey,
    _auctionPda: PublicKey
  ): Promise<ArciumEncryptionResult> {
    try {
      // Get the MXE (Multi-party eXecution Environment) public key from Arcium network
      const mxePublicKey = await getMXEPublicKey(
        this.provider,
        this.program.programId
      );

      if (!mxePublicKey) {
        throw new Error(
          "Failed to retrieve MXE public key from Arcium network"
        );
      }

      // Generate ephemeral x25519 keypair for this encryption
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);

      // Create shared secret using Diffie-Hellman key exchange
      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);

      // Initialize the RescueCipher with the shared secret
      const cipher = new RescueCipher(sharedSecret);

      // Generate random nonce for encryption
      const nonce = new Uint8Array(16);
      crypto.getRandomValues(nonce);

      // The compare_bids circuit expects BidInput { amount: u64, bidder_pubkey: [u8; 32] }.
      const plaintext = [
        BigInt(bidAmount),
        ...Array.from(_bidder.toBuffer()).map((byte) => BigInt(byte)),
      ];
      const ciphertext = cipher.encrypt(plaintext, nonce);

      const proof = Buffer.from(publicKey);
      const serializedBid = this.serializeSharedBidInput(
        publicKey,
        nonce,
        ciphertext
      );

      console.log("Arcium encryption prepared:");
      console.log(
        "  - MXE Public Key:",
        Buffer.from(mxePublicKey).toString("hex").slice(0, 16) + "..."
      );
      console.log(
        "  - Ephemeral Public Key:",
        Buffer.from(publicKey).toString("hex").slice(0, 16) + "..."
      );

      return {
        ciphertext: serializedBid,
        nonce,
        proof,
        publicKey,
      };
    } catch (error) {
      throw new Error(`Arcium bid encryption failed: ${String(error)}`);
    }
  }

  private serializeSharedBidInput(
    publicKey: Uint8Array,
    nonce: Uint8Array,
    ciphertexts: Uint8Array[]
  ): Buffer {
    if (ciphertexts.length !== BID_INPUT_CIPHERTEXTS) {
      throw new Error(
        `compare_bids requires ${BID_INPUT_CIPHERTEXTS} ciphertexts, got ${ciphertexts.length}`
      );
    }

    const output = Buffer.alloc(ARCIUM_SHARED_BID_INPUT_LEN);
    Buffer.from(publicKey).copy(output, 0);
    Buffer.from(nonce).copy(output, 32);

    ciphertexts.forEach((ciphertext, index) => {
      Buffer.from(ciphertext).copy(output, 48 + index * 32);
    });

    return output;
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================

  /**
   * Subscribe to auction events
   */
  subscribeToAuctionEvents(callback: (event: any) => void): number {
    return this.program.addEventListener("auctionCreated", callback);
  }

  /**
   * Subscribe to bid events
   */
  subscribeToBidEvents(callback: (event: any) => void): number {
    return this.program.addEventListener("bidPlaced", callback);
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(listenerId: number): Promise<void> {
    await this.program.removeEventListener(listenerId);
  }
}

// Type definitions placeholder

export * from "../types/shadowbid";
