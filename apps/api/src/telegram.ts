import { config } from "./config.js";
import { logger } from "./logger.js";

const telegramBaseUrl = `https://api.telegram.org/bot${config.telegramBotToken}`;

type InlineKeyboardButton = {
  text: string;
  callback_data: string;
};

type ReplyMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

export async function sendTelegramMessage(params: {
  chatId: string;
  text: string;
  replyMarkup?: ReplyMarkup;
}) {
  const response = await fetch(`${telegramBaseUrl}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: params.chatId,
      text: params.text,
      reply_markup: params.replyMarkup
    })
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, body }, "Telegram sendMessage failed");
  }
}

export function adminActionKeyboard(orderId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Mark Fulfilled", callback_data: `admin:fulfill:${orderId}` }
      ],
      [
        { text: "🧾 Send Voucher Code", callback_data: `admin:voucher:${orderId}` }
      ],
      [
        { text: "❌ Mark Expired/Cancel", callback_data: `admin:expire:${orderId}` }
      ]
    ]
  } satisfies ReplyMarkup;
}
