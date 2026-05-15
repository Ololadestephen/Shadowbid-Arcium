use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub struct BidInput {
        pub amount: u64,
        pub bidder_pubkey: [u8; 32],
    }

    /// Compare two bids and return the higher one
    #[instruction]
    pub fn compare_bids(bid1: Enc<Shared, BidInput>, bid2: Enc<Shared, BidInput>) -> BidInput {
        let b1 = bid1.to_arcis();
        let b2 = bid2.to_arcis();

        let winner = if b1.amount >= b2.amount { b1 } else { b2 };

        winner.reveal()
    }

    /// Validate bid meets reserve price without revealing amount
    #[instruction]
    pub fn validate_bid(
        bid: Enc<Shared, u64>,
        reserve: u64, // plaintext reserve
    ) -> Enc<Shared, bool> {
        let b = bid.to_arcis();
        bid.owner.from_arcis(b >= reserve)
    }
}
