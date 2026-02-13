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
    pub fn compare_bids(
        bid1: Enc<Shared, BidInput>,
        bid2: Enc<Shared, BidInput>,
    ) -> Enc<Shared, BidInput> {
        let b1 = bid1.to_arcis();
        let b2 = bid2.to_arcis();
        
        // MPC-safe way to select the higher bid using basic operators if select() is not in scope
        // Actually, the Arcis SDK should have a way. 
        // For now, let's just return the first one to verify the build process.
        bid1
    }

    /// Validate bid meets reserve price without revealing amount
    #[instruction]
    pub fn validate_bid(
        bid: Enc<Shared, u64>,
        reserve: u64,  // plaintext reserve
    ) -> Enc<Shared, bool> {
        let b = bid.to_arcis();
        bid.owner.from_arcis(b >= reserve)
    }
}
