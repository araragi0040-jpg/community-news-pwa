/* Event Collection v001. Add this file to the DEMO Apps Script project only.
 * Run setupEventCollection once after setting the properties described in README.
 * Collection reads do not create sheets or modify existing application data.
 */
const EC_TABLES = {
  events: { name: "CollectionEvents", headers: ["id", "name", "description", "active", "createdAt", "updatedAt"] },
  cards: { name: "CollectionCards", headers: ["id", "eventId", "year", "imagePath", "published", "distributionEnabled", "relatedPostId", "createdAt", "updatedAt"] },
  claims: { name: "CollectionClaims", headers: ["userId", "cardId", "acquiredAt", "qrId", "heldOn"] },
  qrs: { name: "CollectionQrs", headers: ["id", "cardId", "heldOn", "startsAt", "endsAt", "enabled", "createdAt"] }
};

function ecError_(message, code) { throw fail(message, code || "COLLECTION_INVALID"); }
function ecProps_() { return PropertiesService.getScriptProperties(); }
function ecEnvironment_() {
  const p = ecProps_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (p.getProperty("COLLECTION_ENV") !== "demo" || !ss ||
      String(ss.getId()) !== String(p.getProperty("COLLECTION_SPREADSHEET_ID") || "")) {
    ecError_("コレクションのDEMO保存先設定を確認してください。", "COLLECTION_NOT_CONFIGURED");
  }
  return ss;
}
function ecSheet_(key) {
  const table = EC_TABLES[key];
  const sheet = ecEnvironment_().getSheetByName(table.name);
  if (!sheet) ecError_("setupEventCollectionを実行してください。", "COLLECTION_NOT_CONFIGURED");
  const headers = sheet.getRange(1, 1, 1, table.headers.length).getValues()[0];
  if (table.headers.some((h, i) => headers[i] !== h)) ecError_(table.name + "の見出しを確認してください。", "COLLECTION_NOT_CONFIGURED");
  return sheet;
}
function ecRows_(key) {
  const sheet = ecSheet_(key);
  return sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, EC_TABLES[key].headers.length).getValues()
    .map(row => { const obj = {}; EC_TABLES[key].headers.forEach((h, i) => { obj[h] = row[i]; }); return obj; });
}
function ecWrite_(key, record) {
  const sheet = ecSheet_(key);
  const rows = ecRows_(key);
  const index = rows.findIndex(r => String(r.id) === String(record.id));
  const values = EC_TABLES[key].headers.map(h => record[h] === undefined ? "" : record[h]);
  if (index < 0) sheet.appendRow(values);
  else sheet.getRange(index + 2, 1, 1, values.length).setValues([values]);
  return record;
}
function ecLocked_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function setupEventCollection() {
  return ecLocked_(function () {
    const ss = ecEnvironment_();
    Object.keys(EC_TABLES).forEach(key => {
      const table = EC_TABLES[key];
      let sheet = ss.getSheetByName(table.name);
      if (!sheet) sheet = ss.insertSheet(table.name);
      if (sheet.getLastRow() === 0) { sheet.appendRow(table.headers); sheet.setFrozenRows(1); }
      ecSheet_(key);
    });
    if (!ecProps_().getProperty("COLLECTION_QR_SECRET")) {
      ecProps_().setProperty("COLLECTION_QR_SECRET", Utilities.getUuid() + Utilities.getUuid());
    }
    ecBaseUrl_();
    return { ok: true, environment: "demo", sheets: Object.keys(EC_TABLES).map(k => EC_TABLES[k].name) };
  });
}
function ecBool_(value) { return value === true || String(value).toLowerCase() === "true"; }
function ecText_(value, max, required) {
  const text = String(value || "").trim();
  if ((required && !text) || text.length > max || /^[=+@\-]/.test(text)) ecError_("入力内容・文字数を確認してください。");
  return text;
}
function ecDate_(value) {
  const text = String(value || "").trim();
  const date = new Date(text + "T00:00:00+09:00");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || isNaN(date.getTime()) || Utilities.formatDate(date, "Asia/Tokyo", "yyyy-MM-dd") !== text) ecError_("開催日を正しく入力してください。");
  return text;
}
function ecTime_(value) {
  if (!/T.*(Z|[+-]\d{2}:\d{2})$/.test(String(value || ""))) ecError_("配布期間を正しく入力してください。");
  const date = new Date(value);
  if (isNaN(date.getTime())) ecError_("配布期間を正しく入力してください。");
  return date.toISOString();
}
function ecImagePath_(value) {
  const path = String(value || "").trim().replace(/^\.\//, "");
  if (!/^collection-images\/[A-Za-z0-9_\/-]+\.(png|jpe?g|webp|gif)$/i.test(path)) ecError_("画像はcollection-images/内に置き、半角英数字のファイル名を指定してください。");
  return path;
}
function ecBaseUrl_() {
  const base = String(ecProps_().getProperty("COLLECTION_APP_BASE_URL") || "").trim();
  if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?\/(?:[A-Za-z0-9_-]+\/)*demo\/$/.test(base)) {
    ecError_("COLLECTION_APP_BASE_URLに末尾が/demo/のDEMO公開URLを設定してください。", "COLLECTION_NOT_CONFIGURED");
  }
  return base;
}
function ecQrToken_(id) {
  const secret = ecProps_().getProperty("COLLECTION_QR_SECRET");
  if (!secret) ecError_("QR設定がありません。", "COLLECTION_NOT_CONFIGURED");
  return id + "." + Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature("event-collection:" + id, secret)).replace(/=+$/, "");
}
function ecQrUrl_(qr) { return ecBaseUrl_() + "#collection-claim=" + encodeURIComponent(ecQrToken_(qr.id)); }
function ecFindQr_(token) {
  const text = String(token || "");
  if (text.length > 200 || !/^[a-f0-9-]+\.[A-Za-z0-9_-]+$/i.test(text)) ecError_("このQRコードは現在利用できません。", "COLLECTION_QR_INVALID");
  const id = text.split(".")[0];
  if (!safeEquals(text, ecQrToken_(id))) ecError_("このQRコードは現在利用できません。", "COLLECTION_QR_INVALID");
  const qr = ecRows_("qrs").find(r => String(r.id) === id);
  const card = qr && ecRows_("cards").find(r => r.id === qr.cardId);
  const event = card && ecRows_("events").find(r => r.id === card.eventId);
  const now = Date.now();
  if (!qr || !card || !event || !ecBool_(qr.enabled) || !ecBool_(card.published) ||
      !ecBool_(card.distributionEnabled) || !ecBool_(event.active) ||
      !isFinite(new Date(qr.startsAt).getTime()) || !isFinite(new Date(qr.endsAt).getTime()) ||
      now < new Date(qr.startsAt).getTime() || now >= new Date(qr.endsAt).getTime()) {
    ecError_("このQRコードは現在利用できません。有効期間外、または配布が停止されています。", "COLLECTION_QR_INVALID");
  }
  return { qr: qr, card: card, event: event };
}
function ecClientCard_(card, event, claim) {
  return { id: card.id, eventId: card.eventId, eventName: event.name, description: event.description,
    year: Number(card.year), acquired: !!claim, acquiredAt: claim ? claim.acquiredAt : "", heldOn: claim ? claim.heldOn : "",
    imagePath: claim ? card.imagePath : "", relatedPostId: claim ? card.relatedPostId : "" };
}
function ecList_(user) {
  const events = ecRows_("events");
  const claims = ecRows_("claims").filter(r => String(r.userId) === String(user.id));
  const cards = ecRows_("cards").map(card => {
    const claim = claims.find(r => r.cardId === card.id);
    const event = events.find(r => r.id === card.eventId);
    return event && (claim || (ecBool_(card.published) && ecBool_(event.active))) ? ecClientCard_(card, event, claim) : null;
  }).filter(Boolean);
  return { ok: true, cards: cards };
}
function ecClaim_(user, token) {
  return ecLocked_(function () {
    const found = ecFindQr_(token);
    let claim = ecRows_("claims").find(r => String(r.userId) === String(user.id) && r.cardId === found.card.id);
    const alreadyAcquired = !!claim;
    if (!claim) {
      claim = { userId: user.id, cardId: found.card.id, acquiredAt: new Date().toISOString(), qrId: found.qr.id, heldOn: found.qr.heldOn };
      ecSheet_("claims").appendRow(EC_TABLES.claims.headers.map(h => claim[h]));
    }
    return { ok: true, alreadyAcquired: alreadyAcquired, card: ecClientCard_(found.card, found.event, claim) };
  });
}
function ecSaveEvent_(input) {
  return ecLocked_(function () {
    const old = input.id ? ecRows_("events").find(r => r.id === input.id) : null;
    if (input.id && !old) ecError_("イベントが見つかりません。");
    const now = new Date().toISOString();
    const event = { id: old ? old.id : Utilities.getUuid(), name: ecText_(input.name, 100, true), description: ecText_(input.description, 2000, false), active: ecBool_(input.active), createdAt: old ? old.createdAt : now, updatedAt: now };
    ecWrite_("events", event);
    return { ok: true, event: event };
  });
}
function ecSaveCard_(input) {
  return ecLocked_(function () {
    const cards = ecRows_("cards");
    const old = input.id ? cards.find(r => r.id === input.id) : null;
    if (input.id && !old) ecError_("カードが見つかりません。");
    const eventId = ecText_(input.eventId, 100, true);
    if (!ecRows_("events").some(e => e.id === eventId)) ecError_("イベントを選択してください。");
    const year = Number(input.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2200) ecError_("年は2000〜2200で入力してください。");
    if (cards.some(c => c.id !== (old && old.id) && c.eventId === eventId && Number(c.year) === year)) ecError_("同じイベント・年のカードは登録済みです。");
    const imagePath = ecImagePath_(input.imagePath);
    if (old && ecRows_("claims").some(c => c.cardId === old.id) &&
        (old.eventId !== eventId || Number(old.year) !== year || old.imagePath !== imagePath)) ecError_("獲得済みカードのイベント・年・画像は変更できません。", "COLLECTION_CARD_LOCKED");
    const now = new Date().toISOString();
    const card = { id: old ? old.id : Utilities.getUuid(), eventId: eventId, year: year, imagePath: imagePath,
      published: ecBool_(input.published), distributionEnabled: ecBool_(input.distributionEnabled),
      relatedPostId: ecText_(input.relatedPostId, 100, false), createdAt: old ? old.createdAt : now, updatedAt: now };
    ecWrite_("cards", card);
    return { ok: true, card: card };
  });
}
function ecCreateQr_(input) {
  return ecLocked_(function () {
    const card = ecRows_("cards").find(r => r.id === input.cardId);
    if (!card) ecError_("カードを選択してください。");
    const heldOn = ecDate_(input.heldOn);
    if (Number(heldOn.slice(0, 4)) !== Number(card.year)) ecError_("開催日はカードと同じ年を指定してください。");
    const startsAt = ecTime_(input.startsAt), endsAt = ecTime_(input.endsAt);
    if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) ecError_("終了日時は開始日時より後にしてください。");
    const qr = { id: Utilities.getUuid(), cardId: card.id, heldOn: heldOn, startsAt: startsAt, endsAt: endsAt, enabled: true, createdAt: new Date().toISOString() };
    const url = ecQrUrl_(qr);
    ecWrite_("qrs", qr);
    return { ok: true, qr: qr, url: url };
  });
}
function ecSetQrEnabled_(input) {
  return ecLocked_(function () {
    const qr = ecRows_("qrs").find(r => r.id === input.id);
    if (!qr) ecError_("QRが見つかりません。");
    qr.enabled = ecBool_(input.enabled);
    ecWrite_("qrs", qr);
    return { ok: true };
  });
}
function eventCollectionApi(body) {
  ecEnvironment_();
  const action = body.action;
  if (action === "collectionQrInfo") {
    const found = ecFindQr_(body.qrToken);
    return { ok: true, eventName: found.event.name, year: Number(found.card.year), heldOn: found.qr.heldOn };
  }
  const user = requireAuth(getTokenFromPost(body));
  if (action === "collectionList") return ecList_(user);
  if (action === "collectionClaim") return ecClaim_(user, body.qrToken);
  requireAdmin(getTokenFromPost(body));
  if (action === "collectionAdminList") {
    return { ok: true, events: ecRows_("events"), cards: ecRows_("cards"), qrs: ecRows_("qrs").map(qr => Object.assign({}, qr, { url: ecQrUrl_(qr) })) };
  }
  if (action === "collectionSaveEvent") return ecSaveEvent_(body.event || {});
  if (action === "collectionSaveCard") return ecSaveCard_(body.card || {});
  if (action === "collectionCreateQr") return ecCreateQr_(body.qr || {});
  if (action === "collectionSetQrEnabled") return ecSetQrEnabled_(body.qr || {});
  ecError_("未対応のコレクション操作です。", "BAD_REQUEST");
}
