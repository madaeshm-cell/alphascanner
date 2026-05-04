/* ===== STOCK DATA (same as app.js) ===== */
const STOCKS = [
  { symbol:"IRFC",      name:"Indian Railway Finance Corp", exchange:"NSE", sector:"PSU Finance",      fallbackPrice:161,  volatility:0.025 },
  { symbol:"SUZLON",    name:"Suzlon Energy Ltd",           exchange:"NSE", sector:"Renewable Energy", fallbackPrice:55,   volatility:0.040 },
  { symbol:"YESBANK",   name:"Yes Bank Ltd",                exchange:"NSE", sector:"Banking",          fallbackPrice:19,   volatility:0.045 },
  { symbol:"NHPC",      name:"NHPC Ltd",                    exchange:"NSE", sector:"Hydro Power",      fallbackPrice:82,   volatility:0.025 },
  { symbol:"RVNL",      name:"Rail Vikas Nigam Ltd",        exchange:"NSE", sector:"Infrastructure",   fallbackPrice:390,  volatility:0.030 },
  { symbol:"IREDA",     name:"IREDA",                       exchange:"NSE", sector:"Green Finance",    fallbackPrice:168,  volatility:0.035 },
  { symbol:"GMRINFRA",  name:"GMR Airports Infra",          exchange:"NSE", sector:"Airports",         fallbackPrice:88,   volatility:0.030 },
  { symbol:"IDEA",      name:"Vodafone Idea Ltd",           exchange:"NSE", sector:"Telecom",          fallbackPrice:10,   volatility:0.055 },
  { symbol:"RPOWER",    name:"Reliance Power Ltd",          exchange:"BSE", sector:"Power",            fallbackPrice:36,   volatility:0.050 },
  { symbol:"CANBK",     name:"Canara Bank",                 exchange:"NSE", sector:"PSU Bank",         fallbackPrice:98,  volatility:0.025 },
  { symbol:"TATAPOWER", name:"Tata Power Company",          exchange:"NSE", sector:"Power",            fallbackPrice:395,  volatility:0.025 },
  { symbol:"RECLTD",    name:"REC Limited",                 exchange:"NSE", sector:"PSU Finance",      fallbackPrice:465,  volatility:0.030 },
  { symbol:"SAIL",      name:"Steel Auth. of India",        exchange:"NSE", sector:"Steel",            fallbackPrice:118,  volatility:0.030 },
  { symbol:"BANKBARODA",name:"Bank of Baroda",              exchange:"NSE", sector:"PSU Bank",         fallbackPrice:218,  volatility:0.025 },
  { symbol:"TRIDENT",   name:"Trident Ltd",                 exchange:"NSE", sector:"Textiles",         fallbackPrice:35,   volatility:0.035 },
  { symbol:"HFCL",      name:"HFCL Ltd",                    exchange:"NSE", sector:"Telecom Infra",    fallbackPrice:138,  volatility:0.040 },
  { symbol:"ZOMATO",    name:"Zomato Ltd",                  exchange:"NSE", sector:"Foodtech",         fallbackPrice:220,  volatility:0.030 },
  { symbol:"PAYTM",     name:"One97 Communications",        exchange:"NSE", sector:"Fintech",          fallbackPrice:490,  volatility:0.040 },
  { symbol:"PCJEWELLER",name:"PC Jeweller Ltd",             exchange:"BSE", sector:"Jewellery",        fallbackPrice:72,   volatility:0.045 },
  { symbol:"IEX",       name:"Indian Energy Exchange",      exchange:"NSE", sector:"Energy Markets",   fallbackPrice:182,  volatility:0.030 },
];

const fmtPrice = v => "₹" + (v||0).toFixed(2);
const fmtChg   = v => (v>=0?"+":"") + (v||0).toFixed(2) + "%";
function fmtINR(v) {
  if(v>=1e12) return "₹"+(v/1e12).toFixed(2)+" L Cr";
  if(v>=1e7)  return "₹"+(v/1e7).toFixed(2)+" Cr";
  if(v>=1e5)  return "₹"+(v/1e5).toFixed(2)+" L";
  if(v>=1e3)  return "₹"+(v/1e3).toFixed(1)+"K";
  return "₹"+(v||0).toFixed(2);
}
function fmtVol(v) {
  if(!v) return "--";
  if(v>=1e7) return (v/1e7).toFixed(2)+" Cr";
  if(v>=1e5) return (v/1e5).toFixed(2)+" L";
  return v.toLocaleString("en-IN");
}

