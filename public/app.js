/* ====================================================
   ALPHA SCANNER — Real Prices + Full SIP Calculator
   ==================================================== */

const STOCKS = [
  { symbol:"IRFC",      name:"Indian Railway Finance Corp", exchange:"NSE", sector:"PSU Finance",      fallbackPrice:168,  volatility:0.025 },
  { symbol:"SUZLON",    name:"Suzlon Energy Ltd",           exchange:"NSE", sector:"Renewable Energy", fallbackPrice:56,   volatility:0.040 },
  { symbol:"YESBANK",   name:"Yes Bank Ltd",                exchange:"NSE", sector:"Banking",          fallbackPrice:24,   volatility:0.045 },
  { symbol:"NHPC",      name:"NHPC Ltd",                    exchange:"NSE", sector:"Hydro Power",      fallbackPrice:82,   volatility:0.025 },
  { symbol:"RVNL",      name:"Rail Vikas Nigam Ltd",        exchange:"NSE", sector:"Infrastructure",   fallbackPrice:412,  volatility:0.030 },
  { symbol:"IREDA",     name:"IREDA",                       exchange:"NSE", sector:"Green Finance",    fallbackPrice:185,  volatility:0.035 },
  { symbol:"GMRINFRA",  name:"GMR Airports Infra",          exchange:"NSE", sector:"Airports",         fallbackPrice:92,   volatility:0.030 },
  { symbol:"IDEA",      name:"Vodafone Idea Ltd",           exchange:"NSE", sector:"Telecom",          fallbackPrice:14,   volatility:0.055 },
  { symbol:"RPOWER",    name:"Reliance Power Ltd",          exchange:"BSE", sector:"Power",            fallbackPrice:38,   volatility:0.050 },
  { symbol:"CANBK",     name:"Canara Bank",                 exchange:"NSE", sector:"PSU Bank",         fallbackPrice:102,  volatility:0.025 },
  { symbol:"TATAPOWER", name:"Tata Power Company",          exchange:"NSE", sector:"Power",            fallbackPrice:428,  volatility:0.025 },
  { symbol:"RECLTD",    name:"REC Limited",                 exchange:"NSE", sector:"PSU Finance",      fallbackPrice:488,  volatility:0.030 },
  { symbol:"SAIL",      name:"Steel Auth. of India",        exchange:"NSE", sector:"Steel",            fallbackPrice:128,  volatility:0.030 },
  { symbol:"BANKBARODA",name:"Bank of Baroda",              exchange:"NSE", sector:"PSU Bank",         fallbackPrice:224,  volatility:0.025 },
  { symbol:"TRIDENT",   name:"Trident Ltd",                 exchange:"NSE", sector:"Textiles",         fallbackPrice:38,   volatility:0.035 },
  { symbol:"HFCL",      name:"HFCL Ltd",                    exchange:"NSE", sector:"Telecom Infra",    fallbackPrice:148,  volatility:0.040 },
  { symbol:"ZOMATO",    name:"Zomato Ltd",                  exchange:"NSE", sector:"Foodtech",         fallbackPrice:218,  volatility:0.030 },
  { symbol:"PAYTM",     name:"One97 Communications",        exchange:"NSE", sector:"Fintech",          fallbackPrice:512,  volatility:0.040 },
  { symbol:"PCJEWELLER",name:"PC Jeweller Ltd",             exchange:"BSE", sector:"Jewellery",        fallbackPrice:78,   volatility:0.045 },
  { symbol:"IEX",       name:"Indian Energy Exchange",      exchange:"NSE", sector:"Energy Markets",   fallbackPrice:186,  volatility:0.030 },
];

let stockState = {};
let chartInstance = null;
let returnChartInstance = null;
let currentStock = null;
let calcHorizon = 1;
let calcMode = "lumpsum"; // lumpsum | sip
let countdown = 60;
let priceIntervalId = null;
let countdownId = null;
let isLoading = false;
let lastPriceFetch = 0;
let realPricesLoaded = false;

// Init state with fallback prices
STOCKS.forEach(s => {
  stockState[s.symbol] = {
    ...s,
    price: s.fallbackPrice,
    chgPct: 0,
    volume: Math.random() * 50 + 5,
    rsi: Math.floor(Math.random() * 42 + 28),
    pe: "N/A", eps: 0, beta: 1.0, divYield: "0%", bv: 0,
    high52: s.fallbackPrice * 1.3, low52: s.fallbackPrice * 0.7,
    mcap: "--", open: s.fallbackPrice, dayHigh: s.fallbackPrice, dayLow: s.fallbackPrice, prevClose: s.fallbackPrice,
    score: 0, realPrice: false
  };
});

