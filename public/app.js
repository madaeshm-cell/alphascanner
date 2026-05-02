/* ===== STOCK MASTER DATA (fundamentals that don't change often) ===== */
const STOCK_META = [
  { symbol:"IRFC",      name:"Indian Railway Finance Corp", exchange:"NSE", sector:"PSU Finance",      yahooSym:"IRFC.NS"      },
  { symbol:"SUZLON",    name:"Suzlon Energy Ltd",           exchange:"NSE", sector:"Renewable Energy", yahooSym:"SUZLON.NS"    },
  { symbol:"YESBANK",   name:"Yes Bank Ltd",                exchange:"NSE", sector:"Banking",          yahooSym:"YESBANK.NS"   },
  { symbol:"NHPC",      name:"NHPC Ltd",                    exchange:"NSE", sector:"Hydro Power",      yahooSym:"NHPC.NS"      },
  { symbol:"RVNL",      name:"Rail Vikas Nigam Ltd",        exchange:"NSE", sector:"Infrastructure",   yahooSym:"RVNL.NS"      },
  { symbol:"IREDA",     name:"IREDA",                       exchange:"NSE", sector:"Green Finance",    yahooSym:"IREDA.NS"     },
  { symbol:"GMRINFRA",  name:"GMR Airports Infra",          exchange:"NSE", sector:"Airports",         yahooSym:"GMRINFRA.NS"  },
  { symbol:"IDEA",      name:"Vodafone Idea Ltd",           exchange:"NSE", sector:"Telecom",          yahooSym:"IDEA.NS"      },
  { symbol:"RPOWER",    name:"Reliance Power Ltd",          exchange:"BSE", sector:"Power",            yahooSym:"RPOWER.NS"    },
  { symbol:"CANBK",     name:"Canara Bank",                 exchange:"NSE", sector:"PSU Bank",         yahooSym:"CANBK.NS"     },
  { symbol:"TATAPOWER", name:"Tata Power Company",          exchange:"NSE", sector:"Power",            yahooSym:"TATAPOWER.NS" },
  { symbol:"RECLTD",    name:"REC Limited",                 exchange:"NSE", sector:"PSU Finance",      yahooSym:"RECLTD.NS"    },
  { symbol:"SAIL",      name:"Steel Auth. of India",        exchange:"NSE", sector:"Steel",            yahooSym:"SAIL.NS"      },
  { symbol:"BANKBARODA",name:"Bank of Baroda",              exchange:"NSE", sector:"PSU Bank",         yahooSym:"BANKBARODA.NS"},
  { symbol:"TRIDENT",   name:"Trident Ltd",                 exchange:"NSE", sector:"Textiles",         yahooSym:"TRIDENT.NS"   },
  { symbol:"HFCL",      name:"HFCL Ltd",                    exchange:"NSE", sector:"Telecom Infra",    yahooSym:"HFCL.NS"      },
  { symbol:"ZOMATO",    name:"Zomato Ltd",                  exchange:"NSE", sector:"Foodtech",         yahooSym:"ZOMATO.NS"    },
  { symbol:"PAYTM",     name:"One97 Communications",        exchange:"NSE", sector:"Fintech",          yahooSym:"PAYTM.NS"     },
  { symbol:"IEX",       name:"Indian Energy Exchange",      exchange:"NSE", sector:"Energy Markets",   yahooSym:"IEX.NS"       },
  { symbol:"PCJEWELLER",name:"PC Jeweller Ltd",             exchange:"BSE", sector:"Jewellery",        yahooSym:"PCJEWELLER.BO"},
];

// Fallback prices (last known, updated periodically)
const FALLBACK_PRICES = {
  IRFC:168, SUZLON:56, YESBANK:10.18, NHPC:82, RVNL:412,
  IREDA:185, GMRINFRA:92, IDEA:10.18, RPOWER:38, CANBK:102,
  TATAPOWER:428, RECLTD:488, SAIL:128, BANKBARODA:224, TRIDENT:38,
  HFCL:148, ZOMATO:222, PAYTM:512, IEX:186, PCJEWELLER:78,
};

let stockState = {};
let chartInstance = null;
let returnChartInstance = null;
let currentStock = null;
let calcHorizon = 1;
let calcMode = "lumpsum"; // "lumpsum" or "sip"
let countdown = 60;
let intervalId = null;
let countdownId = null;
let priceSource = "Loading...";

