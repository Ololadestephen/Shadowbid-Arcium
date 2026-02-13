export type Shadowbid = {
    "version": "0.1.0",
    "name": "shadowbid",
    "address": "CSqdLojNG42tPTGTD5tGUv7X8o896Jqq98T1zkynErnW",
    "metadata": {
        "name": "shadowbid",
        "version": "0.1.0",
        "spec": "0.1.0",
        "description": "Privacy-preserving blind auction system on Solana with Arcium MPC"
    },
    "instructions": [
        {
            "name": "create_auction",
            "docs": ["Initialize a new blind auction"],
            "accounts": [
                { "name": "auction", "isMut": true, "isSigner": false },
                { "name": "authority", "isMut": true, "isSigner": true },
                { "name": "escrow_authority", "isMut": false, "isSigner": false },
                { "name": "system_program", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "auction_id", "type": "u64" },
                { "name": "start_time", "type": "i64" },
                { "name": "end_time", "type": "i64" },
                { "name": "reserve_price", "type": "u64" },
                { "name": "item_name", "type": "string" },
                { "name": "item_description", "type": "string" },
                { "name": "arcium_mpc_id", "type": { "array": ["u8", 32] } }
            ]
        },
        {
            "name": "place_bid",
            "docs": ["Place an encrypted bid (bid amount derived from token transfer)"],
            "accounts": [
                { "name": "auction", "isMut": true, "isSigner": false },
                { "name": "bid", "isMut": true, "isSigner": false },
                { "name": "bidder", "isMut": true, "isSigner": true },
                { "name": "bidder_token_account", "isMut": true, "isSigner": false },
                { "name": "escrow_token_account", "isMut": true, "isSigner": false },
                { "name": "escrow_authority", "isMut": false, "isSigner": false },
                { "name": "token_mint", "isMut": false, "isSigner": false },
                { "name": "token_program", "isMut": false, "isSigner": false },
                { "name": "associated_token_program", "isMut": false, "isSigner": false },
                { "name": "system_program", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "amount", "type": "u64" },
                { "name": "encrypted_bid", "type": "bytes" },
                { "name": "arcium_proof", "type": "bytes" },
                { "name": "arcium_public_key", "type": { "array": ["u8", 32] } }
            ]
        },
        {
            "name": "start_auction",
            "accounts": [
                { "name": "auction", "isMut": true, "isSigner": false },
                { "name": "authority", "isMut": false, "isSigner": true }
            ],
            "args": []
        },
        {
            "name": "close_auction",
            "accounts": [
                { "name": "auction", "isMut": true, "isSigner": false },
                { "name": "authority", "isMut": false, "isSigner": true }
            ],
            "args": [
                { "name": "winner_pubkey", "type": "pubkey" },
                { "name": "winning_bid_amount", "type": "u64" },
                { "name": "arcium_result_proof", "type": "bytes" }
            ]
        },
        {
            "name": "settle_auction",
            "accounts": [
                { "name": "auction", "isMut": false, "isSigner": false },
                { "name": "winner", "isMut": false, "isSigner": false },
                { "name": "authority_token_account", "isMut": true, "isSigner": false },
                { "name": "escrow_token_account", "isMut": true, "isSigner": false },
                { "name": "escrow_authority", "isMut": false, "isSigner": false },
                { "name": "token_program", "isMut": false, "isSigner": false }
            ],
            "args": []
        },
        {
            "name": "refund_bid",
            "accounts": [
                { "name": "auction", "isMut": false, "isSigner": false },
                { "name": "bid", "isMut": true, "isSigner": false },
                { "name": "bidder", "isMut": false, "isSigner": false },
                { "name": "bidder_token_account", "isMut": true, "isSigner": false },
                { "name": "escrow_token_account", "isMut": true, "isSigner": false },
                { "name": "escrow_authority", "isMut": false, "isSigner": false },
                { "name": "token_program", "isMut": false, "isSigner": false }
            ],
            "args": []
        },
        {
            "name": "cancel_auction",
            "accounts": [
                { "name": "auction", "isMut": true, "isSigner": false },
                { "name": "authority", "isMut": false, "isSigner": true }
            ],
            "args": []
        }
    ],
    "accounts": [
        {
            "name": "auction",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "auction_id", "type": "u64" },
                    { "name": "authority", "type": "pubkey" },
                    { "name": "start_time", "type": "i64" },
                    { "name": "end_time", "type": "i64" },
                    { "name": "reserve_price", "type": "u64" },
                    { "name": "item_name", "type": "string" },
                    { "name": "item_description", "type": "string" },
                    { "name": "status", "type": { "defined": "AuctionStatus" } },
                    { "name": "total_bids", "type": "u32" },
                    { "name": "last_bid", "type": "pubkey" },
                    { "name": "highest_bid_amount", "type": "u64" },
                    { "name": "winner", "type": "pubkey" },
                    { "name": "arcium_mpc_id", "type": { "array": ["u8", 32] } },
                    { "name": "bump", "type": "u8" },
                    { "name": "escrow_bump", "type": "u8" }
                ]
            }
        },
        {
            "name": "bid",
            "type": {
                "kind": "struct",
                "fields": [
                    { "name": "auction", "type": "pubkey" },
                    { "name": "bidder", "type": "pubkey" },
                    { "name": "bid_amount", "type": "u64" },
                    { "name": "previous_bid", "type": "pubkey" },
                    { "name": "encrypted_bid_data", "type": "bytes" },
                    { "name": "arcium_proof", "type": "bytes" },
                    { "name": "arcium_public_key", "type": { "array": ["u8", 32] } },
                    { "name": "timestamp", "type": "i64" },
                    { "name": "status", "type": { "defined": "BidStatus" } },
                    { "name": "bump", "type": "u8" }
                ]
            }
        }
    ],
    "types": [
        {
            "name": "AuctionStatus",
            "type": {
                "kind": "enum",
                "variants": [
                    { "name": "Pending" },
                    { "name": "Active" },
                    { "name": "Closed" },
                    { "name": "Cancelled" }
                ]
            }
        },
        {
            "name": "BidStatus",
            "type": {
                "kind": "enum",
                "variants": [
                    { "name": "Active" },
                    { "name": "Won" },
                    { "name": "Lost" },
                    { "name": "Refunded" }
                ]
            }
        }
    ],
    "events": [
        { "name": "auctionCreated", "fields": [] },
        { "name": "bidPlaced", "fields": [] }
    ],
    "errors": []
};
