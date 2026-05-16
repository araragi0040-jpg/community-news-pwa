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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
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
    const icon = String(payload.icon || "./favicon.png");
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
      failed: 0
    };

    for (const sub of subscriptions) {
      if (!sub || !sub.endpoint) continue;
      try {
        await webpush.sendNotification(sub, pushPayload);
        result.sent += 1;
      } catch (_err) {
        result.failed += 1;
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      message: String(err && err.message ? err.message : err)
    });
  }
};
