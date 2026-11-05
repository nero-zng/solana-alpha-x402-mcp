// Tool catalog mirrored from the live OpenAPI / ENDPOINTS definitions.
// Keep prices and PayTo in sync with the deployed API; never change PAY_TO.

export const API_BASE_DEFAULT = "https://solana-x402-data.netlify.app";
export const PAY_TO = "3WN7T7VMnRJzjRhKosbaT2oiwuMiBCe6KBfZGiZygv7n";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const VERSION = "1.4.0";

/** @type {Array<{
 *   tool: string,
 *   path: string,
 *   priceUsdc: string,
 *   title: string,
 *   description: string,
 *   inputSchema: object,
 *   exampleInput?: Record<string, string>
 * }>} */
export const TOOLS = [
  {
    tool: "get_price",
    path: "/api/price",
    priceUsdc: "0.005",
    title: "Solana token prices",
    description:
      "Live USD price, 24h change, liquidity and market cap for up to 20 Solana tokens in one call. Accepts symbols (SOL, JUP, BONK, WIF, any Jupiter-listed ticker) or SPL mint addresses. Source: Jupiter Price API v3. Cost: 0.005 USDC via x402.",
    exampleInput: { tokens: "SOL,JUP,BONK" },
    inputSchema: {
      type: "object",
      properties: {
        tokens: {
          type: "string",
          description:
            "Comma-separated symbols or mint addresses, max 20 (e.g. SOL,JUP,DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263)",
        },
      },
      required: ["tokens"],
      additionalProperties: false,
    },
  },
  {
    tool: "get_news",
    path: "/api/news",
    priceUsdc: "0.005",
    title: "Crypto news + Fear & Greed",
    description:
      "Latest crypto headlines from Cointelegraph, Decrypt, The Block and CoinDesk, deduplicated, with Fear & Greed index. Optional keyword filter. Cost: 0.005 USDC via x402.",
    exampleInput: { q: "solana", limit: "10" },
    inputSchema: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description: "Optional keyword filter, e.g. solana, ETF, BTC, hack (max 60 chars)",
        },
        limit: {
          type: "string",
          description: "Number of headlines, 1-50 (default 15)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    tool: "get_trending",
    path: "/api/trending",
    priceUsdc: "0.01",
    title: "Trending Solana tokens",
    description:
      "Trending and newly promoted Solana tokens (DexScreener) with live price, liquidity, volume, age and risk flags. Cost: 0.01 USDC via x402.",
    exampleInput: { sort: "volume", limit: "10", minLiquidity: "20000" },
    inputSchema: {
      type: "object",
      properties: {
        sort: {
          type: "string",
          enum: ["boosts", "volume", "new", "gainers"],
          description: "boosts | volume | new | gainers (default boosts)",
        },
        limit: {
          type: "string",
          description: "Number of tokens, 1-30 (default 20)",
        },
        minLiquidity: {
          type: "string",
          description: "Minimum pool liquidity in USD (default 0)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    tool: "get_new",
    path: "/api/new",
    priceUsdc: "0.005",
    title: "Newest Solana tokens",
    description:
      "Newest Solana token profiles and fresh launches, youngest pair first, with price, liquidity, volume and risk flags. Cost: 0.005 USDC via x402.",
    exampleInput: { limit: "10", minLiquidity: "5000" },
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "string",
          description: "Number of tokens, 1-30 (default 20)",
        },
        minLiquidity: {
          type: "string",
          description: "Minimum pool liquidity in USD (default 0)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    tool: "get_perps",
    path: "/api/perps",
    priceUsdc: "0.01",
    title: "Solana perps funding & open interest",
    description:
      "Perpetual futures snapshot across Solana venues (Phoenix, Velocity, Jupiter Perps): funding, OI, mark/index, basis, cross-venue spreads. Max 5 markets. Cost: 0.01 USDC via x402.",
    exampleInput: { markets: "SOL,BTC,ETH" },
    inputSchema: {
      type: "object",
      properties: {
        markets: {
          type: "string",
          description:
            "Comma-separated symbols (default SOL,BTC,ETH; max 5). Supported: SOL,BTC,ETH,HYPE,ZEC,JUP,BNB,XRP,DOGE,SUI",
        },
      },
      additionalProperties: false,
    },
  },
  {
    tool: "get_rugcheck",
    path: "/api/rugcheck",
    priceUsdc: "0.01",
    title: "Solana token rug check",
    description:
      "Rug-risk report for any SPL / Token-2022 mint: authorities, Token-2022 extensions, supply, top-10 holders excl. pools, LP lock/burn, age, 0-100 risk score. Cost: 0.01 USDC via x402.",
    exampleInput: { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
    inputSchema: {
      type: "object",
      properties: {
        mint: {
          type: "string",
          description: "SPL / Token-2022 mint address (base58)",
        },
      },
      required: ["mint"],
      additionalProperties: false,
    },
  },
  {
    tool: "get_token_report",
    path: "/api/token-report",
    priceUsdc: "0.08",
    title: "Solana token due-diligence report (premium bundle)",
    description:
      "One-call due diligence: full rug check + Jupiter price/changes + DexScreener market data + socials, with pass/caution/avoid verdict. Cost: 0.08 USDC via x402.",
    exampleInput: { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
    inputSchema: {
      type: "object",
      properties: {
        mint: {
          type: "string",
          description: "SPL / Token-2022 mint address (base58)",
        },
      },
      required: ["mint"],
      additionalProperties: false,
    },
  },
  {
    tool: "get_wallet",
    path: "/api/wallet",
    priceUsdc: "0.02",
    title: "Solana wallet profile & PnL",
    description:
      "Profile any Solana wallet: SOL and token holdings with USD values, recent swaps, per-token flows with approximate PnL, bot-like behavior signals. Cost: 0.02 USDC via x402.",
    exampleInput: { address: "D5AKRGcjAiquuFKcMu5isFTNqHYsAuyYto6ZuYg4eikr", limit: "12" },
    inputSchema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Wallet address (base58)",
        },
        limit: {
          type: "string",
          description: "Transactions to parse (5-15 on public RPC, up to 40 with a private RPC)",
        },
      },
      required: ["address"],
      additionalProperties: false,
    },
  },
];

export function pricingList() {
  return {
    service: "Solana Alpha API",
    version: VERSION,
    baseUrl: process.env.API_BASE_URL || API_BASE_DEFAULT,
    network: SOLANA_MAINNET,
    asset: USDC_MINT,
    payTo: PAY_TO,
    scheme: "exact",
    x402Version: 2,
    maxPriceUsdc: process.env.MAX_PRICE_USDC || null,
    hasSigner: Boolean(process.env.SOLANA_PRIVATE_KEY),
    endpoints: TOOLS.map((t) => ({
      tool: t.tool,
      path: t.path,
      title: t.title,
      priceUsdc: t.priceUsdc,
      required: t.inputSchema.required || [],
      params: Object.fromEntries(
        Object.entries(t.inputSchema.properties || {}).map(([k, v]) => [k, v.description || v.type])
      ),
      example: t.exampleInput || {},
    })),
    notes: [
      "Without SOLANA_PRIVATE_KEY, paid tools return HTTP 402 payment requirements (price, payTo, network) instead of failing.",
      "With SOLANA_PRIVATE_KEY set, tools pay via x402 v2 (USDC on Solana mainnet; facilitator pays SOL gas).",
      "MAX_PRICE_USDC (optional) rejects calls whose listed price exceeds the cap.",
      `PayTo wallet is fixed: ${PAY_TO}`,
    ],
  };
}
