# AGENTS.md — Telegram Bot (RU/EN) + NOWPayments USDTTRC20 Checkout (Demo Credits)

## 0) What we are building (college demo)
A Telegram bot that lets users **buy “Demo THB Credits”** using **USDT on TRC20** via NOWPayments.

- User chooses language (RU/EN).
- User enters desired amount in “THB credits” (e.g., 2000).
- Bot applies a configurable FX rate + commission (e.g., 5%).
- Bot creates a NOWPayments invoice for **USDTTRC20**, shows:
  - amount in USDT
  - pay address
  - QR code
  - instructions + countdown timer
- Bot tracks payment status via **IPN webhook** (and optional polling fallback).
- When payment is **detected/confirmed**, bot updates the order status and notifies an admin.
- Admin manually “fulfills” by sending a **demo voucher code** (NOT cash, NOT fiat, NOT ATM withdrawal).

> NOTE (hard constraint for this demo spec): This is **NOT** a fiat exchange, cash-out, remittance, or “P2P market”.
> It is a **stablecoin payment + digital fulfillment** demo to showcase the integration.

## 1) Why NOWPayments (vs x402)
- This project needs human-friendly **invoice primitives**: address + amount + QR + status updates.
- NOWPayments typical flow: create payment → show `pay_address` → get status updates via IPN or query payment status. (IPN triggers on every status change.) :contentReference[oaicite:0]{index=0}
- NOWPayments “create payment” requires fields like `price_amount`, `price_currency`, `pay_currency`, etc. :contentReference[oaicite:1]{index=1}
- x402 is for HTTP-native paywalls/API calls (HTTP 402), not QR-based invoices.

We lock to **USDTTRC20** (Tron). NOWPayments docs and references list this as a supported stablecoin option. 

---

## 2) Tech stack (vibe-code friendly)
### Recommended (Node/TypeScript)
- Node.js 20+
- Telegraf (Telegram bot)
- Fastify or Express (webhook server)
- Prisma + SQLite (MVP) / Postgres (prod-like demo)
- `qrcode` npm package to generate QR image
- `zod` for input validation
- `pino` logger

### Services
- `bot-service`: handles Telegram UX + state machine.
- `api-service`: handles NOWPayments API calls + webhook verification.
  - For MVP you can run both in one server process.

---

## 3) Data model (Prisma)
### Order
- `id` (uuid)
- `userTelegramId` (string)
- `lang` ("ru" | "en")
- `creditsThb` (int) — “THB credits”
- `commissionRate` (decimal) — e.g. 0.05
- `fxUsdtPerThb` (decimal) — config-driven (demo)
- `usdtAmount` (decimal)
- `status` enum:
  - `DRAFT`
  - `INVOICE_CREATED`
  - `WAITING_PAYMENT`   (NOWPayments: `waiting`) :contentReference[oaicite:3]{index=3}
  - `CONFIRMING`        (NOWPayments: `confirming`) :contentReference[oaicite:4]{index=4}
  - `CONFIRMED`         (NOWPayments: `confirmed`) :contentReference[oaicite:5]{index=5}
  - `FINISHED`          (NOWPayments: `finished`) :contentReference[oaicite:6]{index=6}
  - `EXPIRED`           (NOWPayments: `expired`) :contentReference[oaicite:7]{index=7}
  - `FAILED`            (NOWPayments: `failed`) :contentReference[oaicite:8]{index=8}
  - `REFUNDED`          (NOWPayments: `refunded`) :contentReference[oaicite:9]{index=9}
  - `FULFILLED`         (admin marked delivered)
- `nowPaymentsPaymentId` (string, nullable)
- `payAddress` (string, nullable)
- `payAmount` (decimal, nullable) — amount user must send in USDT
- `expiresAt` (datetime) — we set ourselves (e.g., now + 30 min)
- `createdAt`, `updatedAt`

### PaymentEvent (audit log)
- `id`, `orderId`
- `source` = "NOWPAYMENTS_IPN" | "POLL"
- `rawJson` (json)
- `receivedAt`

---

