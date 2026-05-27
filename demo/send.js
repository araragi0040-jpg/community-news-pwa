const webpush = require("web-push");

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.PUSH_ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function sendJson(res, status, body) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(body);
}

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

function normalizeBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body;
}

module.exports = async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  try {
    ensureWebPushConfigured();

    const expectedSecret = String(process.env.PUSH_WEBHOOK_SECRET || "");
    const body = normalizeBody(req);
    const secret = String(body.secret || "");
    if (!expectedSecret || secret !== expectedSecret) {
      return sendJson(res, 401, { ok: false, error: "unauthorized" });
    }

    const payload = body.payload || {};
    const subscriptions = Array.isArray(body.subscriptions)
      ? body.subscriptions
      : (body.subscription ? [body.subscription] : []);

    const title = String(payload.title || "語り場ニュース");
    const message = String(payload.body || "新しいお知らせがあります。");
    const icon = String(payload.icon || "/favicon.png");
    const badge = String(payload.badge || icon || "/favicon.png");
    const url = String(payload.url || "/");

    const pushPayload = JSON.stringify({
      title,
      body: message,
      icon,
      badge,
      url,
      tag: String(payload.tag || "community-news")
    });

    const result = {
      ok: true,
      sent: 0,
      failed: 0,
      skipped: 0,
      expiredEndpoints: []
    };

    for (const sub of subscriptions) {
      if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
        result.skipped += 1;
        continue;
      }
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

    return sendJson(res, 200, result);
  } catch (err) {
    console.error("push send handler error:", err);
    return sendJson(res, 500, {
      ok: false,
      error: "server_error",
      message: String(err && err.message ? err.message : err)
    });
  }
};
