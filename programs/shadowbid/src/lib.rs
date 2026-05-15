use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Token, TokenAccount, Transfer},
};
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::{
    cpi::accounts::QueueComputation,
    types::{CallbackAccount, CallbackInstruction, CircuitSource, OffChainCircuitSource},
};
use arcium_macros::circuit_hash;

const BID_INPUT_CIPHERTEXTS: usize = 33;
const ARCIUM_SHARED_BID_INPUT_LEN: usize = 32 + 16 + (BID_INPUT_CIPHERTEXTS * 32);
const BID_CIPHERTEXT_DATA_OFFSET: u32 = 8 + 32 + 32 + 4;
const COMPARE_BIDS_COMP_DEF_OFFSET: u32 = arcium_anchor::comp_def_offset("compare_bids");
const MIN_ARCIUM_PROOF_LEN: usize = 32;
const MAX_CIPHERTEXT_CHUNK_LEN: usize = 800;
const ARCIUM_SIGNER_ACCOUNT_SPACE: usize = 9;

declare_id!("EkfGifLr2z1zyVsqBWekmRnzGcfy45KzdNpSZbFm4yuy");

#[arcium_program]
pub mod shadowbid {
    use super::*;

    pub fn init_compare_bids_comp_def(
        ctx: Context<InitCompareBidsCompDef>,
    ) -> anchor_lang::Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://shadowbid-beta.vercel.app/arcium/compare_bids.arcis".to_string(),
                hash: circuit_hash!("compare_bids"),
            })),
            None,
        )?;
        Ok(())
    }

    /// Initialize a new blind auction
    pub fn create_auction(
        ctx: Context<CreateAuction>,
        auction_id: u64,
        start_time: i64,
        end_time: i64,
        reserve_price: u64,
        item_name: String,
        item_description: String,
        arcium_mpc_id: [u8; 32], // Arcium MPC computation ID
    ) -> anchor_lang::Result<()> {
        require!(end_time > start_time, ErrorCode::InvalidTimeRange);
        require!(
            start_time >= Clock::get()?.unix_timestamp,
            ErrorCode::StartTimeInPast
        );
        require!(item_name.len() <= 64, ErrorCode::NameTooLong);
        require!(item_description.len() <= 256, ErrorCode::DescriptionTooLong);

        let auction = &mut ctx.accounts.auction;
        auction.auction_id = auction_id;
        auction.authority = ctx.accounts.authority.key();
        auction.start_time = start_time;
        auction.end_time = end_time;
        auction.reserve_price = reserve_price;
        auction.item_name = item_name;
        auction.item_description = item_description;
        auction.status = AuctionStatus::Pending;
        auction.total_bids = 0;
        auction.highest_bid_amount = 0;
        auction.winner = Pubkey::default();
        auction.arcium_mpc_id = arcium_mpc_id;
        auction.bump = ctx.bumps.auction;
        auction.escrow_bump = ctx.bumps.escrow_authority;

        emit!(AuctionCreated {
            auction_id,
            authority: ctx.accounts.authority.key(),
            start_time,
            end_time,
            arcium_mpc_id,
        });

        Ok(())
    }

    pub fn init_bid_ciphertext(ctx: Context<InitBidCiphertext>) -> anchor_lang::Result<()> {
        let ciphertext = &mut ctx.accounts.bid_ciphertext;
        ciphertext.auction = ctx.accounts.auction.key();
        ciphertext.bidder = ctx.accounts.bidder.key();
        ciphertext.data = Vec::new();
        ciphertext.bump = ctx.bumps.bid_ciphertext;
        Ok(())
    }

    pub fn write_bid_ciphertext_chunk(
        ctx: Context<WriteBidCiphertextChunk>,
        offset: u16,
        chunk: Vec<u8>,
    ) -> anchor_lang::Result<()> {
        require!(
            chunk.len() <= MAX_CIPHERTEXT_CHUNK_LEN,
            ErrorCode::CiphertextChunkTooLarge
        );
        let ciphertext = &mut ctx.accounts.bid_ciphertext;
        let offset = offset as usize;
        if offset == 0 {
            ciphertext.data.clear();
        }
        require!(ciphertext.data.len() == offset, ErrorCode::InvalidCiphertextOffset);
        require!(
            ciphertext.data.len() + chunk.len() <= ARCIUM_SHARED_BID_INPUT_LEN,
            ErrorCode::InvalidEncryptedBid
        );
        ciphertext.data.extend_from_slice(&chunk);
        Ok(())
    }

    /// Place an encrypted bid (bid amount derived from token transfer)
    pub fn place_bid(
        ctx: Context<PlaceBid>,
        amount: u64,
        arcium_proof: Vec<u8>,       // Zero-knowledge proof of bid validity
        arcium_public_key: [u8; 32], // Ephemeral public key for Arcium encryption
    ) -> anchor_lang::Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        // Validate auction state
        require!(
            auction.status == AuctionStatus::Active,
            ErrorCode::AuctionNotActive
        );
        require!(
            clock.unix_timestamp >= auction.start_time,
            ErrorCode::AuctionNotStarted
        );
        require!(
            clock.unix_timestamp < auction.end_time,
            ErrorCode::AuctionNotEnded
        );
        require!(amount >= auction.reserve_price, ErrorCode::BidBelowReserve);
        require!(
            ctx.accounts.bid_ciphertext.data.len() == ARCIUM_SHARED_BID_INPUT_LEN,
            ErrorCode::InvalidEncryptedBid
        );
        require!(
            arcium_proof.len() >= MIN_ARCIUM_PROOF_LEN,
            ErrorCode::InvalidProof
        );
        require!(
            arcium_public_key != [0u8; 32],
            ErrorCode::InvalidArciumPublicKey
        );

        let amount_to_transfer = amount;
        let bid = &mut ctx.accounts.bid;
        bid.auction = auction.key();
        bid.bidder = ctx.accounts.bidder.key();
        bid.bid_amount = amount_to_transfer;
        bid.previous_bid = auction.last_bid; // Linked list: point to previous bid
        bid.bid_ciphertext = ctx.accounts.bid_ciphertext.key();

        let encrypted_bid_hash = hash_encrypted_bid(&ctx.accounts.bid_ciphertext.data);
        bid.arcium_proof = arcium_proof;
        bid.arcium_public_key = arcium_public_key;
        bid.timestamp = clock.unix_timestamp;
        bid.status = BidStatus::Active;
        bid.bump = ctx.bumps.bid;

        let cpi_accounts = Transfer {
            from: ctx.accounts.bidder_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.bidder.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount_to_transfer)?;

        auction.total_bids += 1;
        auction.last_bid = bid.key(); // Linked list: update head

        emit!(BidPlaced {
            auction_id: auction.auction_id,
            bidder: ctx.accounts.bidder.key(),
            encrypted_bid_hash,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Start the auction (move from Pending to Active)
    pub fn start_auction(ctx: Context<UpdateAuction>) -> anchor_lang::Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(
            auction.status == AuctionStatus::Pending,
            ErrorCode::AuctionAlreadyStarted
        );
        require!(
            clock.unix_timestamp >= auction.start_time,
            ErrorCode::TooEarlyToStart
        );

        auction.status = AuctionStatus::Active;

        emit!(AuctionStarted {
            auction_id: auction.auction_id,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Trigger the winner comparison via Arcium MPC
    pub fn compare_bids(
        ctx: Context<CompareBids>,
        computation_offset: u64,
        cu_price_micro: u64,
    ) -> anchor_lang::Result<()> {
        let auction = &ctx.accounts.auction;
        require!(
            auction.status == AuctionStatus::Active,
            ErrorCode::AuctionNotActive
        );
        require!(
            Clock::get()?.unix_timestamp >= auction.end_time,
            ErrorCode::AuctionNotEnded
        );
        require!(auction.total_bids > 1, ErrorCode::NoValidBids);
        require!(
            ctx.accounts.bid_a.key() != ctx.accounts.bid_b.key(),
            ErrorCode::NoValidBids
        );
        require!(
            ctx.accounts.bid_a.auction == auction.key()
                && ctx.accounts.bid_b.auction == auction.key(),
            ErrorCode::InvalidWinningBid
        );
        require!(
            ctx.accounts.bid_a.status == BidStatus::Active
                && ctx.accounts.bid_b.status == BidStatus::Active,
            ErrorCode::NoValidBids
        );
        require!(
            ctx.accounts.bid_a.bid_ciphertext == ctx.accounts.bid_a_ciphertext.key()
                && ctx.accounts.bid_b.bid_ciphertext == ctx.accounts.bid_b_ciphertext.key(),
            ErrorCode::InvalidEncryptedBid
        );
        require!(
            ctx.accounts.bid_a_ciphertext.auction == auction.key()
                && ctx.accounts.bid_b_ciphertext.auction == auction.key()
                && ctx.accounts.bid_a_ciphertext.bidder == ctx.accounts.bid_a.bidder
                && ctx.accounts.bid_b_ciphertext.bidder == ctx.accounts.bid_b.bidder,
            ErrorCode::InvalidEncryptedBid
        );
        require!(
            ctx.accounts.bid_a_ciphertext.data.len() == ARCIUM_SHARED_BID_INPUT_LEN
                && ctx.accounts.bid_b_ciphertext.data.len() == ARCIUM_SHARED_BID_INPUT_LEN,
            ErrorCode::InvalidEncryptedBid
        );

        let args = ArgBuilder::new()
            .account(
                ctx.accounts.bid_a_ciphertext.key(),
                BID_CIPHERTEXT_DATA_OFFSET,
                ARCIUM_SHARED_BID_INPUT_LEN as u32,
            )
            .account(
                ctx.accounts.bid_b_ciphertext.key(),
                BID_CIPHERTEXT_DATA_OFFSET,
                ARCIUM_SHARED_BID_INPUT_LEN as u32,
            )
            .build();

        let callback_ix = CompareBidsCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[
                CallbackAccount {
                    pubkey: ctx.accounts.auction.key(),
                    is_writable: true,
                },
                CallbackAccount {
                    pubkey: ctx.accounts.bid_a.key(),
                    is_writable: true,
                },
                CallbackAccount {
                    pubkey: ctx.accounts.bid_b.key(),
                    is_writable: true,
                },
            ],
        )?;

        ensure_arcium_signer_account(
            &ctx.accounts.authority.to_account_info(),
            &ctx.accounts.sign_pda_account.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
        )?;

        arcium_anchor::queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![callback_ix],
            1,
            cu_price_micro,
        )?;

        Ok(())
    }

    /// Callback received from Arcium MPC network with the winner
    pub fn compare_bids_callback(
        ctx: Context<CompareBidsCallback>,
        output: SignedComputationOutputs<CompareBidsOutput>,
    ) -> anchor_lang::Result<()> {
        validate_callback_ixs(
            &ctx.accounts.instructions_sysvar,
            &ctx.accounts.arcium_program.key(),
        )?;

        let result =
            output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account)?;
        let CompareBidsOutputStruct0 {
            field_0: winning_bid_amount,
            field_1: winner_bytes,
        } = result.field_0;
        let winner_pubkey = Pubkey::new_from_array(winner_bytes);
        let auction = &mut ctx.accounts.auction;
        require!(
            auction.status == AuctionStatus::Active,
            ErrorCode::AuctionNotActive
        );
        require!(
            winning_bid_amount >= auction.reserve_price,
            ErrorCode::BidBelowReserve
        );
        let bid_a_matches = ctx.accounts.bid_a.bidder == winner_pubkey
            && ctx.accounts.bid_a.bid_amount == winning_bid_amount;
        let bid_b_matches = ctx.accounts.bid_b.bidder == winner_pubkey
            && ctx.accounts.bid_b.bid_amount == winning_bid_amount;
        require!(bid_a_matches || bid_b_matches, ErrorCode::InvalidWinningBid);

        auction.status = AuctionStatus::Closed;
        auction.winner = winner_pubkey;
        auction.highest_bid_amount = winning_bid_amount;
        if bid_a_matches {
            ctx.accounts.bid_a.status = BidStatus::Won;
            ctx.accounts.bid_b.status = BidStatus::Lost;
        } else {
            ctx.accounts.bid_a.status = BidStatus::Lost;
            ctx.accounts.bid_b.status = BidStatus::Won;
        }

        emit!(AuctionClosed {
            auction_id: auction.auction_id,
            winner: winner_pubkey,
            winning_amount: winning_bid_amount,
            total_bids: auction.total_bids,
        });

        Ok(())
    }

    /// Close auction (manually or via MPC result)
    pub fn close_auction(
        _ctx: Context<CloseAuction>,
        _winner_pubkey: Pubkey,
        _winning_bid_amount: u64,
        _arcium_result_proof: Vec<u8>,
    ) -> anchor_lang::Result<()> {
        err!(ErrorCode::ArciumCallbackRequired)
    }

    /// Settle winning bid - transfer funds to auction creator
    pub fn settle_auction(ctx: Context<SettleAuction>) -> anchor_lang::Result<()> {
        let auction = &ctx.accounts.auction;

        require!(
            auction.status == AuctionStatus::Closed,
            ErrorCode::AuctionNotClosed
        );
        require!(
            ctx.accounts.winner.key() == auction.winner,
            ErrorCode::NotWinner
        );

        let auction_key = auction.key();
        let seeds = &[b"escrow", auction_key.as_ref(), &[auction.escrow_bump]];
        let signer = &[&seeds[..]];

        // Transfer winning bid to auction creator
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.authority_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, auction.highest_bid_amount)?;

        emit!(AuctionSettled {
            auction_id: auction.auction_id,
            winner: auction.winner,
            amount: auction.highest_bid_amount,
        });

        Ok(())
    }

    /// Refund losing bids
    pub fn refund_bid(ctx: Context<RefundBid>) -> anchor_lang::Result<()> {
        let auction = &ctx.accounts.auction;
        let bid = &mut ctx.accounts.bid;

        require!(
            auction.status == AuctionStatus::Closed,
            ErrorCode::AuctionNotClosed
        );
        require!(
            bid.status == BidStatus::Active,
            ErrorCode::BidAlreadyProcessed
        );
        require!(bid.bidder != auction.winner, ErrorCode::CannotRefundWinner);

        let auction_key = auction.key();
        let seeds = &[b"escrow", auction_key.as_ref(), &[auction.escrow_bump]];
        let signer = &[&seeds[..]];

        // Refund bid amount
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.bidder_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, bid.bid_amount)?;

        bid.status = BidStatus::Refunded;

        emit!(BidRefunded {
            auction_id: auction.auction_id,
            bidder: bid.bidder,
            amount: bid.bid_amount,
        });

        Ok(())
    }

    /// Cancel auction (only if no bids placed)
    pub fn cancel_auction(ctx: Context<UpdateAuction>) -> anchor_lang::Result<()> {
        let auction = &mut ctx.accounts.auction;

        require!(auction.total_bids == 0, ErrorCode::CannotCancelWithBids);
        require!(
            auction.status == AuctionStatus::Pending || auction.status == AuctionStatus::Active,
            ErrorCode::CannotCancelClosed
        );

        auction.status = AuctionStatus::Cancelled;

        emit!(AuctionCancelled {
            auction_id: auction.auction_id,
        });

        Ok(())
    }
}

