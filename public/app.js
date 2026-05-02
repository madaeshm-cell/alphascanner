/* ===== STOCK DATA ===== */
const STOCKS = [
  { symbol:"IRFC",     name:"Indian Railway Finance Corp", exchange:"NSE", sector:"PSU Finance",      basePrice:168,  volatility:0.035, mcap:"2.19L Cr", eps:5.2,  beta:0.7,  divYield:"1.2%", bv:42 },
  { symbol:"SUZLON",   name:"Suzlon Energy Ltd",           exchange:"NSE", sector:"Renewable Energy", basePrice:56,   volatility:0.050, mcap:"78K Cr",   eps:1.8,  beta:1.4,  divYield:"0%",   bv:8  },
  { symbol:"YESBANK",  name:"Yes Bank Ltd",                exchange:"NSE", sector:"Banking",          basePrice:24,   volatility:0.055, mcap:"75K Cr",   eps:0.5,  beta:1.8,  divYield:"0%",   bv:14 },
  { symbol:"NHPC",     name:"NHPC Ltd",                    exchange:"NSE", sector:"Hydro Power",      basePrice:82,   volatility:0.030, mcap:"82K Cr",   eps:4.1,  beta:0.6,  divYield:"2.8%", bv:38 },
  { symbol:"RVNL",     name:"Rail Vikas Nigam Ltd",        exchange:"NSE", sector:"Infrastructure",   basePrice:412,  volatility:0.040, mcap:"85K Cr",   eps:12.4, beta:1.1,  divYield:"0.8%", bv:98 },
  { symbol:"IREDA",    name:"IREDA",                       exchange:"NSE", sector:"Green Finance",    basePrice:185,  volatility:0.045, mcap:"49K Cr",   eps:6.8,  beta:1.2,  divYield:"0.5%", bv:55 },
  { symbol:"GMRINFRA", name:"GMR Airports Infra",          exchange:"NSE", sector:"Airports",         basePrice:92,   volatility:0.040, mcap:"55K Cr",   eps:1.2,  beta:1.3,  divYield:"0%",   bv:18 },
  { symbol:"IDEA",     name:"Vodafone Idea Ltd",           exchange:"NSE", sector:"Telecom",          basePrice:14,   volatility:0.070, mcap:"56K Cr",   eps:-2.1, beta:2.1,  divYield:"0%",   bv:4  },
  { symbol:"RPOWER",   name:"Reliance Power Ltd",          exchange:"BSE", sector:"Power",            basePrice:38,   volatility:0.065, mcap:"15K Cr",   eps:0.4,  beta:1.9,  divYield:"0%",   bv:22 },
  { symbol:"CANBK",    name:"Canara Bank",                 exchange:"NSE", sector:"PSU Bank",         basePrice:102,  volatility:0.035, mcap:"92K Cr",   eps:18.2, beta:1.1,  divYield:"3.2%", bv:110},
  { symbol:"TATAPOWER",name:"Tata Power Company",          exchange:"NSE", sector:"Power",            basePrice:428,  volatility:0.030, mcap:"1.37L Cr", eps:10.2, beta:1.0,  divYield:"0.5%", bv:88 },
  { symbol:"RECLTD",   name:"REC Limited",                 exchange:"NSE", sector:"PSU Finance",      basePrice:488,  volatility:0.040, mcap:"1.28L Cr", eps:42.1, beta:0.9,  divYield:"2.1%", bv:215},
  { symbol:"SAIL",     name:"Steel Auth. of India",        exchange:"NSE", sector:"Steel",            basePrice:128,  volatility:0.040, mcap:"52K Cr",   eps:8.4,  beta:1.2,  divYield:"1.8%", bv:112},
  { symbol:"BANKBARODA",name:"Bank of Baroda",             exchange:"NSE", sector:"PSU Bank",         basePrice:224,  volatility:0.035, mcap:"1.16L Cr", eps:38.5, beta:1.0,  divYield:"2.5%", bv:198},
  { symbol:"TRIDENT",  name:"Trident Ltd",                 exchange:"NSE", sector:"Textiles",         basePrice:38,   volatility:0.045, mcap:"19K Cr",   eps:2.1,  beta:0.8,  divYield:"1.5%", bv:22 },
  { symbol:"HFCL",     name:"HFCL Ltd",                    exchange:"NSE", sector:"Telecom Infra",    basePrice:148,  volatility:0.050, mcap:"20K Cr",   eps:4.8,  beta:1.3,  divYield:"0.3%", bv:42 },
  { symbol:"ZOMATO",   name:"Zomato Ltd",                  exchange:"NSE", sector:"Foodtech",         basePrice:218,  volatility:0.040, mcap:"1.9L Cr",  eps:1.8,  beta:1.4,  divYield:"0%",   bv:24 },
  { symbol:"PAYTM",    name:"One97 Communications",        exchange:"NSE", sector:"Fintech",          basePrice:512,  volatility:0.050, mcap:"32K Cr",   eps:-8.2, beta:1.6,  divYield:"0%",   bv:185},
  { symbol:"PCJEWELLER",name:"PC Jeweller Ltd",            exchange:"BSE", sector:"Jewellery",        basePrice:78,   volatility:0.055, mcap:"11K Cr",   eps:2.4,  beta:1.5,  divYield:"0.8%", bv:55 },
  { symbol:"IEX",      name:"Indian Energy Exchange",      exchange:"NSE", sector:"Energy Markets",   basePrice:186,  volatility:0.040, mcap:"16K Cr",   eps:6.2,  beta:0.9,  divYield:"1.8%", bv:28 },
];

