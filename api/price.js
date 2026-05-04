export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: "symbols required" });

  const symList = symbols.split(",").map(s => s.trim());
  const prices = {};

  // Map symbol → correct Yahoo Finance ticker
  const YAHOO_MAP = {
    "IRFC":       "IRFC.NS",
    "SUZLON":     "SUZLON.NS",
    "YESBANK":    "YESBANK.NS",
    "NHPC":       "NHPC.NS",
    "RVNL":       "RVNL.NS",
    "IREDA":      "IREDA.NS",
    "GMRINFRA":   "GMRINFRA.NS",
    "IDEA":       "IDEA.NS",
    "RPOWER":     "RPOWER.NS",
    "CANBK":      "CANBK.NS",
    "TATAPOWER":  "TATAPOWER.NS",
    "RECLTD":     "RECLTD.NS",
    "SAIL":       "SAIL.NS",
    "BANKBARODA": "BANKBARODA.NS",
    "TRIDENT":    "TRIDENT.NS",
    "HFCL":       "HFCL.NS",
    "ZOMATO":     "ZOMATO.NS",
    "PAYTM":      "PAYTM.NS",
    "PCJEWELLER": "PCJEWELLER.NS",
    "IEX":        "IEX.NS",
  };

  const yahooSymbols = symList
    .map(s => YAHOO_MAP[s] || s + ".NS")
    .join("%2C");

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${yahooSymbols}&range=1d&interval=5m`;
    const sparkRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com"
      }
    });

    // Also fetch quote data for fundamentals
    const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSymbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume,fiftyTwoWeekHigh,fiftyTwoWeekLow,marketCap,trailingPE,epsTrailingTwelveMonths,beta,dividendYield,bookValue,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketPreviousClose,regularMarketChange`;
    const quoteRes = await fetch(quoteUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com"
      }
    });

    if (!quoteRes.ok) throw new Error("Yahoo quote returned " + quoteRes.status);

    const quoteData = await quoteRes.json();
    const quotes = quoteData?.quoteResponse?.result || [];

    quotes.forEach(q => {
      // Strip .NS or .BO to get original symbol
      const sym = q.symbol.replace(/\.(NS|BO)$/, "");
      if (q.regularMarketPrice && q.regularMarketPrice > 0) {
        prices[sym] = {
          price:      q.regularMarketPrice,
          chgPct:     q.regularMarketChangePercent || 0,
          chgAmt:     q.regularMarketChange || 0,
          volume:     q.regularMarketVolume || 0,
          high52:     q.fiftyTwoWeekHigh || 0,
          low52:      q.fiftyTwoWeekLow || 0,
          mcapRaw:    q.marketCap || 0,
          pe:         q.trailingPE || null,
          eps:        q.epsTrailingTwelveMonths || 0,
          beta:       q.beta || null,
          divYield:   q.dividendYield || 0,
          bv:         q.bookValue || 0,
          open:       q.regularMarketOpen || q.regularMarketPrice,
          dayHigh:    q.regularMarketDayHigh || q.regularMarketPrice,
          dayLow:     q.regularMarketDayLow || q.regularMarketPrice,
          prevClose:  q.regularMarketPreviousClose || q.regularMarketPrice,
          source:     "yahoo"
        };
      }
    });

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=15");
    return res.status(200).json({ prices, fetched: Object.keys(prices).length });

  } catch (e) {
    console.error("Price fetch error:", e.message);
    // Try fallback with v6 endpoint
    try {
      const fallbackUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${yahooSymbols}`;
      const fb = await fetch(fallbackUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
      });
      const fbData = await fb.json();
      const fbQuotes = fbData?.quoteResponse?.result || [];
      fbQuotes.forEach(q => {
        const sym = q.symbol.replace(/\.(NS|BO)$/, "");
        if (q.regularMarketPrice > 0) {
          prices[sym] = {
            price: q.regularMarketPrice,
            chgPct: q.regularMarketChangePercent || 0,
            volume: q.regularMarketVolume || 0,
            high52: q.fiftyTwoWeekHigh || 0,
            low52: q.fiftyTwoWeekLow || 0,
            mcapRaw: q.marketCap || 0,
            pe: q.trailingPE || null,
            eps: q.epsTrailingTwelveMonths || 0,
            beta: q.beta || null,
            divYield: q.dividendYield || 0,
            bv: q.bookValue || 0,
            open: q.regularMarketOpen || q.regularMarketPrice,
            dayHigh: q.regularMarketDayHigh || q.regularMarketPrice,
            dayLow: q.regularMarketDayLow || q.regularMarketPrice,
            prevClose: q.regularMarketPreviousClose || q.regularMarketPrice,
            source: "yahoo-v2"
          };
        }
      });
      return res.status(200).json({ prices, fetched: Object.keys(prices).length });
    } catch(e2) {
      return res.status(500).json({ error: e.message, fallbackError: e2.message, prices });
    }
  }
}