## 4) Configuration (.env)
- `TELEGRAM_BOT_TOKEN=...`
- `ADMIN_TELEGRAM_ID=123456789` (numeric ID, not @handle)
- `PUBLIC_BASE_URL=https://your-domain.example`
- `NOWPAYMENTS_API_KEY=...`
- `NOWPAYMENTS_IPN_SECRET=...`
- `NOWPAYMENTS_IPN_PATH=/webhooks/nowpayments`
- `INVOICE_TTL_MINUTES=30`

Demo pricing:
- `FX_USDT_PER_THB=0.028` (example)
- `COMMISSION_RATE=0.05`  (5%)
- `MIN_THB=100`
- `MAX_THB=100000`

---

## 5) User experience (RU/EN)

### 5.1 /start → Language select
Inline buttons:
- 🇷🇺 Русский
- 🇬🇧 English

After selection: show “Main Menu”.

### 5.2 Main Menu (Reply Keyboard)
EN:
- ✅ Buy THB Credits
- 📦 My Orders
- 💱 Rate & Fees
- ❓ Help
- 🌐 Language

RU:
- ✅ Купить THB кредиты
- 📦 Мои заказы
- 💱 Курс и комиссия
- ❓ Помощь
- 🌐 Язык

### 5.3 Buy flow
1) Ask amount:
- EN: “Enter amount in THB credits (100–100,000). Example: 2000”
- RU: “Введите сумму в THB кредитах (100–100 000). Пример: 2000”

2) Validate, compute:
- `baseUsdt = creditsThb * FX_USDT_PER_THB`
- `finalUsdt = baseUsdt * (1 + COMMISSION_RATE)`
- Round to sensible decimals (2–6). Keep consistent.

3) Confirmation screen (Inline buttons)
EN:
- “You will buy: 2,000 THB credits
   Pay with: USDT (TRC20)
   Rate: 1 THB = 0.028 USDT (demo)
   Fee: 5%
   Total: 58.80 USDT
   Expires in: 30:00”
Buttons:
- ✅ Create Invoice
- ✏️ Change Amount
- ❌ Cancel

RU equivalent.

### 5.4 Invoice screen
After creating NOWPayments payment:
- Show:
  - “Send EXACT amount”
  - Network: TRC20
  - Address: `pay_address`
  - Amount: `pay_amount`
  - Countdown timer (our own `expiresAt`)
- Attach QR image for the address (and optionally include amount in caption only).

Buttons:
- 🔄 Refresh Status
- ❌ Cancel Order
- 📞 Contact Support (shows @username text or just “Admin will message you”)

---

## 6) Admin UX
Admin gets a Telegram message when order hits **CONFIRMED** (or FINISHED, configurable).

Admin message template (EN):
- “✅ PAID (CONFIRMED)
   Order: {orderId}
   User: tg://user?id={userId}
   Credits: {creditsThb}
   Paid: {payAmount} USDT TRC20
   Status: {payment_status}
   Created: {createdAt}”
Buttons:
- ✅ Mark Fulfilled
- 🧾 Send Voucher Code
- ❌ Mark Expired/Cancel

RU variant optional.

Fulfillment is **digital**:
- Admin presses “Send Voucher Code” → bot asks admin to type code → bot forwards to user and marks `FULFILLED`.

---

## 7) NOWPayments integration (core)

### 7.1 Create payment (invoice)
Endpoint:
- `POST https://api.nowpayments.io/v1/payment` (per docs/examples) :contentReference[oaicite:10]{index=10}

Required fields (from docs):
- `price_amount` (required)
- `price_currency` (required)
- `pay_currency` (required) :contentReference[oaicite:11]{index=11}

IPN configuration:
- Set `ipn_callback_url` so NOWPayments POSTs on every status change. :contentReference[oaicite:12]{index=12}

