// Real historical chart data from Yahoo Finance
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300");

  const { symbol, range } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const rangeMap = {
    "1D": { range: "1d", interval: "5m" },
    "1W": { range: "5d", interval: "60m" },
    "1M": { range: "1mo", interval: "1d" },
    "3M": { range: "3mo", interval: "1d" },
    "1Y": { range: "1y", interval: "1wk" }
  };
  const { range: r, interval } = rangeMap[range] || rangeMap["1D"];
  const ySymbol = symbol.includes(".") ? symbol : symbol + ".NS";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ySymbol}?range=${r}&interval=${interval}&includePrePost=false`;

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://finance.yahoo.com"
      }
    });
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: "No data" });

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const labels = timestamps.map(t => {
      const d = new Date(t * 1000);
      if (range === "1D") return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    });
    return res.status(200).json({ labels, prices: closes.map(p => p ? parseFloat(p.toFixed(2)) : null) });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
