import type { Lang } from "./types.js";

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatNumber(value: number, lang: Lang): string {
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  return new Intl.NumberFormat(locale).format(value);
}

export function formatUsdt(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function formatUsdtTrim(value: number, maxDecimals = 6): string {
  return value.toFixed(maxDecimals).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function formatCountdown(expiresAt: Date, now = new Date()): string {
  const diffMs = Math.max(0, expiresAt.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
