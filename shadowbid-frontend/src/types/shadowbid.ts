/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/shadowbid.json`.
 */
export type Shadowbid = {
  "address": "CSqdLojNG42tPTGTD5tGUv7X8o896Jqq98T1zkynErnW",
  "metadata": {
    "name": "shadowbid",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Privacy-preserving blind auction system on Solana with Arcium MPC"
  },
  "instructions": [
    {
      "name": "cancelAuction",
      "docs": [
        "Cancel auction (only if no bids placed)"
      ],
      "discriminator": [
        156,
        43,
        197,
        110,
        218,
        105,
        143,
        182
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.authority",
                "account": "auction"
              },
              {
                "kind": "account",
                "path": "auction.auction_id",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "auction"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "closeAuction",
      "docs": [
        "Close auction (manually or via MPC result)"
      ],
      "discriminator": [
        225,
        129,
        91,
        48,
        215,
        73,
        203,
        172
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.authority",
                "account": "auction"
              },
              {
                "kind": "account",
                "path": "auction.auction_id",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "auction"
          ]
        }
      ],
      "args": [
        {
          "name": "winnerPubkey",
          "type": "pubkey"
        },
        {
          "name": "winningBidAmount",
          "type": "u64"
        },
        {
          "name": "arciumResultProof",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "compareBids",
      "docs": [
        "Trigger the winner comparison via Arcium MPC"
      ],
      "discriminator": [
        28,
        179,
        72,
        83,
        59,
        200,
        211,
        29
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.authority",
                "account": "auction"
              },
              {
                "kind": "account",
                "path": "auction.auction_id",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "mxeStorageAccount",
          "writable": true
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": []
    },
    {
      "name": "compareBidsCallback",
      "docs": [
        "Callback received from Arcium MPC network with the winner"
      ],
      "discriminator": [
        217,
        51,
        97,
        101,
        152,
        182,
        45,
        201
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.authority",
                "account": "auction"
              },
              {
                "kind": "account",
                "path": "auction.auction_id",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "winnerPubkey",
          "type": "pubkey"
        },
        {
          "name": "winningBidAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createAuction",
      "docs": [
        "Initialize a new blind auction"
      ],
      "discriminator": [
        234,
        6,
        201,
        246,
        47,
        219,
        176,
        107
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "escrowAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        },
        {
          "name": "startTime",
          "type": "i64"
        },
        {
          "name": "endTime",
          "type": "i64"
        },
        {
          "name": "reservePrice",
          "type": "u64"
        },
        {
          "name": "itemName",
          "type": "string"
        },
        {
          "name": "itemDescription",
          "type": "string"
        },
        {
          "name": "arciumMpcId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initCompareBidsCompDef",
      "discriminator": [
        86,
        100,
        95,
        242,
        82,
        254,
        113,
        77
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram",
          "writable": true
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "placeBid",
      "docs": [
        "Place an encrypted bid (bid amount derived from token transfer)"
      ],
      "discriminator": [
        238,
        77,
        148,
        91,
        200,
        151,
        92,
        146
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.authority",
                "account": "auction"
              },
              {
                "kind": "account",
                "path": "auction.auction_id",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "bidderTokenAccount",
          "writable": true
        },
        {
          "name": "escrowTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrowAuthority"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "escrowAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "encryptedBid",
          "type": "bytes"
        },
        {
          "name": "arciumProof",
          "type": "bytes"
        },
        {
          "name": "arciumPublicKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "refundBid",
      "docs": [
        "Refund losing bids"
      ],
      "discriminator": [
        171,
        145,
        79,
        190,
        16,
        50,
        10,
        24
      ],
      "accounts": [
        {
          "name": "auction",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.authority",
                "account": "auction"
              },
              {
                "kind": "account",
                "path": "auction.auction_id",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bid.bidder",
                "account": "bid"
              }
            ]
          }
        },
        {
          "name": "bidder",
          "relations": [
            "bid"
          ]
        },
        {
          "name": "bidderTokenAccount",
          "writable": true
        },
        {
          "name": "escrowTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrowAuthority"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "escrowAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "settleAuction",
      "docs": [
        "Settle winning bid - transfer funds to auction creator"
      ],
      "discriminator": [
        246,
        196,
        183,
        98,
        222,
        139,
        46,
        133
      ],
      "accounts": [
        {
          "name": "auction",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.authority",
                "account": "auction"
              },
              {
                "kind": "account",
                "path": "auction.auction_id",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "winner"
        },
        {
          "name": "authorityTokenAccount",
          "writable": true
        },
        {
          "name": "escrowTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrowAuthority"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "escrowAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "startAuction",
      "docs": [
        "Start the auction (move from Pending to Active)"
      ],
      "discriminator": [
        255,
        2,
        149,
        136,
        148,
        125,
        65,
        195
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.authority",
                "account": "auction"
              },
              {
                "kind": "account",
                "path": "auction.auction_id",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "auction"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "discriminator": [
        218,
        94,
        247,
        242,
        126,
        233,
        131,
        81
      ]
    },
    {
      "name": "bid",
      "discriminator": [
        143,
        246,
        48,
        245,
        42,
        145,
        180,
        88
      ]
    },
    {
      "name": "mxeAccount",
      "discriminator": [
        103,
        26,
        85,
        250,
        179,
        159,
        17,
        117
      ]
    }
  ],
  "events": [
    {
      "name": "auctionCancelled",
      "discriminator": [
        22,
        32,
        51,
        83,
        215,
        194,
        171,
        209
      ]
    },
    {
      "name": "auctionClosed",
      "discriminator": [
        104,
        72,
        168,
        177,
        241,
        79,
        231,
        167
      ]
    },
    {
      "name": "auctionCreated",
      "discriminator": [
        133,
        190,
        194,
        65,
        172,
        0,
        70,
        178
      ]
    },
    {
      "name": "auctionSettled",
      "discriminator": [
        61,
        151,
        131,
        170,
        95,
        203,
        219,
        147
      ]
    },
    {
      "name": "auctionStarted",
      "discriminator": [
        126,
        97,
        193,
        56,
        72,
        162,
        162,
        64
      ]
    },
    {
      "name": "bidPlaced",
      "discriminator": [
        135,
        53,
        176,
        83,
        193,
        69,
        108,
        61
      ]
    },
    {
      "name": "bidRefunded",
      "discriminator": [
        197,
        100,
        31,
        186,
        67,
        28,
        46,
        103
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidTimeRange",
      "msg": "Invalid time range: end time must be after start time"
    },
    {
      "code": 6001,
      "name": "startTimeInPast",
      "msg": "Start time cannot be in the past"
    },
    {
      "code": 6002,
      "name": "nameTooLong",
      "msg": "Item name is too long (max 64 characters)"
    },
    {
      "code": 6003,
      "name": "descriptionTooLong",
      "msg": "Item description is too long (max 256 characters)"
    },
    {
      "code": 6004,
      "name": "auctionNotActive",
      "msg": "Auction is not active"
    },
    {
      "code": 6005,
      "name": "auctionNotStarted",
      "msg": "Auction has not started yet"
    },
    {
      "code": 6006,
      "name": "auctionEnded",
      "msg": "Auction has already ended"
    },
    {
      "code": 6007,
      "name": "invalidEncryptedBid",
      "msg": "Invalid encrypted bid data"
    },
    {
      "code": 6008,
      "name": "invalidProof",
      "msg": "Invalid cryptographic proof"
    },
    {
      "code": 6009,
      "name": "bidBelowReserve",
      "msg": "Bid amount is below reserve price"
    },
    {
      "code": 6010,
      "name": "auctionAlreadyStarted",
      "msg": "Auction has already started"
    },
    {
      "code": 6011,
      "name": "tooEarlyToStart",
      "msg": "Too early to start auction"
    },
    {
      "code": 6012,
      "name": "auctionNotEnded",
      "msg": "Auction has not ended yet"
    },
    {
      "code": 6013,
      "name": "noValidBids",
      "msg": "No valid bids received"
    },
    {
      "code": 6014,
      "name": "auctionNotClosed",
      "msg": "Auction is not closed"
    },
    {
      "code": 6015,
      "name": "notWinner",
      "msg": "Not the auction winner"
    },
    {
      "code": 6016,
      "name": "bidAlreadyProcessed",
      "msg": "Bid has already been processed"
    },
    {
      "code": 6017,
      "name": "cannotRefundWinner",
      "msg": "Cannot refund winning bid"
    },
    {
      "code": 6018,
      "name": "cannotCancelWithBids",
      "msg": "Cannot cancel auction with active bids"
    },
    {
      "code": 6019,
      "name": "cannotCancelClosed",
      "msg": "Cannot cancel closed auction"
    }
  ],
  "types": [
    {
      "name": "auction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "reservePrice",
            "type": "u64"
          },
          {
            "name": "itemName",
            "type": "string"
          },
          {
            "name": "itemDescription",
            "type": "string"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "auctionStatus"
              }
            }
          },
          {
            "name": "totalBids",
            "type": "u32"
          },
          {
            "name": "lastBid",
            "type": "pubkey"
          },
          {
            "name": "highestBidAmount",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "arciumMpcId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "escrowBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "auctionCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "auctionClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "winningAmount",
            "type": "u64"
          },
          {
            "name": "totalBids",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "auctionCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "arciumMpcId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "auctionSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "auctionStarted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "auctionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "active"
          },
          {
            "name": "closed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "bid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "bidAmount",
            "type": "u64"
          },
          {
            "name": "previousBid",
            "type": "pubkey"
          },
          {
            "name": "encryptedBidData",
            "type": "bytes"
          },
          {
            "name": "arciumProof",
            "type": "bytes"
          },
          {
            "name": "arciumPublicKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "bidStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bidPlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "encryptedBidHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "bidRefunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "bidStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "won"
          },
          {
            "name": "lost"
          },
          {
            "name": "refunded"
          }
        ]
      }
    },
    {
      "name": "mxeAccount",
      "docs": [
        "A MPC Execution Environment."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "cluster",
            "type": {
              "option": "u32"
            }
          },
          {
            "name": "keygenOffset",
            "type": "u64"
          },
          {
            "name": "keyRecoveryInitOffset",
            "type": "u64"
          },
          {
            "name": "mxeProgramId",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "utilityPubkeys",
            "type": {
              "defined": {
                "name": "setUnset",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "utilityPubkeys"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "lutOffsetSlot",
            "type": "u64"
          },
          {
            "name": "computationDefinitions",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "mxeStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "mxeStatus",
      "docs": [
        "The status of an MXE."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "recovery"
          }
        ]
      }
    },
    {
      "name": "setUnset",
      "docs": [
        "Utility struct to store a value that needs to be set by a certain number of participants (keys",
        "in our case). Once all participants have set the value, the value is considered set and we only",
        "store it once."
      ],
      "generics": [
        {
          "kind": "type",
          "name": "t"
        }
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "set",
            "fields": [
              {
                "generic": "t"
              }
            ]
          },
          {
            "name": "unset",
            "fields": [
              {
                "generic": "t"
              },
              {
                "vec": "bool"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "utilityPubkeys",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "x25519Pubkey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "ed25519VerifyingKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "elgamalPubkey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "pubkeyValidityProof",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ]
};
