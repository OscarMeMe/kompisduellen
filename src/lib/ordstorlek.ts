// Textstorlek som får ett ord att alltid rymmas på en rad, så att det aldrig bryts mitt i ("Kebabpizz / a").
//
// Svaret är en bredd i cqw (procent av närmaste container med container-type), som används som tak för teckenstorleken:
// text-[length:min(3rem,var(--fit))]. Det längsta ordet i texten avgör. Flera ord får bryta mellan orden som vanligt.
// charEm är ungefär hur brett ett tecken är i rubriktypsnittet (Syne i fetstil), i em, med lite marginal.
export function fitWordSize(text: string, charEm = 0.7): string {
  const longest = Math.max(1, ...text.split(/\s+/).map((word) => word.length))
  return `${(100 / (longest * charEm)).toFixed(2)}cqw`
}
