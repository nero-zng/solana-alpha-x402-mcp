#!/usr/bin/env node
// Local smoke test: initialize + tools/list over stdio, then call get_price WITHOUT a key
// (must return readable 402 payment requirements). Hits the live API; never pays.
// Framing: @modelcontextprotocol/sdk StdioServerTransport uses NDJSON (one JSON object per line).
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = join(__dirname, "../src/index.mjs");

delete process.env.SOLANA_PRIVATE_KEY;

const child = spawn(process.execPath, [entry], {
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, SOLANA_PRIVATE_KEY: "" },
});

let stderr = "";
child.stderr.on("data", (d) => {
  stderr += d.toString();
});

let buf = "";
const pending = new Map();
let nextId = 1;

child.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  while (true) {
    const nl = buf.indexOf("\n");
    if (nl < 0) break;
    const line = buf.slice(0, nl).replace(/\r$/, "").trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (e) {
      console.error("bad NDJSON line:", line.slice(0, 200));
      throw e;
    }
    handleMessage(msg);
  }
});

function handleMessage(msg) {
  if (msg.id != null && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(Object.assign(new Error(msg.error.message || "rpc error"), { rpc: msg.error }));
    else resolve(msg.result);
  }
}

function send(method, params) {
  const id = nextId++;
  const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(payload);
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`timeout waiting for ${method} (id=${id})\nstderr:\n${stderr}`));
      }
    }, 60_000);
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

let ok = 0;
const pass = (m) => {
  ok++;
  console.log("  PASS", m);
};

try {
  const init = await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0.0.0" },
  });
  assert.ok(init?.serverInfo?.name === "solana-alpha-x402-mcp", "serverInfo.name");
  assert.ok(init?.capabilities?.tools, "tools capability");
  pass(`initialize → ${init.serverInfo.name}@${init.serverInfo.version}`);

  notify("notifications/initialized", {});

  const listed = await send("tools/list", {});
  const names = (listed.tools || []).map((t) => t.name);
  console.log("  tools:", names.join(", "));
  assert.ok(names.includes("list_pricing"), "list_pricing present");
  for (const need of [
    "get_price",
    "get_news",
    "get_new",
    "get_trending",
    "get_perps",
    "get_rugcheck",
    "get_token_report",
    "get_wallet",
  ]) {
    assert.ok(names.includes(need), `${need} present`);
  }
  pass(`tools/list → ${names.length} tools`);

  const pricing = await send("tools/call", { name: "list_pricing", arguments: {} });
  const pricingText = pricing.content?.[0]?.text || "";
  const pricingJson = JSON.parse(pricingText);
  assert.equal(pricingJson.payTo, "3WN7T7VMnRJzjRhKosbaT2oiwuMiBCe6KBfZGiZygv7n");
  assert.equal(pricingJson.hasSigner, false);
  pass(`list_pricing → ${pricingJson.endpoints.length} endpoints, payTo ok, hasSigner=false`);

  const paid = await send("tools/call", {
    name: "get_price",
    arguments: { tokens: "SOL" },
  });
  assert.notEqual(paid.isError, true, "402 without key must not be isError");
  const paidJson = JSON.parse(paid.content?.[0]?.text || "{}");
  assert.equal(paidJson.payment_required, true);
  assert.equal(paidJson.payTo, "3WN7T7VMnRJzjRhKosbaT2oiwuMiBCe6KBfZGiZygv7n");
  assert.ok(String(paidJson.network).startsWith("solana:"), "network is solana CAIP-2");
  assert.ok(
    paidJson.priceUsdc === "0.005" || paidJson.amountAtomic === "5000",
    `price readable (got priceUsdc=${paidJson.priceUsdc} amount=${paidJson.amountAtomic})`
  );
  pass(
    `get_price without key → 402 info price=${paidJson.priceUsdc} USDC payTo=${paidJson.payTo.slice(0, 8)}…`
  );

  console.log(`\nSmoke OK (${ok} checks). No payment made.`);
  child.stdin.end();
  setTimeout(() => {
    child.kill("SIGTERM");
    process.exit(0);
  }, 200);
} catch (e) {
  console.error("\nSmoke FAILED:", e);
  console.error("--- stderr ---\n" + stderr);
  child.kill("SIGKILL");
  process.exit(1);
}