// ============================================================================
// Account Contexts
// ============================================================================

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct CreateAuction<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Auction::INIT_SPACE,
        seeds = [b"auction", authority.key().as_ref(), auction_id.to_le_bytes().as_ref()],
        bump
    )]
    pub auction: Box<Account<'info, Auction>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: PDA signer for escrow
    #[account(
        seeds = [b"escrow", auction.key().as_ref()],
        bump
    )]
    pub escrow_authority: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitBidCiphertext<'info> {
    #[account(
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        init,
        payer = bidder,
        space = 8 + BidCiphertext::INIT_SPACE,
        seeds = [b"bid_ciphertext", auction.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub bid_ciphertext: Account<'info, BidCiphertext>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WriteBidCiphertextChunk<'info> {
    #[account(
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [b"bid_ciphertext", auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid_ciphertext.bump
    )]
    pub bid_ciphertext: Account<'info, BidCiphertext>,

    pub bidder: Signer<'info>,
}

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    #[account(
        mut,
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        init,
        payer = bidder,
        space = 8 + Bid::INIT_SPACE,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, Bid>,

    #[account(
        seeds = [b"bid_ciphertext", auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid_ciphertext.bump
    )]
    pub bid_ciphertext: Account<'info, BidCiphertext>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(mut)]
    pub bidder_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = escrow_authority
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA signer for escrow
    #[account(
        seeds = [b"escrow", auction.key().as_ref()],
        bump
    )]
    pub escrow_authority: AccountInfo<'info>,

    pub token_mint: Account<'info, token::Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAuction<'info> {
    #[account(
        mut,
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump,
        has_one = authority
    )]
    pub auction: Account<'info, Auction>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseAuction<'info> {
    #[account(
        mut,
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump,
        has_one = authority
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        seeds = [b"bid", auction.key().as_ref(), winning_bid.bidder.as_ref()],
        bump = winning_bid.bump
    )]
    pub winning_bid: Account<'info, Bid>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SettleAuction<'info> {
    #[account(
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,

    /// CHECK: Winner validation done in instruction
    pub winner: AccountInfo<'info>,

    #[account(mut)]
    pub authority_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = escrow_authority
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA signer for escrow
    #[account(
        seeds = [b"escrow", auction.key().as_ref()],
        bump
    )]
    pub escrow_authority: AccountInfo<'info>,

    pub token_mint: Account<'info, token::Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct RefundBid<'info> {
    #[account(
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bid.bidder.as_ref()],
        bump = bid.bump,
        has_one = bidder
    )]
    pub bid: Account<'info, Bid>,

    /// CHECK: Bidder validation done in account constraint
    pub bidder: AccountInfo<'info>,

    #[account(mut)]
    pub bidder_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = escrow_authority
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA signer for escrow
    #[account(
        seeds = [b"escrow", auction.key().as_ref()],
        bump
    )]
    pub escrow_authority: AccountInfo<'info>,

    pub token_mint: Account<'info, token::Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