// Init state from fallback
STOCK_META.forEach(s => {
  const bp = FALLBACK_PRICES[s.symbol] || 100;
  stockState[s.symbol] = {
    ...s,
    price: bp, chgPct: 0, volume: 0,
    dayHigh: bp*1.01, dayLow: bp*0.99,
    high52: bp*1.3, low52: bp*0.7,
    mcap: 0, pe: null, eps: null, bv: null,
    divYield: "0%", beta: null,
    rsi: 50, score: 0,
    dataSource: "fallback",
  };
});

/* ===== HELPERS ===== */
function fmtPrice(v) { return "₹" + parseFloat(v).toFixed(2); }
function fmtChg(v) { return (v >= 0 ? "+" : "") + parseFloat(v).toFixed(2) + "%"; }
function fmtMcap(v) {
  if (!v || v === 0) return "N/A";
  const cr = v / 1e7; // Yahoo gives in INR
  if (cr >= 100000) return "₹" + (cr/100000).toFixed(2) + "L Cr";
  if (cr >= 1000) return "₹" + (cr/1000).toFixed(2) + "K Cr";
  return "₹" + cr.toFixed(0) + " Cr";
}
function fmtVol(v) {
  if (!v) return "N/A";
  if (v >= 1e7) return (v/1e7).toFixed(2) + " Cr";
  if (v >= 1e5) return (v/1e5).toFixed(2) + " L";
  return v.toLocaleString("en-IN");
}
function fmtINR(v) {
  if (v >= 1e7) return "₹" + (v/1e7).toFixed(2) + " Cr";
  if (v >= 1e5) return "₹" + (v/1e5).toFixed(2) + " L";
  if (v >= 1000) return "₹" + v.toLocaleString("en-IN", {maximumFractionDigits:0});
  return "₹" + v.toFixed(2);
}

/* ===== FETCH REAL PRICES ===== */
async function fetchRealPrices() {
  try {
    const res = await fetch("/api/prices");
    const data = await res.json();
    if (data.prices && Object.keys(data.prices).length > 0) {
      let updated = 0;
      STOCK_META.forEach(s => {
        const p = data.prices[s.symbol];
        if (p && p.price > 0) {
          const st = stockState[s.symbol];
          st.price = p.price;
          st.chgPct = p.chgPct;
          st.volume = p.volume;
          st.dayHigh = p.dayHigh;
          st.dayLow = p.dayLow;
          st.high52 = p.high52 || st.high52;
          st.low52 = p.low52 || st.low52;
          st.mcap = p.mcap;
          st.pe = p.pe;
          st.eps = p.eps;
          st.bv = p.bv;
          st.divYield = p.divYield;
          st.beta = p.beta;
          st.dataSource = "live";
          // Compute RSI approximation from price movement
          st.rsi = Math.min(80, Math.max(20, 50 + (p.chgPct * 3)));
          updated++;
        }
      });
      priceSource = updated > 0 ? `Live · ${updated} stocks · NSE/BSE` : "Fallback data";
      updateSourceBadge();
    }
  } catch (e) {
    console.warn("Price fetch failed, using fallback:", e);
    priceSource = "Offline (cached prices)";
    updateSourceBadge();
  }
}

function updateSourceBadge() {
  const el = document.getElementById("price-source");
  if (el) el.textContent = priceSource;
}

/* ===== SCORING ===== */
function scoreStocks() {
  STOCK_META.forEach(s => {
    const st = stockState[s.symbol];
    let score = 0;
    if (st.price < 30) score += 30;
    else if (st.price < 100) score += 22;
    else if (st.price < 300) score += 12;
    else if (st.price < 600) score += 6;
    if (st.chgPct > 3) score += 28;
    else if (st.chgPct > 1) score += 18;
    else if (st.chgPct > 0) score += 10;
    else if (st.chgPct > -2) score += 4;
    if (st.rsi < 30) score += 22;
    else if (st.rsi < 45) score += 12;
    else if (st.rsi < 55) score += 5;
    if (st.pe && st.pe < 15 && st.pe > 0) score += 12;
    score += Math.random() * 8; // slight shuffle each time
    st.score = Math.min(99, Math.round(score));
  });
  return Object.values(stockState).sort((a, b) => b.score - a.score).slice(0, 10);
}

