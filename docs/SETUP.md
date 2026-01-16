# Local Setup

## Requirements
- Node.js 20+
- A Telegram bot token
- NOWPayments API key + IPN secret

## Steps
1. Install dependencies
```bash
npm install
```

2. Configure env
```bash
cp .env.example .env
```
Fill in the required values.

3. Initialize the database
```bash
npm run prisma:generate
npm run db:push
```

4. Run services
```bash
npm run dev
```

## Notes
- The API service uses `PUBLIC_BASE_URL` to build the NOWPayments IPN callback URL.
- For local testing, you can use an HTTPS tunnel (ngrok, cloudflared) to expose the API.
