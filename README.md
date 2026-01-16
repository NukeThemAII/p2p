# P2P Demo Credits Bot (RU/EN)

This repo is a **college demo** of a Telegram bot that sells **Demo THB Credits** using **USDT (TRC20)** via NOWPayments. It is **not** a fiat exchange, cash-out, remittance, or P2P market. The flow is stablecoin payment + digital fulfillment.

## Features
- RU/EN language selection and localized UX.
- Configurable FX rate + commission.
- NOWPayments invoice: address, amount, QR, and status updates.
- IPN webhook verification (HMAC SHA-512) + polling fallback.
- Admin notifications on paid orders and voucher fulfillment flow.
- SQLite + Prisma models with audit log.

## Architecture
- `apps/bot`: Telegraf bot and state machine.
- `apps/api`: NOWPayments client, webhook, and status updates.
- `packages/shared`: shared types + i18n strings.
- `prisma/`: database schema.

## Quick Start
1. Install dependencies
```bash
npm install
```

2. Configure environment
```bash
cp .env.example .env
```

3. Initialize database
```bash
npm run prisma:generate
npm run db:push
```

4. Run both services
```bash
npm run dev
```

The API listens on `PORT` (default `3001`). The bot runs in long-polling mode.

## Environment Variables
See `.env.example` for the full list. The core values are:
- `TELEGRAM_BOT_TOKEN`
- `ADMIN_TELEGRAM_ID`
- `PUBLIC_BASE_URL`
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`

## Admin Flow
When an order reaches paid status (CONFIRMED by default), the admin receives a Telegram message with buttons to:
- Mark as fulfilled
- Send a voucher code
- Mark expired/cancel

## Docs
- `docs/SETUP.md`
- `docs/WEBHOOKS.md`
- `docs/ARCHITECTURE.md`
- `docs/CONFIG.md`
- `docs/ADMIN.md`

## Disclaimer
This is a demo project for stablecoin payments and digital fulfillment only.
