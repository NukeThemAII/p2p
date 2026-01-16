import { Telegraf, Markup } from "telegraf";
import QRCode from "qrcode";
import type { Decimal } from "@prisma/client/runtime/library";
import {
  ACTIVE_ORDER_STATUSES,
  BUTTONS,
  LANGUAGE_SELECT_PROMPT,
  activeOrderWarning,
  adminFulfilled,
  adminVoucherPrompt,
  amountPrompt,
  helpText,
  invalidAmount,
  invoiceText,
  orderCancelled,
  orderExpired,
  orderLine,
  orderListEmpty,
  orderListHeader,
  paymentStatusUpdate,
  rateLimitReached,
  rateText,
  roundTo,
  summaryText,
  supportText,
  voucherSentUser
} from "@p2p/shared";
import { config } from "./config.js";
import { logger } from "./logger.js";
import prisma from "./prisma.js";
import { createPayment, refreshPayment } from "./apiClient.js";
import type { Lang, SessionState } from "@p2p/shared";

const bot = new Telegraf(config.telegramBotToken);

const languageKeyboard = Markup.inlineKeyboard([
  Markup.button.callback("🇷🇺 Русский", "lang:ru"),
  Markup.button.callback("🇬🇧 English", "lang:en")
]);

function mainMenuKeyboard(lang: Lang) {
  const buttons = BUTTONS[lang];
  return Markup.keyboard([
    [buttons.buy],
    [buttons.orders, buttons.rate],
    [buttons.help, buttons.language]
  ]).resize();
}

function summaryKeyboard(lang: Lang) {
  const buttons = BUTTONS[lang];
  return Markup.inlineKeyboard([
    [Markup.button.callback(buttons.createInvoice, "buy:create")],
    [Markup.button.callback(buttons.changeAmount, "buy:change")],
    [Markup.button.callback(buttons.cancel, "buy:cancel")]
  ]);
}

function invoiceKeyboard(lang: Lang, orderId: string) {
  const buttons = BUTTONS[lang];
  return Markup.inlineKeyboard([
    [Markup.button.callback(buttons.refresh, `invoice:refresh:${orderId}`)],
    [Markup.button.callback(buttons.cancel, `invoice:cancel:${orderId}`)],
    [Markup.button.callback(buttons.support, "invoice:support")]
  ]);
}

async function getOrCreateSession(userId: string) {
  return prisma.userSession.upsert({
    where: { userTelegramId: userId },
    update: {},
    create: {
      userTelegramId: userId,
      lang: "en",
      state: "LANG_SELECTED"
    }
  });
}

async function updateSession(userId: string, data: Partial<{ lang: Lang; state: SessionState; tempCreditsThb: number | null; activeOrderId: string | null; pendingVoucherOrderId: string | null }>) {
  return prisma.userSession.update({
    where: { userTelegramId: userId },
    data
  });
}

async function findActiveOrder(userId: string) {
  return prisma.order.findFirst({
    where: {
      userTelegramId: userId,
      status: { in: ACTIVE_ORDER_STATUSES }
    },
    orderBy: { createdAt: "desc" }
  });
}

async function countActiveOrders(userId: string) {
  return prisma.order.count({
    where: {
      userTelegramId: userId,
      status: { in: ACTIVE_ORDER_STATUSES }
    }
  });
}

async function isRateLimited(userId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.order.count({
    where: {
      userTelegramId: userId,
      createdAt: { gte: since }
    }
  });
  return count >= config.maxInvoicesPerHour;
}

function parseAmount(text: string) {
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  return Number(digits);
}

async function sendMainMenu(ctx: any, lang: Lang) {
  const label = lang === "ru" ? "Главное меню" : "Main menu";
  await ctx.reply(label, mainMenuKeyboard(lang));
}

async function sendInvoiceMessage(ctx: any, order: { id: string; payAddress: string | null; payAmount: Decimal | null; expiresAt: Date; lang: string }) {
  if (!order.payAddress || !order.payAmount) {
    return;
  }

  const lang = order.lang as Lang;
  const payAmount = Number(order.payAmount);
  const caption = invoiceText({ lang, payAddress: order.payAddress, payAmount, expiresAt: order.expiresAt });
  const qrBuffer = await QRCode.toBuffer(order.payAddress, { type: "png", width: 320, margin: 1 });

  await ctx.replyWithPhoto(
    { source: qrBuffer },
    {
      caption,
      reply_markup: invoiceKeyboard(lang, order.id).reply_markup
    }
  );
}

bot.start(async (ctx) => {
  if (!ctx.from) {
    return;
  }
  await getOrCreateSession(String(ctx.from.id));
  await ctx.reply(LANGUAGE_SELECT_PROMPT, languageKeyboard);
});

bot.action(/lang:(en|ru)/, async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const lang = ctx.match[1] as Lang;
  await updateSession(String(ctx.from.id), { lang, state: "MAIN_MENU" });
  await ctx.answerCbQuery();
  await sendMainMenu(ctx, lang);
});