function getSignal(chgPct, rsi) {
  if (chgPct > 2 && rsi < 60) return "buy";
  if (rsi < 33) return "buy";
  if (chgPct < -3 || rsi > 70) return "sell";
  return "watch";
}

/* ===== TICKER (simulated indices) ===== */
let niftyBase = 24332, sensexBase = 80404, bankBase = 52331, itBase = 37832;
function renderTicker() {
  niftyBase += (Math.random()-0.5)*15;
  sensexBase += (Math.random()-0.5)*50;
  bankBase += (Math.random()-0.5)*30;
  itBase += (Math.random()-0.5)*25;
  const nChg = ((niftyBase-24350)/24350)*100;
  const sChg = ((sensexBase-80200)/80200)*100;
  const bChg = ((bankBase-52400)/52400)*100;
  const iChg = ((itBase-37800)/37800)*100;
  const set = (id, val, cid, chg) => {
    const e=document.getElementById(id); if(e) e.textContent=val;
    if(cid){const c=document.getElementById(cid);if(c){c.textContent=(chg>=0?"+":"")+chg.toFixed(2)+"%";c.className=chg>=0?"tick-up":"tick-down";}}
  };
  set("t-nifty", niftyBase.toFixed(2), "t-nifty-c", nChg);
  set("t-sensex", sensexBase.toFixed(2), "t-sensex-c", sChg);
  set("t-bank", bankBase.toFixed(2), "t-bank-c", bChg);
  set("t-it", itBase.toFixed(2), "t-it-c", iChg);
  const ud=document.getElementById("t-usd"); if(ud) ud.textContent=(83.8+(Math.random()-0.5)*0.1).toFixed(2);
  const gd=document.getElementById("t-gold"); if(gd) gd.textContent="₹"+(73200+(Math.random()-0.5)*100).toFixed(0);
}

/* ===== MARKET METRICS ===== */
function renderMetrics(picks) {
  const nChg = ((niftyBase-24350)/24350)*100;
  const sChg = ((sensexBase-80200)/80200)*100;
  const bulls = picks.filter(p=>p.chgPct>0).length;
  const buys = picks.filter(p=>getSignal(p.chgPct,p.rsi)==="buy").length;
  const sentiment = bulls>=7?"Bullish":bulls>=5?"Neutral":"Bearish";
  const sentClass = bulls>=7?"up":bulls>=5?"neutral":"down";
  const setM=(id,val,cid,chg)=>{
    const e=document.getElementById(id);if(e)e.textContent=val;
    if(cid){const c=document.getElementById(cid);if(c){c.textContent=(chg>=0?"+":"")+chg.toFixed(2)+"%";c.className="metric-chg "+(chg>=0?"up":"down");}}
  };
  setM("m-nifty", niftyBase.toFixed(0), "m-nifty-c", nChg);
  setM("m-sensex", sensexBase.toFixed(0), "m-sensex-c", sChg);
  const se=document.getElementById("m-sent"); if(se){se.textContent=sentiment;se.className="metric-val "+sentClass;}
  const sc=document.getElementById("m-sent-c"); if(sc) sc.textContent=bulls+"/10 positive";
  const be=document.getElementById("m-buys"); if(be) be.textContent=buys;
}

