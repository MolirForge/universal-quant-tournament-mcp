# Universal Quant Strategy Tournament & Execution Engine (v1.0)

An institutional-grade, top-down quantitative trading engine, out-of-sample walk-forward backtester, Bayesian Monte Carlo risk gate, and multi-broker order router. Designed for seamless integration with **REST API pipelines**, **AI Trading Agents**, and **Claude Desktop via Model Context Protocol (`universal-quant-tournament-mcp`)** with direct local **MetaTrader 5 (MT5)**, **Alpaca**, and **Tradovate / TradingView** execution support.

---

## Broker Execution Tiers & Roadmap

To ensure institutional reliability, broker integrations are categorized by execution verification level:

* **Tier 1: Live Verified Direct Execution (Production Ready)**
  * **MetaTrader 5 (Forex, Metals, Energies & Index CFDs):** Direct local Windows terminal execution via the built-in zero-install Python IPC bridge (`sync_or_execute_local_mt5`). Features sequential mutex queueing, automatic Market Watch symbol activation, live broker OHLCV bar ingestion, account equity/leverage syncing, pre-flight `order_check()` margin/stops validation, and automatic `MARKET_DEAL` vs. `PENDING_LIMIT` order routing.
  * **Alpaca (US Equities, ETFs & Crypto):** Direct Paper & Live execution via `alpaca_bracket_order` payloads[cite: 1] paired with the companion `@ideadesignmedia/alpaca-mcp` server or Alpaca REST API.
* **Tier 2: Universal Webhook JSON Schema (Beta)**
  * **TradingView / Tradovate Webhook Relay (`tradovate_tradingview_webhook`):** Generates standardized bracket order JSON payloads[cite: 1] compatible with third-party webhook automation relays (such as TradersPost, PickMyTrade, and PineConnector). *Note: When routing CME Futures (`MNQ`, `MES`, `ES`, `NQ`), append your active front-month contract expiry code (e.g., `MNQZ6` for Dec 2026) as required by your relay provider.*
* **v1.1 Roadmap (In Development)**
  * **TradeLocker Native REST Bridge:** Direct JWT authentication and automatic `tradableInstrumentId` lookup for prop-firm accounts.
  * **Direct Tradovate OAuth2 Bridge:** Native REST order routing without third-party webhook relays.

---

## Core Institutional Architecture (5-Stage Pipeline)

Unlike basic indicator scripts that generate unvalidated signals, this engine enforces a strict 5-stage institutional desk workflow before approving any trade:

1. **Live ForexFactory Macro Calendar Filter:** Automatically fetches and caches the official weekly economic calendar feed (`forexfactory.com`). Detects High-Impact (`RED_FOLDER_HIGH_IMPACT`) and Medium-Impact (`ORANGE_FOLDER_MEDIUM_IMPACT`) events affecting the target asset's currency/macro exposure (`USD`, `EUR`, `GBP`, `JPY`, `AUD`, `NZD`, `CAD`, `CHF`, `XAU`, `XAG`) within a 24-hour window and automatically blocks live signal activation if a Red-Folder release is within 60 minutes.
2. **Higher-Timeframe (HTF) Structure & Regime Classifier:** Evaluates 200-SMA, 400-SMA, 50-EMA, ATR separation, and Bollinger Band width to classify the market into `STRONG_BULLISH_TREND_REGIME`, `STRONG_BEARISH_TREND_REGIME`, `DIRECTIONAL_EXPANSION_REGIME`, `VOLATILITY_SQUEEZE_COILING_REGIME`, or `RANGING_MEAN_REVERTING_REGIME`, dynamically weighting strategy families that fit the active regime.
3. **Session Killzone & Price-Action Confirmation Guardrails:** Filters historical backtests and live signals by configurable UTC liquidity windows (`london_ny`, `london_only`, `ny_only`, `london_ny_overlap`, `us_equity_regular`, `24_7`, or `custom`). Enforces strict entry-bar candle confirmation (`BULLISH/BEARISH_ENGULFING_CLOSE`, `REJECTION_PINBAR`, or `DISPLACEMENT_CLOSE`) and an **Anti-Exhaustion RSI Guardrail** that prevents momentum/breakout strategies from buying overbought (`RSI > 68`) or shorting oversold (`RSI < 32`) extremes.
4. **Strict Out-of-Sample (OOS) Bounded Walk-Forward Tournament:** Simultaneously backtests 8 quantitative strategies across a two-stage split (**65% In-Sample / 35% Out-of-Sample**) with spread deduction (`0.04x ATR`) and Bayesian shrinkage. To prevent curve-fitting and mask out-of-sample decay, `win_rate_prior` is strictly capped at the lower bound of the In-Sample, Out-of-Sample, and Full-Sample win rates.
5. **1,000-Path Bayesian Monte Carlo & Auto-Routed Bracket Execution:** Stress-tests the tournament winner across 1,000 paths (30 trades/path) incorporating Gaussian win-rate dispersion ($\sigma = 6.5\%$), serial loss correlation ($-1.5\%$), spread slippage, and tail stop-gap shocks. Outputs Half-Kelly and Quarter-Kelly sizing benchmarks and builds ready-to-fire bracket payloads (`MARKET_DEAL` when a live trigger candle is active, or `PENDING_LIMIT` pullback orders when awaiting confirmation).