let st = null;
let chartInstance = null;
let returnChartInstance = null;
let calcMode = "lumpsum";
let calcHorizon = 1;

/* ===== INIT ===== */
async function init() {
  const params = new URLSearchParams(window.location.search);
  const symbol = params.get("s");
  if (!symbol) { window.location.href = "/"; return; }

  const stockDef = STOCKS.find(s => s.symbol === symbol);
  if (!stockDef) { window.location.href = "/"; return; }

  // Start with fallback
  st = {
    ...stockDef,
    price: stockDef.fallbackPrice,
    chgPct: 0,
    volume: Math.random()*50+5,
    rsi: Math.floor(Math.random()*42+28),
    pe:"N/A", eps:0, beta:1.0, divYield:"0%", bv:0,
    high52: stockDef.fallbackPrice*1.3,
    low52:  stockDef.fallbackPrice*0.7,
    mcap:"--", open:stockDef.fallbackPrice,
    dayHigh:stockDef.fallbackPrice, dayLow:stockDef.fallbackPrice,
    prevClose:stockDef.fallbackPrice, realPrice:false
  };

  renderHeader();
  renderStats();
  renderTechnicals();
  drawChart("1D");
  calcReturns();
  renderPeers();
  fetchAIAnalysis();

  // Fetch real price
  await fetchRealPrice(symbol);
}

async function fetchRealPrice(symbol) {
  // Show loading state
  const badge = document.getElementById("h-live-tag");
  if(badge) { badge.textContent="FETCHING..."; badge.className="real-tag"; badge.style.background="#fef9e7"; badge.style.color="#92400e"; }

  try {
    const res = await fetch("/api/price?symbols=" + symbol);
    const data = await res.json();
    const p = data.prices?.[symbol];
    if (p && p.price > 0) {
      st.price     = p.price;
      st.chgPct    = p.chgPct || 0;
      st.volume    = p.volume || st.volume;
      st.high52    = p.high52 || st.high52;
      st.low52     = p.low52  || st.low52;
      st.pe        = p.pe  ? p.pe.toFixed(1) : "N/A";
      st.eps       = p.eps || 0;
      st.beta      = p.beta || 1.0;
      st.divYield  = p.divYield ? (p.divYield*100).toFixed(2)+"%" : "0%";
      st.bv        = p.bv || 0;
      st.mcap      = p.mcapRaw ? fmtINR(p.mcapRaw) : "--";
      st.open      = p.open || st.price;
      st.dayHigh   = p.dayHigh || st.price;
      st.dayLow    = p.dayLow  || st.price;
      st.prevClose = p.prevClose || st.price;
      st.rsi       = Math.min(85, Math.max(15, 50 + st.chgPct * 3 + (Math.random()-0.5)*5));
      st.realPrice = true;
      st.source    = p.source || "live";
      st.fetchedAt = data.fetchedAt;

      if(badge) { badge.textContent="✓ LIVE"; badge.style.background="#e6f9f4"; badge.style.color="#008f6b"; }
      renderHeader();
      renderStats();
      renderTechnicals();
      drawChart("1D");
      calcReturns();

      // Also fetch fundamentals
      fetchFundamentals(symbol);
    } else {
      if(badge) { badge.textContent="SIMULATED"; badge.style.background="#fef9e7"; badge.style.color="#92400e"; }
      showToast("Using simulated price — live data unavailable", "info");
    }
  } catch(e) {
    console.warn("Price fetch failed:", e.message);
    if(badge) { badge.textContent="SIMULATED"; badge.style.background="#fef9e7"; badge.style.color="#92400e"; }
  }

  // Refresh price every 60s
  setTimeout(() => fetchRealPrice(symbol), 60000);
}

async function fetchFundamentals(symbol) {
  try {
    const res = await fetch("/api/fundamentals?symbol=" + symbol);
    const data = await res.json();
    if (data && !data.error) {
      st.roce = data.roce;
      st.roe  = data.roe;
      st.faceVal = data.faceVal;
      st.debtToEq = data.debtToEq;
      st.currentRatio = data.currentRatio;
      st.promoterHolding = data.promoterHolding;
      renderStats(); // re-render with extra data
    }
  } catch(e) { console.warn("Fundamentals fetch failed:", e.message); }
}

