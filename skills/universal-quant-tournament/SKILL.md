---
name: universal-quant-tournament
description: Runs an 8-strategy out-of-sample walk-forward quantitative trading tournament, applies a 1,000-path Bayesian Monte Carlo risk gate, filters high-impact ForexFactory news, and executes bracket orders on MetaTrader 5 (MT5) or Alpaca with mandatory human-in-the-loop confirmation. Use when the user asks to backtest a ticker, run a quant tournament, evaluate trade risk, check forex news filters, or prepare/execute MT5 or Alpaca bracket orders.
license: MIT
compatibility: Requires Node.js (npx) and the universal-quant-tournament-mcp server configured with RAPIDAPI_KEY. Optional ALPACA_KEY_ID/ALPACA_SECRET_KEY for Alpaca REST v2 or Windows MetaTrader 5 terminal for local IPC execution.
metadata:
  author: Pyrochem
  version: "1.0.1"
  mcp_package: universal-quant-tournament-mcp
  repository: https://github.com/Pyrochem/universal-quant-tournament-mcp
---

# Universal Quant Tournament

Run institutional walk-forward strategy selection, Monte Carlo risk gating, macro news filtering, and human-approved bracket order execution via the `universal-quant-tournament-mcp` server.

## Prerequisites

Verify that the `universal-quant-tournament` MCP server is connected (`npx -y universal-quant-tournament-mcp`) with:
- `RAPIDAPI_KEY` set for tournament, Monte Carlo, and news-filter endpoints.
- **Alpaca execution (optional):** `ALPACA_KEY_ID`, `ALPACA_SECRET_KEY`, and `ALPACA_PAPER="true"` (default to paper trading unless the user explicitly specifies live).
- **MetaTrader 5 execution (optional):** Windows MT5 terminal open with algorithmic trading enabled and the local Python IPC bridge active.

## Workflow Instructions

Follow this 5-stage pipeline in strict order. Never skip risk gates or execute orders without explicit user confirmation.

1. **Run the Walk-Forward Tournament**
   - Call the tournament MCP tool for the user's requested symbol and timeframe (e.g., `NVDA`, `XAUUSD`, `US30`, `GBP/JPY`).
   - Evaluate all 8 strategies using the out-of-sample split (65/35) and lower-bound `win_rate_prior` cap to prevent curve-fitting.
   - Present the top-ranked strategy, out-of-sample metrics (win rate, profit factor, max drawdown), and whether any strategy cleared the minimum threshold. If none qualify, stop and advise sitting out.

2. **Apply the 1,000-Path Monte Carlo Risk Gate**
   - Pass the winning strategy's parameters into the Bayesian Monte Carlo risk tool (1,000 paths with serial loss correlation).
   - Report risk-of-ruin, expected drawdown distribution, and recommended position size.
   - **Hard stop:** If the setup fails the risk gate, do not propose an order—explain the exact risk metric that failed.

3. **Check the ForexFactory Macro News Filter**
   - Query the news filter for upcoming high-impact ("red-folder") events affecting the instrument's currency or market.
   - **Hard stop:** If a red-folder event falls inside the blackout window, flag the exact event time and block execution.

4. **Present the Trade Plan & Require Confirmation**
   - Before calling any broker execution tool, display a structured trade ticket containing:
     - **Broker & Mode:** Alpaca (Paper/Live) or MetaTrader 5
     - **Symbol & Direction:** Buy / Sell
     - **Position Size:** Exact shares or lot size from Stage 2
     - **Bracket Levels:** Entry, Stop Loss (SL), and Take Profit (TP)
   - Ask the user to reply **`Confirmed`** to execute. Never auto-submit an order.

5. **Execute & Verify Bracket Order**
   - Only after receiving explicit confirmation, invoke the Alpaca or MT5 execution tool with mandatory SL and TP attached.
   - Return the broker order ID, execution status, and active bracket levels.

## Error Handling

| Failure Condition | Required Agent Action |
| :--- | :--- |
| Missing `RAPIDAPI_KEY` | Instruct the user to obtain a key from RapidAPI (`universal-quant-strategy-tournament`) and add it to `mcp.json` or `claude_desktop_config.json`. |
| No strategy passes out-of-sample | Report the tournament table and recommend **no trade**. Do not force an entry. |
| Monte Carlo gate fails | Highlight the drawdown or ruin probability breach and halt before Stage 4. |
| Red-folder news conflict | State the scheduled event and wait until the blackout window clears. |
| MT5 IPC / Alpaca auth error | Confirm whether the MT5 terminal/bridge is running or verify `ALPACA_KEY_ID` / `ALPACA_PAPER` env vars. |

## Example

**User prompt:**
> Scan `NVDA` on the 1H timeframe, run the quant tournament and Monte Carlo risk gate, and prep an Alpaca paper bracket order if it passes.

**Expected agent flow:**
1. Runs the 8-strategy walk-forward tournament on `NVDA` and summarizes the out-of-sample leader.
2. Runs the 1,000-path Monte Carlo simulation and outputs position sizing.
3. Checks the macro news filter for conflicting US red-folder releases.
4. Outputs the full Alpaca Paper bracket ticket (Entry, SL, TP, qty) and waits for the user to type `Confirmed` before firing the order.