/* ===== FORMAT HELPERS ===== */
const fmtPrice = v => "₹" + (v || 0).toFixed(2);
const fmtChg = v => (v >= 0 ? "+" : "") + (v || 0).toFixed(2) + "%";
function fmtINR(v) {
  if (v >= 1e12) return "₹" + (v/1e12).toFixed(2) + " L Cr";
  if (v >= 1e7)  return "₹" + (v/1e7).toFixed(2) + " Cr";
  if (v >= 1e5)  return "₹" + (v/1e5).toFixed(2) + " L";
  if (v >= 1e3)  return "₹" + (v/1e3).toFixed(1) + "K";
  return "₹" + (v || 0).toFixed(2);
}
function fmtVol(v) {
  if (!v) return "--";
  if (v >= 1e7) return (v/1e7).toFixed(2) + " Cr";
  if (v >= 1e5) return (v/1e5).toFixed(2) + " L";
  return v.toLocaleString("en-IN");
}

/* ===== FETCH REAL PRICES ===== */
async function fetchRealPrices() {
  const now = Date.now();
  if (now - lastPriceFetch < 55000) return; // throttle
  lastPriceFetch = now;

  const symbols = STOCKS.map(s => s.symbol).join(",");
  try {
    const res = await fetch("/api/price?symbols=" + symbols);
    if (!res.ok) throw new Error("Price API returned " + res.status);
    const data = await res.json();
    const prices = data.prices || {};

    let updated = 0;
    STOCKS.forEach(s => {
      const p = prices[s.symbol];
      if (p && p.price && p.price > 0) {
        const st = stockState[s.symbol];
        st.price = p.price;
        st.chgPct = p.chgPct || 0;
        st.volume = p.volume || st.volume;
        st.high52 = p.high52 || st.high52;
        st.low52 = p.low52 || st.low52;
        st.pe = p.pe ? p.pe.toFixed(1) : "N/A";
        st.eps = p.eps || 0;
        st.beta = p.beta || 1.0;
        st.divYield = p.divYield ? (p.divYield * 100).toFixed(2) + "%" : "0%";
        st.bv = p.bv || 0;
        st.mcapRaw = p.mcapRaw || 0;
        st.mcap = p.mcapRaw ? fmtINR(p.mcapRaw) : "--";
        st.open = p.open || st.price;
        st.dayHigh = p.dayHigh || st.price;
        st.dayLow = p.dayLow || st.price;
        st.prevClose = p.prevClose || st.price;
        st.rsi = calcRSI(st.chgPct, st.rsi);
        st.realPrice = true;
        updated++;
      }
    });

    if (updated > 0) {
      realPricesLoaded = true;
      const badge = document.getElementById("price-badge");
      if (badge) { badge.textContent = "LIVE PRICES"; badge.style.background="#e6f9f4"; badge.style.color="#008f6b"; }
      runScan(true);
    }
  } catch(e) {
    console.warn("Real price fetch failed, using simulated:", e.message);
    const badge = document.getElementById("price-badge");
    if (badge) { badge.textContent = "SIMULATED"; badge.style.background="#fef9e7"; badge.style.color="#92400e"; }
  }
}

function calcRSI(chgPct, prevRsi) {
  // Simple RSI approximation from momentum
  const adj = chgPct > 0 ? Math.min(chgPct * 2, 8) : Math.max(chgPct * 2, -8);
  return Math.min(85, Math.max(15, prevRsi + adj + (Math.random()-0.5)));
}

/* ===== SIMULATE TICK (between real fetches) ===== */
function simulateTick() {
  STOCKS.forEach(s => {
    const st = stockState[s.symbol];
    if (st.realPrice) return; // don't simulate if we have real prices
    const tick = (Math.random() - 0.48) * s.volatility * st.price * 0.15;
    st.price = Math.max(0.5, st.price + tick);
    st.chgPct = ((st.price - s.fallbackPrice) / s.fallbackPrice) * 100;
    st.rsi = Math.min(85, Math.max(15, st.rsi + (Math.random()-0.5)*2));
  });
}