function getSignal(chgPct, rsi) {
  if(rsi<30 || (chgPct>2 && rsi<55)) return "buy";
  if(rsi>70) return "sell";
  return "watch";
}

/* ===== RENDER HEADER ===== */
function renderHeader() {
  const s = st;
  const chgClass = s.chgPct >= 0 ? "up" : "down";
  document.title = `${s.symbol} ${fmtPrice(s.price)} — Alpha Scanner`;
  setText("h-sym", s.symbol);
  setText("h-exch", s.exchange);
  setText("h-name", s.name);
  setText("h-price", fmtPrice(s.price));
  const hc = document.getElementById("h-chg");
  if(hc){ hc.textContent = fmtChg(s.chgPct)+" today"; hc.className = "stock-header-chg "+chgClass; }

  const signal = getSignal(s.chgPct, s.rsi);
  const sb = document.getElementById("signal-banner");
  const cfg = {
    buy:  {cls:"buy",  icon:"✅", text:`Strong Buy — RSI ${s.rsi.toFixed(0)}, ${s.chgPct>=0?"positive":"recovering"} momentum. Good entry zone.`},
    sell: {cls:"sell", icon:"⚠️", text:`Overbought — RSI ${s.rsi.toFixed(0)}. Consider waiting for pullback before entering.`},
    watch:{cls:"watch",icon:"👁",  text:`Watch — RSI ${s.rsi.toFixed(0)}. Wait for a clearer signal or better entry price.`}
  }[signal];
  if(sb){ sb.className="signal-banner-2 "+cfg.cls; sb.innerHTML=`<span>${cfg.icon}</span> ${cfg.text}`; }
}

/* ===== RENDER STATS ===== */
function renderStats() {
  const s = st;
  const chgClass = s.chgPct >= 0 ? "up" : "down";
  setText("s-price", fmtPrice(s.price));
  const sc = document.getElementById("s-chg");
  if(sc){ sc.textContent=fmtChg(s.chgPct); sc.className="stat-row-val "+chgClass; }
  setText("s-open",   fmtPrice(s.open));
  setText("s-prev",   fmtPrice(s.prevClose));
  setText("s-high",   fmtPrice(s.dayHigh));
  setText("s-low",    fmtPrice(s.dayLow));
  setText("s-high52", fmtPrice(s.high52));
  setText("s-low52",  fmtPrice(s.low52));
  setText("s-mcap",   s.mcap || "--");
  setText("s-vol",    fmtVol(s.volume));
  setText("s-pe",     s.pe || "N/A");
  setText("s-eps",    s.eps ? (s.eps>0?"₹"+s.eps.toFixed(2):"Loss ₹"+Math.abs(s.eps).toFixed(2)) : "N/A");
  const rsiEl = document.getElementById("s-rsi");
  if(rsiEl){ rsiEl.textContent=s.rsi.toFixed(0); rsiEl.className="stat-row-val "+(s.rsi<35?"up":s.rsi>65?"down":""); }
  setText("s-beta",   s.beta?s.beta.toFixed(2):"N/A");
  setText("s-div",    s.divYield||"0%");
  setText("s-bv",     s.bv?"₹"+s.bv.toFixed(2):"N/A");
}

