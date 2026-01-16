# Configuration Reference

## Core
- `TELEGRAM_BOT_TOKEN`: Telegram bot token.
- `ADMIN_TELEGRAM_ID`: Numeric admin chat ID.
- `PUBLIC_BASE_URL`: Public URL for webhook callbacks.
- `NOWPAYMENTS_API_KEY`: NOWPayments API key.
- `NOWPAYMENTS_IPN_SECRET`: HMAC secret.
- `NOWPAYMENTS_IPN_PATH`: Webhook path. Default `/webhooks/nowpayments`.

## Pricing
- `FX_USDT_PER_THB`: Demo FX rate.
- `COMMISSION_RATE`: Commission fraction (e.g., `0.05`).
- `MIN_THB` / `MAX_THB`: Allowed THB credit range.
- `INVOICE_TTL_MINUTES`: Local expiry for invoices.

## Limits
- `MAX_OPEN_ORDERS`: Max active invoices per user.
- `MAX_INVOICES_PER_HOUR`: Rate limit.

## API
- `PORT`: API server port.
- `PRICE_CURRENCY`: NOWPayments price currency (default `usd`).
- `PAY_CURRENCY`: NOWPayments pay currency (default `usdttrc20`).

## Bot
- `API_BASE_URL`: Base URL for internal API calls.
- `SUPPORT_TELEGRAM`: Optional support handle.

## Notifications
- `ADMIN_NOTIFY_STATUS`: `CONFIRMED` or `FINISHED`.
- `LOG_LEVEL`: pino log level.