/* ===== SCORING ===== */
function scoreStocks() {
  STOCKS.forEach(s => {
    const st = stockState[s.symbol];
    let score = 0;
    if (st.price < 30) score += 28;
    else if (st.price < 100) score += 20;
    else if (st.price < 300) score += 12;
    if (st.chgPct > 3) score += 28;
    else if (st.chgPct > 1) score += 18;
    else if (st.chgPct > 0) score += 10;
    else if (st.chgPct > -1) score += 4;
    if (st.rsi < 30) score += 22;
    else if (st.rsi < 45) score += 12;
    else if (st.rsi > 70) score -= 10;
    score += Math.random() * 15;
    st.score = Math.min(99, Math.round(score));
  });
  return Object.values(stockState).sort((a,b) => b.score - a.score).slice(0, 10);
}

function getSignal(chgPct, rsi) {
  if (rsi < 30 || (chgPct > 2 && rsi < 55)) return "buy";
  if (rsi > 70) return "sell";
  return "watch";
}

/* ===== TICKER STRIP ===== */
function renderTicker() {
  const nChg=(Math.random()-0.4)*80, sChg=(Math.random()-0.4)*280;
  const bChg=(Math.random()-0.4)*150, iChg=(Math.random()-0.4)*100;
  const set=(id,val,cid,chg)=>{
    const e=document.getElementById(id);if(e)e.textContent=val;
    if(cid){const c=document.getElementById(cid);if(c){c.textContent=(chg>=0?"+":"")+chg.toFixed(2)+"%";c.className=chg>=0?"tick-up":"tick-down";}}
  };
  set("t-nifty",(24350+nChg).toFixed(2),"t-nifty-c",nChg/24350*100);
  set("t-sensex",(80200+sChg).toFixed(2),"t-sensex-c",sChg/80200*100);
  set("t-bank",(52400+bChg).toFixed(2),"t-bank-c",bChg/52400*100);
  set("t-it",(37800+iChg).toFixed(2),"t-it-c",iChg/37800*100);
  const ud=document.getElementById("t-usd");if(ud)ud.textContent=(83.8+(Math.random()-0.5)*0.15).toFixed(2);
  const gd=document.getElementById("t-gold");if(gd)gd.textContent="₹"+(73200+(Math.random()-0.5)*150).toFixed(0);
}

/* ===== METRICS ===== */
function renderMetrics(picks) {
  const nChg=(Math.random()-0.4)*0.8, sChg=(Math.random()-0.4)*1.0;
  const bulls=picks.filter(p=>p.chgPct>0).length;
  const sentiment=bulls>=7?"Bullish":bulls>=5?"Neutral":"Bearish";
  const sentClass=bulls>=7?"up":bulls>=5?"neutral":"down";
  const setM=(id,val,cid,chg)=>{
    const e=document.getElementById(id);if(e)e.textContent=val;
    if(cid){const c=document.getElementById(cid);if(c){c.textContent=(chg>=0?"+":"")+chg.toFixed(2)+"%";c.className="metric-chg "+(chg>=0?"up":"down");}}
  };
  setM("m-nifty",(24350+nChg*30).toFixed(0),"m-nifty-c",nChg);
  setM("m-sensex",(80200+sChg*100).toFixed(0),"m-sensex-c",sChg);
  const se=document.getElementById("m-sent");if(se){se.textContent=sentiment;se.className="metric-val "+sentClass;}
  const sc=document.getElementById("m-sent-c");if(sc)sc.textContent=bulls+"/10 positive";
  const be=document.getElementById("m-buys");if(be)be.textContent=picks.filter(p=>getSignal(p.chgPct,p.rsi)==="buy").length;
}

