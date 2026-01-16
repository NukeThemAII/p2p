import { config } from "./config.js";
import { logger } from "./logger.js";

const baseUrl = "https://api.nowpayments.io/v1";

async function request(path: string, options: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "x-api-key": config.nowPaymentsApiKey,
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, body }, "NowPayments request failed");
    throw new Error(`NowPayments request failed: ${response.status}`);
  }

  return response.json();
}

export async function createPayment(params: {
  priceAmount: number;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
}) {
  return request("/payment", {
    method: "POST",
    body: JSON.stringify({
      price_amount: params.priceAmount,
      price_currency: config.priceCurrency,
      pay_currency: config.payCurrency,
      order_id: params.orderId,
      order_description: params.orderDescription,
      ipn_callback_url: params.ipnCallbackUrl
    })
  });
}

export async function getPaymentStatus(paymentId: string) {
  return request(`/payment/${paymentId}`, {
    method: "GET"
  });
}
