// Fetches additional fundamental data from screener.in for Indian stocks
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    // Screener.in public page scrape
    const url = `https://www.screener.in/company/${symbol}/consolidated/`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
        "Accept-Language": "en-IN,en;q=0.9"
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!r.ok) throw new Error("Screener returned " + r.status);

    const html = await r.text();

    // Extract key ratios using regex patterns
    const extract = (pattern) => {
      const m = html.match(pattern);
      return m ? m[1].replace(/[,\s]/g, "").trim() : null;
    };

    const getNumber = (pattern) => {
      const v = extract(pattern);
      return v ? parseFloat(v) : null;
    };

    // Parse ratios from screener HTML
    const roce = getNumber(/ROCE<\/td>\s*<td[^>]*>([\-\d\.]+)\s*%/);
    const roe  = getNumber(/ROE<\/td>\s*<td[^>]*>([\-\d\.]+)\s*%/);
    const faceVal = getNumber(/Face Value<\/td>\s*<td[^>]*>₹?([\d\.]+)/);
    const debtToEq = getNumber(/Debt to equity<\/td>\s*<td[^>]*>([\-\d\.]+)/);
    const currentRatio = getNumber(/Current ratio<\/td>\s*<td[^>]*>([\d\.]+)/);
    const promoterHolding = getNumber(/Promoter<\/span>[\s\S]*?>([\d\.]+)%/);

    res.setHeader("Cache-Control", "s-maxage=3600");
    return res.status(200).json({
      roce, roe, faceVal, debtToEq, currentRatio, promoterHolding,
      source: "screener.in"
    });
  } catch(e) {
    console.error("Fundamentals fetch error:", e.message);
    return res.status(200).json({ error: e.message, roce: null, roe: null });
  }
}
