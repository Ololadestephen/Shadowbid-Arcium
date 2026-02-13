use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Token, TokenAccount, Transfer},
};
use arcium_anchor::prelude::*;

const COMP_DEF_OFFSET_COMPARE_BIDS: u32 = arcium_anchor::comp_def_offset("compare_bids");

declare_id!("CSqdLojNG42tPTGTD5tGUv7X8o896Jqq98T1zkynErnW");

#[arcium_program]
pub mod shadowbid {
    use super::*;

    pub fn init_compare_bids_comp_def(ctx: Context<InitCompareBidsCompDef>) -> anchor_lang::Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
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
        require!(start_time >= Clock::get()?.unix_timestamp, ErrorCode::StartTimeInPast);
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

    /// Place an encrypted bid (bid amount derived from token transfer)
    pub fn place_bid(
        ctx: Context<PlaceBid>,
        amount: u64,
        encrypted_bid: Vec<u8>, // Encrypted bid data from Arcium
        arcium_proof: Vec<u8>,  // Zero-knowledge proof of bid validity
        arcium_public_key: [u8; 32], // Ephemeral public key for Arcium encryption
    ) -> anchor_lang::Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        
        
        // Transfer amount
        let amount_to_transfer = amount; 
        
        // Validate auction state
        require!(auction.status == AuctionStatus::Active, ErrorCode::AuctionNotActive);
        require!(clock.unix_timestamp >= auction.start_time, ErrorCode::AuctionNotStarted);
        require!(clock.unix_timestamp < auction.end_time, ErrorCode::AuctionNotEnded);
        let bid = &mut ctx.accounts.bid;
        bid.auction = auction.key();
        bid.bidder = ctx.accounts.bidder.key();
        bid.bid_amount = amount_to_transfer; 
        bid.previous_bid = auction.last_bid; // Linked list: point to previous bid
        
        let encrypted_bid_hash = hash_encrypted_bid(&encrypted_bid);
        bid.encrypted_bid_data = encrypted_bid;
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

        require!(auction.status == AuctionStatus::Pending, ErrorCode::AuctionAlreadyStarted);
        require!(clock.unix_timestamp >= auction.start_time, ErrorCode::TooEarlyToStart);

        auction.status = AuctionStatus::Active;

        emit!(AuctionStarted {
            auction_id: auction.auction_id,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Trigger the winner comparison via Arcium MPC
    pub fn compare_bids(ctx: Context<CompareBids>) -> anchor_lang::Result<()> {
        let auction = &ctx.accounts.auction;
        
    
        
        Ok(())
    }

    /// Callback received from Arcium MPC network with the winner
    pub fn compare_bids_callback(
        ctx: Context<CompareBidsCallback>,
        winner_pubkey: Pubkey,
        winning_bid_amount: u64,
    ) -> anchor_lang::Result<()> {
        let auction = &mut ctx.accounts.auction;
        
        auction.status = AuctionStatus::Closed;
        auction.winner = winner_pubkey;
        auction.highest_bid_amount = winning_bid_amount;

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
        ctx: Context<CloseAuction>,
        winner_pubkey: Pubkey,
        winning_bid_amount: u64,
        _arcium_result_proof: Vec<u8>, 
    ) -> anchor_lang::Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(auction.status == AuctionStatus::Active, ErrorCode::AuctionNotActive);
        require!(clock.unix_timestamp >= auction.end_time, ErrorCode::AuctionNotEnded);
        
        // Simulating the finalization if not using callback
        auction.status = AuctionStatus::Closed;
        auction.winner = winner_pubkey;
        auction.highest_bid_amount = winning_bid_amount;

        emit!(AuctionClosed {
            auction_id: auction.auction_id,
            winner: winner_pubkey,
            winning_amount: winning_bid_amount,
            total_bids: auction.total_bids,
        });

        Ok(())
    }

    /// Settle winning bid - transfer funds to auction creator
    pub fn settle_auction(ctx: Context<SettleAuction>) -> anchor_lang::Result<()> {
        let auction = &ctx.accounts.auction;

        require!(auction.status == AuctionStatus::Closed, ErrorCode::AuctionNotClosed);
        require!(ctx.accounts.winner.key() == auction.winner, ErrorCode::NotWinner);

        let auction_key = auction.key();
        let seeds = &[
            b"escrow",
            auction_key.as_ref(),
            &[auction.escrow_bump],
        ];
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

        require!(auction.status == AuctionStatus::Closed, ErrorCode::AuctionNotClosed);
        require!(bid.status == BidStatus::Active, ErrorCode::BidAlreadyProcessed);
        require!(bid.bidder != auction.winner, ErrorCode::CannotRefundWinner);

        let auction_key = auction.key();
        let seeds = &[
            b"escrow",
            auction_key.as_ref(),
            &[auction.escrow_bump],
        ];
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
    pub auction: Account<'info, Auction>,

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
    #[max_len(256)]
    pub encrypted_bid_data: Vec<u8>,
    #[max_len(256)]
    pub arcium_proof: Vec<u8>,
    pub arcium_public_key: [u8; 32],
    pub timestamp: i64,
    pub status: BidStatus,
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

#[init_computation_definition_accounts("compare_bids", payer)]
#[derive(Accounts)]
pub struct InitCompareBidsCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(mut)]
    /// CHECK: This is the computation definition account being initialized.
    pub comp_def_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Address lookup table for Arcium
    pub address_lookup_table: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: LUT program
    pub lut_program: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompareBids<'info> {
    #[account(
        mut,
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump,
        has_one = authority
    )]
    pub auction: Account<'info, Auction>,

    pub authority: Signer<'info>,

    #[account(mut)]
    /// CHECK: Storage definition account for Arcium MXE
    pub mxe_storage_account: AccountInfo<'info>,

    pub arcium_program: Program<'info, Arcium>,
}

#[derive(Accounts)]
pub struct CompareBidsCallback<'info> {
    #[account(
        mut,
        seeds = [b"auction", auction.authority.as_ref(), auction.auction_id.to_le_bytes().as_ref()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,

    pub arcium_program: Program<'info, Arcium>,
}
