# NOWPayments IPN Webhooks

The API server exposes a webhook endpoint (default: `/webhooks/nowpayments`).

## Verification
The IPN request includes `x-nowpayments-sig`. Verification steps:
1. Sort JSON keys (deterministic order).
2. `JSON.stringify(sortedPayload)`.
3. Compute HMAC SHA-512 with `NOWPAYMENTS_IPN_SECRET`.
4. Compare to the header value using a timing-safe compare.

If verification fails, the webhook returns `401`.

## Status Mapping
NOWPayments statuses map to the internal order states:
- `waiting` -> `WAITING_PAYMENT`
- `confirming` -> `CONFIRMING`
- `confirmed` -> `CONFIRMED`
- `finished` -> `FINISHED`
- `expired` -> `EXPIRED`
- `failed` -> `FAILED`
- `refunded` -> `REFUNDED`

## Polling Fallback
The bot can request a refresh via `/internal/orders/:id/refresh-status` to query NOWPayments and update the order.
