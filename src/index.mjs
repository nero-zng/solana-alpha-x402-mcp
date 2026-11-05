#!/usr/bin/env node
// stdio MCP server: one tool per Solana Alpha API endpoint + free list_pricing.
// stdout is JSON-RPC only — log with console.error.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, VERSION, pricingList, PAY_TO } from "./catalog.mjs";
import { callEndpoint, apiBase } from "./client.mjs";

function textResult(obj, { isError = false } = {}) {
  return {
    content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

function buildServer() {
  const server = new Server(
    {
      name: "solana-alpha-x402-mcp",
      version: VERSION,
    },
    {
      capabilities: { tools: {} },
    }
  );

  const toolDefs = [
    {
      name: "list_pricing",
      description:
        "Free. List all Solana Alpha API tools with USDC prices, PayTo, network, params, and whether a signer is configured. Call this first.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    ...TOOLS.map((t) => ({
      name: t.tool,
      description: `${t.title} — ${t.priceUsdc} USDC. ${t.description}`,
      inputSchema: t.inputSchema,
    })),
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefs }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments || {};

    if (name === "list_pricing") {
      return textResult(pricingList());
    }

    const ep = TOOLS.find((t) => t.tool === name);
    if (!ep) {
      return textResult({ error: "unknown_tool", name, known: toolDefs.map((t) => t.name) }, { isError: true });
    }

    try {
      const result = await callEndpoint({
        path: ep.path,
        query: args,
        listedPriceUsdc: ep.priceUsdc,
      });
      // 402 without a key is a successful, readable result (not isError) so agents can act on payment info.
      if (result.paymentRequired) {
        return textResult(result.content);
      }
      if (result.capped) {
        return textResult(result.content, { isError: true });
      }
      if (!result.ok) {
        return textResult(result.content, { isError: true });
      }
      return textResult(result.content);
    } catch (e) {
      return textResult(
        {
          error: "tool_failed",
          message: String(e?.message || e),
          tool: name,
          path: ep.path,
          payTo: PAY_TO,
          baseUrl: apiBase(),
        },
        { isError: true }
      );
    }
  });

  return server;
}

async function main() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `solana-alpha-x402-mcp v${VERSION} on stdio → ${apiBase()} (signer=${Boolean(process.env.SOLANA_PRIVATE_KEY) ? "yes" : "no"})`
  );
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