bot.hears([BUTTONS.en.buy, BUTTONS.ru.buy], async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const session = await getOrCreateSession(String(ctx.from.id));
  const lang = session.lang as Lang;
  const activeOrder = await findActiveOrder(session.userTelegramId);
  const activeCount = await countActiveOrders(session.userTelegramId);

  if (activeOrder && activeCount >= config.maxOpenOrders) {
    await ctx.reply(activeOrderWarning(lang));
    if (activeOrder.payAddress && activeOrder.payAmount) {
      await sendInvoiceMessage(ctx, activeOrder);
    }
    return;
  }

  await updateSession(session.userTelegramId, { state: "BUY_ENTER_AMOUNT", tempCreditsThb: null });
  await ctx.reply(amountPrompt(lang, config.minThb, config.maxThb));
});

bot.hears([BUTTONS.en.orders, BUTTONS.ru.orders], async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const session = await getOrCreateSession(String(ctx.from.id));
  const lang = session.lang as Lang;
  const orders = await prisma.order.findMany({
    where: { userTelegramId: session.userTelegramId },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  if (orders.length === 0) {
    await ctx.reply(orderListEmpty(lang));
    return;
  }

  const lines = orders.map((order: (typeof orders)[number]) =>
    orderLine({
      lang,
      orderId: order.id,
      creditsThb: order.creditsThb,
      usdtAmount: Number(order.usdtAmount),
      status: order.status,
      createdAt: order.createdAt
    })
  );

  await ctx.reply([orderListHeader(lang), ...lines].join("\n"));
});

bot.hears([BUTTONS.en.rate, BUTTONS.ru.rate], async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const session = await getOrCreateSession(String(ctx.from.id));
  const lang = session.lang as Lang;
  await ctx.reply(
    rateText({
      lang,
      fxUsdtPerThb: config.fxUsdtPerThb,
      commissionRate: config.commissionRate,
      minThb: config.minThb,
      maxThb: config.maxThb
    })
  );
});

bot.hears([BUTTONS.en.help, BUTTONS.ru.help], async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const session = await getOrCreateSession(String(ctx.from.id));
  await ctx.reply(helpText(session.lang as Lang));
});

bot.hears([BUTTONS.en.language, BUTTONS.ru.language], async (ctx) => {
  await ctx.reply(LANGUAGE_SELECT_PROMPT, languageKeyboard);
});

bot.action("buy:change", async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const session = await getOrCreateSession(String(ctx.from.id));
  await updateSession(session.userTelegramId, { state: "BUY_ENTER_AMOUNT" });
  await ctx.answerCbQuery();
  await ctx.reply(amountPrompt(session.lang as Lang, config.minThb, config.maxThb));
});

bot.action("buy:cancel", async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const session = await getOrCreateSession(String(ctx.from.id));
  await updateSession(session.userTelegramId, { state: "MAIN_MENU", tempCreditsThb: null, activeOrderId: null });
  await ctx.answerCbQuery();
  await sendMainMenu(ctx, session.lang as Lang);
});

bot.action("buy:create", async (ctx) => {
  if (!ctx.from) {
    return;
  }
  await ctx.answerCbQuery();
  const session = await getOrCreateSession(String(ctx.from.id));
  const lang = session.lang as Lang;

  if (!session.tempCreditsThb) {
    await ctx.reply(amountPrompt(lang, config.minThb, config.maxThb));
    return;
  }

  const activeOrder = await findActiveOrder(session.userTelegramId);
  const activeCount = await countActiveOrders(session.userTelegramId);
  if (activeOrder && activeCount >= config.maxOpenOrders) {
    await ctx.reply(activeOrderWarning(lang));
    return;
  }

  if (await isRateLimited(session.userTelegramId)) {
    await ctx.reply(rateLimitReached(lang));
    return;
  }

  const creditsThb = session.tempCreditsThb;
  const baseUsdt = creditsThb * config.fxUsdtPerThb;
  const finalUsdt = roundTo(baseUsdt * (1 + config.commissionRate), 6);
  const expiresAt = new Date(Date.now() + config.invoiceTtlMinutes * 60 * 1000);

  const order = await prisma.order.create({
    data: {
      userTelegramId: session.userTelegramId,
      lang,
      creditsThb,
      commissionRate: config.commissionRate,
      fxUsdtPerThb: config.fxUsdtPerThb,
      usdtAmount: finalUsdt,
      status: "DRAFT",
      expiresAt
    }
  });

  await updateSession(session.userTelegramId, { state: "INVOICE_VIEW", activeOrderId: order.id });

  try {
    const payment = await createPayment(order.id);
    const updated = await prisma.order.findUnique({ where: { id: order.id } });

    if (!updated) {
      throw new Error("Order not found after payment creation");
    }

    await sendInvoiceMessage(ctx, updated);
  } catch (error) {
    logger.error({ error }, "Failed to create payment");
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" }
    });
    await ctx.reply(lang === "ru" ? "Не удалось создать инвойс." : "Failed to create invoice.");
  }
});

