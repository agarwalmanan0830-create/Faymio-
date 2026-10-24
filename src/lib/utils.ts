import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
export const date = (value: string, full = false) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    ...(full ? { year: "numeric" } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
export const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
export const label = (value: string) =>
  value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^./, (s) => s.toUpperCase());