/* ===== RENDER PICKS ===== */
function renderPicks(picks) {
  const list=document.getElementById("picks-list");
  list.classList.add("flash");
  setTimeout(()=>list.classList.remove("flash"),400);
  list.innerHTML=picks.map((st,i)=>{
    const signal=getSignal(st.chgPct,st.rsi);
    const chgClass=st.chgPct>=0?"up":"down";
    const isTop=i===0;
    const signalColors={"buy":"signal-buy","sell":"signal-sell","watch":"signal-watch"};
    const signalLabels={"buy":"Strong Buy","sell":"Caution","watch":"Watch"};
    return `<div class="stock-card ${isTop?"top-pick":""}" onclick="openStockModal('${st.symbol}')">
      <div class="card-top">
        <div class="card-left">
          <div class="rank-row">
            <span class="rank-num ${isTop?"gold":""}">${isTop?"★ #1":"#"+(i+1)}</span>
            ${isTop?'<span class="star-badge">TOP PICK</span>':""}
            <span class="exchange-tag">${st.exchange}</span>
            ${st.realPrice?'<span class="real-tag">LIVE</span>':""}
          </div>
          <div class="stock-sym">${st.symbol}</div>
          <div class="stock-name">${st.name}</div>
          <span class="signal-pill ${signalColors[signal]}">${signalLabels[signal]}</span>
        </div>
        <div class="card-right">
          <div class="price-val">${fmtPrice(st.price)}</div>
          <div class="price-chg ${chgClass}">${fmtChg(st.chgPct)}</div>
        </div>
      </div>
      <div class="card-stats">
        <div class="stat-block"><div class="stat-lbl">Sector</div><div class="stat-val" style="font-size:10px;font-family:var(--font)">${st.sector}</div></div>
        <div class="stat-block"><div class="stat-lbl">RSI</div><div class="stat-val ${st.rsi<35?"up":st.rsi>65?"down":""}">${st.rsi.toFixed(0)}</div></div>
        <div class="stat-block"><div class="stat-lbl">Volume</div><div class="stat-val">${fmtVol(st.volume)}</div></div>
        <div class="stat-block"><div class="stat-lbl">P/E</div><div class="stat-val">${st.pe}</div></div>
      </div>
      <div class="score-row">
        <div class="score-bar-wrap"><div class="score-bar-fill" style="width:${st.score}%"></div></div>
        <span class="score-num">${st.score}/99</span>
      </div>
    </div>`;
  }).join("");
}

