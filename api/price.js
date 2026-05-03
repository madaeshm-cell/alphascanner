export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: "symbols required" });

  const symList = symbols.split(",").map(s => s.trim() + ".NS");
  const yahooSyms = symList.join("%2C");

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSyms}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume,fiftyTwoWeekHigh,fiftyTwoWeekLow,marketCap,trailingPE,epsTrailingTwelveMonths,beta,dividendYield,bookValue,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketPreviousClose`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AlphaScanner/1.0)" }
    });
    if (!r.ok) throw new Error("Yahoo Finance returned " + r.status);
    const data = await r.json();
    const quotes = data?.quoteResponse?.result || [];

    const prices = {};
    quotes.forEach(q => {
      const sym = q.symbol.replace(".NS","").replace(".BO","");
      prices[sym] = {
        price: q.regularMarketPrice,
        chgPct: q.regularMarketChangePercent,
        volume: q.regularMarketVolume,
        high52: q.fiftyTwoWeekHigh,
        low52: q.fiftyTwoWeekLow,
        mcapRaw: q.marketCap,
        pe: q.trailingPE,
        eps: q.epsTrailingTwelveMonths,
        beta: q.beta,
        divYield: q.dividendYield,
        bv: q.bookValue,
        open: q.regularMarketOpen,
        dayHigh: q.regularMarketDayHigh,
        dayLow: q.regularMarketDayLow,
        prevClose: q.regularMarketPreviousClose,
      };
    });
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json({ prices });
  } catch(e) {
    console.error("Price fetch error:", e);
    return res.status(500).json({ error: e.message });
  }
}
