# TODO

- Add idempotency guard for IPN events (payment_id + status).
- Add unit tests for signature verification and status mapping.
- Add E2E webhook simulator for NOWPayments.
- Add per-user invoice creation cooldown in addition to hourly cap.
- Add admin locale preference for notifications.
- Add Prisma migrations and seed data for demo.
- Add Dockerfile + compose for local deployment.
- Add health checks and basic metrics.