bot.action(/invoice:refresh:(.+)/, async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const orderId = ctx.match[1];
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    await ctx.answerCbQuery("Order not found");
    return;
  }

  try {
    const result = await refreshPayment(orderId);
    await ctx.answerCbQuery();
    await ctx.reply(paymentStatusUpdate(order.lang as Lang, result.status ?? order.status));
  } catch (error) {
    logger.error({ error }, "Failed to refresh status");
    await ctx.answerCbQuery(order.lang === "ru" ? "Ошибка обновления" : "Refresh failed");
  }
});

bot.action(/invoice:cancel:(.+)/, async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const orderId = ctx.match[1];
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    await ctx.answerCbQuery("Order not found");
    return;
  }

  await prisma.order.update({ where: { id: orderId }, data: { status: "EXPIRED" } });
  await updateSession(String(ctx.from.id), { state: "MAIN_MENU", activeOrderId: null });
  await ctx.answerCbQuery();
  await ctx.reply(orderCancelled(order.lang as Lang));
  await sendMainMenu(ctx, order.lang as Lang);
});

bot.action("invoice:support", async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const session = await getOrCreateSession(String(ctx.from.id));
  await ctx.answerCbQuery();
  await ctx.reply(supportText(session.lang as Lang, config.supportTelegram));
});

bot.action(/admin:(fulfill|voucher|expire):(.+)/, async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const userId = String(ctx.from.id);
  if (userId !== config.adminTelegramId) {
    await ctx.answerCbQuery("Not authorized");
    return;
  }

  const action = ctx.match[1];
  const orderId = ctx.match[2];
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    await ctx.answerCbQuery("Order not found");
    return;
  }

  if (action === "fulfill") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "FULFILLED" } });
    await ctx.answerCbQuery();
    await ctx.reply(adminFulfilled(order.lang as Lang));
    await ctx.telegram.sendMessage(order.userTelegramId, paymentStatusUpdate(order.lang as Lang, "FULFILLED"));
    return;
  }

  if (action === "expire") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "EXPIRED" } });
    await ctx.answerCbQuery();
    await ctx.reply(orderExpired(order.lang as Lang));
    await ctx.telegram.sendMessage(order.userTelegramId, paymentStatusUpdate(order.lang as Lang, "EXPIRED"));
    return;
  }

  await updateSession(userId, { state: "ADMIN_WAIT_VOUCHER", pendingVoucherOrderId: orderId });
  await ctx.answerCbQuery();
  await ctx.reply(adminVoucherPrompt(order.lang as Lang));
});

bot.on("text", async (ctx) => {
  if (!ctx.from) {
    return;
  }

  const session = await getOrCreateSession(String(ctx.from.id));
  const lang = session.lang as Lang;

  if (session.state === "ADMIN_WAIT_VOUCHER" && String(ctx.from.id) === config.adminTelegramId) {
    const code = ctx.message.text.trim();
    const orderId = session.pendingVoucherOrderId;

    if (!orderId) {
      await ctx.reply(lang === "ru" ? "Заказ не найден." : "Order not found.");
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      await ctx.reply(lang === "ru" ? "Заказ не найден." : "Order not found.");
      return;
    }

    await prisma.order.update({ where: { id: orderId }, data: { status: "FULFILLED" } });
    await updateSession(session.userTelegramId, { state: "MAIN_MENU", pendingVoucherOrderId: null });
    await ctx.reply(adminFulfilled(order.lang as Lang));
    await ctx.telegram.sendMessage(order.userTelegramId, voucherSentUser(order.lang as Lang, code));
    return;
  }

  if (session.state === "BUY_ENTER_AMOUNT") {
    const amount = parseAmount(ctx.message.text);
    if (!amount || amount < config.minThb || amount > config.maxThb) {
      await ctx.reply(invalidAmount(lang, config.minThb, config.maxThb));
      return;
    }

    const baseUsdt = amount * config.fxUsdtPerThb;
    const finalUsdt = roundTo(baseUsdt * (1 + config.commissionRate), 6);
    const expiresAt = new Date(Date.now() + config.invoiceTtlMinutes * 60 * 1000);

    await updateSession(session.userTelegramId, { state: "BUY_CONFIRM_SUMMARY", tempCreditsThb: amount });
    await ctx.reply(
      summaryText({
        lang,
        creditsThb: amount,
        fxUsdtPerThb: config.fxUsdtPerThb,
        commissionRate: config.commissionRate,
        usdtTotal: finalUsdt,
        expiresAt
      }),
      summaryKeyboard(lang)
    );
    return;
  }

  await sendMainMenu(ctx, lang);
});

bot.catch((error) => {
  logger.error({ error }, "Bot error");
});

bot.launch().then(() => {
  logger.info("Bot started");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
