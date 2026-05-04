export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, subject, html, text } = req.body;
  if (!to || !subject) return res.status(400).json({ error: "Missing fields" });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: "Alpha Scanner <alerts@resend.dev>",
        to: [to],
        subject,
        html: html || `<p>${text}</p>`,
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Resend error:", data);
      return res.status(502).json({ error: data.message || "Email send failed" });
    }
    return res.status(200).json({ success: true, id: data.id });
  } catch (e) {
    console.error("Alert handler error:", e);
    return res.status(500).json({ error: e.message });
  }
}
