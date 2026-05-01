/* ===== STOCK DATA ===== */
const STOCKS = [
  { symbol: "IRFC",     name: "Indian Railway Finance Corp", exchange: "NSE", sector: "PSU Finance",     basePrice: 168,  volatility: 0.035 },
  { symbol: "SUZLON",   name: "Suzlon Energy Ltd",           exchange: "NSE", sector: "Renewable Energy", basePrice: 56,   volatility: 0.050 },
  { symbol: "YESBANK",  name: "Yes Bank Ltd",                exchange: "NSE", sector: "Banking",          basePrice: 24,   volatility: 0.055 },
  { symbol: "NHPC",     name: "NHPC Ltd",                    exchange: "NSE", sector: "Hydro Power",      basePrice: 82,   volatility: 0.030 },
  { symbol: "RVNL",     name: "Rail Vikas Nigam Ltd",        exchange: "NSE", sector: "Infrastructure",   basePrice: 412,  volatility: 0.040 },
  { symbol: "IREDA",    name: "IREDA",                       exchange: "NSE", sector: "Green Finance",    basePrice: 185,  volatility: 0.045 },
  { symbol: "GMRINFRA", name: "GMR Airports Infra",          exchange: "NSE", sector: "Airports",         basePrice: 92,   volatility: 0.040 },
  { symbol: "IDEA",     name: "Vodafone Idea Ltd",           exchange: "NSE", sector: "Telecom",          basePrice: 14,   volatility: 0.070 },
  { symbol: "RPOWER",   name: "Reliance Power Ltd",          exchange: "BSE", sector: "Power",            basePrice: 38,   volatility: 0.065 },
  { symbol: "CANBK",    name: "Canara Bank",                 exchange: "NSE", sector: "PSU Bank",         basePrice: 102,  volatility: 0.035 },
  { symbol: "TATAPOWER",name: "Tata Power Company",          exchange: "NSE", sector: "Power",            basePrice: 428,  volatility: 0.030 },
  { symbol: "RECLTD",   name: "REC Limited",                 exchange: "NSE", sector: "PSU Finance",      basePrice: 488,  volatility: 0.040 },
  { symbol: "SAIL",     name: "Steel Auth. of India",        exchange: "NSE", sector: "Steel",            basePrice: 128,  volatility: 0.040 },
  { symbol: "BANKBARODA","name": "Bank of Baroda",           exchange: "NSE", sector: "PSU Bank",         basePrice: 224,  volatility: 0.035 },
  { symbol: "TRIDENT",  name: "Trident Ltd",                 exchange: "NSE", sector: "Textiles",         basePrice: 38,   volatility: 0.045 },
  { symbol: "HFCL",     name: "HFCL Ltd",                    exchange: "NSE", sector: "Telecom Infra",    basePrice: 148,  volatility: 0.050 },
  { symbol: "ZOMATO",   name: "Zomato Ltd",                  exchange: "NSE", sector: "Foodtech",         basePrice: 218,  volatility: 0.040 },
  { symbol: "PAYTM",    name: "One97 Communications",        exchange: "NSE", sector: "Fintech",          basePrice: 512,  volatility: 0.050 },
  { symbol: "PCJEWELLER","name":"PC Jeweller Ltd",           exchange: "BSE", sector: "Jewellery",        basePrice: 78,   volatility: 0.055 },
  { symbol: "IEX",      name: "Indian Energy Exchange",      exchange: "NSE", sector: "Energy Markets",   basePrice: 186,  volatility: 0.040 },
];

/* ===== STATE ===== */
let stockState = {};
let countdown = 30;
let intervalId = null;
let countdownId = null;
let isLoading = false;

/* ===== INIT STATE ===== */
STOCKS.forEach(s => {
  const chgPct = (Math.random() - 0.4) * s.volatility * 100;
  stockState[s.symbol] = {
    ...s,
    price: s.basePrice * (1 + chgPct / 100),
    chgPct,
    volume: parseFloat((Math.random() * 80 + 5).toFixed(2)),
    rsi: Math.floor(Math.random() * 42 + 28),
    pe: (Math.random() * 22 + 8).toFixed(1),
    score: 0
  };
});

/* ===== HELPERS ===== */
function fmtPrice(v) {
  return "₹" + v.toFixed(2);
}

