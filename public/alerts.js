/* ===== ALERT SYSTEM ===== */
const USER_EMAIL = "madaeshm@gmail.com";
const ALERTS_KEY = "alpha_scanner_alerts";

function loadAlerts() {
  try { return JSON.parse(localStorage.getItem(ALERTS_KEY) || "[]"); } catch { return []; }
}

function saveAlerts(alerts) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

function addAlert(symbol, name, buyPrice, targetPrice, stopLoss, quantity) {
  const alerts = loadAlerts();
  const existing = alerts.findIndex(a => a.symbol === symbol);
  const alert = {
    id: Date.now(),
    symbol, name, buyPrice: parseFloat(buyPrice),
    targetPrice: parseFloat(targetPrice),
    stopLoss: parseFloat(stopLoss),
    quantity: parseFloat(quantity),
    createdAt: new Date().toISOString(),
    status: "active",
    triggered: false
  };
  if (existing >= 0) alerts[existing] = alert;
  else alerts.push(alert);
  saveAlerts(alerts);
  return alert;
}

function removeAlert(id) {
  const alerts = loadAlerts().filter(a => a.id !== id);
  saveAlerts(alerts);
}

async function checkAlerts(stockState) {
  const alerts = loadAlerts().filter(a => a.status === "active");
  for (const alert of alerts) {
    const st = stockState[alert.symbol];
    if (!st) continue;
    const price = st.price;
    const invested = alert.buyPrice * alert.quantity;
    const currentVal = price * alert.quantity;
    const pnl = currentVal - invested;
    const pnlPct = (pnl / invested) * 100;

    let triggered = false, emailSubject = "", emailHTML = "";

    if (price >= alert.targetPrice) {
      // TARGET HIT — SELL signal
      triggered = true;
      emailSubject = `🎯 SELL NOW: ${alert.symbol} hit your target of ₹${alert.targetPrice.toFixed(2)}!`;
      emailHTML = buildEmailHTML({
        type: "TARGET",
        symbol: alert.symbol, name: alert.name,
        buyPrice: alert.buyPrice, currentPrice: price,
        targetPrice: alert.targetPrice, stopLoss: alert.stopLoss,
        quantity: alert.quantity, invested, currentVal, pnl, pnlPct,
        action: "SELL NOW — Your target price has been reached! Lock in your profit on Groww.",
        color: "#00b386", emoji: "🎯"
      });
    } else if (alert.stopLoss > 0 && price <= alert.stopLoss) {
      // STOP LOSS HIT
      triggered = true;
      emailSubject = `🛑 STOP LOSS: ${alert.symbol} fell below ₹${alert.stopLoss.toFixed(2)}!`;
      emailHTML = buildEmailHTML({
        type: "STOP LOSS",
        symbol: alert.symbol, name: alert.name,
        buyPrice: alert.buyPrice, currentPrice: price,
        targetPrice: alert.targetPrice, stopLoss: alert.stopLoss,
        quantity: alert.quantity, invested, currentVal, pnl, pnlPct,
        action: "STOP LOSS HIT — Consider selling to limit further losses on Groww.",
        color: "#e74c3c", emoji: "🛑"
      });
    }

    if (triggered) {
      try {
        await fetch("/api/alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: USER_EMAIL, subject: emailSubject, html: emailHTML })
        });
        // Mark triggered
        const allAlerts = loadAlerts();
        const idx = allAlerts.findIndex(a => a.id === alert.id);
        if (idx >= 0) { allAlerts[idx].status = "triggered"; allAlerts[idx].triggeredAt = new Date().toISOString(); allAlerts[idx].triggeredPrice = price; }
        saveAlerts(allAlerts);
        showAlertNotification(alert.symbol, price >= alert.targetPrice ? "target" : "stoploss", price);
      } catch(e) { console.error("Email send failed:", e); }
    }
  }
}

