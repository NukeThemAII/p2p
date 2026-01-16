import { config } from "./config.js";

export async function createPayment(orderId: string) {
  const response = await fetch(`${config.apiBaseUrl}/internal/orders/${orderId}/create-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create payment: ${response.status} ${body}`);
  }

  return response.json();
}

export async function refreshPayment(orderId: string) {
  const response = await fetch(`${config.apiBaseUrl}/internal/orders/${orderId}/refresh-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to refresh payment: ${response.status} ${body}`);
  }

  return response.json();
}
