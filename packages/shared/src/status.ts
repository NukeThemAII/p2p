import type { NowPaymentsStatus, OrderStatus } from "./types.js";

const STATUS_MAP: Record<string, OrderStatus> = {
  waiting: "WAITING_PAYMENT",
  confirming: "CONFIRMING",
  confirmed: "CONFIRMED",
  finished: "FINISHED",
  expired: "EXPIRED",
  failed: "FAILED",
  refunded: "REFUNDED",
  partially_paid: "WAITING_PAYMENT",
  sending: "CONFIRMING"
};

export function mapNowPaymentsStatus(status?: string | null): OrderStatus | null {
  if (!status) {
    return null;
  }
  return STATUS_MAP[status] ?? null;
}

export function isKnownNowPaymentsStatus(status: string): status is NowPaymentsStatus {
  return Object.prototype.hasOwnProperty.call(STATUS_MAP, status);
}
