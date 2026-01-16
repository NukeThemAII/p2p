import crypto from "crypto";
import express from "express";
import type { Request, Response } from "express";
import type { Decimal } from "@prisma/client/runtime/library";
import {
  PAID_ORDER_STATUSES,
  TERMINAL_ORDER_STATUSES,
  mapNowPaymentsStatus,
  paymentStatusUpdate,
  adminPaidNotification,
  getStatusLabel
} from "@p2p/shared";
import { config } from "./config.js";
import { logger } from "./logger.js";
import prisma from "./prisma.js";
import { createPayment, getPaymentStatus } from "./nowpayments.js";
import { adminActionKeyboard, sendTelegramMessage } from "./telegram.js";
import type { Lang, OrderStatus, PaymentEventSource } from "@p2p/shared";

const app = express();

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use("/internal", express.json());

app.post("/internal/orders/:orderId/create-payment", async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "DRAFT") {
      return res.status(400).json({ error: "Order is not in DRAFT state" });
    }

    const ipnCallbackUrl = new URL(config.nowPaymentsIpnPath, config.publicBaseUrl).toString();
    const payment = await createPayment({
      priceAmount: Number(order.usdtAmount),
      orderId: `ORDER-${order.id}`,
      orderDescription: "THB Credits (Demo)",
      ipnCallbackUrl
    });

    const mappedStatus = mapNowPaymentsStatus(payment.payment_status) ?? "INVOICE_CREATED";
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        nowPaymentsPaymentId: String(payment.payment_id),
        payAddress: payment.pay_address ?? null,
        payAmount: payment.pay_amount ? String(payment.pay_amount) : null,
        status: mappedStatus
      }
    });

    return res.json({
      orderId: updated.id,
      paymentId: updated.nowPaymentsPaymentId,
      paymentStatus: payment.payment_status,
      payAddress: updated.payAddress,
      payAmount: updated.payAmount ? Number(updated.payAmount) : null,
      expiresAt: updated.expiresAt.toISOString()
    });
  } catch (error) {
    logger.error({ error }, "Failed to create payment");
    return res.status(500).json({ error: "Failed to create payment" });
  }
});

app.post("/internal/orders/:orderId/refresh-status", async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.nowPaymentsPaymentId) {
      return res.status(400).json({ error: "Order has no payment id" });
    }

    const payment = await getPaymentStatus(order.nowPaymentsPaymentId);
    const mappedStatus = mapNowPaymentsStatus(payment.payment_status);

    await applyStatusUpdate({
      order,
      newStatus: mappedStatus,
      source: "POLL",
      rawJson: payment
    });

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    if (!updated) {
      return res.status(404).json({ error: "Order not found after update" });
    }

    return res.json({
      orderId: updated.id,
      paymentId: updated.nowPaymentsPaymentId,
      paymentStatus: payment.payment_status,
      status: updated.status,
      payAddress: updated.payAddress,
      payAmount: updated.payAmount ? Number(updated.payAmount) : null,
      expiresAt: updated.expiresAt.toISOString()
    });
  } catch (error) {
    logger.error({ error }, "Failed to refresh status");
    return res.status(500).json({ error: "Failed to refresh status" });
  }
});

app.post(config.nowPaymentsIpnPath, express.raw({ type: "*/*" }), async (req: Request, res: Response) => {
  const signature = req.headers["x-nowpayments-sig"];
  if (typeof signature !== "string") {
    return res.status(401).send("Missing signature");
  }

  const rawBody = req.body.toString("utf8");
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    logger.error({ error }, "Invalid JSON in webhook");
    return res.status(400).send("Invalid JSON");
  }

  if (!verifySignature(payload, signature)) {
    logger.warn("Invalid webhook signature");
    return res.status(401).send("Invalid signature");
  }

  const paymentId = payload.payment_id ? String(payload.payment_id) : null;
  const orderIdRaw = payload.order_id ? String(payload.order_id) : null;

  const order = paymentId
    ? await prisma.order.findFirst({ where: { nowPaymentsPaymentId: paymentId } })
    : null;

  const fallbackOrderId = orderIdRaw?.startsWith("ORDER-") ? orderIdRaw.replace("ORDER-", "") : null;
  const resolvedOrder = order ?? (fallbackOrderId ? await prisma.order.findUnique({ where: { id: fallbackOrderId } }) : null);

  if (!resolvedOrder) {
    logger.warn({ paymentId, orderIdRaw }, "Webhook order not found");
    return res.status(404).send("Order not found");
  }

  const mappedStatus = mapNowPaymentsStatus(payload.payment_status as string | undefined);
  await applyStatusUpdate({
    order: resolvedOrder,
    newStatus: mappedStatus,
    source: "NOWPAYMENTS_IPN",
    rawJson: payload
  });

  return res.status(200).send("OK");
});

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value && typeof value === "object" && value.constructor === Object) {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortKeys(val)] as const);

    return Object.fromEntries(entries);
  }

  return value;
}