let stockState = {};
let chartInstance = null;
let returnChartInstance = null;
let currentStock = null;
let calcHorizon = 1;
let countdown = 30;
let intervalId = null;
let countdownId = null;
let isLoading = false;

// Init state
STOCKS.forEach(s => {
  const chgPct = (Math.random() - 0.4) * s.volatility * 100;
  stockState[s.symbol] = {
    ...s,
    price: s.basePrice * (1 + chgPct / 100),
    chgPct,
    volume: parseFloat((Math.random() * 80 + 5).toFixed(2)),
    rsi: Math.floor(Math.random() * 42 + 28),
    pe: s.eps > 0 ? (s.basePrice / s.eps).toFixed(1) : "N/A",
    score: 0,
    high52: s.basePrice * (1 + Math.random() * 0.35 + 0.05),
    low52: s.basePrice * (1 - Math.random() * 0.30 - 0.05),
  };
});

function fmtPrice(v) { return "₹" + v.toFixed(2); }
function fmtChg(v) { return (v >= 0 ? "+" : "") + v.toFixed(2) + "%"; }
function fmtINR(v) {
  if (v >= 1e7) return "₹" + (v/1e7).toFixed(2) + " Cr";
  if (v >= 1e5) return "₹" + (v/1e5).toFixed(2) + " L";
  return "₹" + v.toFixed(2);
}

function simulatePriceUpdate() {
  STOCKS.forEach(s => {
    const st = stockState[s.symbol];
    const tick = (Math.random() - 0.48) * s.volatility * st.price * 0.25;
    st.price = Math.max(0.5, st.price + tick);
    st.chgPct = ((st.price - s.basePrice) / s.basePrice) * 100;
    st.rsi = Math.min(80, Math.max(20, st.rsi + (Math.random() - 0.5) * 3));
    st.volume = Math.max(0.5, st.volume + (Math.random() - 0.5) * 5);
    if (st.price > st.high52) st.high52 = st.price;
  });
}

function scoreStocks() {
  STOCKS.forEach(s => {
    const st = stockState[s.symbol];
    let score = 0;
    if (st.price < 50) score += 28;
    else if (st.price < 150) score += 18;
    else if (st.price < 300) score += 10;
    if (st.chgPct > 2) score += 25;
    else if (st.chgPct > 0.5) score += 14;
    else if (st.chgPct > -1) score += 6;
    if (st.rsi < 30) score += 22;
    else if (st.rsi < 45) score += 12;
    score += Math.random() * 20;
    st.score = Math.min(99, Math.round(score));
  });
  return Object.values(stockState).sort((a, b) => b.score - a.score).slice(0, 10);
}

function getSignal(chgPct, rsi) {
  return (chgPct > 1.5 && rsi < 58) || rsi < 33 ? "buy" : "watch";
}

