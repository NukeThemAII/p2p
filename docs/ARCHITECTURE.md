# Architecture

## Services
- `apps/bot`: Telegraf bot for user/admin UX and state machine.
- `apps/api`: Express server for NOWPayments API calls, webhook verification, and background expiry.
- `packages/shared`: shared types, i18n strings, and helpers.

## Data Flow
1. User selects language and enters THB credits.
2. Bot calculates USDT and creates an `Order` in the DB.
3. Bot calls API `/internal/orders/:id/create-payment`.
4. API calls NOWPayments and stores `payment_id`, `pay_address`, `pay_amount`.
5. Bot displays address + QR.
6. NOWPayments sends IPN status updates to the API.
7. API updates order status and notifies admin/user.
8. Admin fulfills by sending a demo voucher code.

## Expiry
A background worker in `apps/api` marks unpaid orders as `EXPIRED` when `expiresAt` is reached.
