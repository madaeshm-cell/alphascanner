# Groww Alpha Scanner 📈

AI-powered Indian stock market scanner built for Groww retail investors.  
Prices in ₹ · NSE & BSE · Mobile-first · Auto-refreshes every 30 seconds.

---

## 🚀 Deploy to Vercel (5 minutes)

### Step 1 — Get your Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Click **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-...`)

### Step 2 — Upload to GitHub
1. Go to [github.com/new](https://github.com/new)
2. Create a new repository (e.g. `groww-scanner`)
3. Upload all these files keeping the same folder structure:
   ```
   groww-scanner/
   ├── public/
   │   ├── index.html
   │   ├── style.css
   │   └── app.js
   ├── api/
   │   └── ai.js
   ├── vercel.json
   ├── package.json
   └── README.md
   ```

### Step 3 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New Project**
3. Select your `groww-scanner` repository
4. Click **Deploy** (no build settings needed)

### Step 4 — Add your API Key
1. In Vercel dashboard → your project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your key from Step 1
3. Click **Save**
4. Go to **Deployments** → click **Redeploy**

### Step 5 — Open on mobile!
Your app will be live at: `https://your-project-name.vercel.app`

Open that URL on your phone and add it to your home screen:
- **iPhone:** Safari → Share → "Add to Home Screen"
- **Android:** Chrome → Menu → "Add to Home Screen"

---

## 📱 Features

- **Top 10 AI picks** ranked by: low price, RSI oversold, momentum, sector strength
- **Real-time ticker** — NIFTY 50, SENSEX, BANK NIFTY, NIFTY IT, USD/INR, Gold MCX
- **AI commentary** powered by Claude — India-specific themes
- **Groww integration** — tap any stock card to open directly in Groww
- **Auto-refresh** every 30 seconds
- **Mobile PWA-ready** — works like a native app

---

## ⚠ Disclaimer

This app is for **educational purposes only**.  
It is **not SEBI-registered financial advice**.  
Prices shown are **simulated for demonstration** — always verify on Groww/NSE before investing.  
Past performance does not guarantee future returns.

---

## 🔧 Local Development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`