---

## The 8 Competing Quantitative Strategies

Every tournament call ranks all 8 strategies by composite expectancy ($R$), HTF alignment, regime compatibility, and sample reliability:

| Strategy ID | Strategy Name | Family | Stop / Target (ATR) | Core Logic |
| :--- | :--- | :--- | :--- | :--- |
| `trend_pullback_champion` | Trend Pullback Champion | `TREND_PULLBACK` | `2.0x` / `4.0x` | 200-SMA trend alignment + RSI pullback (`<=42` Long / `>=58` Short) + candle trigger. |
| `heikin_ashi_fast_macd` | Heikin-Ashi Momentum + Fast MACD | `MOMENTUM_TREND` | `1.5x` / `3.0x` | Consecutive Heikin-Ashi trend bodies + Fast MACD (`8/21/9`) histogram + RSI exhaustion check. |
| `bollinger_rsi_mean_reversion` | Institutional Bollinger + RSI Extreme | `MEAN_REVERSION` | `1.5x` / `2.4x` | `2.0 SD` Bollinger Band touch + RSI extreme (`<=34` / `>=66`) targeting 20-SMA equilibrium. |
| `vwap_mean_reversion` | Session Anchor Elasticity Reversion | `MEAN_REVERSION` | `1.6x` / `2.5x` | `>=0.35%` deviation from rolling 26-bar session VWAP equilibrium. |
| `ote_fib_liquidity_sweep` | ICT Optimal Trade Entry (OTE) | `LIQUIDITY_SWEEP` | `1.8x` / `3.8x` | 50-bar swing range `0.618–0.786` Fibonacci retracement zone aligned with 200-SMA. |
| `beast_volatility_breakout` | Volatility Squeeze & 20-Bar Breakout | `BREAKOUT` | `1.8x` / `3.6x` | 20-bar channel breakout with ATR expansion ratio and RSI anti-exhaustion filter. |
| `ema_ribbon_trend_following` | EMA Ribbon Trend Following | `MOMENTUM_TREND` | `2.0x` / `4.0x` | Stacked EMA ribbon (`8 > 21 > 50 > 200-SMA`) with non-exhausted RSI confirmation. |
| `macd_fib_confluence` | Standard MACD + Golden Pocket Fib | `MOMENTUM_TREND` | `2.0x` / `3.6x` | Expanding Standard MACD (`12/26/9`) histogram aligned with 200-SMA structure. |

---

## Supported Asset Classes & Contract Sizing Intelligence