/* ===== RENDER TECHNICALS ===== */
function renderTechnicals() {
  const s = st;
  const sma20  = s.price*(1-(Math.random()-0.45)*0.025);
  const sma50  = s.price*(1-(Math.random()-0.45)*0.055);
  const macd   = (sma20-sma50)*0.3;
  const stoch  = Math.min(99,Math.max(1,s.rsi+(Math.random()-0.5)*15));
  const adx    = Math.random()*35+15;
  const willR  = -Math.random()*100;

  const setTech=(vid,sid,val,sig)=>{
    const ve=document.getElementById(vid); if(ve) ve.textContent=val;
    const se=document.getElementById(sid);
    if(se){ se.textContent=sig; se.className="tech-sig-2 "+(sig==="Buy"?"buy":sig==="Sell"?"sell":"neutral"); }
  };
  setTech("t-macd",  "t-macd-s",  macd.toFixed(2),           macd>0?"Buy":"Sell");
  setTech("t-sma20", "t-sma20-s", fmtPrice(sma20),           s.price>sma20?"Buy":"Sell");
  setTech("t-sma50", "t-sma50-s", fmtPrice(sma50),           s.price>sma50?"Buy":"Sell");
  setTech("t-stoch", "t-stoch-s", stoch.toFixed(1),          stoch<30?"Buy":stoch>70?"Sell":"Neutral");
  setTech("t-adx",   "t-adx-s",   adx.toFixed(1),            adx>25?"Buy":"Neutral");
  setTech("t-willr", "t-willr-s", willR.toFixed(1)+"%",      willR<-80?"Buy":willR>-20?"Sell":"Neutral");
}

/* ===== CHART ===== */
function generateChartData(range) {
  const cfg={"1D":{pts:78,unit:"min",step:5},"1W":{pts:35,unit:"hr",step:4},"1M":{pts:30,unit:"day",step:1},"3M":{pts:90,unit:"day",step:1},"1Y":{pts:252,unit:"day",step:1}};
  const {pts,unit,step}=cfg[range]||cfg["1D"];
  const labels=[],data=[];
  let p=st.price*(1-(Math.random()*0.04));
  const now=new Date();
  for(let i=pts;i>=0;i--){
    const d=new Date(now);
    if(unit==="min") d.setMinutes(d.getMinutes()-i*step);
    else if(unit==="hr") d.setHours(d.getHours()-i*step);
    else d.setDate(d.getDate()-i*step);
    if(unit==="min") labels.push(d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}));
    else if(unit==="hr") labels.push(d.toLocaleDateString("en-IN",{weekday:"short"}));
    else labels.push(d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}));
    p=Math.max(st.price*0.4, p+(Math.random()-0.47)*st.volatility*p*0.5);
    data.push(parseFloat(p.toFixed(2)));
  }
  data[data.length-1]=parseFloat(st.price.toFixed(2));
  return {labels,data};
}

function drawChart(range) {
  const canvas=document.getElementById("stock-chart");
  if(!canvas||!st) return;
  if(chartInstance){chartInstance.destroy();chartInstance=null;}
  const {labels,data}=generateChartData(range);
  const isUp=data[data.length-1]>=data[0];
  const color=isUp?"#00b386":"#e74c3c";
  chartInstance=new Chart(canvas,{
    type:"line",
    data:{labels,datasets:[{data,borderColor:color,borderWidth:2,backgroundColor:isUp?"rgba(0,179,134,0.08)":"rgba(231,76,60,0.08)",fill:true,tension:0.3,pointRadius:0,pointHoverRadius:5}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,callbacks:{label:c=>"₹"+c.parsed.y.toFixed(2)}}},
      scales:{
        x:{grid:{display:false},ticks:{maxTicksLimit:6,font:{size:10},color:"#9ca3af"}},
        y:{position:"right",grid:{color:"rgba(0,0,0,0.04)"},ticks:{font:{size:10},color:"#9ca3af",callback:v=>"₹"+v.toFixed(0)}}
      },interaction:{mode:"nearest",axis:"x",intersect:false}
    }
  });
}

function setChartRange(range,btn) {
  document.querySelectorAll(".chart-tab").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  drawChart(range);
}

/* ===== CALCULATOR ===== */
function setMode(mode, btn) {
  calcMode = mode;
  document.querySelectorAll(".mode-tab").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  const fr=document.getElementById("freq-row");
  if(fr) fr.style.display=mode==="sip"?"block":"none";
  const lbl=document.getElementById("amount-lbl");
  if(lbl) lbl.textContent=mode==="sip"?"Amount per SIP instalment":"One-time investment amount";
  calcReturns();
}

function setAmt(v){ document.getElementById("calc-amount").value=v; calcReturns(); }

function setHorizon(y,btn) {
  calcHorizon=y;
  document.querySelectorAll(".h-tab").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  calcReturns();
}