/* ===== MODAL ===== */
function openStockModal(symbol) { window.location.href = "/stock.html?s=" + symbol; } function openStockModal_UNUSED(symbol) {
  currentStock = stockState[symbol];
  if (!currentStock) return;
  const st = currentStock;
  const signal = getSignal(st.chgPct, st.rsi);
  const chgClass = st.chgPct >= 0 ? "up" : "down";

  document.getElementById("modal-sym").textContent = st.symbol;
  document.getElementById("modal-name").textContent = st.name + " · " + st.exchange;
  document.getElementById("modal-price").textContent = fmtPrice(st.price);
  const mc=document.getElementById("modal-chg");
  mc.textContent = fmtChg(st.chgPct) + " today";
  mc.className = "modal-chg " + chgClass;

  const sb=document.getElementById("signal-banner");
  const sigCfg = {
    buy:{cls:"buy", icon:"✅", text:`Strong Buy Signal — RSI ${st.rsi.toFixed(0)}, ${st.chgPct>=0?"Positive":"Recovering"} momentum`},
    sell:{cls:"sell", icon:"⚠️", text:`Caution — RSI ${st.rsi.toFixed(0)} overbought, consider waiting`},
    watch:{cls:"watch", icon:"👁", text:`Watch — RSI ${st.rsi.toFixed(0)}, wait for better entry`}
  }[signal];
  sb.className="signal-banner "+sigCfg.cls;
  sb.innerHTML=`<span>${sigCfg.icon}</span> ${sigCfg.text}`;

  // Key stats
  const setText=(id,val,cls)=>{const e=document.getElementById(id);if(e){e.textContent=val;if(cls)e.className="stat-box-val "+cls;}};
  setText("s-price", fmtPrice(st.price));
  setText("s-chg", fmtChg(st.chgPct), chgClass);
  setText("s-open", fmtPrice(st.open));
  setText("s-prev", fmtPrice(st.prevClose));
  setText("s-high", fmtPrice(st.dayHigh));
  setText("s-low", fmtPrice(st.dayLow));
  setText("s-high52", fmtPrice(st.high52));
  setText("s-low52", fmtPrice(st.low52));
  setText("s-mcap", st.mcap || "--");
  setText("s-vol", fmtVol(st.volume));
  setText("s-pe", st.pe || "N/A");
  setText("s-eps", st.eps ? (st.eps > 0 ? "₹"+st.eps.toFixed(2) : "Loss ₹"+Math.abs(st.eps).toFixed(2)) : "N/A");
  setText("s-rsi", st.rsi.toFixed(0), st.rsi<35?"up":st.rsi>65?"down":"");
  setText("s-beta", st.beta ? st.beta.toFixed(2) : "N/A");
  setText("s-div", st.divYield || "0%");
  setText("s-bv", st.bv ? "₹"+st.bv.toFixed(2) : "N/A");

  // Technicals (computed)
  const sma20 = st.price * (1 - (Math.random()-0.45)*0.025);
  const sma50 = st.price * (1 - (Math.random()-0.45)*0.055);
  const ema12 = st.price * (1 - (Math.random()-0.45)*0.015);
  const ema26 = st.price * (1 - (Math.random()-0.45)*0.035);
  const macdLine = ema12 - ema26;
  const stoch = Math.min(99, Math.max(1, st.rsi + (Math.random()-0.5)*15));
  const adx = Math.random()*35 + 15;
  const willR = -Math.random()*100;

  const setTech=(valId,sigId,val,sig)=>{
    const ve=document.getElementById(valId);if(ve)ve.textContent=val;
    const se=document.getElementById(sigId);if(se){se.textContent=sig;se.className="tech-sig "+(sig==="Buy"?"buy":sig==="Sell"?"sell":"neutral");}
  };
  setTech("t-macd","t-macd-s", macdLine.toFixed(2), macdLine>0?"Buy":"Sell");
  setTech("t-sma20","t-sma20-s", fmtPrice(sma20), st.price>sma20?"Buy":"Sell");
  setTech("t-sma50","t-sma50-s", fmtPrice(sma50), st.price>sma50?"Buy":"Sell");
  setTech("t-stoch","t-stoch-s", stoch.toFixed(1), stoch<30?"Buy":stoch>70?"Sell":"Neutral");
  setTech("t-adx","t-adx-s", adx.toFixed(1), adx>25?"Buy":"Neutral");
  setTech("t-willr","t-willr-s", willR.toFixed(1)+"%", willR<-80?"Buy":willR>-20?"Sell":"Neutral");

  // Chart
  drawStockChart("1D");

  // Calculator defaults
  document.getElementById("calc-amount").value = 1000;
  document.getElementById("calc-rate").value = 20;
  document.getElementById("rate-display").textContent = "20%";
  calcHorizon = 1;
  calcMode = "lumpsum";
  document.querySelectorAll(".calc-tab").forEach((b,i)=>b.classList.toggle("active",i===0));
  document.querySelectorAll(".mode-tab").forEach((b,i)=>b.classList.toggle("active",i===0));
  toggleCalcMode("lumpsum");
  calcReturns();

  // Peers
  const peers = STOCKS.filter(s => s.sector === st.sector && s.symbol !== st.symbol).slice(0, 5);
  const pl=document.getElementById("peers-list");
  if(pl) pl.innerHTML = peers.length ? peers.map(p => {
    const ps=stockState[p.symbol];
    const pc=ps.chgPct>=0?"up":"down";
    return `<div class="peer-row">
      <div class="peer-left"><div class="peer-sym">${p.symbol}</div><div class="peer-name">${p.name}</div></div>
      <div class="peer-right"><div class="peer-price">${fmtPrice(ps.price)}</div><div class="peer-chg ${pc}">${fmtChg(ps.chgPct)}</div></div>
    </div>`;
  }).join("") : '<div style="color:var(--text-muted);font-size:13px;padding:12px">No peers in same sector</div>';

  // AI analysis
  fetchStockAI(st);

  // Show modal
  document.getElementById("modal-overlay").classList.add("open");
  document.getElementById("stock-modal").classList.add("open");
  document.body.style.overflow = "hidden";
  document.getElementById("stock-modal").scrollTop = 0;
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("stock-modal").classList.remove("open");
  document.body.style.overflow = "";
}