/* TICKER */
function renderTicker() {
  const nChg = (Math.random()-0.4)*120, sChg=(Math.random()-0.4)*400;
  const bChg = (Math.random()-0.4)*200, iChg=(Math.random()-0.4)*150;
  const set = (id, val, chgId, chg) => {
    const e = document.getElementById(id); if(e) e.textContent = val;
    if(chgId){ const c=document.getElementById(chgId); if(c){c.textContent=(chg>=0?"+":"")+chg.toFixed(2)+"%";c.className=chg>=0?"tick-up":"tick-down";}}
  };
  set("t-nifty",(24350+nChg).toFixed(2),"t-nifty-c",nChg/24350*100);
  set("t-sensex",(80200+sChg).toFixed(2),"t-sensex-c",sChg/80200*100);
  set("t-bank",(52400+bChg).toFixed(2),"t-bank-c",bChg/52400*100);
  set("t-it",(37800+iChg).toFixed(2),"t-it-c",iChg/37800*100);
  const ud=document.getElementById("t-usd"); if(ud) ud.textContent=(83.8+(Math.random()-0.5)*0.2).toFixed(2);
  const gd=document.getElementById("t-gold"); if(gd) gd.textContent="₹"+(73200+(Math.random()-0.5)*200).toFixed(0);
}

/* MARKET METRICS */
function renderMetrics(picks) {
  const nChg=(Math.random()-0.4)*1.2, sChg=(Math.random()-0.4)*1.4;
  const bulls=picks.filter(p=>p.chgPct>0).length;
  const sentiment=bulls>=7?"Bullish":bulls>=5?"Neutral":"Bearish";
  const sentClass=bulls>=7?"up":bulls>=5?"neutral":"down";
  const setM=(id,val,cid,chg)=>{
    const e=document.getElementById(id);if(e)e.textContent=val;
    if(cid){const c=document.getElementById(cid);if(c){c.textContent=(chg>=0?"+":"")+chg.toFixed(2)+"%";c.className="metric-chg "+(chg>=0?"up":"down");}}
  };
  setM("m-nifty",(24350+nChg*30).toFixed(0),"m-nifty-c",nChg);
  setM("m-sensex",(80200+sChg*100).toFixed(0),"m-sensex-c",sChg);
  const se=document.getElementById("m-sent"); if(se){se.textContent=sentiment;se.className="metric-val "+sentClass;}
  const sc=document.getElementById("m-sent-c"); if(sc) sc.textContent=bulls+"/10 positive";
  const be=document.getElementById("m-buys"); if(be) be.textContent=picks.filter(p=>getSignal(p.chgPct,p.rsi)==="buy").length;
}

/* RENDER PICKS */
function renderPicks(picks) {
  const list = document.getElementById("picks-list");
  list.classList.add("flash");
  setTimeout(()=>list.classList.remove("flash"),400);
  list.innerHTML = picks.map((st,i)=>{
    const signal=getSignal(st.chgPct,st.rsi);
    const chgClass=st.chgPct>=0?"up":"down";
    const isTop=i===0;
    return `<div class="stock-card ${isTop?"top-pick":""}" onclick="openStockModal('${st.symbol}')">
      <div class="card-top">
        <div class="card-left">
          <div class="rank-row">
            <span class="rank-num ${isTop?"gold":""}">${isTop?"★ #1":"#"+(i+1)}</span>
            ${isTop?'<span class="star-badge">TOP PICK</span>':""}
            <span class="exchange-tag">${st.exchange}</span>
          </div>
          <div class="stock-sym">${st.symbol}</div>
          <div class="stock-name">${st.name}</div>
          <span class="signal-pill signal-${signal}">${signal==="buy"?"Strong Buy":"Watch"}</span>
        </div>
        <div class="card-right">
          <div class="price-val">${fmtPrice(st.price)}</div>
          <div class="price-chg ${chgClass}">${fmtChg(st.chgPct)}</div>
        </div>
      </div>
      <div class="card-stats">
        <div class="stat-block"><div class="stat-lbl">Sector</div><div class="stat-val" style="font-size:10px;font-family:var(--font)">${st.sector}</div></div>
        <div class="stat-block"><div class="stat-lbl">RSI</div><div class="stat-val ${st.rsi<35?"up":st.rsi>65?"down":""}">${st.rsi.toFixed(0)}</div></div>
        <div class="stat-block"><div class="stat-lbl">Volume</div><div class="stat-val">${st.volume.toFixed(1)}L</div></div>
        <div class="stat-block"><div class="stat-lbl">P/E</div><div class="stat-val">${st.pe}</div></div>
      </div>
      <div class="score-row">
        <div class="score-bar-wrap"><div class="score-bar-fill" style="width:${st.score}%"></div></div>
        <span class="score-num">${st.score}/99</span>
      </div>
    </div>`;
  }).join("");
}

