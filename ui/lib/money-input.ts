const MONEY_DRAFT_SEPARATOR = ","

export function formatMoneyInput(rawValue: string): string {
  const compact = rawValue.replace(/[\s\u00a0\u202f]/g, "")
  if (!compact) return ""

  const negative = compact.startsWith("-")
  const unsigned = compact.replace(/-/g, "").replace(/[^\d.,]/g, "")
  const separatorIndex = unsigned.search(/[.,]/)
  const hasSeparator = separatorIndex >= 0
  const integerSource = hasSeparator ? unsigned.slice(0, separatorIndex) : unsigned
  const fractionSource = hasSeparator ? unsigned.slice(separatorIndex + 1) : ""
  const integerDigits = integerSource.replace(/\D/g, "")
  const fractionDigits = fractionSource.replace(/\D/g, "").slice(0, 2)

  if (!integerDigits && !hasSeparator) return negative ? "-" : ""

  const normalizedInteger = (integerDigits || "0").replace(/^0+(?=\d)/, "")
  const groupedInteger = normalizedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  const sign = negative ? "-" : ""

  return `${sign}${groupedInteger}${
    hasSeparator ? `${MONEY_DRAFT_SEPARATOR}${fractionDigits}` : ""
  }`
}

export function parseMoneyInput(value: string): number {
  const normalized = value
    .replace(/[\s\u00a0\u202f]/g, "")
    .replace(MONEY_DRAFT_SEPARATOR, ".")
  if (!normalized || normalized === "-" || normalized.endsWith(".")) return Number.NaN
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}