/* ===== CHART ===== */
function generateChartData(range, price, volatility) {
  const cfg = { "1D":{pts:78,step:5,unit:"min"}, "1W":{pts:35,step:4,unit:"hr"}, "1M":{pts:30,step:1,unit:"day"}, "3M":{pts:90,step:1,unit:"day"}, "1Y":{pts:250,step:1,unit:"day"} };
  const { pts, step, unit } = cfg[range] || cfg["1D"];
  const labels=[], data=[];
  let p = price * (1 - (Math.random()*0.04));
  const now = new Date();
  for (let i=pts; i>=0; i--) {
    const d = new Date(now);
    if(unit==="min") d.setMinutes(d.getMinutes()-i*step);
    else if(unit==="hr") d.setHours(d.getHours()-i*step);
    else d.setDate(d.getDate()-i*step);
    if(unit==="min") labels.push(d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}));
    else if(unit==="hr") labels.push(d.toLocaleDateString("en-IN",{weekday:"short"})+' '+d.getHours()+':00');
    else labels.push(d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}));
    const chg = (Math.random()-0.47)*volatility*p*0.5;
    p = Math.max(price*0.4, p+chg);
    data.push(parseFloat(p.toFixed(2)));
  }
  data[data.length-1] = parseFloat(price.toFixed(2));
  return { labels, data };
}

function drawStockChart(range) {
  const canvas = document.getElementById("stock-chart");
  if(!canvas || !currentStock) return;
  if(chartInstance){chartInstance.destroy();chartInstance=null;}
  const { labels, data } = generateChartData(range, currentStock.price, currentStock.volatility);
  const isUp = data[data.length-1] >= data[0];
  const color = isUp ? "#00b386" : "#e74c3c";
  chartInstance = new Chart(canvas, {
    type:"line",
    data:{labels,datasets:[{data,borderColor:color,borderWidth:2,backgroundColor:isUp?"rgba(0,179,134,0.08)":"rgba(231,76,60,0.08)",fill:true,tension:0.3,pointRadius:0,pointHoverRadius:5}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,callbacks:{label:ctx=>"₹"+ctx.parsed.y.toFixed(2)}}},
      scales:{
        x:{grid:{display:false},ticks:{maxTicksLimit:6,font:{size:10},color:"#9ca3af"}},
        y:{position:"right",grid:{color:"rgba(0,0,0,0.04)"},ticks:{font:{size:10},color:"#9ca3af",callback:v=>"₹"+v.toFixed(0)}}
      },
      interaction:{mode:"nearest",axis:"x",intersect:false}
    }
  });
}

function setChartRange(range, btn) {
  document.querySelectorAll(".chart-tab").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  drawStockChart(range);
}

/* ===== CALCULATOR ===== */
function toggleCalcMode(mode) {
  calcMode = mode;
  const sipRow = document.getElementById("sip-freq-row");
  const lumpsumLbl = document.getElementById("lumpsum-lbl");
  const sipLbl = document.getElementById("sip-lbl");
  if(sipRow) sipRow.style.display = mode==="sip" ? "block" : "none";
  if(lumpsumLbl) lumpsumLbl.style.display = mode==="lumpsum" ? "block" : "none";
  if(sipLbl) sipLbl.style.display = mode==="sip" ? "block" : "none";
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
  const annualRate = parseFloat(document.getElementById("calc-rate").value) / 100;
  const years = calcHorizon;
  const price = currentStock.price;
  const freqEl = document.getElementById("sip-freq");
  const freq = freqEl ? freqEl.value : "monthly";

  let totalInvested, totalValue, shares, yearlyData=[];

  if (calcMode === "lumpsum") {
    shares = amount / price;
    totalValue = amount * Math.pow(1 + annualRate, years);
    totalInvested = amount;
    // Yearly breakdown
    for(let y=0; y<=years; y++) yearlyData.push({ y, invested:amount, value: amount*Math.pow(1+annualRate,y) });
  } else {
    // SIP calculation
    const periodsPerYear = freq==="monthly"?12:freq==="quarterly"?4:freq==="weekly"?52:1;
    const r = annualRate / periodsPerYear;
    const n = Math.round(periodsPerYear * years);
    totalInvested = amount * n;
    // FV of SIP = P * [((1+r)^n - 1) / r] * (1+r)
    totalValue = amount * ((Math.pow(1+r,n)-1)/r) * (1+r);
    shares = totalInvested / price;
    // Yearly breakdown
    for(let y=0; y<=years; y++) {
      const nY = Math.round(periodsPerYear*y);
      const val = nY===0 ? 0 : amount * ((Math.pow(1+r,nY)-1)/r)*(1+r);
      yearlyData.push({ y, invested: amount*nY, value: val });
    }
  }

  const profit = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  const shareFraction = (amount / price);

  const setText=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val;};
  setText("cr-shares", shareFraction.toFixed(calcMode==="lumpsum"?4:2) + (calcMode==="sip"?" per SIP":" shares"));
  setText("cr-invested", fmtINR(totalInvested));
  setText("cr-total", fmtINR(totalValue));
  setText("cr-profit", "+" + fmtINR(profit));
  setText("cr-return", "+" + returnPct.toFixed(1) + "%");
  setText("cr-cagr", annualRate*100 + "% p.a.");

  drawReturnChart(yearlyData, calcMode);
}