/* ===== STOCK MODAL ===== */
function openStockModal(symbol) {
  currentStock = stockState[symbol];
  if (!currentStock) return;
  const st = currentStock;
  const signal = getSignal(st.chgPct, st.rsi);
  const chgClass = st.chgPct >= 0 ? "up" : "down";

  document.getElementById("modal-sym").textContent = st.symbol;
  document.getElementById("modal-name").textContent = st.name + " · " + st.exchange;
  document.getElementById("modal-price").textContent = fmtPrice(st.price);
  const mc = document.getElementById("modal-chg");
  mc.textContent = fmtChg(st.chgPct) + " today";
  mc.className = "modal-chg " + chgClass;

  const sb = document.getElementById("signal-banner");
  sb.className = "signal-banner " + signal;
  sb.innerHTML = signal === "buy"
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Strong Buy Signal — RSI ${st.rsi.toFixed(0)}, Momentum ${st.chgPct >= 0 ? "Positive" : "Weak"}`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Watch — Wait for better entry point`;

  // Key stats
  const setText = (id, val) => { const e=document.getElementById(id); if(e) e.textContent=val; };
  setText("s-price", fmtPrice(st.price));
  const sc = document.getElementById("s-chg");
  if(sc){sc.textContent=fmtChg(st.chgPct);sc.className="stat-box-val "+chgClass;}
  setText("s-high", fmtPrice(st.high52));
  setText("s-low", fmtPrice(st.low52));
  setText("s-mcap", st.mcap);
  setText("s-vol", st.volume.toFixed(1) + " L shares");
  setText("s-pe", st.pe);
  setText("s-eps", st.eps > 0 ? "₹"+st.eps : "Loss");
  const rsiEl=document.getElementById("s-rsi");
  if(rsiEl){rsiEl.textContent=st.rsi.toFixed(0);rsiEl.className="stat-box-val "+(st.rsi<35?"up":st.rsi>65?"down":"");}
  setText("s-beta", st.beta.toFixed(1));
  setText("s-div", st.divYield);
  setText("s-bv", "₹"+st.bv);

  // Technicals
  const sma20 = st.price * (1 - (Math.random()-0.4)*0.03);
  const sma50 = st.price * (1 - (Math.random()-0.4)*0.06);
  const macdVal = (Math.random()-0.4)*2;
  const stoch = Math.random()*100;
  const adx = Math.random()*40+15;

  const setTech = (valId, sigId, val, sig) => {
    const ve=document.getElementById(valId); if(ve) ve.textContent=val;
    const se=document.getElementById(sigId); if(se){se.textContent=sig;se.className="tech-sig "+sig.toLowerCase();}
  };
  setTech("t-macd","t-macd-s", macdVal.toFixed(2), macdVal>0?"Buy":"Sell");
  setTech("t-sma20","t-sma20-s", fmtPrice(sma20), st.price>sma20?"Buy":"Sell");
  setTech("t-sma50","t-sma50-s", fmtPrice(sma50), st.price>sma50?"Buy":"Sell");
  setTech("t-boll","t-boll-s", st.price>st.basePrice*1.02?"Upper Band":"Lower Band", st.rsi<50?"Buy":"Neutral");
  setTech("t-stoch","t-stoch-s", stoch.toFixed(0), stoch<30?"Buy":stoch>70?"Sell":"Neutral");
  setTech("t-adx","t-adx-s", adx.toFixed(0), adx>25?"Buy":"Neutral");

  // Draw chart
  drawStockChart("1D");

  // Calculator
  document.getElementById("calc-amount").value = 1000;
  document.getElementById("calc-rate").value = 20;
  document.getElementById("rate-display").textContent = "20%";
  calcHorizon = 1;
  document.querySelectorAll(".calc-tab").forEach((b,i)=>b.classList.toggle("active",i===0));
  calcReturns();

  // Peers
  const peers = STOCKS.filter(s => s.sector === st.sector && s.symbol !== st.symbol).slice(0, 4);
  const pl = document.getElementById("peers-list");
  if(pl) pl.innerHTML = peers.map(p => {
    const ps = stockState[p.symbol];
    const pc = ps.chgPct >= 0 ? "up" : "down";
    return `<div class="peer-row">
      <div class="peer-left"><div class="peer-sym">${p.symbol}</div><div class="peer-name">${p.name}</div></div>
      <div class="peer-right"><div class="peer-price">${fmtPrice(ps.price)}</div><div class="peer-chg ${pc}">${fmtChg(ps.chgPct)}</div></div>
    </div>`;
  }).join("") || '<div style="color:var(--text-muted);font-size:13px;padding:12px">No peers in same sector</div>';

  // AI analysis
  fetchStockAI(st);

  // Show modal
  document.getElementById("modal-overlay").classList.add("open");
  document.getElementById("stock-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("stock-modal").classList.remove("open");
  document.body.style.overflow = "";
}

/* CHART */
function generateChartData(range, basePrice, volatility) {
  const points = { "1D":78, "1W":35, "1M":30, "3M":90, "1Y":250 }[range] || 78;
  const labels = [];
  const data = [];
  let price = basePrice * (1 - (Math.random()*0.05));
  const now = new Date();

  for (let i = points; i >= 0; i--) {
    const d = new Date(now);
    if (range === "1D") { d.setMinutes(d.getMinutes() - i*5); labels.push(d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})); }
    else if (range === "1W") { d.setHours(d.getHours() - i*4); labels.push(d.toLocaleDateString("en-IN",{weekday:"short",hour:"2-digit"})); }
    else { d.setDate(d.getDate() - i); labels.push(d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})); }
    const change = (Math.random()-0.47)*volatility*price*0.6;
    price = Math.max(basePrice*0.5, price+change);
    data.push(parseFloat(price.toFixed(2)));
  }
  // Make last point current price
  data[data.length-1] = parseFloat(currentStock.price.toFixed(2));
  return { labels, data };
}