* **US Equities & ETFs (`EQUITY`):** Any US stock or ETF (`NVDA`, `AAPL`, `SPY`, `QQQ`). Sizes integer shares for Alpaca (`1 share` increments) and Equity CFD lots for MT5 (`1.00 lot = 100 shares`).
* **28 Spot Forex Pairs (`FOREX`):** All major and cross pairs (`EUR/USD`, `GBP/JPY`, `USD/JPY`, `AUD/CAD`, etc.). Automatically calculates `100,000` base-unit standard lots and converts `JPY` quote pairs or `USD` base pairs into exact USD risk using spot cross-rates.
* **Precious Metals & Energy (`METALS_COMMODITIES`):** Auto-detects Gold (`XAU/USD`, `XAUUSD`, `GOLD`, `GC`), Silver (`XAG/USD`, `SILVER`, `SI`), and Oil (`WTI`, `USOIL`, `UKOIL`, `CL`). Applies institutional MT5 contract specs (`100 troy oz/lot` for Gold, `5,000 troy oz/lot` for Silver, `1,000 barrels/lot` for Crude Oil).
* **CME Futures & Index CFDs (`FUTURES`):** Supports `MNQ`, `NQ`, `MES`, `ES`, `MYM`, `YM`, `NAS100`, `US500`, `US30` with configurable `contract_multiplier` point values (e.g., `$2/pt` for `MNQ`, `$20/pt` for `NQ`) and automatic Micro E-mini scaling for accounts under `$25,000`.
* **Cryptocurrencies (`CRYPTO`):** 24/7 liquidity mode for `BTC/USD`, `ETH/USD`, `SOL/USD`, `XRP/USD`, `DOGE/USD`, `ADA/USD`, `AVAX/USD` with fractional `0.0001` unit precision.

---

## API Endpoints

### 1. `POST /api/v1/quant/multi-strategy-tournament`
Runs the 5-stage top-down analysis, ForexFactory calendar check, regime classification, and 8-strategy Out-of-Sample walk-forward tournament.

**Example Request Body:**
```json
{
  "symbol": "XAU/USD",
  "timeframe": "15Min",
  "lookback_bars": 1000,
  "strategy_filter": "all",
  "session_filter": "auto",
  "require_candle_confirmation": true
}
```

**Key Response Fields:**
* `top_down_market_context`: HTF structure bias, 400-SMA / 200-SMA slope, detected market regime, active session window status, RSI exhaustion state, and live entry-bar candle confirmation telemetry.
* `forex_factory_macro_calendar`: Monitored currencies, `high_impact_collision_within_60m` boolean, imminent Red-Folder alerts, and upcoming 24h scheduled macro releases.
* `champion_strategy`: Top-ranked strategy with `execution_readiness_status` (`READY_FOR_IMMEDIATE_MARKET_EXECUTION` or `PENDING_PULLBACK_LIMIT_ORDER_RECOMMENDED`), `recommended_order_execution_mode` (`MARKET_DEAL` vs `PENDING_LIMIT`), `win_rate_prior` (strictly OOS-bounded), `zero_edge_breakeven_win_rate`, `entry_price` (auto-routed to pullback limit if unconfirmed), `stop_loss`, and `take_profit`.
* `leaderboard`: Full ranked array of all 8 strategies with In-Sample and Out-of-Sample win/loss records.

---

### 2. `POST /api/v1/quant/monte-carlo-stress-test`
Stress-tests a trade setup across 1,000 simulated paths with parameter dispersion, serial correlation, slippage, and tail gap shocks.

**Example Request Body:**
```json
{
  "entry_price": 2685.50,
  "stop_loss": 2678.00,
  "take_profit": 2700.50,
  "win_rate": 0.545,
  "paths": 1000,
  "trades_per_path": 30,
  "risk_per_trade_pct": 0.015,
  "slippage_bps": 5,
  "min_probability_of_profit_pct": 65.0
}
```

**Key Response Fields:**
* `probability_of_profit_pct`, `median_30_trade_return_pct`, `var_95_worst_case_return_pct`, `max_drawdown_95th_pct`, `risk_of_30pct_ruin_pct`.
* `kelly_criterion_telemetry`: `quarter_kelly_conservative_risk_pct`, `half_kelly_optimal_risk_pct`, and sizing assessment.
* `institutional_gate_passed` (`true`/`false`) & `verdict` (`APPROVED_FOR_EXECUTION` or rejection reason).

---

