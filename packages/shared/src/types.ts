export const LANGS = ["en", "ru"] as const;
export type Lang = (typeof LANGS)[number];

export const ORDER_STATUSES = [
  "DRAFT",
  "INVOICE_CREATED",
  "WAITING_PAYMENT",
  "CONFIRMING",
  "CONFIRMED",
  "FINISHED",
  "EXPIRED",
  "FAILED",
  "REFUNDED",
  "FULFILLED"
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SESSION_STATES = [
  "LANG_SELECTED",
  "MAIN_MENU",
  "BUY_ENTER_AMOUNT",
  "BUY_CONFIRM_SUMMARY",
  "INVOICE_VIEW",
  "ORDER_LIST",
  "HELP",
  "ADMIN_WAIT_VOUCHER"
] as const;
export type SessionState = (typeof SESSION_STATES)[number];

export const PAYMENT_EVENT_SOURCES = ["NOWPAYMENTS_IPN", "POLL"] as const;
export type PaymentEventSource = (typeof PAYMENT_EVENT_SOURCES)[number];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "DRAFT",
  "INVOICE_CREATED",
  "WAITING_PAYMENT",
  "CONFIRMING",
  "CONFIRMED",
  "FINISHED"
];

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  "EXPIRED",
  "FAILED",
  "REFUNDED",
  "FULFILLED"
];

export const PAID_ORDER_STATUSES: OrderStatus[] = ["CONFIRMED", "FINISHED"];

export type NowPaymentsStatus =
  | "waiting"
  | "confirming"
  | "confirmed"
  | "finished"
  | "failed"
  | "expired"
  | "refunded"
  | "partially_paid"
  | "sending";
