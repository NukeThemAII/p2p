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
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  ADMIN_TELEGRAM_ID: z.string().min(1),
  API_BASE_URL: z.string().default("http://localhost:3001"),
  FX_USDT_PER_THB: z.string().default("0.028"),
  COMMISSION_RATE: z.string().default("0.05"),
  MIN_THB: z.string().default("100"),
  MAX_THB: z.string().default("100000"),
  INVOICE_TTL_MINUTES: z.string().default("30"),
  MAX_OPEN_ORDERS: z.string().default("1"),
  MAX_INVOICES_PER_HOUR: z.string().default("3"),
  SUPPORT_TELEGRAM: z.string().optional(),
  LOG_LEVEL: z.string().default("info")
});

const parsed = envSchema.parse(process.env);

export const config = {
  telegramBotToken: parsed.TELEGRAM_BOT_TOKEN,
  adminTelegramId: parsed.ADMIN_TELEGRAM_ID,
  apiBaseUrl: parsed.API_BASE_URL,
  fxUsdtPerThb: Number(parsed.FX_USDT_PER_THB),
  commissionRate: Number(parsed.COMMISSION_RATE),
  minThb: Number(parsed.MIN_THB),
  maxThb: Number(parsed.MAX_THB),
  invoiceTtlMinutes: Number(parsed.INVOICE_TTL_MINUTES),
  maxOpenOrders: Number(parsed.MAX_OPEN_ORDERS),
  maxInvoicesPerHour: Number(parsed.MAX_INVOICES_PER_HOUR),
  supportTelegram: parsed.SUPPORT_TELEGRAM,
  logLevel: parsed.LOG_LEVEL
};
