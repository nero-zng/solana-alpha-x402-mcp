# solana-alpha-x402-mcp

[![MCP score](https://glama.ai/mcp/servers/nero-zng/solana-alpha-x402-mcp/badges/score.svg)](https://glama.ai/mcp/servers/nero-zng/solana-alpha-x402-mcp)

stdio **MCP server** for the [Solana Alpha API](https://solana-x402-data.netlify.app) (x402 v2, USDC on Solana mainnet).

One tool per paid HTTP endpoint, plus a free `list_pricing` tool. Each tool calls the **live** API at `https://solana-x402-data.netlify.app` (override with `API_BASE_URL`).

| Tool | Endpoint | Price |
|---|---|---|
| `list_pricing` | — | free |
| `get_price` | `/api/price` | 0.005 USDC |
| `get_news` | `/api/news` | 0.005 USDC |
| `get_new` | `/api/new` | 0.005 USDC |
| `get_trending` | `/api/trending` | 0.01 USDC |
| `get_perps` | `/api/perps` | 0.01 USDC |
| `get_rugcheck` | `/api/rugcheck` | 0.01 USDC |
| `get_wallet` | `/api/wallet` | 0.02 USDC |
| `get_token_report` | `/api/token-report` | 0.08 USDC |

**PayTo (never change):** `3WN7T7VMnRJzjRhKosbaT2oiwuMiBCe6KBfZGiZygv7n`

## Behavior

- **No `SOLANA_PRIVATE_KEY`:** tools still call the live API. A `402` is returned as a **readable JSON result** (price, payTo, network, asset, feePayer) — not a hard failure — so agents can discover payment requirements.
- **With `SOLANA_PRIVATE_KEY`:** uses `@x402/fetch` + `@x402/svm` (`ExactSvmScheme`) to sign and settle USDC payments automatically. Optional `MAX_PRICE_USDC` rejects calls above the cap.
- This package is a **standalone** Node MCP server; it talks to the live Solana Alpha API over HTTPS and does not embed Netlify Functions.

## Install (local / from this repo)

```bash
npm install
npm run smoke          # initialize + tools/list + get_price → 402 info (no key, no payment)
```

Published npm name (when published): `solana-alpha-x402-mcp`  
Until then, point your MCP host at the local entry: `node /absolute/path/to/solana-alpha-x402-mcp/src/index.mjs`

## Environment

| Variable | Required | Meaning |
|---|---|---|
| `SOLANA_PRIVATE_KEY` | no | Buyer secret key: base58 (Phantom/Solana CLI export) **or** JSON byte array `[…]`. Never commit this. |
| `MAX_PRICE_USDC` | no | Cap per call (e.g. `0.02`). Listed price above the cap → error, no payment. |
| `API_BASE_URL` | no | Default `https://solana-x402-data.netlify.app` |

## Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "solana-alpha-x402": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/solana-alpha-x402-mcp/src/index.mjs"],
      "env": {
        "API_BASE_URL": "https://solana-x402-data.netlify.app"
      }
    }
  }
}
```

With auto-pay (use a funded burner wallet only):

```json
{
  "mcpServers": {
    "solana-alpha-x402": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/solana-alpha-x402-mcp/src/index.mjs"],
      "env": {
        "SOLANA_PRIVATE_KEY": "YOUR_BASE58_SECRET",
        "MAX_PRICE_USDC": "0.08",
        "API_BASE_URL": "https://solana-x402-data.netlify.app"
      }
    }
  }
}
```

After `npm publish` of this package you can use:

```json
{
  "mcpServers": {
    "solana-alpha-x402": {
      "command": "npx",
      "args": ["-y", "solana-alpha-x402-mcp"],
      "env": {
        "MAX_PRICE_USDC": "0.08"
      }
    }
  }
}
```

## Cursor (`mcp.json`)

Project or user MCP config:

```json
{
  "mcpServers": {
    "solana-alpha-x402": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/solana-alpha-x402-mcp/src/index.mjs"],
      "env": {
        "API_BASE_URL": "https://solana-x402-data.netlify.app"
      }
    }
  }
}
```

Or via npx once published:

```json
{
  "mcpServers": {
    "solana-alpha-x402": {
      "command": "npx",
      "args": ["-y", "solana-alpha-x402-mcp"]
    }
  }
}
```

## Discovery (HTTP, free)

Public discovery documents on the live API host:

- [/.well-known/mcp.json](https://solana-x402-data.netlify.app/.well-known/mcp.json) — server card / install command
- [/tools.json](https://solana-x402-data.netlify.app/tools.json) — Claude/OpenAI-style function schemas (incl. price)
- [/.well-known/agent.json](https://solana-x402-data.netlify.app/.well-known/agent.json)
- [/openapi.json](https://solana-x402-data.netlify.app/openapi.json)
- [/llms.txt](https://solana-x402-data.netlify.app/llms.txt)

## Safety

- Do **not** put a real funded key in git, screenshots, or chat logs.
- Smoke tests intentionally unset `SOLANA_PRIVATE_KEY` and never settle a payment.
- PayTo is a **receive-only** public address hard-coded to match the API; changing it would break settlement against the live service.