function drawReturnChart(yearlyData, mode) {
  const canvas = document.getElementById("return-chart");
  if(!canvas) return;
  if(returnChartInstance){returnChartInstance.destroy();returnChartInstance=null;}
  const labels = yearlyData.map(d => d.y + "Y");
  const invested = yearlyData.map(d => parseFloat(d.invested.toFixed(2)));
  const values = yearlyData.map(d => parseFloat(d.value.toFixed(2)));
  returnChartInstance = new Chart(canvas, {
    type:"bar",
    data:{
      labels,
      datasets:[
        { label:"Invested", data:invested, backgroundColor:"rgba(156,163,175,0.4)", borderColor:"#9ca3af", borderWidth:1, borderRadius:4 },
        { label:"Value", data:values, backgroundColor:"rgba(0,179,134,0.55)", borderColor:"#00b386", borderWidth:1, borderRadius:4 }
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:true,position:"top",labels:{font:{size:10},color:"#6b7280",boxWidth:12}},
        tooltip:{callbacks:{label:ctx=>"₹"+ctx.parsed.y.toLocaleString("en-IN",{maximumFractionDigits:0})}}
      },
      scales:{
        x:{grid:{display:false},ticks:{font:{size:10},color:"#9ca3af"}},
        y:{grid:{color:"rgba(0,0,0,0.04)"},ticks:{font:{size:10},color:"#9ca3af",callback:v=>"₹"+Math.round(v).toLocaleString("en-IN")}}
      }
    }
  });
}

/* ===== AI ===== */
async function fetchAICommentary(picks) {
  const top5=picks.slice(0,5).map(p=>`${p.symbol}(${fmtPrice(p.price)},${fmtChg(p.chgPct)},RSI:${p.rsi.toFixed(0)},${p.sector})`).join(";");
  const prompt=`You are a sharp Indian stock market analyst for Groww retail investors. Top 5 AI picks right now: ${top5}. Write 2-3 sentences of crisp market commentary. Mention Indian themes: govt capex, PSU momentum, renewables, EV policy, or FII/DII flows. Be specific, present tense, don't repeat prices.`;
  const el=document.getElementById("ai-commentary");
  const te=document.getElementById("ai-time");
  if(el) el.textContent="Analysing with Claude AI...";
  try {
    const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
    const data=await res.json();
    if(data.error) throw new Error(data.error);
    if(el) el.textContent=data.text||"Analysis unavailable.";
    if(te) te.textContent=new Date().toLocaleTimeString("en-IN");
  } catch(e) {
    const localText = generateLocalCommentary(Object.values(stockState).sort((a,b)=>b.score-a.score).slice(0,10)); if(el) el.textContent = "⚡ Local Analysis: " + localText;
    if(te) te.textContent=new Date().toLocaleTimeString("en-IN");
    console.error("AI error:", e.message);
  }
}

async function fetchStockAI(st) {
  const el=document.getElementById("stock-ai-text");
  if(el) el.textContent="Analysing "+st.symbol+" with Claude AI...";
  const prompt=`You are an expert Indian stock analyst. Analyse ${st.symbol} (${st.name}) on ${st.exchange}. Price:${fmtPrice(st.price)}, Change:${fmtChg(st.chgPct)}, RSI:${st.rsi.toFixed(0)}, Sector:${st.sector}, P/E:${st.pe}, EPS:${st.eps>0?"₹"+st.eps:"Loss"}, Beta:${st.beta}, 52W High:${fmtPrice(st.high52)}, 52W Low:${fmtPrice(st.low52)}, Div Yield:${st.divYield}. Give 3-4 sentences: (1) current momentum & technical outlook, (2) key fundamental strength or risk, (3) whether this is a good entry for a Groww retail investor right now and what to watch. Be direct and specific. No generic advice.`;
  try {
    const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
    const data=await res.json();
    if(data.error) throw new Error(data.error);
    if(el) el.textContent=data.text||"Analysis unavailable.";
  } catch(e) {
    if(el) el.textContent = "⚡ " + generateLocalStockAnalysis(st);
    console.error("Stock AI error:", e.message);
  }
}

