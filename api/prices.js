// Fetches real NSE/BSE prices via Yahoo Finance
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");

  const symbols = [
    "IRFC.NS","SUZLON.NS","YESBANK.NS","NHPC.NS","RVNL.NS",
    "IREDA.NS","GMRINFRA.NS","IDEA.NS","RPOWER.NS","CANBK.NS",
    "TATAPOWER.NS","RECLTD.NS","SAIL.NS","BANKBARODA.NS","TRIDENT.NS",
    "HFCL.NS","ZOMATO.NS","PAYTM.NS","IEX.NS","PCJEWELLER.BO"
  ];

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}&fields=symbol,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketDayHigh,regularMarketDayLow,fiftyTwoWeekHigh,fiftyTwoWeekLow,marketCap,trailingPE,epsTrailingTwelveMonths,bookValue,dividendYield,beta,regularMarketOpen,regularMarketPreviousClose`;

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com"
      }
    });
    if (!r.ok) return res.status(502).json({ error: "Yahoo Finance fetch failed", status: r.status });
    const data = await r.json();
    const quotes = data?.quoteResponse?.result || [];
    const result = {};
    quotes.forEach(q => {
      const sym = q.symbol.replace(".NS","").replace(".BO","");
      result[sym] = {
        price: q.regularMarketPrice,
        change: q.regularMarketChange,
        changePct: q.regularMarketChangePercent,
        open: q.regularMarketOpen,
        prevClose: q.regularMarketPreviousClose,
        high: q.regularMarketDayHigh,
        low: q.regularMarketDayLow,
        high52: q.fiftyTwoWeekHigh,
        low52: q.fiftyTwoWeekLow,
        volume: q.regularMarketVolume,
        marketCap: q.marketCap,
        pe: q.trailingPE,
        eps: q.epsTrailingTwelveMonths,
        bookValue: q.bookValue,
        dividendYield: q.dividendYield,
        beta: q.beta
      };
    });
    return res.status(200).json({ quotes: result, timestamp: Date.now() });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
