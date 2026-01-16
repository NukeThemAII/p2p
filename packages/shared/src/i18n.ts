import type { Lang, OrderStatus } from "./types.js";
import { formatCountdown, formatNumber, formatUsdt, formatUsdtTrim } from "./utils.js";

export const LANGUAGE_SELECT_PROMPT = "Choose language / Выберите язык";

export const BUTTONS = {
  en: {
    buy: "✅ Buy THB Credits",
    orders: "📦 My Orders",
    rate: "💱 Rate & Fees",
    help: "❓ Help",
    language: "🌐 Language",
    createInvoice: "✅ Create Invoice",
    changeAmount: "✏️ Change Amount",
    cancel: "❌ Cancel",
    refresh: "🔄 Refresh Status",
    support: "📞 Contact Support",
    adminFulfill: "✅ Mark Fulfilled",
    adminVoucher: "🧾 Send Voucher Code",
    adminExpire: "❌ Mark Expired/Cancel"
  },
  ru: {
    buy: "✅ Купить THB кредиты",
    orders: "📦 Мои заказы",
    rate: "💱 Курс и комиссия",
    help: "❓ Помощь",
    language: "🌐 Язык",
    createInvoice: "✅ Создать инвойс",
    changeAmount: "✏️ Изменить сумму",
    cancel: "❌ Отмена",
    refresh: "🔄 Обновить статус",
    support: "📞 Поддержка",
    adminFulfill: "✅ Отметить как выполнено",
    adminVoucher: "🧾 Отправить ваучер",
    adminExpire: "❌ Отметить как истекло"
  }
} as const;

const STATUS_LABELS: Record<OrderStatus, { en: string; ru: string }> = {
  DRAFT: { en: "Draft", ru: "Черновик" },
  INVOICE_CREATED: { en: "Invoice created", ru: "Инвойс создан" },
  WAITING_PAYMENT: { en: "Waiting payment", ru: "Ожидание оплаты" },
  CONFIRMING: { en: "Confirming", ru: "Подтверждается" },
  CONFIRMED: { en: "Confirmed", ru: "Подтверждено" },
  FINISHED: { en: "Finished", ru: "Завершено" },
  EXPIRED: { en: "Expired", ru: "Истекло" },
  FAILED: { en: "Failed", ru: "Ошибка" },
  REFUNDED: { en: "Refunded", ru: "Возвращено" },
  FULFILLED: { en: "Fulfilled", ru: "Выполнено" }
};

export function getStatusLabel(lang: Lang, status: OrderStatus): string {
  return STATUS_LABELS[status]?.[lang] ?? status;
}

export function amountPrompt(lang: Lang, min: number, max: number): string {
  if (lang === "ru") {
    return `Введите сумму в THB кредитах (${formatNumber(min, lang)}–${formatNumber(max, lang)}). Пример: 2000`;
  }
  return `Enter amount in THB credits (${formatNumber(min, lang)}–${formatNumber(max, lang)}). Example: 2000`;
}

export function invalidAmount(lang: Lang, min: number, max: number): string {
  if (lang === "ru") {
    return `Некорректная сумма. Введите число от ${formatNumber(min, lang)} до ${formatNumber(max, lang)}.`;
  }
  return `Invalid amount. Enter a number from ${formatNumber(min, lang)} to ${formatNumber(max, lang)}.`;
}

export function summaryText(params: {
  lang: Lang;
  creditsThb: number;
  fxUsdtPerThb: number;
  commissionRate: number;
  usdtTotal: number;
  expiresAt: Date;
}): string {
  const { lang, creditsThb, fxUsdtPerThb, commissionRate, usdtTotal, expiresAt } = params;
  if (lang === "ru") {
    return [
      `Вы покупаете: ${formatNumber(creditsThb, lang)} THB кредитов`,
      "Оплата: USDT (TRC20)",
      `Курс: 1 THB = ${formatUsdt(fxUsdtPerThb, 3)} USDT (демо)`,
      `Комиссия: ${Math.round(commissionRate * 100)}%`,
      `Итого: ${formatUsdt(usdtTotal)} USDT`,
      `Истекает через: ${formatCountdown(expiresAt)}`
    ].join("\n");
  }
  return [
    `You will buy: ${formatNumber(creditsThb, lang)} THB credits`,
    "Pay with: USDT (TRC20)",
    `Rate: 1 THB = ${formatUsdt(fxUsdtPerThb, 3)} USDT (demo)`,
    `Fee: ${Math.round(commissionRate * 100)}%`,
    `Total: ${formatUsdt(usdtTotal)} USDT`,
    `Expires in: ${formatCountdown(expiresAt)}`
  ].join("\n");
}

export function invoiceText(params: {
  lang: Lang;
  payAddress: string;
  payAmount: number;
  expiresAt: Date;
}): string {
  const { lang, payAddress, payAmount, expiresAt } = params;
  if (lang === "ru") {
    return [
      "Отправьте ТОЧНУЮ сумму",
      "Сеть: TRC20",
      `Адрес: ${payAddress}`,
      `Сумма: ${formatUsdtTrim(payAmount)} USDT`,
      `Истекает через: ${formatCountdown(expiresAt)}`
    ].join("\n");
  }
  return [
    "Send EXACT amount",
    "Network: TRC20",
    `Address: ${payAddress}`,
    `Amount: ${formatUsdtTrim(payAmount)} USDT`,
    `Expires in: ${formatCountdown(expiresAt)}`
  ].join("\n");
}