// ============================================================================
// Account Structures
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct Auction {
    pub auction_id: u64,
    pub authority: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub reserve_price: u64,
    #[max_len(64)]
    pub item_name: String,
    #[max_len(256)]
    pub item_description: String,
    pub status: AuctionStatus,
    pub total_bids: u32,
    pub last_bid: Pubkey, // Head of the linked list of bids
    pub highest_bid_amount: u64,
    pub winner: Pubkey,
    pub arcium_mpc_id: [u8; 32],
    pub bump: u8,
    pub escrow_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Bid {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub bid_amount: u64,
    pub previous_bid: Pubkey, // Pointer to the previous bid in the list
    pub bid_ciphertext: Pubkey,
    #[max_len(256)]
    pub arcium_proof: Vec<u8>,
    pub arcium_public_key: [u8; 32],
    pub timestamp: i64,
    pub status: BidStatus,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BidCiphertext {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    #[max_len(1104)]
    pub data: Vec<u8>,
    pub bump: u8,
}

// ============================================================================
// Enums
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum AuctionStatus {
    Pending,
    Active,
    Closed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum BidStatus {
    Active,
    Won,
    Lost,
    Refunded,
}

#[event]
pub struct AuctionCreated {
    pub auction_id: u64,
    pub authority: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub arcium_mpc_id: [u8; 32],
}

#[event]
pub struct AuctionStarted {
    pub auction_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct BidPlaced {
    pub auction_id: u64,
    pub bidder: Pubkey,
    pub encrypted_bid_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct AuctionClosed {
    pub auction_id: u64,
    pub winner: Pubkey,
    pub winning_amount: u64,
    pub total_bids: u32,
}

#[event]
pub struct AuctionSettled {
    pub auction_id: u64,
    pub winner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct BidRefunded {
    pub auction_id: u64,
    pub bidder: Pubkey,
    pub amount: u64,
}

#[event]
pub struct AuctionCancelled {
    pub auction_id: u64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid time range: end time must be after start time")]
    InvalidTimeRange,
    #[msg("Start time cannot be in the past")]
    StartTimeInPast,
    #[msg("Item name is too long (max 64 characters)")]
    NameTooLong,
    #[msg("Item description is too long (max 256 characters)")]
    DescriptionTooLong,
    #[msg("Auction is not active")]
    AuctionNotActive,
    #[msg("Auction has not started yet")]
    AuctionNotStarted,
    #[msg("Auction has already ended")]
    AuctionEnded,
    #[msg("Invalid encrypted bid data")]
    InvalidEncryptedBid,
    #[msg("Invalid cryptographic proof")]
    InvalidProof,
    #[msg("Invalid Arcium encryption public key")]
    InvalidArciumPublicKey,
    #[msg("Bid amount is below reserve price")]
    BidBelowReserve,
    #[msg("Auction has already started")]
    AuctionAlreadyStarted,
    #[msg("Too early to start auction")]
    TooEarlyToStart,
    #[msg("Auction has not ended yet")]
    AuctionNotEnded,
    #[msg("No valid bids received")]
    NoValidBids,
    #[msg("Auction is not closed")]
    AuctionNotClosed,
    #[msg("Not the auction winner")]
    NotWinner,
    #[msg("Bid has already been processed")]
    BidAlreadyProcessed,
    #[msg("Cannot refund winning bid")]
    CannotRefundWinner,
    #[msg("Cannot cancel auction with active bids")]
    CannotCancelWithBids,
    #[msg("Cannot cancel closed auction")]
    CannotCancelClosed,
    #[msg("Winning bid account does not match the supplied result")]
    InvalidWinningBid,
    #[msg("Auction must be closed by a verified Arcium callback")]
    ArciumCallbackRequired,
    #[msg("Arcium MXE account is not assigned to a cluster")]
    ClusterNotSet,
    #[msg("Ciphertext chunk is too large")]
    CiphertextChunkTooLarge,
    #[msg("Ciphertext chunk offset does not match current ciphertext length")]
    InvalidCiphertextOffset,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn hash_encrypted_bid(data: &[u8]) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

fn ensure_arcium_signer_account<'info>(
    payer: &AccountInfo<'info>,
    signer_account: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
) -> Result<()> {
    if signer_account.data_len() >= ARCIUM_SIGNER_ACCOUNT_SPACE {
        return Ok(());
    }

    let bump = Pubkey::find_program_address(&[SIGN_PDA_SEED], &ID).1;
    let rent_lamports = Rent::get()?.minimum_balance(ARCIUM_SIGNER_ACCOUNT_SPACE);

    anchor_lang::solana_program::program::invoke_signed(
        &anchor_lang::solana_program::system_instruction::create_account(
            payer.key,
            signer_account.key,
            rent_lamports,
            ARCIUM_SIGNER_ACCOUNT_SPACE as u64,
            &ID,
        ),
        &[
            payer.clone(),
            signer_account.clone(),
            system_program.clone(),
        ],
        &[&[SIGN_PDA_SEED, &[bump]]],
    )?;

    Ok(())
}

#[init_computation_definition_accounts("compare_bids", payer)]
#[derive(Accounts)]
pub struct InitCompareBidsCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: Initialized by the Arcium program as the computation definition account.
    #[account(mut)]
    pub comp_def_account: UncheckedAccount<'info>,

    /// CHECK: Address lookup table used by the Arcium computation definition.
    #[account(mut)]
    pub address_lookup_table: UncheckedAccount<'info>,

    /// CHECK: Solana address lookup table program account required by Arcium CPI.
    pub lut_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CompareBids<'info> {
    #[account(
        mut,
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump,
        has_one = authority
    )]
    pub auction: Account<'info, Auction>,

    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bid_a.bidder.as_ref()],
        bump = bid_a.bump
    )]
    pub bid_a: Box<Account<'info, Bid>>,

    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bid_b.bidder.as_ref()],
        bump = bid_b.bump
    )]
    pub bid_b: Box<Account<'info, Bid>>,

    #[account(
        seeds = [b"bid_ciphertext", auction.key().as_ref(), bid_a.bidder.as_ref()],
        bump = bid_a_ciphertext.bump
    )]
    pub bid_a_ciphertext: Box<Account<'info, BidCiphertext>>,

    #[account(
        seeds = [b"bid_ciphertext", auction.key().as_ref(), bid_b.bidder.as_ref()],
        bump = bid_b_ciphertext.bump
    )]
    pub bid_b_ciphertext: Box<Account<'info, BidCiphertext>>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    /// CHECK: Arcium signer PDA.
    #[account(mut, address = derive_sign_pda!())]
    pub sign_pda_account: UncheckedAccount<'info>,

    /// CHECK: Arcium mempool PDA.
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub mempool_account: UncheckedAccount<'info>,

    /// CHECK: Arcium executing pool PDA.
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub executing_pool: UncheckedAccount<'info>,

    /// CHECK: Arcium computation PDA for this offset.
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(COMPARE_BIDS_COMP_DEF_OFFSET))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,

    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,

    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