function buildEmailHTML({ type, symbol, name, buyPrice, currentPrice, targetPrice, stopLoss, quantity, invested, currentVal, pnl, pnlPct, action, color, emoji }) {
  const isProfit = pnl >= 0;
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',sans-serif">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

  <!-- HEADER -->
  <div style="background:${color};padding:28px 24px;text-align:center">
    <div style="font-size:42px;margin-bottom:8px">${emoji}</div>
    <div style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.5px">${type} ALERT</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:4px">${symbol} · ${name}</div>
  </div>

  <!-- PRICE BANNER -->
  <div style="background:${color}18;border-bottom:2px solid ${color}30;padding:20px 24px;text-align:center">
    <div style="font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Current Price</div>
    <div style="font-size:36px;font-weight:800;color:#1a1a2e;font-family:monospace">₹${currentPrice.toFixed(2)}</div>
    <div style="font-size:14px;color:${isProfit?"#00b386":"#e74c3c"};font-weight:700;margin-top:4px">${isProfit?"▲":"▼"} ${Math.abs(pnlPct).toFixed(2)}% from your buy price</div>
  </div>

  <!-- STATS TABLE -->
  <div style="padding:20px 24px">
    <table style="width:100%;border-collapse:collapse">
      <tr style="background:#f8fafc">
        <td style="padding:11px 14px;font-size:13px;color:#6b7280;font-weight:500;border-radius:8px 0 0 8px">Your Buy Price</td>
        <td style="padding:11px 14px;font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;font-family:monospace;border-radius:0 8px 8px 0">₹${buyPrice.toFixed(2)}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr style="background:#f8fafc">
        <td style="padding:11px 14px;font-size:13px;color:#6b7280;font-weight:500;border-radius:8px 0 0 8px">Quantity</td>
        <td style="padding:11px 14px;font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;font-family:monospace;border-radius:0 8px 8px 0">${quantity} shares</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr style="background:#f8fafc">
        <td style="padding:11px 14px;font-size:13px;color:#6b7280;font-weight:500;border-radius:8px 0 0 8px">Amount Invested</td>
        <td style="padding:11px 14px;font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;font-family:monospace;border-radius:0 8px 8px 0">₹${invested.toFixed(2)}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr style="background:#f8fafc">
        <td style="padding:11px 14px;font-size:13px;color:#6b7280;font-weight:500;border-radius:8px 0 0 8px">Current Value</td>
        <td style="padding:11px 14px;font-size:14px;font-weight:700;color:#1a1a2e;text-align:right;font-family:monospace;border-radius:0 8px 8px 0">₹${currentVal.toFixed(2)}</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr style="background:${isProfit?"#e6f9f4":"#fdecea"}">
        <td style="padding:11px 14px;font-size:13px;font-weight:700;color:${isProfit?"#008f6b":"#c0392b"};border-radius:8px 0 0 8px">P&amp;L</td>
        <td style="padding:11px 14px;font-size:15px;font-weight:800;color:${isProfit?"#008f6b":"#c0392b"};text-align:right;font-family:monospace;border-radius:0 8px 8px 0">${isProfit?"+":""} ₹${pnl.toFixed(2)} (${isProfit?"+":""}${pnlPct.toFixed(2)}%)</td>
      </tr>
      <tr><td colspan="2" style="height:4px"></td></tr>
      <tr style="background:#f8fafc">
        <td style="padding:11px 14px;font-size:13px;color:#6b7280;font-weight:500;border-radius:8px 0 0 8px">Target Price</td>
        <td style="padding:11px 14px;font-size:14px;font-weight:700;color:#00b386;text-align:right;font-family:monospace;border-radius:0 8px 8px 0">₹${targetPrice.toFixed(2)}</td>
      </tr>
      ${stopLoss>0?`<tr><td colspan="2" style="height:4px"></td></tr>
      <tr style="background:#f8fafc">
        <td style="padding:11px 14px;font-size:13px;color:#6b7280;font-weight:500;border-radius:8px 0 0 8px">Stop Loss</td>
        <td style="padding:11px 14px;font-size:14px;font-weight:700;color:#e74c3c;text-align:right;font-family:monospace;border-radius:0 8px 8px 0">₹${stopLoss.toFixed(2)}</td>
      </tr>`:""}
    </table>
  </div>

  <!-- ACTION BANNER -->
  <div style="margin:0 24px 20px;background:${color};border-radius:12px;padding:16px 20px;text-align:center">
    <div style="font-size:15px;font-weight:700;color:white">${action}</div>
  </div>

  <!-- FOOTER -->
  <div style="padding:16px 24px 24px;border-top:1px solid #f0f0f0;text-align:center">
    <div style="font-size:11px;color:#9ca3af;line-height:1.6">
      This is an automated alert from <strong>Alpha Scanner</strong> for Groww investors.<br>
      Always verify prices on <strong>NSE/BSE</strong> before trading.<br>
      <em>Not SEBI-registered financial advice.</em>
    </div>
    <div style="margin-top:8px;font-size:10px;color:#c4c4c4">Triggered at ${new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</div>
  </div>
</div>
</body></html>`;
}

function showAlertNotification(symbol, type, price) {
  const msg = type === "target"
    ? `🎯 ${symbol} hit your target! Price: ₹${price.toFixed(2)}. Check your email!`
    : `🛑 ${symbol} hit stop loss! Price: ₹${price.toFixed(2)}. Check your email!`;

  if (window.Notification && Notification.permission === "granted") {
    new Notification("Alpha Scanner Alert", { body: msg, icon: "/favicon.ico" });
  }
  // Also show in-app toast
  showToast(msg, type === "target" ? "success" : "error");
}

function showToast(msg, type="success") {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:${type==="success"?"#00b386":type==="error"?"#e74c3c":"#1a1a2e"};color:white;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;z-index:9999;max-width:320px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.2);animation:slideUp .3s ease`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// CSS for toast animation
const style = document.createElement("style");
style.textContent = `@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
document.head.appendChild(style);