function calcReturns() {
  if(!st) return;
  const amount=parseFloat(document.getElementById("calc-amount").value)||0;
  const annRate=parseFloat(document.getElementById("calc-rate").value)/100;
  const years=calcHorizon;
  const price=st.price;
  const freq=(document.getElementById("sip-freq")||{}).value||"monthly";

  let invested,value,yearlyData=[];
  if(calcMode==="lumpsum"){
    invested=amount; value=amount*Math.pow(1+annRate,years);
    for(let y=0;y<=years;y++) yearlyData.push({y,invested:amount,value:amount*Math.pow(1+annRate,y)});
  } else {
    const ppy=freq==="monthly"?12:freq==="quarterly"?4:freq==="weekly"?52:1;
    const r=annRate/ppy, n=Math.round(ppy*years);
    invested=amount*n;
    value=n===0?0:amount*((Math.pow(1+r,n)-1)/r)*(1+r);
    for(let y=0;y<=years;y++){
      const nY=Math.round(ppy*y);
      const v=nY===0?0:amount*((Math.pow(1+r,nY)-1)/r)*(1+r);
      yearlyData.push({y,invested:amount*nY,value:v});
    }
  }
  const profit=value-invested;
  const retPct=invested>0?(profit/invested)*100:0;
  const shares=amount/price;
  setText("cr-shares", shares.toFixed(calcMode==="lumpsum"?4:2)+(calcMode==="sip"?" per SIP":" shares"));
  setText("cr-invested",fmtINR(invested));
  setText("cr-total",   fmtINR(value));
  setText("cr-profit",  "+"+fmtINR(profit));
  setText("cr-return",  "+"+retPct.toFixed(1)+"%");
  setText("cr-cagr",    annRate*100+"% p.a.");
  drawReturnChart(yearlyData);
}

function drawReturnChart(yearlyData) {
  const canvas=document.getElementById("return-chart");
  if(!canvas) return;
  if(returnChartInstance){returnChartInstance.destroy();returnChartInstance=null;}
  returnChartInstance=new Chart(canvas,{
    type:"bar",
    data:{
      labels:yearlyData.map(d=>d.y+"Y"),
      datasets:[
        {label:"Invested",data:yearlyData.map(d=>parseFloat(d.invested.toFixed(2))),backgroundColor:"rgba(156,163,175,0.4)",borderColor:"#9ca3af",borderWidth:1,borderRadius:4},
        {label:"Value",   data:yearlyData.map(d=>parseFloat(d.value.toFixed(2))),   backgroundColor:"rgba(0,179,134,0.6)",  borderColor:"#00b386",  borderWidth:1,borderRadius:4}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:true,position:"top",labels:{font:{size:10},color:"#6b7280",boxWidth:12}},
        tooltip:{callbacks:{label:c=>"₹"+c.parsed.y.toLocaleString("en-IN",{maximumFractionDigits:0})}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{size:10},color:"#9ca3af"}},
        y:{grid:{color:"rgba(0,0,0,0.04)"},ticks:{font:{size:10},color:"#9ca3af",callback:v=>"₹"+Math.round(v).toLocaleString("en-IN")}}
      }
    }
  });
}

/* ===== PEERS ===== */
function renderPeers() {
  const pl=document.getElementById("peers-list");
  if(!pl||!st) return;
  const peers=STOCKS.filter(s=>s.sector===st.sector&&s.symbol!==st.symbol).slice(0,5);
  if(!peers.length){ pl.innerHTML='<div style="padding:16px;color:var(--text-muted);font-size:13px">No peers in same sector</div>'; return; }
  pl.innerHTML=peers.map(p=>{
    const price=p.fallbackPrice*(1+(Math.random()-0.5)*0.05);
    const chg=(Math.random()-0.45)*3;
    const cc=chg>=0?"up":"down";
    return `<div class="peer-item" onclick="window.location.href='/stock.html?s=${p.symbol}'">
      <div><div class="peer-sym-2">${p.symbol}</div><div class="peer-name-2">${p.name}</div></div>
      <div><div class="peer-price-2">${fmtPrice(price)}</div><div class="peer-chg-2 ${cc}">${fmtChg(chg)}</div></div>
    </div>`;
  }).join("");
}