function drawStockChart(range) {
  const canvas = document.getElementById("stock-chart");
  if (!canvas || !currentStock) return;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const { labels, data } = generateChartData(range, currentStock.basePrice, currentStock.volatility);
  const isUp = data[data.length-1] >= data[0];
  const color = isUp ? "#00b386" : "#e74c3c";
  const bgColor = isUp ? "rgba(0,179,134,0.08)" : "rgba(231,76,60,0.08)";

  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data,
        borderColor: color,
        borderWidth: 2,
        backgroundColor: bgColor,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend:{display:false}, tooltip:{
        mode:"index", intersect:false,
        callbacks:{ label: ctx => "₹" + ctx.parsed.y.toFixed(2) }
      }},
      scales: {
        x: { grid:{display:false}, ticks:{maxTicksLimit:6, font:{size:10}, color:"#9ca3af"} },
        y: { grid:{color:"rgba(0,0,0,0.04)"}, ticks:{font:{size:10}, color:"#9ca3af", callback: v=>"₹"+v.toFixed(0)} }
      },
      interaction:{ mode:"nearest", axis:"x", intersect:false }
    }
  });
}

function setChartRange(range, btn) {
  document.querySelectorAll(".chart-tab").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  drawStockChart(range);
}

/* INVESTMENT CALCULATOR */
function setCalcAmount(val) {
  document.getElementById("calc-amount").value = val;
  calcReturns();
}

function setHorizon(years, btn) {
  calcHorizon = years;
  document.querySelectorAll(".calc-tab").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  calcReturns();
}

function calcReturns() {
  if (!currentStock) return;
  const amount = parseFloat(document.getElementById("calc-amount").value) || 0;
  const rate = parseFloat(document.getElementById("calc-rate").value) / 100;
  const years = calcHorizon;
  const price = currentStock.price;

  const shares = amount / price;
  const totalValue = amount * Math.pow(1 + rate, years);
  const profit = totalValue - amount;
  const returnPct = ((totalValue - amount) / amount) * 100;

  const setText = (id, val) => { const e=document.getElementById(id); if(e) e.textContent=val; };
  setText("cr-shares", shares.toFixed(4) + " shares");
  setText("cr-total", fmtINR(totalValue));
  setText("cr-profit", "+" + fmtINR(profit));
  setText("cr-return", "+" + returnPct.toFixed(1) + "%");

  drawReturnChart(amount, rate, years);
}