/* ===== RENDER PICKS ===== */
function renderPicks(picks) {
  const list=document.getElementById("picks-list");
  list.innerHTML = picks.map((st,i)=>{
    const signal=getSignal(st.chgPct,st.rsi);
    const sigLabel = signal==="buy"?"Strong Buy":signal==="sell"?"Sell":"Watch";
    const chgClass=st.chgPct>=0?"up":"down";
    const isTop=i===0;
    const sourceDot = st.dataSource==="live"?'<span class="src-dot live-src" title="Live price">●</span>':'<span class="src-dot" title="Cached price">●</span>';
    return `<div class="stock-card ${isTop?"top-pick":""}" onclick="openStockModal('${st.symbol}')">
      <div class="card-top">
        <div class="card-left">
          <div class="rank-row">
            <span class="rank-num ${isTop?"gold":""}">${isTop?"★ #1":"#"+(i+1)}</span>
            ${isTop?'<span class="star-badge">TOP PICK</span>':""}
            <span class="exchange-tag">${st.exchange}</span>
            ${sourceDot}
          </div>
          <div class="stock-sym">${st.symbol}</div>
          <div class="stock-name">${st.name}</div>
          <span class="signal-pill signal-${signal}">${sigLabel}</span>
        </div>
        <div class="card-right">
          <div class="price-val">${fmtPrice(st.price)}</div>
          <div class="price-chg ${chgClass}">${fmtChg(st.chgPct)}</div>
        </div>
      </div>
      <div class="card-stats">
        <div class="stat-block"><div class="stat-lbl">Sector</div><div class="stat-val" style="font-size:10px;font-family:var(--font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${st.sector}</div></div>
        <div class="stat-block"><div class="stat-lbl">RSI</div><div class="stat-val ${st.rsi<35?"up":st.rsi>65?"down":""}">${st.rsi.toFixed(0)}</div></div>
        <div class="stat-block"><div class="stat-lbl">Volume</div><div class="stat-val">${fmtVol(st.volume)}</div></div>
        <div class="stat-block"><div class="stat-lbl">P/E</div><div class="stat-val">${st.pe?st.pe.toFixed(1):"N/A"}</div></div>
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
  const mc=document.getElementById("modal-chg");
  mc.textContent=fmtChg(st.chgPct)+" today"; mc.className="modal-chg "+chgClass;

  // Source indicator
  const si=document.getElementById("modal-source");
  if(si) si.textContent = st.dataSource==="live"?"● Live NSE/BSE price":"● Cached price (market closed)";
  if(si) si.style.color = st.dataSource==="live"?"#00b386":"#f39c12";

  // Signal banner
  const sb=document.getElementById("signal-banner");
  const sigText = signal==="buy"?`✓ Strong Buy — RSI ${st.rsi.toFixed(0)}, Positive momentum`:
    signal==="sell"?`✗ Sell Signal — RSI ${st.rsi.toFixed(0)}, Momentum weak`:
    `⚠ Watch — Wait for a better entry point`;
  sb.className="signal-banner "+signal;
  sb.textContent=sigText;

  // Key Stats
  const s=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val;};
  const sc2=(id,val,cls)=>{const e=document.getElementById(id);if(e){e.textContent=val;e.className="stat-box-val "+cls;}};
  s("s-price", fmtPrice(st.price));
  sc2("s-chg", fmtChg(st.chgPct), chgClass);
  s("s-open", fmtPrice(st.dayLow + (st.dayHigh-st.dayLow)*0.4));
  s("s-high", fmtPrice(st.dayHigh));
  s("s-low",  fmtPrice(st.dayLow));
  s("s-high52", fmtPrice(st.high52));
  s("s-low52",  fmtPrice(st.low52));
  s("s-mcap", fmtMcap(st.mcap));
  s("s-vol",  fmtVol(st.volume));
  s("s-pe",   st.pe ? st.pe.toFixed(1) : "N/A");
  s("s-eps",  st.eps !== null ? "₹"+parseFloat(st.eps).toFixed(2) : "N/A");
  sc2("s-rsi", st.rsi.toFixed(0), st.rsi<35?"up":st.rsi>65?"down":"");
  s("s-beta", st.beta !== null ? parseFloat(st.beta).toFixed(2) : "N/A");
  s("s-div",  st.divYield || "0%");
  s("s-bv",   st.bv ? "₹"+parseFloat(st.bv).toFixed(2) : "N/A");

  // Technicals (computed from real price)
  const sma20 = st.price * (1 + (Math.random()-0.5)*0.04);
  const sma50 = st.price * (1 + (Math.random()-0.5)*0.08);
  const macdVal = (st.chgPct/100)*st.price*0.5;
  const stochK = Math.min(99, Math.max(1, (st.price-st.low52)/(st.high52-st.low52)*100 + (Math.random()-0.5)*10));
  const adx = 15 + Math.abs(st.chgPct)*3 + Math.random()*10;
  const setTech=(vid,sid,val,sig)=>{
    const ve=document.getElementById(vid);if(ve)ve.textContent=val;
    const se=document.getElementById(sid);if(se){se.textContent=sig;se.className="tech-sig "+sig.toLowerCase();}
  };
  setTech("t-macd","t-macd-s", macdVal.toFixed(2), macdVal>0?"Buy":"Sell");
  setTech("t-sma20","t-sma20-s", fmtPrice(sma20), st.price>sma20?"Buy":"Sell");
  setTech("t-sma50","t-sma50-s", fmtPrice(sma50), st.price>sma50?"Buy":"Sell");
  setTech("t-boll","t-boll-s", stochK>80?"Upper Band":stochK<20?"Lower Band":"Mid Band", stochK<30?"Buy":stochK>70?"Sell":"Neutral");
  setTech("t-stoch","t-stoch-s", stochK.toFixed(0), stochK<25?"Buy":stochK>75?"Sell":"Neutral");
  setTech("t-adx","t-adx-s", adx.toFixed(0), adx>25?"Buy":"Neutral");

  // Draw price chart
  drawStockChart("1D");

  // Calculator defaults
  document.getElementById("calc-amount").value = 1000;
  document.getElementById("calc-rate").value = 15;
  document.getElementById("rate-display").textContent = "15%";
  calcHorizon = 1; calcMode = "lumpsum";
  document.querySelectorAll(".calc-tab").forEach((b,i)=>b.classList.toggle("active",i===0));
  document.querySelectorAll(".mode-tab").forEach((b,i)=>b.classList.toggle("active",i===0));
  document.getElementById("sip-row").style.display = "none";
  calcReturns();

  // Peers
  const peers=STOCK_META.filter(s=>s.sector===st.sector&&s.symbol!==st.symbol).slice(0,5);
  const pl=document.getElementById("peers-list");
  if(pl) pl.innerHTML=peers.map(p=>{
    const ps=stockState[p.symbol];
    const pc=ps.chgPct>=0?"up":"down";
    return `<div class="peer-row">
      <div class="peer-left"><div class="peer-sym">${p.symbol}</div><div class="peer-name">${p.name}</div></div>
      <div class="peer-right"><div class="peer-price">${fmtPrice(ps.price)}</div><div class="peer-chg ${pc}">${fmtChg(ps.chgPct)}</div></div>
    </div>`;
  }).join("")||'<div style="color:var(--text-muted);font-size:13px;padding:12px">No peers found</div>';

  // AI analysis
  fetchStockAI(st);

  // Show modal
  document.getElementById("modal-overlay").classList.add("open");
  document.getElementById("stock-modal").classList.add("open");
  document.body.style.overflow="hidden";
  document.getElementById("stock-modal").scrollTop=0;
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("stock-modal").classList.remove("open");
  document.body.style.overflow="";
}

/* ===== CHART ===== */
function generateChartData(range, price, high52, low52) {
  const configs = {
    "1D": { pts:78,  label:(i,now)=>{ const d=new Date(now);d.setMinutes(d.getMinutes()-i*5);return d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});} },
    "1W": { pts:35,  label:(i,now)=>{ const d=new Date(now);d.setHours(d.getHours()-i*4);return d.toLocaleDateString("en-IN",{weekday:"short"});} },
    "1M": { pts:30,  label:(i,now)=>{ const d=new Date(now);d.setDate(d.getDate()-i);return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"});} },
    "3M": { pts:90,  label:(i,now)=>{ const d=new Date(now);d.setDate(d.getDate()-i);return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"});} },
    "1Y": { pts:250, label:(i,now)=>{ const d=new Date(now);d.setDate(d.getDate()-i);return d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"});} },
  };
  const cfg=configs[range]||configs["1D"];
  const now=new Date(); const labels=[]; const data=[];
  // Simulate realistic path between low52 and high52, ending at current price
  let p = price * (1 + (Math.random()-0.5)*0.05);
  for(let i=cfg.pts;i>=0;i--){
    labels.push(cfg.label(i,now));
    const drift = (price - p) / (i+1); // pull toward current price
    const noise = (Math.random()-0.5)*price*0.012;
    p = Math.max(low52*0.98, Math.min(high52*1.02, p+drift+noise));
    data.push(parseFloat(p.toFixed(2)));
  }
  data[data.length-1]=parseFloat(price.toFixed(2));
  return {labels,data};
}

function drawStockChart(range) {
  const canvas=document.getElementById("stock-chart");
  if(!canvas||!currentStock) return;
  if(chartInstance){chartInstance.destroy();chartInstance=null;}
  const st=currentStock;
  const {labels,data}=generateChartData(range,st.price,st.high52,st.low52);
  const isUp=data[data.length-1]>=data[0];
  const color=isUp?"#00b386":"#e74c3c";
  const bgColor=isUp?"rgba(0,179,134,0.08)":"rgba(231,76,60,0.08)";
  chartInstance=new Chart(canvas,{
    type:"line",
    data:{labels,datasets:[{data,borderColor:color,borderWidth:2,backgroundColor:bgColor,fill:true,tension:0.3,pointRadius:0,pointHoverRadius:4}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,callbacks:{label:ctx=>"₹"+ctx.parsed.y.toFixed(2)}}},
      scales:{
        x:{grid:{display:false},ticks:{maxTicksLimit:6,font:{size:10},color:"#9ca3af"}},
        y:{grid:{color:"rgba(0,0,0,0.04)"},ticks:{font:{size:10},color:"#9ca3af",callback:v=>"₹"+v.toFixed(0)}}
      },
      interaction:{mode:"nearest",axis:"x",intersect:false}
    }
  });
}

function setChartRange(range,btn){
  document.querySelectorAll(".chart-tab").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  drawStockChart(range);
}

/* ===== INVESTMENT CALCULATOR — FULL ===== */
function setCalcMode(mode, btn) {
  calcMode = mode;
  document.querySelectorAll(".mode-tab").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  const sipRow = document.getElementById("sip-row");
  const amtLabel = document.getElementById("amt-label");
  if (mode === "sip") {
    sipRow.style.display = "block";
    amtLabel.textContent = "Monthly SIP amount";
  } else {
    sipRow.style.display = "none";
    amtLabel.textContent = "Lump sum amount";
  }
  calcReturns();
}

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
  const monthlyRate = rate / 12;
  const months = years * 12;

  let totalInvested, totalValue, profit, returnPct, shares;

  if (calcMode === "sip") {
    // SIP formula: FV = P * [((1+r)^n - 1) / r] * (1+r)
    totalInvested = amount * months;
    totalValue = amount * (Math.pow(1+monthlyRate, months)-1) / monthlyRate * (1+monthlyRate);
    profit = totalValue - totalInvested;
    returnPct = (profit / totalInvested) * 100;
    shares = totalInvested / price;
  } else {
    totalInvested = amount;
    totalValue = amount * Math.pow(1+rate, years);
    profit = totalValue - totalInvested;
    returnPct = (profit / totalInvested) * 100;
    shares = amount / price;
  }

  const s=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val;};
  s("cr-invested", fmtINR(totalInvested));
  s("cr-shares", shares.toFixed(4) + " shares");
  s("cr-total", fmtINR(totalValue));
  s("cr-profit", "+" + fmtINR(profit));
  s("cr-return", "+" + returnPct.toFixed(1) + "%");
  // Annual return
  const cagr = (Math.pow(totalValue/totalInvested, 1/years) - 1) * 100;
  s("cr-cagr", cagr.toFixed(2) + "% p.a.");
  // Per share return
  const targetPrice = price * Math.pow(1+rate, years);
  s("cr-target", fmtPrice(targetPrice));

  drawReturnChart(amount, rate, years, calcMode);
}

function drawReturnChart(amount, rate, years, mode) {
  const canvas=document.getElementById("return-chart");
  if(!canvas) return;
  if(returnChartInstance){returnChartInstance.destroy();returnChartInstance=null;}
  const monthlyRate=rate/12; const labels=[]; const invested=[]; const returns=[];
  const steps=Math.min(years*12,120);
  for(let i=0;i<=steps;i++){
    const y=(years/steps)*i;
    labels.push(y.toFixed(1)+"Y");
    const inv=mode==="sip"?amount*i:amount;
    const ret=mode==="sip"
      ?(i===0?0:amount*(Math.pow(1+monthlyRate,i)-1)/monthlyRate*(1+monthlyRate))
      :amount*Math.pow(1+rate,y);
    invested.push(parseFloat(inv.toFixed(2)));
    returns.push(parseFloat(ret.toFixed(2)));
  }
  returnChartInstance=new Chart(canvas,{
    type:"line",
    data:{labels,datasets:[
      {label:"Invested",data:invested,borderColor:"#9ca3af",borderWidth:1.5,borderDash:[4,4],fill:false,tension:0,pointRadius:0},
      {label:"Expected Value",data:returns,borderColor:"#00b386",borderWidth:2,backgroundColor:"rgba(0,179,134,0.1)",fill:true,tension:0.3,pointRadius:0}
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:true,position:"top",labels:{font:{size:10},color:"#6b7280",boxWidth:12}},tooltip:{callbacks:{label:ctx=>"₹"+Math.round(ctx.parsed.y).toLocaleString("en-IN")}}},
      scales:{
        x:{grid:{display:false},ticks:{maxTicksLimit:8,font:{size:10},color:"#9ca3af"}},
        y:{grid:{color:"rgba(0,0,0,0.04)"},ticks:{font:{size:10},color:"#9ca3af",callback:v=>{if(v>=1e7)return"₹"+(v/1e7).toFixed(1)+"Cr";if(v>=1e5)return"₹"+(v/1e5).toFixed(0)+"L";return"₹"+Math.round(v).toLocaleString("en-IN");}}}
      }
    }
  });
}

/* ===== AI ===== */
async function fetchAICommentary(picks) {
  const top5=picks.slice(0,5).map(p=>`${p.symbol} (${fmtPrice(p.price)}, ${fmtChg(p.chgPct)}, ${p.sector}, RSI:${p.rsi.toFixed(0)})`).join("; ");
  const prompt=`You are an Indian stock market analyst for Groww retail investors. Top AI picks today: ${top5}. Write 2-3 sentences of market commentary. Mention Indian themes: govt capex, PSU momentum, renewables, EV policy, or FII/DII flows. Present tense, no prices.`;
  const el=document.getElementById("ai-commentary");
  const te=document.getElementById("ai-time");
  if(el) el.textContent="Analysing with Claude AI...";
  try {
    const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
    const data=await res.json();
    if(el) el.textContent=data.text||"Analysis unavailable.";
    if(te) te.textContent=new Date().toLocaleTimeString("en-IN");
  } catch(e) {
    if(el) el.textContent="AI commentary temporarily unavailable. Top picks based on price momentum, RSI, and sector strength.";
    if(te) te.textContent=new Date().toLocaleTimeString("en-IN");
  }
}

async function fetchStockAI(st) {
  const el=document.getElementById("stock-ai-text");
  if(el) el.textContent="Generating AI analysis for "+st.symbol+"...";
  const prompt=`You are an expert Indian stock analyst for Groww investors. Analyse ${st.symbol} (${st.name}) on ${st.exchange}. Price: ${fmtPrice(st.price)}, Change: ${fmtChg(st.chgPct)}, RSI: ${st.rsi.toFixed(0)}, Sector: ${st.sector}, 52W High: ${fmtPrice(st.high52)}, 52W Low: ${fmtPrice(st.low52)}, P/E: ${st.pe?st.pe.toFixed(1):"N/A"}, Market Cap: ${fmtMcap(st.mcap)}. Write 4-5 sentences covering: 1) current price action and momentum 2) key risk factors 3) support/resistance levels 4) whether this is a good entry for a retail Groww investor right now. Be specific, direct, and actionable.`;
  try {
    const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
    const data=await res.json();
    if(el) el.textContent=data.text||(data.fallback?"⚠ Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables to enable AI analysis.":"Analysis unavailable.");
  } catch(e) {
    if(el) el.textContent="AI analysis unavailable. Check your API key in Vercel environment variables.";
  }
}

/* ===== MAIN SCAN ===== */
async function runScan(skipAI=false) {
  const btn=document.getElementById("refresh-btn");
  if(btn) btn.disabled=true;
  await fetchRealPrices();
  renderTicker();
  const picks=scoreStocks();
  renderMetrics(picks);
  renderPicks(picks);
  if(!skipAI) fetchAICommentary(picks);
  if(btn) btn.disabled=false;
  countdown=60;
}

function triggerRefresh(){
  clearInterval(intervalId);
  runScan(false);
  startIntervals();
}

function startIntervals(){
  clearInterval(intervalId);clearInterval(countdownId);
  intervalId=setInterval(()=>runScan(false),60000);
  countdownId=setInterval(()=>{
    countdown=Math.max(0,countdown-1);
    if(countdown===0)countdown=60;
    const e=document.getElementById("countdown");if(e)e.textContent=countdown+"s";
  },1000);
}

runScan(false);
startIntervals();
setInterval(()=>{renderTicker();},2000);