function verifySignature(payload: Record<string, unknown>, signature: string): boolean {
  const sorted = sortKeys(payload);
  const payloadString = JSON.stringify(sorted);
  const hmac = crypto
    .createHmac("sha512", config.nowPaymentsIpnSecret)
    .update(payloadString)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "utf8");
  const hmacBuffer = Buffer.from(hmac, "utf8");

  if (sigBuffer.length !== hmacBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, hmacBuffer);
}

async function applyStatusUpdate(params: {
  order: {
    id: string;
    status: string;
    lang: string;
    userTelegramId: string;
    payAmount: Decimal | null;
    creditsThb: number;
    createdAt: Date;
  };
  newStatus: OrderStatus | null;
  source: PaymentEventSource;
  rawJson: unknown;
}) {
  const { order, newStatus, source, rawJson } = params;
  const rawJsonString = typeof rawJson === "string" ? rawJson : JSON.stringify(rawJson);

  await prisma.paymentEvent.create({
    data: {
      orderId: order.id,
      source,
      rawJson: rawJsonString
    }
  });

  const currentStatus = order.status as OrderStatus;

  if (!newStatus || TERMINAL_ORDER_STATUSES.includes(currentStatus)) {
    return order;
  }

  if (currentStatus === "FINISHED" && newStatus !== "FINISHED") {
    return order;
  }

  if (currentStatus === newStatus) {
    return order;
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: newStatus }
  });

  await notifyStatusChange({ ...order, status: currentStatus }, newStatus);

  return updated;
}

async function notifyStatusChange(order: { id: string; lang: string; userTelegramId: string; payAmount: Decimal | null; creditsThb: number; createdAt: Date; status: OrderStatus },
  newStatus: OrderStatus
) {
  const lang = order.lang as Lang;
  const shouldNotifyUser = ["CONFIRMING", "CONFIRMED", "FINISHED", "EXPIRED", "FAILED", "REFUNDED"].includes(newStatus);

  if (shouldNotifyUser) {
    await sendTelegramMessage({
      chatId: order.userTelegramId,
      text: paymentStatusUpdate(lang, newStatus)
    });
  }

  const wasPaid = PAID_ORDER_STATUSES.includes(order.status);
  const isPaid = PAID_ORDER_STATUSES.includes(newStatus);
  const notifyOn = config.adminNotifyStatus;
  const shouldNotifyAdmin =
    notifyOn === "FINISHED"
      ? newStatus === "FINISHED" && order.status !== "FINISHED"
      : !wasPaid && isPaid;

  if (shouldNotifyAdmin) {
    const payAmount = order.payAmount ? Number(order.payAmount) : 0;
    const text = adminPaidNotification({
      orderId: order.id,
      userId: order.userTelegramId,
      creditsThb: order.creditsThb,
      payAmount,
      statusLabel: getStatusLabel("en", newStatus),
      createdAt: order.createdAt.toISOString()
    });

    await sendTelegramMessage({
      chatId: config.adminTelegramId,
      text,
      replyMarkup: adminActionKeyboard(order.id)
    });
  }
}

export function startExpiryWorker() {
  const intervalMs = 60 * 1000;

  setInterval(async () => {
    const now = new Date();
    const expiring = await prisma.order.findMany({
      where: {
        expiresAt: { lt: now },
        status: { in: ["DRAFT", "INVOICE_CREATED", "WAITING_PAYMENT", "CONFIRMING"] }
      }
    });

    for (const order of expiring) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
      await sendTelegramMessage({
        chatId: order.userTelegramId,
        text: paymentStatusUpdate(order.lang as Lang, "EXPIRED")
      });
    }
  }, intervalMs);

  logger.info("Expiry worker started");
}

export default app;