function drawReturnChart(amount, rate, years) {
  const canvas = document.getElementById("return-chart");
  if (!canvas) return;
  if (returnChartInstance) { returnChartInstance.destroy(); returnChartInstance = null; }

  const labels = [];
  const invested = [];
  const returns = [];
  const steps = Math.min(years * 4, 40);

  for (let i = 0; i <= steps; i++) {
    const y = (years / steps) * i;
    labels.push(y.toFixed(1) + "Y");
    invested.push(parseFloat(amount.toFixed(2)));
    returns.push(parseFloat((amount * Math.pow(1 + rate, y)).toFixed(2)));
  }

  returnChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label:"Invested", data:invested, borderColor:"#9ca3af", borderWidth:1.5, borderDash:[4,4], fill:false, tension:0, pointRadius:0 },
        { label:"Value", data:returns, borderColor:"#00b386", borderWidth:2, backgroundColor:"rgba(0,179,134,0.1)", fill:true, tension:0.3, pointRadius:0 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=>"₹"+ctx.parsed.y.toLocaleString("en-IN",{maximumFractionDigits:0})}}},
      scales:{
        x:{grid:{display:false},ticks:{maxTicksLimit:6,font:{size:10},color:"#9ca3af"}},
        y:{grid:{color:"rgba(0,0,0,0.04)"},ticks:{font:{size:10},color:"#9ca3af",callback:v=>"₹"+Math.round(v).toLocaleString("en-IN")}}
      }
    }
  });
}

/* AI */
async function fetchAICommentary(picks) {
  const top5 = picks.slice(0,5).map(p=>`${p.symbol} (${p.name}, ${fmtPrice(p.price)}, ${fmtChg(p.chgPct)}, ${p.sector}, RSI ${p.rsi.toFixed(0)})`).join("; ");
  const prompt = `You are a sharp Indian stock market analyst for Groww retail investors. Top 5 AI picks: ${top5}. Write 2-3 sentences of crisp market commentary. Mention Indian themes: govt capex, PSU momentum, renewables, EV policy, or FII/DII flows. Present tense. Don't repeat prices.`;
  const el = document.getElementById("ai-commentary");
  const te = document.getElementById("ai-time");
  if(el) el.textContent = "Analysing with Claude AI...";
  try {
    const res = await fetch("/api/ai", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt}) });
    const data = await res.json();
    if(el) el.textContent = data.text || "Analysis unavailable.";
    if(te) te.textContent = new Date().toLocaleTimeString("en-IN");
  } catch(e) {
    if(el) el.textContent = "AI commentary unavailable. Picks based on RSI, momentum, price entry, and sector strength.";
    if(te) te.textContent = new Date().toLocaleTimeString("en-IN");
  }
}

async function fetchStockAI(st) {
  const el = document.getElementById("stock-ai-text");
  if(el) el.textContent = "Analysing " + st.symbol + " with Claude AI...";
  const prompt = `You are an expert Indian stock analyst. Give a focused 3-4 sentence analysis of ${st.symbol} (${st.name}) on ${st.exchange}. Current price: ₹${st.price.toFixed(2)}, RSI: ${st.rsi.toFixed(0)}, sector: ${st.sector}, 52W high: ₹${st.high52.toFixed(2)}, 52W low: ₹${st.low52.toFixed(2)}, P/E: ${st.pe}. Cover: current momentum, key risk, and whether this is a good entry point for a retail investor on Groww. Be direct and specific.`;
  try {
    const res = await fetch("/api/ai", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt}) });
    const data = await res.json();
    if(el) el.textContent = data.text || "Analysis unavailable.";
  } catch(e) {
    if(el) el.textContent = `${st.symbol} is trading at ${fmtPrice(st.price)} with RSI at ${st.rsi.toFixed(0)}. ${st.rsi < 40 ? "The stock appears oversold and may present a buying opportunity." : "The stock is showing steady momentum in the " + st.sector + " sector."} Always verify fundamentals before investing.`;
  }
}

/* MAIN SCAN */
function runScan(skipAI=false) {
  if(isLoading) return;
  isLoading = true;
  const btn = document.getElementById("refresh-btn");
  if(btn) btn.disabled = true;
  simulatePriceUpdate();
  renderTicker();
  const picks = scoreStocks();
  renderMetrics(picks);
  renderPicks(picks);
  if(!skipAI) fetchAICommentary(picks);
  if(btn) btn.disabled = false;
  countdown = 30;
  isLoading = false;
}

function triggerRefresh() {
  clearInterval(intervalId);
  runScan(false);
  startIntervals();
}

function startIntervals() {
  clearInterval(intervalId); clearInterval(countdownId);
  intervalId = setInterval(()=>runScan(false), 30000);
  countdownId = setInterval(()=>{
    countdown = Math.max(0, countdown-1);
    if(countdown===0) countdown=30;
    const e=document.getElementById("countdown"); if(e) e.textContent=countdown+"s";
  }, 1000);
}

runScan(false);
startIntervals();
setInterval(()=>{ simulatePriceUpdate(); renderTicker(); }, 1500);
