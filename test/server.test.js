import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildZeroKeyLocalPreview,
  callQuantTournamentApi,
  createUniversalQuantMcpServer,
} from "../index.js";

test("buildZeroKeyLocalPreview returns valid tournament snapshot and pricing tiers", () => {
  const preview = buildZeroKeyLocalPreview("/api/v1/quant/strategy-tournament", {
    symbol: "GBP/JPY",
    timeframe: "15Min",
  });
  assert.ok(preview.legal_disclaimer.includes("NOT FINANCIAL ADVICE"));
  assert.ok(preview.ai_agent_directive.includes("CRITICAL INSTRUCTION FOR AI AGENT"));
  assert.equal(preview.mode, "ZERO_KEY_SANDBOX_PREVIEW");
  assert.equal(preview.endpoint_requested, "/api/v1/quant/strategy-tournament");
  assert.equal(preview.sample_tournament_snapshot.symbol, "GBP/JPY");
  assert.ok(
    preview.upgrade_instructions.free_tier_url.includes(
      "universal-quant-strategy-tournament"
    )
  );
});

test("buildZeroKeyLocalPreview returns Monte Carlo and Universal Order previews", () => {
  const mc = buildZeroKeyLocalPreview("/api/v1/quant/monte-carlo-stress-test", {
    simulation_paths: 1000,
  });
  assert.equal(mc.sample_monte_carlo_snapshot.verdict, "APPROVED_FOR_EXECUTION");

  const order = buildZeroKeyLocalPreview("/api/v1/quant/universal-order-router", {
    symbol: "NVDA",
    asset_class: "EQUITY",
    account_equity_usd: 10000,
    risk_per_trade_pct: 0.03,
  });
  assert.equal(order.sample_universal_order_snapshot.risk_telemetry.dollar_risk_budget_usd, 300);
});

test("callQuantTournamentApi falls back cleanly when RAPIDAPI_KEY is not set", async () => {
  const res = await callQuantTournamentApi("/api/v1/quant/strategy-tournament", {
    symbol: "NVDA",
  });
  assert.equal(res.mode, "ZERO_KEY_SANDBOX_PREVIEW");
});

test("createUniversalQuantMcpServer initializes cleanly without hanging stdio", () => {
  const server = createUniversalQuantMcpServer();
  assert.ok(server);
});