function fmtChg(v) {
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

function fmtVol(v) {
  return v.toFixed(1) + "L";
}

/* ===== SIMULATION ===== */
function simulatePriceUpdate() {
  STOCKS.forEach(s => {
    const st = stockState[s.symbol];
    const tick = (Math.random() - 0.48) * s.volatility * st.price * 0.25;
    st.price = Math.max(0.5, st.price + tick);
    st.chgPct = ((st.price - s.basePrice) / s.basePrice) * 100;
    st.rsi = Math.min(80, Math.max(20, st.rsi + (Math.random() - 0.5) * 3));
    st.volume = Math.max(0.5, st.volume + (Math.random() - 0.5) * 5);
  });
}

function scoreStocks() {
  STOCKS.forEach(s => {
    const st = stockState[s.symbol];
    let score = 0;
    // Low price bonus
    if (st.price < 50) score += 28;
    else if (st.price < 150) score += 18;
    else if (st.price < 300) score += 10;
    // Momentum
    if (st.chgPct > 2) score += 25;
    else if (st.chgPct > 0.5) score += 14;
    else if (st.chgPct > -1) score += 6;
    // RSI oversold
    if (st.rsi < 30) score += 22;
    else if (st.rsi < 45) score += 12;
    // Random noise for variety
    score += Math.random() * 20;
    st.score = Math.min(99, Math.round(score));
  });
  return Object.values(stockState).sort((a, b) => b.score - a.score).slice(0, 10);
}

function getSignal(chgPct, rsi) {
  return (chgPct > 1.5 && rsi < 58) || rsi < 33 ? "buy" : "watch";
}

/* ===== RENDER TICKER ===== */
function renderTicker() {
  const nChg = (Math.random() - 0.4) * 120;
  const sChg = (Math.random() - 0.4) * 400;
  const bChg = (Math.random() - 0.4) * 200;
  const iChg = (Math.random() - 0.4) * 150;
  const niftyVal = (24350 + nChg).toFixed(2);
  const sensexVal = (80200 + sChg).toFixed(2);
  const bankVal = (52400 + bChg).toFixed(2);
  const itVal = (37800 + iChg).toFixed(2);
  const usdInr = (83.8 + (Math.random() - 0.5) * 0.2).toFixed(2);
  const gold = (73200 + (Math.random() - 0.5) * 200).toFixed(0);

  const set = (id, val, chg) => {
    const el = document.getElementById(id);
    const cEl = document.getElementById(id + "-c");
    if (el) el.textContent = val;
    if (cEl) {
      const sign = chg >= 0 ? "+" : "";
      cEl.textContent = sign + chg.toFixed(2) + "%";
      cEl.className = chg >= 0 ? "tick-up" : "tick-down";
    }
  };

  set("t-nifty", niftyVal, nChg / 24350 * 100);
  set("t-sensex", sensexVal, sChg / 80200 * 100);
  set("t-bank", bankVal, bChg / 52400 * 100);
  set("t-it", itVal, iChg / 37800 * 100);
  const usdEl = document.getElementById("t-usd");
  if (usdEl) usdEl.textContent = usdInr;
  const goldEl = document.getElementById("t-gold");
  if (goldEl) goldEl.textContent = "₹" + parseInt(gold).toLocaleString("en-IN");
}

/* ===== RENDER METRICS ===== */
function renderMetrics(picks) {
  const nChg = (Math.random() - 0.4) * 1.2;
  const sChg = (Math.random() - 0.4) * 1.4;
  const bulls = picks.filter(p => p.chgPct > 0).length;
  const buySigs = picks.filter(p => getSignal(p.chgPct, p.rsi) === "buy").length;
  const sentiment = bulls >= 7 ? "Bullish" : bulls >= 5 ? "Neutral" : "Bearish";
  const sentClass = bulls >= 7 ? "up" : bulls >= 5 ? "neutral" : "down";

  const setM = (id, val, chgId, chg) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
    if (chgId) {
      const cEl = document.getElementById(chgId);
      if (cEl) {
        cEl.textContent = (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%";
        cEl.className = "metric-chg " + (chg >= 0 ? "up" : "down");
      }
    }
  };

  setM("m-nifty", (24350 + nChg * 30).toFixed(0), "m-nifty-c", nChg);
  setM("m-sensex", (80200 + sChg * 100).toFixed(0), "m-sensex-c", sChg);

  const sentEl = document.getElementById("m-sent");
  if (sentEl) { sentEl.textContent = sentiment; sentEl.className = "metric-val " + sentClass; }
  const sentCEl = document.getElementById("m-sent-c");
  if (sentCEl) sentCEl.textContent = bulls + "/10 positive";

  const buysEl = document.getElementById("m-buys");
  if (buysEl) buysEl.textContent = buySigs;
}

/* ===== RENDER STOCK CARDS ===== */
function renderPicks(picks) {
  const list = document.getElementById("picks-list");
  list.classList.add("flash");
  setTimeout(() => list.classList.remove("flash"), 400);

  list.innerHTML = picks.map((st, i) => {
    const signal = getSignal(st.chgPct, st.rsi);
    const chgClass = st.chgPct >= 0 ? "up" : "down";
    const isTop = i === 0;
    const growwLink = `https://groww.in/stocks/${st.symbol.toLowerCase()}`;

    return `
    <a class="stock-card ${isTop ? "top-pick" : ""}" href="${growwLink}" target="_blank" rel="noopener">
      <div class="card-top">
        <div class="card-left">
          <div class="rank-row">
            <span class="rank-num ${isTop ? "gold" : ""}">${isTop ? "★ #1" : "#" + (i + 1)}</span>
            ${isTop ? '<span class="star-badge">TOP PICK</span>' : ""}
            <span class="exchange-tag">${st.exchange}</span>
          </div>
          <div class="stock-sym">${st.symbol}</div>
          <div class="stock-name">${st.name}</div>
          <span class="signal-pill signal-${signal}">${signal === "buy" ? "Strong Buy" : "Watch"}</span>
        </div>
        <div class="card-right">
          <div class="price-val">${fmtPrice(st.price)}</div>
          <div class="price-chg ${chgClass}">${fmtChg(st.chgPct)}</div>
        </div>
      </div>
      <div class="card-stats">
        <div class="stat-block">
          <div class="stat-lbl">Sector</div>
          <div class="stat-val" style="font-size:10px;font-family:var(--font)">${st.sector}</div>
        </div>
        <div class="stat-block">
          <div class="stat-lbl">RSI</div>
          <div class="stat-val ${st.rsi < 35 ? "up" : st.rsi > 65 ? "down" : ""}">${st.rsi.toFixed(0)}</div>
        </div>
        <div class="stat-block">
          <div class="stat-lbl">Volume</div>
          <div class="stat-val">${fmtVol(st.volume)}</div>
        </div>
        <div class="stat-block">
          <div class="stat-lbl">P/E</div>
          <div class="stat-val">${st.pe}</div>
        </div>
      </div>
      <div class="score-row">
        <div class="score-bar-wrap">
          <div class="score-bar-fill" style="width:${st.score}%"></div>
        </div>
        <span class="score-num">${st.score}/99</span>
      </div>
    </a>`;
  }).join("");
}

/* ===== AI COMMENTARY ===== */
async function fetchAICommentary(picks) {
  const top5 = picks.slice(0, 5).map(p =>
    `${p.symbol} (${p.name}, ₹${p.price.toFixed(2)}, ${fmtChg(p.chgPct)}, ${p.sector}, RSI ${p.rsi.toFixed(0)}, AI score ${p.score})`
  ).join("; ");

  const prompt = `You are a sharp Indian stock market analyst helping retail investors on Groww. The top 5 AI-ranked picks right now are: ${top5}.

Write 2–3 sentences of crisp, specific market commentary for a Groww user. Mention relevant Indian themes: government capex, PSU momentum, renewable energy, EV policy, domestic consumption, or FII/DII flows. Be grounded in present tense. Do not repeat prices or rupee values.`;

  const aiEl = document.getElementById("ai-commentary");
  const timeEl = document.getElementById("ai-time");
  if (aiEl) aiEl.textContent = "Analysing with Claude AI...";

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (aiEl) aiEl.textContent = data.text || "Analysis unavailable. Check your API key.";
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString("en-IN");
  } catch (e) {
    if (aiEl) aiEl.textContent = "AI commentary unavailable. Picks based on RSI, momentum, low entry price, and sector strength signals for Indian retail investors.";
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString("en-IN");
  }
}

/* ===== MAIN SCAN ===== */
function runScan(skipAI = false) {
  if (isLoading) return;
  isLoading = true;
  const btn = document.getElementById("refresh-btn");
  if (btn) btn.disabled = true;

  const label = document.getElementById("update-label");

  simulatePriceUpdate();
  renderTicker();

  const picks = scoreStocks();
  renderMetrics(picks);
  renderPicks(picks);

  if (!skipAI) fetchAICommentary(picks);

  if (btn) btn.disabled = false;
  countdown = 30;
  isLoading = false;
}

function triggerRefresh() {
  clearInterval(intervalId);
  runScan(false);
  startIntervals();
}

function startIntervals() {
  clearInterval(intervalId);
  clearInterval(countdownId);

  intervalId = setInterval(() => runScan(false), 30000);

  countdownId = setInterval(() => {
    countdown = Math.max(0, countdown - 1);
    if (countdown === 0) countdown = 30;
    const el = document.getElementById("countdown");
    if (el) el.textContent = countdown + "s";
  }, 1000);
}

/* ===== INIT ===== */
runScan(false);
startIntervals();

// Fast ticker updates every 1.5s
setInterval(() => {
  simulatePriceUpdate();
  renderTicker();
}, 1500);
