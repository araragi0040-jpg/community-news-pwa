const webpush = require("web-push");

function ensureWebPushConfigured() {
  const subject = process.env.WEB_PUSH_SUBJECT || process.env.VAPID_SUBJECT || "";
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY || "";

  if (!subject || !publicKey || !privateKey) {
    throw new Error("WEB_PUSH_* env is not configured");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function isGoneSubscriptionError(err) {
  const status = err && (err.statusCode || err.status);
  return status === 404 || status === 410;
}

async function fetchSubscriptionsFromGAS(secret) {
  const gasApiUrl = process.env.GAS_API_URL || "";

  if (!gasApiUrl) {
    throw new Error("GAS_API_URL env is not configured");
  }

  const res = await fetch(gasApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "listPushSubscriptionsForServer",
      secret
    })
  });

  const text = await res.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_err) {
    throw new Error("GAS response is not JSON: " + text.slice(0, 200));
  }

  if (!data.ok) {
    throw new Error(data.message || data.error || "Failed to fetch subscriptions from GAS");
  }

  return Array.isArray(data.subscriptions) ? data.subscriptions : [];
}

module.exports = async function handler(req, res) {
  // ==============================
  // CORS設定
  // GitHub Pages demo から Vercel API を叩けるようにする
  // ==============================
  const origin = req.headers.origin || "*";

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );

  // preflight request 対応
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

    const expectedSecret = String(
      process.env.PUSH_WEBHOOK_SECRET ||
      process.env.PUSH_API_SECRET ||
      ""
    );

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});

    const secret = String(body.secret || "");

    if (!expectedSecret || secret !== expectedSecret) {
      return res.status(401).json({
        ok: false,
        error: "unauthorized",
        message: "secretが一致しません。"
      });
    }

    // payload形式・直書き形式の両方に対応
    const payload = body.payload || {};

    const title = String(payload.title || body.title || "語り場ニュース");
    const message = String(payload.body || body.body || "新しいお知らせがあります。");
    const icon = String(payload.icon || body.icon || "/favicon.png");
    const url = String(payload.url || body.url || "/");
    const type = String(payload.type || body.type || "admin_notice");

    // body.subscriptions があればそれを使う
    // なければGAS/スプシから取得する
    let subscriptions = Array.isArray(body.subscriptions)
      ? body.subscriptions
      : [];

    if (subscriptions.length === 0) {
      subscriptions = await fetchSubscriptionsFromGAS(secret);
    }

    const pushPayload = JSON.stringify({
      title,
      body: message,
      icon,
      badge: icon,
      url,
      type
    });

    const result = {
      ok: true,
      sentCount: 0,
      failedCount: 0,
      totalSubscriptions: subscriptions.length,
      expiredEndpoints: []
    };

    for (const sub of subscriptions) {
      if (!sub || !sub.endpoint) continue;

      const subscription = {
        endpoint: sub.endpoint,
        keys: sub.keys || {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(subscription, pushPayload);
        result.sentCount += 1;
      } catch (err) {
        result.failedCount += 1;

        if (isGoneSubscriptionError(err)) {
          result.expiredEndpoints.push(String(subscription.endpoint));
        }

        console.warn(
          "webpush.sendNotification failed:",
          subscription.endpoint,
          err && err.message ? err.message : err
        );
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