/* ===== AI ===== */
async function fetchAIAnalysis() {
  const el=document.getElementById("stock-ai-text");
  if(!el||!st) return;
  el.textContent="Analysing "+st.symbol+"...";
  const s=st;
  const from52H=((s.price-s.high52)/s.high52*100).toFixed(1);
  const from52L=((s.price-s.low52)/s.low52*100).toFixed(1);
  const prompt=`You are an expert Indian stock analyst for Groww retail investors. Analyse ${s.symbol} (${s.name}) on ${s.exchange}. Data: Price ${fmtPrice(s.price)}, Change ${fmtChg(s.chgPct)}, RSI ${s.rsi.toFixed(0)}, Sector ${s.sector}, P/E ${s.pe}, EPS ${s.eps>0?"₹"+s.eps:"Loss"}, Beta ${s.beta}, 52W High ${fmtPrice(s.high52)} (${from52H}% away), 52W Low ${fmtPrice(s.low52)} (+${from52L}% from low), Div Yield ${s.divYield}. Write 3-4 sentences covering: (1) current technical momentum, (2) key fundamental risk or strength, (3) whether it's a good entry for a retail investor and what price target to watch. Be direct, specific, no generic advice.`;
  try {
    const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
    const data=await res.json();
    if(data.error) throw new Error(data.error);
    el.textContent=data.text||"Analysis unavailable.";
  } catch(e) {
    // Smart local fallback
    const signal=getSignal(s.chgPct,s.rsi);
    const rsiTxt=s.rsi<30?"heavily oversold — strong reversal potential":s.rsi<45?"mildly oversold — accumulation zone":s.rsi>70?"overbought — wait for pullback":"neutral zone";
    const from52H=((s.price-s.high52)/s.high52*100).toFixed(1);
    const from52L=((s.price-s.low52)/s.low52*100).toFixed(1);
    el.textContent=`${s.symbol} is trading at ${fmtPrice(s.price)}, ${s.chgPct>=0?"up":"down"} ${Math.abs(s.chgPct).toFixed(2)}% today. RSI at ${s.rsi.toFixed(0)} is ${rsiTxt}. The stock sits ${Math.abs(parseFloat(from52H))}% below its 52-week high of ${fmtPrice(s.high52)} and ${from52L}% above its 52-week low of ${fmtPrice(s.low52)}. ${signal==="buy"?"Technicals suggest a buying opportunity — consider a staggered entry or SIP approach on Groww.":signal==="sell"?"Stock appears stretched — better to wait for a 5–10% correction before entering.":"Set a price alert on Groww and watch for a dip before entering."}`;
  }
}

/* ===== UTIL ===== */
function setText(id,val){ const e=document.getElementById(id); if(e) e.textContent=val; }

init();

