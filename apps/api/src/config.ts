import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env")
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

const envSchema = z.object({
  PORT: z.string().default("3001"),
  PUBLIC_BASE_URL: z.string().url(),
  NOWPAYMENTS_API_KEY: z.string().min(1),
  NOWPAYMENTS_IPN_SECRET: z.string().min(1),
  NOWPAYMENTS_IPN_PATH: z.string().default("/webhooks/nowpayments"),
  PRICE_CURRENCY: z.string().default("usd"),
  PAY_CURRENCY: z.string().default("usdttrc20"),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  ADMIN_TELEGRAM_ID: z.string().min(1),
  ADMIN_NOTIFY_STATUS: z.enum(["CONFIRMED", "FINISHED"]).default("CONFIRMED"),
  LOG_LEVEL: z.string().default("info")
});

const parsed = envSchema.parse(process.env);

export const config = {
  port: Number(parsed.PORT),
  publicBaseUrl: parsed.PUBLIC_BASE_URL,
  nowPaymentsApiKey: parsed.NOWPAYMENTS_API_KEY,
  nowPaymentsIpnSecret: parsed.NOWPAYMENTS_IPN_SECRET,
  nowPaymentsIpnPath: parsed.NOWPAYMENTS_IPN_PATH,
  priceCurrency: parsed.PRICE_CURRENCY,
  payCurrency: parsed.PAY_CURRENCY,
  telegramBotToken: parsed.TELEGRAM_BOT_TOKEN,
  adminTelegramId: parsed.ADMIN_TELEGRAM_ID,
  adminNotifyStatus: parsed.ADMIN_NOTIFY_STATUS,
  logLevel: parsed.LOG_LEVEL
};
