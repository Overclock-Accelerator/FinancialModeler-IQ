# FinancialModeler IQ

AI-powered financial modeling platform. Describe a business, get a full driver-based financial model with interactive sliders, unit economics, and a live P&L — then analyze it and benchmark it against real industry data.

**Built for [Overclock AI Operations Accelerator](https://overclockaccelerator.com) — Unit 4: AI-Powered Applications (Demo 3)**

## What It Does

FinancialModeler IQ is a full AI application with three distinct AI tool calls:

1. **Generate** — Describe a business in plain language. AI builds a complete driver-based 3-year financial model with tunable assumptions, formula-driven line items, and unit economics.
2. **Analyze** — AI reviews your model for strengths, risks, and improvement suggestions, referencing specific drivers and computed values.
3. **Research & Benchmark** — Uses Tavily to search for real-world industry data, then AI synthesizes benchmarks and suggests specific driver adjustments to ground your model in reality.

### Key Features

- **Driver-based formulas** — Every P&L number is computed from tunable drivers, not hardcoded. Change an assumption and watch the entire model recompute.
- **Interactive sliders** — Tune drivers (pricing, volume, costs, growth rates) with sliders grouped by category.
- **Unit Economics** — Revenue per unit, contribution margin, gross margin %, and business-specific efficiency ratios.
- **Income Statement** — Proper P&L ordering: Revenue → COGS → Gross Profit → OpEx → EBITDA → Net Income. Accounting-format numbers with % of revenue toggle.
- **9 models across 3 providers** — Claude Opus 4.7 (Thinking), Sonnet 4.6, Haiku 4.5, GPT-5.4/Mini/Nano, DeepSeek V3.2, Kimi K2.6, MiniMax M2.5
- **Cost & performance tracking** — Token count, estimated cost in USD, and wall-clock duration for every AI action.
- **Share & Export** — Shareable URLs (encodes current driver state) and CSV export with formulas.
- **Sample prompt generator** — AI generates random realistic business scenarios for instant demo.

## Why It Exists

This is Demo 3 in a three-part progression showing how AI can be embedded inside applications:

1. **[SimplyAI](https://github.com/Overclock-Accelerator/SimplyAI)** — AI returns text, app displays text
2. **[SpendIQ](https://github.com/Overclock-Accelerator/SpendIQ)** — AI returns structured JSON, app renders rich visual components
3. **FinancialModeler IQ** (this app) — AI is deeply integrated with multiple tool calls, interactive computation, and research

The teaching point: this is the endgame for AI applications. AI isn't a chatbot — it's the engine powering generation, analysis, research, and interactive computation.

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript 5 + Tailwind CSS 4
- Cormorant Garamond (display) + Inter (body)
- Recharts (planned) for visualization
- Client-side formula evaluation engine (`compute.ts`)
- Multi-provider LLM caller (Anthropic, OpenAI, OpenRouter)
- Tavily API for industry research

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and add your API keys
4. Run the dev server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
TAVILY_API_KEY=tvly-...
```

At least one LLM provider key is required. Tavily key is needed for the Research & Benchmark feature.

## Live Demo

[financialmodeler-iq.vercel.app](https://financialmodeler-iq.vercel.app)