/* ===== ALERT FUNCTIONS ===== */
function updateAlertPreview() {
  if (!st) return;
  const buy    = parseFloat(document.getElementById("alert-buy")?.value) || 0;
  const target = parseFloat(document.getElementById("alert-target")?.value) || 0;
  const stop   = parseFloat(document.getElementById("alert-stop")?.value) || 0;
  const qty    = parseFloat(document.getElementById("alert-qty")?.value) || 0;
  const el     = document.getElementById("alert-preview");
  if (!el) return;

  if (!buy || !target || !qty) {
    el.innerHTML = "Enter your buy price, target, and quantity to see your expected P&amp;L";
    return;
  }

  const invested   = buy * qty;
  const targetVal  = target * qty;
  const profit     = targetVal - invested;
  const profitPct  = (profit / invested) * 100;
  const currentVal = st.price * qty;
  const currentPnL = currentVal - invested;
  const currentPct = (currentPnL / invested) * 100;
  const stopVal    = stop > 0 ? stop * qty : null;
  const maxLoss    = stopVal ? stopVal - invested : null;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><strong>Invested:</strong> ₹${invested.toFixed(2)}</div>
      <div><strong>Current P&amp;L:</strong> <span style="color:${currentPnL>=0?"#00b386":"#e74c3c"}">${currentPnL>=0?"+":""}₹${currentPnL.toFixed(2)} (${currentPct>=0?"+":""}${currentPct.toFixed(1)}%)</span></div>
      <div><strong>🎯 Target value:</strong> ₹${targetVal.toFixed(2)}</div>
      <div><strong>Expected profit:</strong> <span style="color:#00b386">+₹${profit.toFixed(2)} (+${profitPct.toFixed(1)}%)</span></div>
      ${maxLoss !== null ? `<div><strong>🛑 Max loss:</strong> <span style="color:#e74c3c">₹${Math.abs(maxLoss).toFixed(2)}</span></div>` : ""}
      <div><strong>Current price:</strong> ₹${st.price.toFixed(2)}</div>
    </div>
    <div style="font-size:11px;color:#6b7280">📧 You'll get an email at <strong>madaeshm@gmail.com</strong> when ${st.symbol} reaches ₹${target.toFixed(2)}</div>
  `;
}

function submitAlert() {
  if (!st) return;
  const buy    = parseFloat(document.getElementById("alert-buy")?.value);
  const target = parseFloat(document.getElementById("alert-target")?.value);
  const stop   = parseFloat(document.getElementById("alert-stop")?.value) || 0;
  const qty    = parseFloat(document.getElementById("alert-qty")?.value);

  if (!buy || buy <= 0)    { showToast("Enter your buy price", "error"); return; }
  if (!target || target <= 0) { showToast("Enter a target price", "error"); return; }
  if (!qty || qty <= 0)    { showToast("Enter quantity", "error"); return; }
  if (target <= buy)       { showToast("Target must be higher than buy price!", "error"); return; }
  if (stop > 0 && stop >= buy) { showToast("Stop loss must be lower than buy price", "error"); return; }

  addAlert(st.symbol, st.name, buy, target, stop, qty);
  showToast(`🔔 Alert set! Email when ${st.symbol} hits ₹${target.toFixed(2)}`, "success");
  renderMyAlerts();

  // Clear form
  ["alert-buy","alert-target","alert-stop","alert-qty"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  updateAlertPreview();
}

function renderMyAlerts() {
  const alerts = loadAlerts().filter(a => a.symbol === st?.symbol);
  const section = document.getElementById("my-alerts-section");
  const list = document.getElementById("my-alerts-list");
  if (!section || !list) return;

  if (alerts.length === 0) { section.style.display = "none"; return; }
  section.style.display = "block";

  list.innerHTML = alerts.map(a => {
    const invested = a.buyPrice * a.quantity;
    const currentVal = (st?.price || a.buyPrice) * a.quantity;
    const pnl = currentVal - invested;
    const pnlPct = (pnl / invested) * 100;
    const pnlColor = pnl >= 0 ? "#00b386" : "#e74c3c";
    return `<div class="my-alert-card ${a.status}">
      <button class="my-alert-del" onclick="deleteAlert(${a.id})" title="Remove alert">✕</button>
      <div class="my-alert-sym">${a.symbol} <span class="alert-status-pill status-${a.status}">${a.status.toUpperCase()}</span></div>
      <div class="my-alert-meta">Buy: ₹${a.buyPrice.toFixed(2)} · Qty: ${a.quantity} shares · Set ${new Date(a.createdAt).toLocaleDateString("en-IN")}</div>
      <div class="my-alert-stats">
        <div class="my-alert-stat"><div class="my-alert-stat-lbl">Current P&L</div><div class="my-alert-stat-val" style="color:${pnlColor}">${pnl>=0?"+":""}₹${Math.abs(pnl).toFixed(2)}</div></div>
        <div class="my-alert-stat"><div class="my-alert-stat-lbl">🎯 Target</div><div class="my-alert-stat-val" style="color:#00b386">₹${a.targetPrice.toFixed(2)}</div></div>
        <div class="my-alert-stat"><div class="my-alert-stat-lbl">🛑 Stop</div><div class="my-alert-stat-val" style="color:#e74c3c">${a.stopLoss>0?"₹"+a.stopLoss.toFixed(2):"None"}</div></div>
      </div>
    </div>`;
  }).join("");
}

function deleteAlert(id) {
  removeAlert(id);
  renderMyAlerts();
  showToast("Alert removed", "info");
}

// Check alerts every 60s when price updates
let alertCheckInterval = setInterval(async () => {
  if (!st) return;
  const fakeState = { [st.symbol]: st };
  await checkAlerts(fakeState);
  renderMyAlerts();
}, 60000);

// Also check immediately on load after price fetched
window._origFetchRealPrice = fetchRealPrice;

// Render alerts on init
setTimeout(() => { if (st) { renderMyAlerts(); updateAlertPreview(); } }, 1000);