impl<'info> arcium_anchor::traits::QueueCompAccs<'info> for CompareBids<'info> {
    fn comp_def_offset(&self) -> u32 {
        COMPARE_BIDS_COMP_DEF_OFFSET
    }

    fn queue_comp_accs(&self) -> QueueComputation<'info> {
        QueueComputation {
            signer: self.authority.to_account_info(),
            sign_seed: self.sign_pda_account.to_account_info(),
            comp: self.computation_account.to_account_info(),
            mxe: self.mxe_account.to_account_info(),
            mempool: self.mempool_account.to_account_info(),
            executing_pool: self.executing_pool.to_account_info(),
            comp_def_acc: self.comp_def_account.to_account_info(),
            cluster: self.cluster_account.to_account_info(),
            pool_account: self.pool_account.to_account_info(),
            system_program: self.system_program.to_account_info(),
            clock: self.clock_account.to_account_info(),
        }
    }

    fn arcium_program(&self) -> AccountInfo<'info> {
        self.arcium_program.to_account_info()
    }

    fn mxe_program(&self) -> Pubkey {
        ID
    }

    fn signer_pda_bump(&self) -> u8 {
        Pubkey::find_program_address(&[SIGN_PDA_SEED], &ID).1
    }
}

#[derive(Accounts)]
pub struct CompareBidsCallback<'info> {
    #[account(
        mut,
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bid_a.bidder.as_ref()],
        bump = bid_a.bump
    )]
    pub bid_a: Account<'info, Bid>,

    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bid_b.bidder.as_ref()],
        bump = bid_b.bump
    )]
    pub bid_b: Account<'info, Bid>,

    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(COMPARE_BIDS_COMP_DEF_OFFSET))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: Verified by Arcium output signature and callback instruction sysvar.
    pub computation_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    /// CHECK: Anchor cannot type sysvar instructions as an Account.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