export function rateText(params: {
  lang: Lang;
  fxUsdtPerThb: number;
  commissionRate: number;
  minThb: number;
  maxThb: number;
}): string {
  const { lang, fxUsdtPerThb, commissionRate, minThb, maxThb } = params;
  if (lang === "ru") {
    return [
      `Курс (демо): 1 THB = ${formatUsdt(fxUsdtPerThb, 3)} USDT`,
      `Комиссия: ${Math.round(commissionRate * 100)}%`,
      `Мин/макс: ${formatNumber(minThb, lang)}–${formatNumber(maxThb, lang)} THB кредитов`
    ].join("\n");
  }
  return [
    `Rate (demo): 1 THB = ${formatUsdt(fxUsdtPerThb, 3)} USDT`,
    `Fee: ${Math.round(commissionRate * 100)}%`,
    `Min/Max: ${formatNumber(minThb, lang)}–${formatNumber(maxThb, lang)} THB credits`
  ].join("\n");
}

export function helpText(lang: Lang): string {
  if (lang === "ru") {
    return [
      "Это демо-проект: оплата USDT (TRC20) за демо-кредиты, не за реальные THB.",
      "Отправляйте ТОЧНУЮ сумму на указанный адрес.",
      "Статус обновится автоматически после подтверждений сети.",
      "Нужна помощь — нажмите 'Поддержка'."
    ].join("\n");
  }
  return [
    "This bot is a demo payment flow using USDT (TRC20). You purchase demo credits, not real THB.",
    "Send EXACT amount to the address shown.",
    "We will update status automatically after blockchain confirmations.",
    "If you need help, tap Contact Support."
  ].join("\n");
}

export function supportText(lang: Lang, supportHandle?: string): string {
  if (supportHandle) {
    return lang === "ru" ? `Поддержка: ${supportHandle}` : `Support: ${supportHandle}`;
  }
  return lang === "ru"
    ? "Админ свяжется с вами в чате."
    : "Admin will message you in this chat.";
}

export function orderListHeader(lang: Lang): string {
  return lang === "ru" ? "Ваши заказы:" : "Your orders:";
}

export function orderListEmpty(lang: Lang): string {
  return lang === "ru" ? "Пока нет заказов." : "No orders yet.";
}

export function orderLine(params: {
  lang: Lang;
  orderId: string;
  creditsThb: number;
  usdtAmount: number;
  status: OrderStatus;
  createdAt: Date;
}): string {
  const { lang, orderId, creditsThb, usdtAmount, status, createdAt } = params;
  const date = createdAt.toISOString().slice(0, 19).replace("T", " ");
  if (lang === "ru") {
    return `• ${orderId} | ${formatNumber(creditsThb, lang)} THB | ${formatUsdt(usdtAmount)} USDT | ${getStatusLabel(lang, status)} | ${date}`;
  }
  return `• ${orderId} | ${formatNumber(creditsThb, lang)} THB | ${formatUsdt(usdtAmount)} USDT | ${getStatusLabel(lang, status)} | ${date}`;
}

export function activeOrderWarning(lang: Lang): string {
  return lang === "ru"
    ? "У вас уже есть активный инвойс. Сначала завершите или отмените его."
    : "You already have an active invoice. Please finish or cancel it first.";
}

export function rateLimitReached(lang: Lang): string {
  return lang === "ru"
    ? "Слишком много запросов инвойса. Попробуйте позже."
    : "Too many invoice requests. Try again later.";
}

export function orderCancelled(lang: Lang): string {
  return lang === "ru" ? "Заказ отменен." : "Order cancelled.";
}

export function orderExpired(lang: Lang): string {
  return lang === "ru" ? "Инвойс истек." : "Invoice expired.";
}

export function adminPaidNotification(params: {
  orderId: string;
  userId: string;
  creditsThb: number;
  payAmount: number;
  statusLabel: string;
  createdAt: string;
}): string {
  return [
    "✅ PAID",
    `Order: ${params.orderId}`,
    `User: tg://user?id=${params.userId}`,
    `Credits: ${params.creditsThb}`,
    `Paid: ${formatUsdtTrim(params.payAmount)} USDT TRC20`,
    `Status: ${params.statusLabel}`,
    `Created: ${params.createdAt}`
  ].join("\n");
}

export function adminVoucherPrompt(lang: Lang): string {
  return lang === "ru" ? "Введите код ваучера для отправки пользователю." : "Type the voucher code to send to the user.";
}

export function adminFulfilled(lang: Lang): string {
  return lang === "ru" ? "Заказ отмечен как выполненный." : "Order marked as fulfilled.";
}

export function voucherSentUser(lang: Lang, code: string): string {
  return lang === "ru"
    ? `Ваш ваучерный код: ${code}\nСпасибо за оплату!`
    : `Your voucher code: ${code}\nThanks for your payment!`;
}

export function paymentStatusUpdate(lang: Lang, status: OrderStatus): string {
  if (lang === "ru") {
    return `Статус оплаты: ${getStatusLabel(lang, status)}`;
  }
  return `Payment status: ${getStatusLabel(lang, status)}`;
}
