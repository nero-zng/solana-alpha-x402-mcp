// x402-aware HTTP client for the live Solana Alpha API.
// - No SOLANA_PRIVATE_KEY: plain fetch; 402 responses are returned as structured payment info (never an error).
// - With SOLANA_PRIVATE_KEY: @x402/fetch + ExactSvmScheme auto-pays (USDC on Solana mainnet).
// NEVER hardcode or commit a wallet key. Do not pay in tests unless explicitly requested.

import { base58 } from "@scure/base";
import {
  API_BASE_DEFAULT,
  PAY_TO,
  SOLANA_MAINNET,
  USDC_MINT,
} from "./catalog.mjs";

export function apiBase() {
  return (process.env.API_BASE_URL || API_BASE_DEFAULT).replace(/\/+$/, "");
}

export function maxPriceUsdc() {
  const raw = process.env.MAX_PRICE_USDC;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function decodePaymentRequired(header) {
  if (!header) return null;
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    try {
      return JSON.parse(header);
    } catch {
      return null;
    }
  }
}

function humanAmount(atomic, decimals = 6) {
  if (atomic == null) return null;
  const s = String(atomic);
  const neg = s.startsWith("-");
  const digits = neg ? s.slice(1) : s;
  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  const out = frac ? `${whole}.${frac}` : whole;
  return neg ? `-${out}` : out;
}

export function formatPaymentRequired(pr, { status, body, path, listedPriceUsdc } = {}) {
  const accept = pr?.accepts?.[0] || {};
  const priceUsdc =
    humanAmount(accept.amount, accept.extra?.decimals ?? 6) ||
    listedPriceUsdc ||
    body?.endpoint?.priceUsdc ||
    null;
  return {
    payment_required: true,
    httpStatus: status ?? 402,
    path,
    message:
      body?.message ||
      pr?.error ||
      `Payment required: ${priceUsdc ?? "?"} USDC on Solana mainnet via x402 v2.`,
    priceUsdc,
    amountAtomic: accept.amount ?? null,
    payTo: accept.payTo || PAY_TO,
    network: accept.network || SOLANA_MAINNET,
    asset: accept.asset || USDC_MINT,
    scheme: accept.scheme || "exact",
    x402Version: pr?.x402Version ?? 2,
    feePayer: accept.extra?.feePayer ?? null,
    maxTimeoutSeconds: accept.maxTimeoutSeconds ?? null,
    resource: pr?.resource || null,
    endpoint: body?.endpoint || null,
    docs: body?.docs || {
      openapi: "/openapi.json",
      llms: "/llms.txt",
      wellKnown: "/.well-known/x402",
      mcp: "/.well-known/mcp.json",
      tools: "/tools.json",
    },
    howToPay:
      "Set SOLANA_PRIVATE_KEY (base58 secret key or JSON byte array) in the MCP server env to auto-pay with @x402/fetch + @x402/svm. Optional MAX_PRICE_USDC caps spend. Facilitator pays SOL gas.",
  };
}

function parseSecretKey(raw) {
  const trimmed = String(raw).trim();
  if (!trimmed) throw new Error("SOLANA_PRIVATE_KEY is empty");
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed);
    if (!Array.isArray(arr)) throw new Error("SOLANA_PRIVATE_KEY JSON must be a byte array");
    return Uint8Array.from(arr);
  }
  return base58.decode(trimmed);
}

let payingFetchPromise;

async function getPayingFetch() {
  if (!process.env.SOLANA_PRIVATE_KEY) return null;
  if (!payingFetchPromise) {
    payingFetchPromise = (async () => {
      const { wrapFetchWithPayment, x402Client } = await import("@x402/fetch");
      const { ExactSvmScheme } = await import("@x402/svm/exact/client");
      const { createKeyPairSignerFromBytes } = await import("@solana/kit");
      const bytes = parseSecretKey(process.env.SOLANA_PRIVATE_KEY);
      // Solana secret keys are 64 bytes; seeds are 32 — kit accepts both via fromBytes helpers.
      const signer = await createKeyPairSignerFromBytes(bytes);
      const client = new x402Client().register(SOLANA_MAINNET, new ExactSvmScheme(signer));
      // Also register wildcard for facilitators that advertise solana:*
      try {
        client.register("solana:*", new ExactSvmScheme(signer));
      } catch {
        /* ignore duplicate / unsupported wildcard */
      }
      return wrapFetchWithPayment(fetch, client);
    })().catch((e) => {
      payingFetchPromise = null;
      throw e;
    });
  }
  return payingFetchPromise;
}

/**
 * Call a paid API path. Never throws solely because of HTTP 402 without a key —
 * returns { ok:false, paymentRequired:true, ... } instead.
 */
export async function callEndpoint({ path, query, listedPriceUsdc }) {
  const cap = maxPriceUsdc();
  if (cap != null && listedPriceUsdc != null && Number(listedPriceUsdc) > cap) {
    return {
      ok: false,
      capped: true,
      content: {
        error: "max_price_exceeded",
        message: `Endpoint price ${listedPriceUsdc} USDC exceeds MAX_PRICE_USDC=${cap}.`,
        priceUsdc: listedPriceUsdc,
        maxPriceUsdc: cap,
        path,
        payTo: PAY_TO,
        network: SOLANA_MAINNET,
      },
    };
  }

  const url = new URL(apiBase() + path);
  for (const [k, v] of Object.entries(query || {})) {
    if (v == null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const hasKey = Boolean(process.env.SOLANA_PRIVATE_KEY);
  let res;
  if (hasKey) {
    const pay = await getPayingFetch();
    res = await pay(url.toString(), { method: "GET", headers: { accept: "application/json" } });
  } else {
    res = await fetch(url.toString(), { method: "GET", headers: { accept: "application/json" } });
  }

  const hdr = res.headers.get("payment-required") || res.headers.get("PAYMENT-REQUIRED");
  let body = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (res.status === 402) {
    const pr = decodePaymentRequired(hdr) || {};
    return {
      ok: false,
      paymentRequired: true,
      content: formatPaymentRequired(pr, {
        status: 402,
        body,
        path: url.pathname + url.search,
        listedPriceUsdc,
      }),
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      content: {
        error: "http_error",
        status: res.status,
        path: url.pathname + url.search,
        body,
      },
    };
  }

  return { ok: true, status: res.status, content: body };
}
