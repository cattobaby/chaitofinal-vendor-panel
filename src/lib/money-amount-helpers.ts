import { currencies } from "./data/currencies"

export const getDecimalDigits = (currency: string) => {
  return currencies[currency.toUpperCase()]?.decimal_digits ?? 0
}

/**
 * Returns a formatted amount based on the currency code using the browser's locale
 * @param amount - The amount to format
 * @param currencyCode - The currency code to format the amount in
 * @returns - The formatted amount
 */
export const getLocaleAmount = (amount: number, currencyCode: string) => {
  try {
    // Intenta usar el formateador nativo del navegador
    const formatter = new Intl.NumberFormat([], {
      style: "currency",
      currencyDisplay: "narrowSymbol",
      currency: currencyCode,
    })
    return formatter.format(amount)
  } catch (error) {
    // FALLBACK: Si falla (ej. USDT), lo construimos manualmente
    const code = currencyCode.toUpperCase()
    const currencyInfo = currencies[code]

    // Configuración por defecto si no encontramos info
    const decimalDigits = currencyInfo?.decimal_digits ?? 2
    const symbol = currencyInfo?.symbol_native ?? code

    const formatter = new Intl.NumberFormat([], {
      style: "decimal", // Usamos decimal, no currency, para evitar el error
      minimumFractionDigits: decimalDigits,
      maximumFractionDigits: decimalDigits,
    })

    return `${symbol}${formatter.format(amount)}`
  }
}

export const getNativeSymbol = (currencyCode: string) => {
  try {
    const formatted = new Intl.NumberFormat([], {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
    }).format(0)

    return formatted.replace(/\d/g, "").replace(/[.,]/g, "").trim()
  } catch (error) {
    // FALLBACK: Si falla, sacamos el símbolo de nuestro archivo de constantes
    return currencies[currencyCode.toUpperCase()]?.symbol_native || currencyCode
  }
}

/**
 * In some cases we want to display the amount with the currency code and symbol,
 * in the format of "symbol amount currencyCode". This breaks from the
 * user's locale and is only used in cases where we want to display the
 * currency code and symbol explicitly, e.g. for totals.
 */
export const getStylizedAmount = (amount: number, currencyCode: string) => {
  const symbol = getNativeSymbol(currencyCode)
  const decimalDigits = getDecimalDigits(currencyCode)

  const lessThanRoundingPrecission = isAmountLessThenRoundingError(
    amount,
    currencyCode
  )

  const total = amount.toLocaleString(undefined, {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
    signDisplay: lessThanRoundingPrecission ? "exceptZero" : "auto",
  })

  return `${symbol} ${total} ${currencyCode.toUpperCase()}`
}

/**
 * Returns true if the amount is less than the rounding error for the currency
 * @param amount - The amount to check
 * @param currencyCode - The currency code to check the amount in
 * @returns - True if the amount is less than the rounding error, false otherwise
 *
 * For example returns true if amount is < 0.005 for a USD | EUR etc.
 */
export const isAmountLessThenRoundingError = (
  amount: number,
  currencyCode: string
) => {
  const decimalDigits = getDecimalDigits(currencyCode)
  return Math.abs(amount) < 1 / 10 ** decimalDigits / 2
}
