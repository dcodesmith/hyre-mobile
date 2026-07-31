const LOCALE_BY_CURRENCY = {
  NGN: "en-NG",
  USD: "en-US",
  EUR: "en-GB",
  GBP: "en-GB",
} as const;

export type Currency = keyof typeof LOCALE_BY_CURRENCY;

const DEFAULT_CURRENCY: Currency = "NGN";
const DEFAULT_LOCALE = "en-NG";

export type FormatCurrencyOptions = {
  currency?: Currency;
  fractionDigits?: number;
  locale?: string;
};

type Formatter = {
  currency: Currency;
  locale: string;
  fractionDigits?: number;
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function resolveLocale(currency: Currency, locale?: string): string {
  return locale ?? LOCALE_BY_CURRENCY[currency] ?? DEFAULT_LOCALE;
}

function getFormatter({
  currency,
  locale,
  fractionDigits,
}: Formatter): Intl.NumberFormat {
  const key = `${locale}:${currency}:${fractionDigits ?? "auto"}`;

  const cachedFormatter = formatterCache.get(key);

  if (cachedFormatter) {
    return cachedFormatter;
  }

  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
  };

  if (fractionDigits !== undefined) {
    options.minimumFractionDigits = fractionDigits;
    options.maximumFractionDigits = fractionDigits;
  }

  const formatter = new Intl.NumberFormat(locale, options);

  formatterCache.set(key, formatter);

  return formatter;
}

export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {},
): string {
  const currency = options.currency ?? DEFAULT_CURRENCY;
  const locale = resolveLocale(currency, options.locale);

  return getFormatter({
    currency,
    locale,
    fractionDigits: options.fractionDigits,
  }).format(amount);
}
