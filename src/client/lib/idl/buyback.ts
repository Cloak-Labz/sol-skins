/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/programs.json`.
 */
export type Buyback = {
  address: "Bwx4dpTtC72nyzTwdCH3rRJVvFg1SatKqgrFNcqNFSAJ";
  metadata: {
    name: "programs";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "executeBuyback";
      docs: [
        "Execute a buyback: burn NFT and transfer SOL",
        "Backend calculates buyback_amount based on skin price"
      ];
      discriminator: [47, 32, 19, 100, 184, 96, 144, 49];
      accounts: [
        {
          name: "buybackConfig";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 117, 121, 98, 97, 99, 107, 95, 99, 111, 110, 102, 105, 103];
              }
            ];
          };
        },
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "treasury";
          writable: true;
          signer: true;
        },
        {
          name: "nftMint";
          writable: true;
        },
        {
          name: "userNftAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "buybackAmount";
          type: "u64";
        }
      ];
    },
    {
      name: "initializeBuyback";
      docs: ["Initialize the buyback configuration (one-time setup)"];
      discriminator: [250, 129, 236, 160, 227, 36, 103, 134];
      accounts: [
        {
          name: "buybackConfig";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 117, 121, 98, 97, 99, 107, 95, 99, 111, 110, 102, 105, 103];
              }
            ];
          };
        },
        {
          name: "authority";
          writable: true;
          signer: true;
        },
        {
          name: "treasury";
        },
        {
          name: "collectionMint";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "collectionMint";
          type: "pubkey";
        },
        {
          name: "minTreasuryBalance";
          type: "u64";
        }
      ];
    },
    {
      name: "toggleBuyback";
      docs: ["Toggle buyback on/off (emergency pause)"];
      discriminator: [246, 251, 121, 101, 124, 163, 123, 165];
      accounts: [
        {
          name: "buybackConfig";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 117, 121, 98, 97, 99, 107, 95, 99, 111, 110, 102, 105, 103];
              }
            ];
          };
        },
        {
          name: "authority";
          signer: true;
        }
      ];
      args: [
        {
          name: "enabled";
          type: "bool";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "buyBackConfig";
      discriminator: [35, 154, 238, 83, 142, 200, 9, 126];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "BuybackDisabled";
      msg: "Buyback is currently disabled";
    },
    {
      code: 6001;
      name: "InsufficientTreasuryBalance";
      msg: "Treasury has insufficient balance";
    },
    {
      code: 6002;
      name: "InvalidAmount";
      msg: "Invalid buyback amount";
    },
    {
      code: 6003;
      name: "InvalidTreasury";
      msg: "Invalid treasury account";
    },
    {
      code: 6004;
      name: "InvalidCollectionMint";
      msg: "Invalid collection mint";
    },
    {
      code: 6005;
      name: "InvalidNFTOwner";
      msg: "User does not own the NFT";
    },
    {
      code: 6006;
      name: "InvalidNFTMint";
      msg: "Token account mint does not match NFT mint";
    },
    {
      code: 6007;
      name: "InvalidNFTAmount";
      msg: "Invalid NFT amount (must be 1)";
    },
    {
      code: 6008;
      name: "MathOverflow";
      msg: "Math operation overflow";
    },
    {
      code: 6009;
      name: "InvalidMinBalance";
      msg: "Minimum treasury balance too high";
    },
    {
      code: 6010;
      name: "Unauthorized";
      msg: "Unauthorized: Only authority can perform this action";
    }
  ];
  types: [
    {
      name: "BuyBackConfig";
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            type: "pubkey";
          },
          {
            name: "treasury";
            type: "pubkey";
          },
          {
            name: "collectionMint";
            type: "pubkey";
          },
          {
            name: "buybackEnable";
            type: "bool";
          },
          {
            name: "minTreasuryBalance";
            type: "u64";
          },
          {
            name: "configBump";
            type: "u8";
          }
        ];
      };
    }
  ];
};

export const IDL: Buyback = {
  address: "Bwx4dpTtC72nyzTwdCH3rRJVvFg1SatKqgrFNcqNFSAJ",
  metadata: {
    name: "programs",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor",
  },
  instructions: [
    {
      name: "executeBuyback",
      docs: [
        "Execute a buyback: burn NFT and transfer SOL",
        "Backend calculates buyback_amount based on skin price",
      ],
      discriminator: [47, 32, 19, 100, 184, 96, 144, 49],
      accounts: [
        {
          name: "buybackConfig",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [98, 117, 121, 98, 97, 99, 107, 95, 99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "user",
          writable: true,
          signer: true,
        },
        {
          name: "treasury",
          writable: true,
          signer: true,
        },
        {
          name: "nftMint",
          writable: true,
        },
        {
          name: "userNftAccount",
          writable: true,
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        },
        {
          name: "systemProgram",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "buybackAmount",
          type: "u64",
        },
      ],
    },
    {
      name: "initializeBuyback",
      docs: ["Initialize the buyback configuration (one-time setup)"],
      discriminator: [250, 129, 236, 160, 227, 36, 103, 134],
      accounts: [
        {
          name: "buybackConfig",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [98, 117, 121, 98, 97, 99, 107, 95, 99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "authority",
          writable: true,
          signer: true,
        },
        {
          name: "treasury",
        },
        {
          name: "collectionMint",
        },
        {
          name: "systemProgram",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "collectionMint",
          type: "pubkey",
        },
        {
          name: "minTreasuryBalance",
          type: "u64",
        },
      ],
    },
    {
      name: "toggleBuyback",
      docs: ["Toggle buyback on/off (emergency pause)"],
      discriminator: [246, 251, 121, 101, 124, 163, 123, 165],
      accounts: [
        {
          name: "buybackConfig",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [98, 117, 121, 98, 97, 99, 107, 95, 99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "authority",
          signer: true,
        },
      ],
      args: [
        {
          name: "enabled",
          type: "bool",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "buyBackConfig",
      discriminator: [35, 154, 238, 83, 142, 200, 9, 126],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "BuybackDisabled",
      msg: "Buyback is currently disabled",
    },
    {
      code: 6001,
      name: "InsufficientTreasuryBalance",
      msg: "Treasury has insufficient balance",
    },
    {
      code: 6002,
      name: "InvalidAmount",
      msg: "Invalid buyback amount",
    },
    {
      code: 6003,
      name: "InvalidTreasury",
      msg: "Invalid treasury account",
    },
    {
      code: 6004,
      name: "InvalidCollectionMint",
      msg: "Invalid collection mint",
    },
    {
      code: 6005,
      name: "InvalidNFTOwner",
      msg: "User does not own the NFT",
    },
    {
      code: 6006,
      name: "InvalidNFTMint",
      msg: "Token account mint does not match NFT mint",
    },
    {
      code: 6007,
      name: "InvalidNFTAmount",
      msg: "Invalid NFT amount (must be 1)",
    },
    {
      code: 6008,
      name: "MathOverflow",
      msg: "Math operation overflow",
    },
    {
      code: 6009,
      name: "InvalidMinBalance",
      msg: "Minimum treasury balance too high",
    },
    {
      code: 6010,
      name: "Unauthorized",
      msg: "Unauthorized: Only authority can perform this action",
    },
  ],
  types: [
    {
      name: "BuyBackConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            type: "pubkey",
          },
          {
            name: "treasury",
            type: "pubkey",
          },
          {
            name: "collectionMint",
            type: "pubkey",
          },
          {
            name: "buybackEnable",
            type: "bool",
          },
          {
            name: "minTreasuryBalance",
            type: "u64",
          },
          {
            name: "configBump",
            type: "u8",
          },
        ],
      },
    },
  ],
};