Payload (demo):
```json
{
  "price_amount": 58.8,
  "price_currency": "usd",
  "pay_currency": "usdttrc20",
  "order_id": "ORDER-<uuid>",
  "order_description": "THB Credits (Demo)",
  "ipn_callback_url": "https://<PUBLIC_BASE_URL>/webhooks/nowpayments"
}


Note: price_currency can be "usd" for a stable demo, while the user-facing UI shows “THB credits”.
We are not doing real FX feeds in this demo; we use config.

Response fields vary, but you should persist at minimum:

payment_id

payment_status

pay_address

pay_amount
(These are referenced in NOWPayments integration guidance: show pay address, then track status via IPN or “get payment status”.)

7.2 Status lifecycle mapping

NOWPayments status references include values such as:
waiting, confirming, confirmed, sending, partially_paid, finished, failed, refunded, expired.

Bot mapping:

waiting → WAITING_PAYMENT

confirming → CONFIRMING (show “tx detected, waiting confirmations”)

confirmed → CONFIRMED (trigger admin notify)

finished → FINISHED (optional: treat as “stronger paid”)

expired → EXPIRED

failed/refunded → terminal states

Fulfillment trigger (configurable):

Default: notify admin at CONFIRMED.

Option: wait for FINISHED if you want safer settlement.

7.3 IPN webhook verification (important)

NOWPayments IPN includes a header x-nowpayments-sig. Docs describe verification steps:

sort request body keys

stringify deterministically

sign with HMAC SHA-512 using your IPN secret

compare to the header value

Implement:

Read raw JSON body

Create a sorted-key object

JSON.stringify(sortedObj)

HMAC_SHA512(ipnSecret, stringified)

Compare to header (timing-safe compare)

7.4 Polling fallback

If webhook missed:

GET payment status periodically (e.g., every 30–60s for active invoices)
NOWPayments suggests you can use “get payment status” as an alternative to IPN.

MVP: add a “🔄 Refresh Status” button that hits your backend which calls “get payment status” and updates DB.

8) Timer / Expiry behavior

NOWPayments has an expired status in their status list.
But for the demo UX, implement your own TTL:

expiresAt = createdAt + INVOICE_TTL_MINUTES

A background job marks order EXPIRED if not CONFIRMED/FINISHED by then.

UI shows countdown; disable pay actions after expiry.

9) Telegram bot state machine (high level)

States per user:

LANG_SELECTED

MAIN_MENU

BUY_ENTER_AMOUNT

BUY_CONFIRM_SUMMARY

INVOICE_VIEW

ORDER_LIST

HELP

Use “session” storage in DB or in-memory for MVP; prefer DB so restarts don’t break flows.

10) Abuse prevention (still needed in a demo)

Rate-limit: max N invoice creations per user per hour.

Prevent duplicate open orders: user can have at most 1 active invoice at a time (config).

Idempotent webhook handling: process each payment_id + status + timestamp once.

11) Copy (EN/RU)
EN Help

“This bot is a demo payment flow using USDT (TRC20). You purchase demo credits, not real THB.”

“Send EXACT amount to the address shown.”

“We will update status automatically after blockchain confirmations.”

“If you need help, tap Contact Support.”

RU Help

“Это демо-проект: оплата USDT (TRC20) за демо-кредиты, не за реальные THB.”

“Отправляйте ТОЧНУЮ сумму на указанный адрес.”

“Статус обновится автоматически после подтверждений сети.”

“Нужна помощь — нажмите ‘Поддержка’.”

12) Implementation plan (Codex tasks)

Scaffold repo

/apps/bot (Telegraf)

/apps/api (Fastify/Express)

/packages/shared (i18n strings, types)

DB with Prisma (SQLite)

Bot:

/start language selection

main menu + handlers

buy flow + validation

invoice message with QR

NOWPayments client:

createPayment()

getPaymentStatus()

Webhook endpoint:

raw body capture

signature verification (x-nowpayments-sig)

status mapping + DB update

notify user + admin on CONFIRMED

Admin tools:

paid order notifications

mark fulfilled

send voucher code flow

Background worker:

expiry job

Testing:

unit test for signature verify

integration test with mocked webhook payloads

13) Definition of done (MVP)

RU/EN language selection works

User can create invoice for USDTTRC20 and see QR/address/amount

IPN webhook updates status:

waiting → confirming → confirmed (or finished)

Admin receives paid notification and can deliver a voucher code

Orders list shows correct status history

Expired invoices auto-close after TTL

END.

::contentReference[oaicite:19]{index=19}
