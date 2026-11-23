// Shared calculation and date utilities for G-Force SI Unified Platform

export const safeNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return Number.isNaN(num) || !Number.isFinite(num) ? defaultValue : num;
};

export const safeDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    if (dateStr instanceof Date) {
      return Number.isNaN(dateStr.getTime()) ? null : dateStr;
    }
    if (typeof dateStr === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split("-").map(Number);
        const d = new Date(year, month - 1, day);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(dateStr);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
};

export const formatDate = (dateStr, formatType = "short") => {
  const date = safeDate(dateStr);
  if (!date) return "—";
  try {
    if (formatType === "short") {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    if (formatType === "long") {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    if (formatType === "input" || formatType === "yyyy-MM-dd") {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return date.toLocaleDateString("en-US");
  } catch {
    return "—";
  }
};

export const safeDivide = (numerator, denominator, defaultValue = 0) => {
  const num = safeNumber(numerator);
  const denom = safeNumber(denominator);
  if (denom === 0) return defaultValue;
  const result = (num / denom) * 100;
  return Number.isNaN(result) || !Number.isFinite(result) ? defaultValue : result;
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(safeNumber(amount, 0));