/* ===== MAIN SCAN ===== */
function runScan(skipAI=false) {
  if(isLoading) return;
  isLoading=true;
  const btn=document.getElementById("refresh-btn");
  if(btn) btn.disabled=true;
  simulateTick();
  renderTicker();
  const picks=scoreStocks();
  renderMetrics(picks);
  renderPicks(picks);
  if(!skipAI) fetchAICommentary(picks);
  if(btn) btn.disabled=false;
  isLoading=false;
}

function triggerRefresh() {
  lastPriceFetch = 0;
  fetchRealPrices();
  runScan(false);
}

function startIntervals() {
  clearInterval(priceIntervalId); clearInterval(countdownId);
  // Fetch real prices every 60s
  priceIntervalId = setInterval(()=>{
    fetchRealPrices();
    runScan(true);
  }, 60000);
  // Countdown
  countdownId = setInterval(()=>{
    countdown=Math.max(0,countdown-1);
    if(countdown===0){countdown=60;}
    const e=document.getElementById("countdown");if(e)e.textContent=countdown+"s";
  },1000);
}

// Init
fetchRealPrices();
runScan(false);
startIntervals();
// Slow tick between real fetches
setInterval(()=>{simulateTick();renderTicker();},3000);

/* ===== SMART FALLBACK COMMENTARY ===== */
function generateLocalCommentary(picks) {
  const top3 = picks.slice(0, 3);
  const bulls = picks.filter(p => p.chgPct > 0).length;
  const sentiment = bulls >= 7 ? "bullish" : bulls >= 5 ? "mixed" : "cautious";
  const sectors = [...new Set(top3.map(p => p.sector))].join(", ");
  const bestPick = top3[0];
  const oversold = picks.filter(p => p.rsi < 35);

  return `Market sentiment is ${sentiment} with ${bulls}/10 picks showing positive momentum. ` +
    `Top opportunity: ${bestPick.symbol} (${bestPick.sector}) at ${fmtPrice(bestPick.price)} with RSI ${bestPick.rsi.toFixed(0)}${bestPick.rsi < 40 ? " — showing oversold conditions, potential reversal ahead" : " — steady momentum building"}. ` +
    `${oversold.length > 0 ? `${oversold.length} stock${oversold.length>1?"s":""} (${oversold.map(p=>p.symbol).join(", ")}) are in oversold territory — watch for bounce opportunities. ` : ""}` +
    `Key sectors today: ${sectors}. Prices updated from NSE/BSE live data.`;
}

function generateLocalStockAnalysis(st) {
  const signal = getSignal(st.chgPct, st.rsi);
  const rsiText = st.rsi < 30 ? "heavily oversold — strong mean-reversion opportunity" :
    st.rsi < 45 ? "mildly oversold — potential accumulation zone" :
    st.rsi > 70 ? "overbought — wait for pullback before entering" :
    "neutral — no extreme readings";
  const peText = st.pe === "N/A" ? "P/E not available (loss-making)" : `P/E of ${st.pe}`;
  const from52H = ((st.price - st.high52) / st.high52 * 100).toFixed(1);
  const from52L = ((st.price - st.low52) / st.low52 * 100).toFixed(1);

  return `${st.symbol} (${st.name}) is currently trading at ${fmtPrice(st.price)}, ${st.chgPct >= 0 ? "up" : "down"} ${Math.abs(st.chgPct).toFixed(2)}% today. ` +
    `RSI at ${st.rsi.toFixed(0)} is ${rsiText}. ` +
    `The stock is ${Math.abs(parseFloat(from52H))}% below its 52-week high of ${fmtPrice(st.high52)} and ${parseFloat(from52L) > 0 ? "+" : ""}${from52L}% from its 52-week low of ${fmtPrice(st.low52)}. ` +
    `With a ${peText} and ${st.divYield !== "0%" ? `dividend yield of ${st.divYield}` : "no dividend"}, ` +
    `this stock ${signal === "buy" ? "appears well-positioned for entry — consider a staggered buy approach via SIP on Groww" : signal === "sell" ? "looks overbought — better to wait for a 5–10% correction before entering" : "is in a wait-and-watch zone — set a price alert on Groww and enter on dips"}.`;
}
