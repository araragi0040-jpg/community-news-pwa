const webpush = require("web-push");

function ensureWebPushConfigured() {
  const subject = process.env.WEB_PUSH_SUBJECT || "";
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || "";
  if (!subject || !publicKey || !privateKey) {
    throw new Error("WEB_PUSH_* env is not configured");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function isGoneSubscriptionError(err) {
  const status = err && (err.statusCode || err.status);
  return status === 404 || status === 410;
}

module.exports = async function handler(req, res) {
  const allowedOrigins = [
    "https://araragi0040-jpg.github.io",
    "https://community-news-pwa.vercel.app"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Method Not Allowed"
    });
  }

  try {
    ensureWebPushConfigured();

    const expectedSecret = String(process.env.PUSH_WEBHOOK_SECRET || "");
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const secret = String(body.secret || "");
    if (!expectedSecret || secret !== expectedSecret) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const payload = body.payload || {};
    const subscriptions = Array.isArray(body.subscriptions) ? body.subscriptions : [];
    const title = String(payload.title || "語り場ニュース");
    const message = String(payload.body || "新しいお知らせがあります。");
    const icon = String(payload.icon || "");
    const url = String(payload.url || "/");

    const pushPayload = JSON.stringify({
      title,
      body: message,
      icon,
      badge: icon,
      url
    });

    const result = {
      ok: true,
      sent: 0,
      failed: 0,
      expiredEndpoints: []
    };

    for (const sub of subscriptions) {
      if (!sub || !sub.endpoint) continue;
      try {
        await webpush.sendNotification(sub, pushPayload);
        result.sent += 1;
      } catch (err) {
        result.failed += 1;
        if (isGoneSubscriptionError(err)) {
          result.expiredEndpoints.push(String(sub.endpoint));
        }
        console.warn("webpush.sendNotification failed:", sub.endpoint, err && err.message ? err.message : err);
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("push send handler error:", err);
    return res.status(500).json({
      ok: false,
      error: "server_error",
      message: String(err && err.message ? err.message : err)
    });
  }
};
