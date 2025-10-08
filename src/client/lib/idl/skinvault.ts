/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/skinvault.json`.
 */
export type Skinvault = {
  "address": "44UwMzMZUcobRp4YyucjvAbBeTFJ3uBPxg7YqwHS2ncp",
  "metadata": {
    "name": "skinvault",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "acceptAuthority",
      "docs": [
        "Accept authority transfer (step 2 of 2)"
      ],
      "discriminator": [
        107,
        86,
        198,
        91,
        33,
        12,
        107,
        160
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "newAuthority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "createBox",
      "docs": [
        "Create a new loot box state"
      ],
      "discriminator": [
        108,
        200,
        91,
        3,
        44,
        99,
        31,
        27
      ],
      "accounts": [
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "boxState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "account",
                "path": "boxAsset"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "boxAsset"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "batchId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "depositTreasury",
      "docs": [
        "Deposit USDC into the treasury"
      ],
      "discriminator": [
        2,
        129,
        72,
        214,
        50,
        94,
        151,
        230
      ],
      "accounts": [
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "treasuryAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "global"
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
                "path": "usdcMint"
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
          "name": "depositorAta",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "emergencyPause",
      "docs": [
        "Emergency pause/unpause all user operations"
      ],
      "discriminator": [
        21,
        143,
        27,
        142,
        200,
        181,
        210,
        255
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "global"
          ]
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "Initialize the SkinVault program"
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint",
          "docs": [
            "USDC mint (or test mint for devnet)"
          ]
        },
        {
          "name": "treasuryAta",
          "docs": [
            "Treasury ATA - PDA will own this account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "global"
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
                "path": "usdcMint"
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
          "name": "authority",
          "writable": true,
          "signer": true
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
      "args": []
    },
    {
      "name": "initiateAuthorityTransfer",
      "docs": [
        "Initiate authority transfer (step 1 of 2)"
      ],
      "discriminator": [
        210,
        43,
        101,
        215,
        119,
        140,
        106,
        218
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "global"
          ]
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "openBox",
      "docs": [
        "Open a loot box and request VRF"
      ],
      "discriminator": [
        225,
        220,
        10,
        104,
        173,
        151,
        214,
        199
      ],
      "accounts": [
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "boxState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "account",
                "path": "box_state.asset",
                "account": "boxState"
              }
            ]
          }
        },
        {
          "name": "batch",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "box_state.batch_id",
                "account": "boxState"
              }
            ]
          }
        },
        {
          "name": "vrfPending",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  114,
                  102,
                  95,
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "box_state.asset",
                "account": "boxState"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "poolSize",
          "type": "u64"
        }
      ]
    },
    {
      "name": "publishMerkleRoot",
      "docs": [
        "Publish a Merkle root for a new batch of inventory"
      ],
      "discriminator": [
        38,
        143,
        10,
        241,
        155,
        226,
        229,
        141
      ],
      "accounts": [
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "batch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "batchId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "global"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "batchId",
          "type": "u64"
        },
        {
          "name": "candyMachine",
          "type": "pubkey"
        },
        {
          "name": "metadataUris",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "merkleRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "snapshotTime",
          "type": "i64"
        }
      ]
    },
    {
      "name": "revealAndClaim",
      "docs": [
        "Reveal and claim NFT from Candy Machine after VRF fulfillment"
      ],
      "discriminator": [
        252,
        157,
        47,
        161,
        84,
        59,
        153,
        60
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "globalState",
          "docs": [
            "Global state (contains authority)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "boxState",
          "docs": [
            "Box state (contains batch_id for deterministic selection)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "account",
                "path": "box_state.asset",
                "account": "boxState"
              }
            ]
          }
        },
        {
          "name": "batch",
          "docs": [
            "Batch containing metadata URIs (DYNAMIC!)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "box_state.batch_id",
                "account": "boxState"
              }
            ]
          }
        },
        {
          "name": "asset",
          "docs": [
            "Core NFT asset to be created (signer for new asset)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "collection",
          "docs": [
            "Collection asset (Metaplex Core collection) - optional"
          ],
          "optional": true
        },
        {
          "name": "coreProgram",
          "docs": [
            "Metaplex Core program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "sellBack",
      "docs": [
        "Sell back an assigned item for USDC"
      ],
      "discriminator": [
        230,
        50,
        8,
        6,
        210,
        15,
        152,
        133
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "treasuryAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "global"
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
                "path": "usdcMint"
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
          "name": "userAta",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "boxState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "account",
                "path": "box_state.asset",
                "account": "boxState"
              }
            ]
          }
        },
        {
          "name": "asset",
          "docs": [
            "Core NFT asset to be burned (must be owned by seller)"
          ],
          "writable": true
        },
        {
          "name": "collection",
          "docs": [
            "Optional collection (if asset belongs to a collection)"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "coreProgram",
          "docs": [
            "Metaplex Core program"
          ]
        },
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "marketPrice",
          "type": "u64"
        },
        {
          "name": "minPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setMinTreasuryBalance",
      "docs": [
        "Set minimum treasury balance for circuit breaker"
      ],
      "discriminator": [
        70,
        18,
        138,
        237,
        133,
        52,
        71,
        175
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "global"
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "toggleBuyback",
      "docs": [
        "Toggle buyback functionality on/off"
      ],
      "discriminator": [
        246,
        251,
        121,
        101,
        124,
        163,
        123,
        165
      ],
      "accounts": [
        {
          "name": "global",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "global"
          ]
        }
      ],
      "args": [
        {
          "name": "enabled",
          "type": "bool"
        }
      ]
    },
    {
      "name": "vrfCallback",
      "docs": [
        "VRF callback to provide randomness for box opening"
      ],
      "discriminator": [
        248,
        224,
        55,
        227,
        56,
        10,
        108,
        36
      ],
      "accounts": [
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "batch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "batch.batch_id",
                "account": "batch"
              }
            ]
          }
        },
        {
          "name": "boxState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "account",
                "path": "box_state.asset",
                "account": "boxState"
              }
            ]
          }
        },
        {
          "name": "vrfPending",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  114,
                  102,
                  95,
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "box_state.asset",
                "account": "boxState"
              }
            ]
          }
        },
        {
          "name": "vrfAuthority",
          "docs": [
            "VRF authority (Switchboard or authorized signer)"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "requestId",
          "type": "u64"
        },
        {
          "name": "randomness",
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
      "name": "withdrawTreasury",
      "docs": [
        "Withdraw USDC from the treasury (authority only)"
      ],
      "discriminator": [
        40,
        63,
        122,
        158,
        144,
        216,
        83,
        96
      ],
      "accounts": [
        {
          "name": "global",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "treasuryAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "global"
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
                "path": "usdcMint"
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
          "name": "recipientAta",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "global"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "batch",
      "discriminator": [
        156,
        194,
        70,
        44,
        22,
        88,
        137,
        44
      ]
    },
    {
      "name": "boxState",
      "discriminator": [
        103,
        153,
        190,
        230,
        226,
        85,
        160,
        203
      ]
    },
    {
      "name": "global",
      "discriminator": [
        167,
        232,
        232,
        177,
        200,
        108,
        114,
        127
      ]
    },
    {
      "name": "vrfPending",
      "discriminator": [
        223,
        4,
        29,
        168,
        28,
        148,
        222,
        31
      ]
    }
  ],
  "events": [
    {
      "name": "boxMinted",
      "discriminator": [
        141,
        150,
        109,
        170,
        184,
        231,
        225,
        232
      ]
    },
    {
      "name": "boxOpenRequested",
      "discriminator": [
        75,
        73,
        106,
        46,
        170,
        86,
        59,
        67
      ]
    },
    {
      "name": "boxOpened",
      "discriminator": [
        182,
        8,
        54,
        3,
        13,
        230,
        16,
        28
      ]
    },
    {
      "name": "buybackExecuted",
      "discriminator": [
        150,
        109,
        157,
        10,
        124,
        24,
        38,
        189
      ]
    },
    {
      "name": "buybackToggled",
      "discriminator": [
        75,
        239,
        143,
        171,
        116,
        10,
        72,
        156
      ]
    },
    {
      "name": "inventoryAssigned",
      "discriminator": [
        8,
        103,
        6,
        164,
        224,
        18,
        226,
        208
      ]
    },
    {
      "name": "merklePublished",
      "discriminator": [
        202,
        109,
        177,
        198,
        203,
        197,
        120,
        150
      ]
    },
    {
      "name": "treasuryDeposit",
      "discriminator": [
        176,
        79,
        3,
        202,
        180,
        107,
        127,
        236
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6001,
      "name": "invalidMerkleProof",
      "msg": "Invalid Merkle proof provided"
    },
    {
      "code": 6002,
      "name": "vrfNotFulfilled",
      "msg": "VRF request not fulfilled or invalid"
    },
    {
      "code": 6003,
      "name": "notOpenedYet",
      "msg": "Box has not been opened yet"
    },
    {
      "code": 6004,
      "name": "alreadyOpened",
      "msg": "Box has already been opened"
    },
    {
      "code": 6005,
      "name": "treasuryInsufficient",
      "msg": "Treasury has insufficient funds"
    },
    {
      "code": 6006,
      "name": "buybackDisabled",
      "msg": "Buyback is currently disabled"
    },
    {
      "code": 6007,
      "name": "invalidPoolSize",
      "msg": "Invalid pool size for randomness"
    },
    {
      "code": 6008,
      "name": "slippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6009,
      "name": "merkleProofTooDeep",
      "msg": "Merkle proof depth exceeds maximum allowed"
    },
    {
      "code": 6010,
      "name": "inventoryAlreadyAssigned",
      "msg": "Inventory item already assigned"
    },
    {
      "code": 6011,
      "name": "notBoxOwner",
      "msg": "Box is not owned by the caller"
    },
    {
      "code": 6012,
      "name": "invalidBatchId",
      "msg": "Invalid batch ID"
    },
    {
      "code": 6013,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6014,
      "name": "invalidCandyMachineProgram",
      "msg": "Invalid Candy Machine program ID"
    },
    {
      "code": 6015,
      "name": "invalidMetadataProgram",
      "msg": "Invalid Token Metadata program ID"
    },
    {
      "code": 6016,
      "name": "invalidCandyMachine",
      "msg": "Invalid Candy Machine address"
    },
    {
      "code": 6017,
      "name": "invalidMetadata",
      "msg": "Invalid metadata URI or index"
    },
    {
      "code": 6018,
      "name": "invalidCoreProgram",
      "msg": "Invalid Core program ID"
    },
    {
      "code": 6019,
      "name": "cpiFailed",
      "msg": "CPI call failed"
    }
  ],
  "types": [
    {
      "name": "batch",
      "docs": [
        "Batch of inventory items with Merkle root for verification",
        "",
        "Each batch stores dynamic metadata URIs that can be updated by admin.",
        "This allows flexible package management without program redeployment."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "docs": [
              "Unique batch identifier"
            ],
            "type": "u64"
          },
          {
            "name": "candyMachine",
            "docs": [
              "Candy Machine reference (optional, for verification)",
              "Admin can link to external CM or leave as default"
            ],
            "type": "pubkey"
          },
          {
            "name": "merkleRoot",
            "docs": [
              "Merkle root of the inventory snapshot (for verification)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "snapshotTime",
            "docs": [
              "Timestamp when the snapshot was taken"
            ],
            "type": "i64"
          },
          {
            "name": "totalItems",
            "docs": [
              "Total items in this batch's inventory"
            ],
            "type": "u64"
          },
          {
            "name": "boxesMinted",
            "docs": [
              "Number of boxes minted for this batch"
            ],
            "type": "u64"
          },
          {
            "name": "boxesOpened",
            "docs": [
              "Number of boxes opened for this batch"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for PDA"
            ],
            "type": "u8"
          },
          {
            "name": "metadataUris",
            "docs": [
              "Dynamic metadata URIs for all skins in this batch",
              "Admin can update this list to add/remove skins",
              "Each URI should be max 200 characters (Arweave/IPFS links)"
            ],
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    },
    {
      "name": "boxMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "batchId",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "metadataUri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "boxOpenRequested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "vrfRequestId",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "boxOpened",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "randomness",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "randomIndex",
            "type": "u64"
          },
          {
            "name": "poolSize",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "boxState",
      "docs": [
        "State of an individual loot box NFT (Metaplex Core)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "Owner of the box NFT"
            ],
            "type": "pubkey"
          },
          {
            "name": "batchId",
            "docs": [
              "Batch this box belongs to"
            ],
            "type": "u64"
          },
          {
            "name": "opened",
            "docs": [
              "Whether the box has been opened"
            ],
            "type": "bool"
          },
          {
            "name": "assignedInventory",
            "docs": [
              "Hash of the assigned inventory item (zero if not assigned)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "asset",
            "docs": [
              "Core NFT asset address (single account for Core NFTs)",
              "Replaces the old mint + token account pattern"
            ],
            "type": "pubkey"
          },
          {
            "name": "mintTime",
            "docs": [
              "Timestamp when box was minted"
            ],
            "type": "i64"
          },
          {
            "name": "openTime",
            "docs": [
              "Timestamp when box was opened (zero if not opened)"
            ],
            "type": "i64"
          },
          {
            "name": "randomIndex",
            "docs": [
              "Random index generated during opening"
            ],
            "type": "u64"
          },
          {
            "name": "redeemed",
            "docs": [
              "Whether the box has been redeemed (sold back)"
            ],
            "type": "bool"
          },
          {
            "name": "redeemTime",
            "docs": [
              "Timestamp when redeemed (zero if not redeemed)"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "buybackExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "inventoryIdHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "spreadFee",
            "type": "u64"
          },
          {
            "name": "payout",
            "type": "u64"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "buybackToggled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "global",
      "docs": [
        "Global program state - singleton PDA with fixed seed \"global\""
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Authority that can perform admin operations"
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "docs": [
              "USDC mint address"
            ],
            "type": "pubkey"
          },
          {
            "name": "buybackEnabled",
            "docs": [
              "Whether buyback is currently enabled"
            ],
            "type": "bool"
          },
          {
            "name": "minTreasuryBalance",
            "docs": [
              "Minimum treasury balance required for buybacks"
            ],
            "type": "u64"
          },
          {
            "name": "currentBatch",
            "docs": [
              "Current batch counter"
            ],
            "type": "u64"
          },
          {
            "name": "totalBoxesMinted",
            "docs": [
              "Total boxes minted across all batches"
            ],
            "type": "u64"
          },
          {
            "name": "totalBuybacks",
            "docs": [
              "Total successful buybacks"
            ],
            "type": "u64"
          },
          {
            "name": "totalBuybackVolume",
            "docs": [
              "Total USDC volume from buybacks"
            ],
            "type": "u64"
          },
          {
            "name": "paused",
            "docs": [
              "Emergency pause flag (stops all user operations)"
            ],
            "type": "bool"
          },
          {
            "name": "pendingAuthority",
            "docs": [
              "Pending authority for 2-step transfer"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "inventoryAssigned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "inventoryIdHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "batchId",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "merklePublished",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "batchId",
            "type": "u64"
          },
          {
            "name": "merkleRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "snapshotTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "treasuryDeposit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "newBalance",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "vrfPending",
      "docs": [
        "Temporary state for pending VRF randomness requests"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "boxMint",
            "docs": [
              "Box mint that requested VRF"
            ],
            "type": "pubkey"
          },
          {
            "name": "requestId",
            "docs": [
              "VRF request ID (if using external VRF service)"
            ],
            "type": "u64"
          },
          {
            "name": "requestTime",
            "docs": [
              "Timestamp when VRF was requested"
            ],
            "type": "i64"
          },
          {
            "name": "poolSize",
            "docs": [
              "Pool size for random index calculation"
            ],
            "type": "u64"
          },
          {
            "name": "randomness",
            "docs": [
              "VRF randomness result (0 if not yet fulfilled)"
            ],
            "type": "u64"
          },
          {
            "name": "user",
            "docs": [
              "User who requested the VRF (for closing account)"
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for PDA"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ]
};