impl CallbackCompAccs for CompareBidsCallback<'_> {
    fn callback_ix(
        computation_offset: u64,
        mxe_account: &MXEAccount,
        extra_accs: &[CallbackAccount],
    ) -> anchor_lang::Result<CallbackInstruction> {
        let mut accounts = Vec::with_capacity(extra_accs.len() + 6);
        accounts.push(CallbackAccount {
            pubkey: ARCIUM_PROG_ID,
            is_writable: false,
        });
        accounts.push(CallbackAccount {
            pubkey: derive_comp_def_pda!(COMPARE_BIDS_COMP_DEF_OFFSET),
            is_writable: false,
        });
        accounts.push(CallbackAccount {
            pubkey: derive_mxe_pda!(),
            is_writable: false,
        });
        accounts.push(CallbackAccount {
            pubkey: derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet),
            is_writable: false,
        });
        accounts.push(CallbackAccount {
            pubkey: derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet),
            is_writable: false,
        });
        accounts.push(CallbackAccount {
            pubkey: anchor_lang::solana_program::sysvar::instructions::ID,
            is_writable: false,
        });
        accounts.extend_from_slice(extra_accs);

        Ok(CallbackInstruction {
            program_id: crate::ID,
            discriminator: crate::instruction::CompareBidsCallback::DISCRIMINATOR.to_vec(),
            accounts,
        })
    }
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CompareBidsOutput {
    pub field_0: CompareBidsOutputStruct0,
}

impl arcium_anchor::HasSize for CompareBidsOutput {
    const SIZE: usize = 40;
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CompareBidsOutputStruct0 {
    pub field_0: u64,
    pub field_1: [u8; 32],
}