### 3. `POST /api/v1/quant/universal-order-router`
Calculates exact position sizing constrained by both your dollar risk budget and `95%` of leveraged buying power, outputting broker-ready payloads.

**Example Request Body:**
```json
{
  "symbol": "XAU/USD",
  "asset_class": "FOREX",
  "broker_format": "mt5",
  "bias": "LONG",
  "entry_price": 2685.50,
  "stop_loss": 2678.00,
  "take_profit": 2700.50,
  "account_equity_usd": 10000,
  "risk_per_trade_pct": 0.015,
  "account_leverage": 100,
  "usd_jpy_rate": 154.5,
  "execution_mode": "AUTO"
}
```

**Key Response Fields:**
* `levels`: `entry_price`, `pending_pullback_limit_price`, `stop_loss`, `take_profit`, `stop_distance`, and `stop_distance_pips`.
* `risk_telemetry`: Exact dollar risk, margin required, notional exposure, `recommended_mt5_lots`, `recommended_equity_shares`, or `recommended_futures_contracts`.
* `broker_execution_payloads`:
  * `mt5_mql5_order_send`: Includes both `TRADE_ACTION_DEAL` (`ORDER_FILLING_IOC`) and `TRADE_ACTION_PENDING` (`ORDER_FILLING_RETURN`) with 31-character safe `UQMCP` comments.
  * `alpaca_bracket_order`: Ready for Alpaca Paper/Live REST API or MCP execution (`EQUITY` & `CRYPTO`).
  * `tradovate_tradingview_webhook`: JSON webhook payload for futures/CFD automation.

---

## Claude Desktop MCP & Local MT5 Bridge Setup

Use the companion MCP server (`universal-quant-tournament-mcp`) to connect Claude Desktop directly to this API, Alpaca Paper Trading, and your local Windows MetaTrader 5 terminal (with pre-flight `order_check()` validation and live broker bar fetching).

```json
{
  "mcpServers": {
    "universal-quant-tournament": {
      "command": "npx",
      "args": ["-y", "universal-quant-tournament-mcp"],
      "env": {
        "RAPIDAPI_KEY": "YOUR_RAPIDAPI_KEY",
        "RAPIDAPI_HOST": "universal-quant-strategy-tournament.p.rapidapi.com",
        "ALPACA_KEY_ID": "PK_YOUR_ALPACA_PAPER_KEY_ID",
        "ALPACA_SECRET_KEY": "YOUR_ALPACA_PAPER_SECRET_KEY",
        "ALPACA_PAPER": "true"
      }
    }
  }
}
```

## ⚠️ Legal Disclaimer & Risk Disclosure

**For Informational & Educational Purposes Only — Not Financial Advice:**  
The data, technical indicators, strategy tournament rankings, Monte Carlo simulations, and broker order payloads generated by `universal-quant-tournament-mcp` and its associated APIs are provided strictly for informational, educational, and quantitative research purposes. Nothing contained herein constitutes financial, investment, legal, or tax advice, nor does it constitute a solicitation, recommendation, endorsement, or offer to buy or sell any securities, foreign exchange (Forex), futures, options, cryptocurrencies, or other financial instruments.

**Hypothetical & Simulated Performance Disclaimer:**  
Monte Carlo stress tests and strategy tournament expectancy scores are mathematical simulations based on historical or synthetic parameters and do not represent actual trading. Hypothetical or simulated performance results have inherent limitations. No representation is being made that any account will or is likely to achieve profits or losses similar to those shown.

**Assumption of Risk & Autonomous Execution Liability:**  
Trading financial markets involves a high degree of risk, including the potential loss of your entire invested capital. By connecting this software or API to any AI agent, LLM, webhook, or brokerage execution environment (including paper or live accounts on Alpaca, MetaTrader 5, Tradovate, or any other platform), you acknowledge that you are solely responsible for verifying all order parameters, position sizes, and risk limits prior to execution. The authors, contributors, and API providers assume **zero liability** for any financial losses, execution slippage, API downtime, software bugs, or autonomous agent errors incurred through the use of this software. Use strictly at your own discretion and risk.
