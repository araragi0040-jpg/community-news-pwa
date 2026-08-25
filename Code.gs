const SHEET_NAME = "posts";
const EVENTS_SHEET_NAME = "events";
const CONTACT_SHEET_NAME = "contacts";
const USERS_SHEET_NAME = "users";
const AUTH_SECRET_PROP = "AUTH_SECRET";
const APP_BASE_URL_PROP = "APP_BASE_URL";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_LOCK_SECONDS = 15 * 60;
const RESET_REQ_LIMIT = 3;
const RESET_REQ_WINDOW_SECONDS = 60 * 60;
const CONTACT_INTERVAL_SECONDS = 5 * 60;

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "listPosts";
    const token = getTokenFromGet(e);

    if (action === "ping") {
      return outputJson({ ok: true });
    }

    if (action === "listPosts") {
      requireAuth(token);
      return outputJson({ ok: true, posts: getPosts(false) });
    }

    if (action === "listAllPosts") {
      requireAdmin(token);
      return outputJson({ ok: true, posts: getPosts(true) });
    }

    if (action === "listEvents") {
      requireAuth(token);
      return outputJson({ ok: true, events: getEvents(false) });
    }

    if (action === "listAllEvents") {
      requireAdmin(token);
      return outputJson({ ok: true, events: getEvents(true) });
    }

    if (action === "listEditableEvents") {
      const user = requireEventEditorOrAdmin(token);
      return outputJson({ ok: true, events: getEditableEvents(user) });
    }

    throw fail("Unknown action", "BAD_REQUEST");
  } catch (err) {
    return outputError(err);
  }
}

function doPost(e) {
  try {
    const body = parseRequestBody(e);
    const action = body.action || "";
    const token = getTokenFromPost(body);

    if (action === "savePost") {
      requireAdmin(token);
      return outputJson({ ok: true, post: savePost(body.post || {}) });
    }

    if (action === "recordPostView") {
      const user = requireAuth(token);
      const stats = recordPostView(body.id || "", user.id || "");
      return outputJson({
        ok: true,
        totalViews: Number(stats.totalViews || 0),
        uniqueViewCount: Number(stats.uniqueViewCount || 0)
      });
    }

    if (action === "deletePost") {
      requireAdmin(token);
      deletePost(body.id || "");
      return outputJson({ ok: true });
    }

    if (action === "saveEvent") {
      const user = requireEventEditorOrAdmin(token);
      return outputJson({ ok: true, event: saveEvent(body.event || {}, user) });
    }

    if (action === "deleteEvent") {
      const user = requireEventEditorOrAdmin(token);
      deleteEvent(body.id || "", user);
      return outputJson({ ok: true });
    }

    if (action === "uploadImage") {
      requireAuth(token);
      const result = uploadImage(body);
      return outputJson({ ok: true, url: result.url });
    }

    if (action === "saveContact") {
      requireAuth(token);
      return outputJson({ ok: true, contact: saveContact(body.contact || {}) });
    }

    if (action === "getProfile") {
      const user = requireAuth(token);
      return outputJson({
        ok: true,
        profile: {
          nickname: user.nickname || "",
          iconUrl: user.iconUrl || "",
          hobby: user.hobby || "",
          interests: user.interests || "",
          points: Number(user.points || 0)
        }
      });
    }

    if (action === "saveProfile") {
      const user = requireAuth(token);
      const profile = saveProfile(user.id, body.profile || {});
      return outputJson({ ok: true, profile: profile });
    }

    if (action === "touchDailyPoint") {
      const user = requireAuth(token);
      return outputJson({ ok: true, points: touchDailyPoint(user.id || "") });
    }

    if (action === "createGachaTicket") {
  const user = requireAuth(token);
  return outputJson(createGachaTicket(user.id || ""));
  }

  if (action === "getGachaStatus") {
  return outputJson(getGachaStatus(body.ticket || ""));
  }

  if (action === "useGachaPoint" || action === "usePoint") {
  return outputJson(useGachaPoint(body.ticket || ""));
  }

if (action === "useGachaPoints") {
  return outputJson(useGachaPoints(body.ticket || "", body.count || 1));
}

if (action === "refundGachaPoints") {
  return outputJson(refundGachaPoints(body.ticket || "", body.count || 1));
}

if (action === "getGachaCollection") {
  return outputJson(getGachaCollection(body.ticket || ""));
}

if (action === "saveGachaResult") {
  return outputJson(saveGachaResult(body.ticket || "", body.result || body.figure || {}, body.requestId || ""));
}

if (action === "saveGachaResults") {
  return outputJson(saveGachaResults(body.ticket || "", body.results || [], body.requestId || ""));
}

if (action === "importLocalGachaInventory") {
  return outputJson(importLocalGachaInventory(body.ticket || "", body.items || []));
}

if (action === "getExchangeStatus") {
  return outputJson(getGachaCollection(body.ticket || ""));
}

if (action === "exchangeFigure" || action === "exchangeExFigure") {
  return outputJson(exchangeGachaFigure(body.ticket || "", body.figureId || "", body.requestId || ""));
}

if (action === "savePushSubscription") {
  const user = requireAuth(token);
  return outputJson(savePushSubscription(user.id || "", body.subscription || {}));
}

if (action === "removePushSubscription") {
  const user = requireAuth(token);
  return outputJson(removePushSubscription(user.id || "", body.endpoint || ""));
}

if (action === "listPushSubscriptions") {
  requireAdmin(token);
  return outputJson({
    ok: true,
    subscriptions: listPushSubscriptions()
  });
}

if (action === "listPushSubscriptionsForServer") {
  const expectedSecret = String(PropertiesService.getScriptProperties().getProperty(PUSH_WEBHOOK_SECRET_PROP) || "").trim();
  const secret = String(body.secret || "").trim();
  if (!expectedSecret || secret !== expectedSecret) {
    throw fail("Unauthorized", "FORBIDDEN");
  }
  return outputJson({
    ok: true,
    subscriptions: listPushSubscriptions()
  });
}

    if (action === "login") {
      const result = loginUser(body.email || "", body.password || "");
      return outputJson({ ok: true, user: result.user, token: result.token });
    }

    if (action === "register") {
      const result = registerUser(body.user || {});
      return outputJson({ ok: true, user: result });
    }

    if (action === "requestPasswordReset") {
      const email = String(body.email || "").trim();
      const appBaseUrl = String(body.appBaseUrl || "").trim();
      requestPasswordReset(email, appBaseUrl);
      return outputJson({ ok: true });
    }

    if (action === "resetPassword") {
      const resetToken = String(body.resetToken || "").trim();
      const newPassword = String(body.newPassword || "").trim();
      resetPassword(resetToken, newPassword);
      return outputJson({ ok: true });
    }

    throw fail("Unknown action", "BAD_REQUEST");
  } catch (err) {
    return outputError(err);
  }
  }

  function parseRequestBody(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    return JSON.parse(raw);
  } catch (_err) {
    throw fail("Invalid JSON body", "BAD_REQUEST");
  }
  }

  function getTokenFromGet(e) {
  return String((e && e.parameter && e.parameter.token) || "").trim();
  }

  function getTokenFromPost(body) {
  return String((body && body.token) || "").trim();
  }

  function uploadImage(body) {
  const fileName = sanitizeFileName(String(body.fileName || ("image_" + Date.now() + ".jpg")));
  const mimeType = String(body.mimeType || "image/jpeg").toLowerCase();
  const dataUrl = String(body.dataUrl || "");
  const allowedMimes = {
    "image/jpeg": true,
    "image/jpg": true,
    "image/png": true,
    "image/webp": true,
    "image/gif": true
  };

  if (!dataUrl) throw fail("dataUrl is required", "BAD_REQUEST");
  if (!allowedMimes[mimeType]) throw fail("Unsupported image type", "BAD_REQUEST");
  if (!/^data:image\/[a-z0-9.+-]+;base64,/.test(dataUrl)) throw fail("Invalid dataUrl", "BAD_REQUEST");

  const base64 = dataUrl.split(",")[1];
  if (!base64) throw fail("Invalid dataUrl", "BAD_REQUEST");
  const bytes = Utilities.base64Decode(base64);

  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folderId = "1ZmhtBMhwa5nyDmAObnW0WRsfYqRds_-7";
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  return {
    ok: true,
    url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w2400"
  };
  }

  function sanitizeFileName(name) {
  return String(name || "image.jpg")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 120);
  }

  function getSheet() {
  return ensurePostsSheet();
  }

  function getPostsSheetForRead() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw fail("posts sheet not found", "SERVER_ERROR");
  return sheet;
  }

  function ensurePostsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "id",
      "date",
      "channel",
      "tone",
      "badge",
      "title",
      "tags",
      "summary",
      "body",
      "ctaText",
      "ctaUrl",
      "imageUrls",
      "video",
      "status",
      "publishedAt",
      "scheduledAt",
      "updatedAt",
      "totalViews",
      "uniqueViewCount",
      "viewerUserIdsJson"
    ]);
  }

  ensurePostColumns(sheet);
  applyPostMetricColumnFormats(sheet);
  return sheet;
  }

  function ensurePostColumns(sheet) {
  const required = [
    "id",
    "date",
    "channel",
    "tone",
    "badge",
    "title",
    "tags",
    "summary",
    "body",
    "ctaText",
    "ctaUrl",
    "imageUrls",
    "video",
    "status",
    "publishedAt",
    "scheduledAt",
    "updatedAt",
    "totalViews",
    "uniqueViewCount",
    "viewerUserIdsJson"
  ];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  required.forEach(col => {
    if (headers.indexOf(col) === -1) {
      sheet.insertColumnAfter(sheet.getLastColumn());
      sheet.getRange(1, sheet.getLastColumn()).setValue(col);
      headers.push(col);
    }
  });

  return headers;
  }

  function parseMetricCell(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    const base = new Date(1899, 11, 30, 0, 0, 0, 0);
    const diffDays = Math.round((value.getTime() - base.getTime()) / 86400000);
    return Number.isFinite(diffDays) && diffDays > 0 ? diffDays : 0;
  }

  const raw = String(value).trim();
  if (!raw) return 0;
  if (raw === "#NUM!" || raw === "#VALUE!" || raw === "#ERROR!" || raw === "NaN") return 0;

  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } 

  function applyPostMetricColumnFormats(sheet) {
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const totalViewsCol = headers.indexOf("totalViews");
  const uniqueViewCountCol = headers.indexOf("uniqueViewCount");
  const viewerUserIdsJsonCol = headers.indexOf("viewerUserIdsJson");

  if (totalViewsCol >= 0) {
    sheet.getRange(2, totalViewsCol + 1, lastRow - 1, 1).setNumberFormat("0");
  }
  if (uniqueViewCountCol >= 0) {
    sheet.getRange(2, uniqueViewCountCol + 1, lastRow - 1, 1).setNumberFormat("0");
  }
  if (viewerUserIdsJsonCol >= 0) {
    sheet.getRange(2, viewerUserIdsJsonCol + 1, lastRow - 1, 1).setNumberFormat("@");
  }
  }

  function repairPostMetrics() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    applyPostMetricColumnFormats(sheet);
    return { ok: true, repaired: 0 };
  }

  const headers = values[0];
  const totalViewsCol = headers.indexOf("totalViews");
  const uniqueViewCountCol = headers.indexOf("uniqueViewCount");
  const viewerUserIdsJsonCol = headers.indexOf("viewerUserIdsJson");

  if (totalViewsCol === -1 || uniqueViewCountCol === -1 || viewerUserIdsJsonCol === -1) {
    throw fail("Post metric columns not found", "SERVER_ERROR");
  }

  const totalValues = [];
  const uniqueValues = [];
  const viewerValues = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const viewerIds = parseViewerUserIds(row[viewerUserIdsJsonCol]);
    const totalViews = parseMetricCell(row[totalViewsCol]);
    const uniqueViewCount = viewerIds.length > 0
      ? viewerIds.length
      : parseMetricCell(row[uniqueViewCountCol]);

    totalValues.push([totalViews]);
    uniqueValues.push([uniqueViewCount]);
    viewerValues.push([JSON.stringify(viewerIds)]);
  }

  sheet.getRange(2, totalViewsCol + 1, totalValues.length, 1).setNumberFormat("0").setValues(totalValues);
  sheet.getRange(2, uniqueViewCountCol + 1, uniqueValues.length, 1).setNumberFormat("0").setValues(uniqueValues);
  sheet.getRange(2, viewerUserIdsJsonCol + 1, viewerValues.length, 1).setNumberFormat("@").setValues(viewerValues);

  return { ok: true, repaired: totalValues.length };
  }

  function runRepairPostMetrics() {
  return repairPostMetrics();
  }

  function getEventsSheet() {
  return ensureEventsSheet();
  }

  function ensureEventsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(EVENTS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(EVENTS_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "id",
      "title",
      "date",
      "startTime",
      "endTime",
      "description",
      "location",
      "imageUrls",
      "ctaUrl",
      "status",
      "createdAt",
      "createdByUserId",
      "createdByName",
      "createdByEmail",
      "updatedByUserId",
      "updatedAt"
    ]);
  }
  ensureEventColumns(sheet);
  return sheet;
  }

  function ensureEventColumns(sheet) {
  const required = [
    "id",
    "title",
    "date",
    "startTime",
    "endTime",
    "description",
    "location",
    "imageUrls",
    "ctaUrl",
    "status",
    "createdAt",
    "createdByUserId",
    "createdByName",
    "createdByEmail",
    "updatedByUserId",
    "updatedAt"
  ];

  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  required.forEach(col => {
    if (headers.indexOf(col) === -1) {
      sheet.insertColumnAfter(sheet.getLastColumn());
      sheet.getRange(1, sheet.getLastColumn()).setValue(col);
      headers.push(col);
    }
  });

  return headers;
  }


  function runEnsureEventEditorColumns() {
  ensureEventsSheet();
  return { ok: true, message: "eventsシートのevent_editor用カラム確認が完了しました。" };
  }

  function getUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(USERS_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "email", "password", "name", "role", "status", "updatedAt"]);
  }
  ensureUsersColumns(sheet);
  return sheet;
  }

  function ensureUsersColumns(sheet) {
  const required = ["id", "email", "password", "name", "role", "status", "updatedAt", "salt", "resetToken", "resetExpiry", "nickname", "iconUrl", "hobby", "interests", "points", "lastPointDate"];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  required.forEach(col => {
    if (headers.indexOf(col) === -1) {
      sheet.insertColumnAfter(sheet.getLastColumn());
      sheet.getRange(1, sheet.getLastColumn()).setValue(col);
      headers.push(col);
    }
  });
  return headers;
  }

  function getContactSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONTACT_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONTACT_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "name", "email", "message", "createdAt"]);
  }
  return sheet;
  }

  function loginUser(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const plainPassword = String(password || "");
  if (!normalizedEmail) throw fail("email is required", "BAD_REQUEST");
  if (!plainPassword) throw fail("password is required", "BAD_REQUEST");
  if (isLoginLocked(normalizedEmail)) {
    throw fail("Too many login attempts. Please try again later.", "RATE_LIMITED");
  }

  const sheet = getUsersSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw fail("No users found", "INVALID_CREDENTIALS");

  const headers = values[0];
  const userIndex = findUserRowIndexByEmail(values, headers, normalizedEmail);
  if (userIndex < 1) {
    recordLoginFailure(normalizedEmail);
    throw fail("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const row = values[userIndex];
  const obj = rowToObj(headers, row);
  const salt = String(obj.salt || "").trim();
  const rowStatus = String(obj.status || "").trim().toLowerCase();

  if (rowStatus !== "active") throw fail("This account is inactive", "ACCOUNT_INACTIVE");

  if (!salt) {
    if (!safeEquals(String(obj.password || ""), plainPassword)) {
      recordLoginFailure(normalizedEmail);
      throw fail("Invalid email or password", "INVALID_CREDENTIALS");
    }
    const newSalt = generateSalt();
    const newHash = hashPassword(plainPassword, newSalt);
    const passwordCol = headers.indexOf("password");
    const saltCol = headers.indexOf("salt");
    const updatedAtCol = headers.indexOf("updatedAt");
    sheet.getRange(userIndex + 1, passwordCol + 1).setValue(newHash);
    sheet.getRange(userIndex + 1, saltCol + 1).setValue(newSalt);
    if (updatedAtCol >= 0) {
      sheet.getRange(userIndex + 1, updatedAtCol + 1).setValue(formatDateTime(new Date()));
    }
  } else {
    const computed = hashPassword(plainPassword, salt);
    if (!safeEquals(String(obj.password || ""), computed)) {
      recordLoginFailure(normalizedEmail);
      throw fail("Invalid email or password", "INVALID_CREDENTIALS");
    }
  }

  let points = Number(obj.points || 0);
  if (!Number.isFinite(points) || points < 0) points = 0;

  const user = {
    id: obj.id || "",
    email: obj.email || "",
    name: obj.name || "",
    role: normalizeRoleValue(obj.role || "member"),
    status: obj.status || "active",
    nickname: obj.nickname || "",
    iconUrl: obj.iconUrl || "",
    hobby: obj.hobby || "",
    interests: obj.interests || "",
    points: points
  };
  clearLoginFailure(normalizedEmail);
  const token = createToken(user.id, user.role);
  return { user, token };
  }

  function registerUser(user) {
  const sheet = getUsersSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  const email = String(user.email || "").trim().toLowerCase();
  const password = String(user.password || "");
  const name = String(user.name || "").trim();

  if (!name) throw fail("name is required", "BAD_REQUEST");
  if (!email) throw fail("email is required", "BAD_REQUEST");
  if (!isValidEmail(email)) throw fail("Invalid email format", "BAD_REQUEST");
  validatePassword(password);

  const emailCol = headers.indexOf("email");
  for (let i = 1; i < values.length; i++) {
    const rowEmail = String(values[i][emailCol] || "").trim().toLowerCase();
    if (rowEmail === email) throw fail("This email is already registered", "CONFLICT");
  }

  const now = formatDateTime(new Date());
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const newUser = {
    id: "u_" + new Date().getTime().toString(36),
    email: email,
    password: passwordHash,
    name: name,
    role: "member",
    status: "active",
    updatedAt: now,
    salt: salt,
    resetToken: "",
    resetExpiry: "",
    nickname: "",
    iconUrl: "",
    hobby: "",
    interests: "",
    points: 0,
    lastPointDate: ""
  };

  const rowData = headers.map(h => (newUser[h] !== undefined && newUser[h] !== null ? newUser[h] : ""));
  sheet.appendRow(rowData);

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    status: newUser.status
  };
  }

  function touchDailyPoint(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw fail("userId is required", "BAD_REQUEST");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getUsersSheet();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) throw fail("User not found", "AUTH_REQUIRED");

    const headers = values[0];
    const idCol = headers.indexOf("id");
    const pointsCol = headers.indexOf("points");
    const lastPointDateCol = headers.indexOf("lastPointDate");
    if (idCol === -1 || pointsCol === -1 || lastPointDateCol === -1) {
      throw fail("User point columns not found", "SERVER_ERROR");
    }

    const rowIndex = findRowIndexById(values, normalizedUserId, idCol);
    if (rowIndex < 0) throw fail("User not found", "AUTH_REQUIRED");

    const rowObj = rowToObj(headers, values[rowIndex]);
    const today = formatDateYMD(new Date());
    let points = Number(rowObj.points || 0);
    if (!Number.isFinite(points) || points < 0) points = 0;
    const lastPointDate = String(rowObj.lastPointDate || "").trim();

    if (lastPointDate !== today) {
      points += 1;
      sheet.getRange(rowIndex + 1, pointsCol + 1).setValue(points);
      sheet.getRange(rowIndex + 1, lastPointDateCol + 1).setValue(today);
    }

    return points;
  } finally {
    lock.releaseLock();
  }
  }

  function migratePasswordsToHash() {
  const sheet = getUsersSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true, migrated: 0 };

  const headers = values[0];
  const passwordCol = headers.indexOf("password");
  const saltCol = headers.indexOf("salt");
  const updatedAtCol = headers.indexOf("updatedAt");
  let migrated = 0;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const currentSalt = String(row[saltCol] || "").trim();
    const currentPassword = String(row[passwordCol] || "");
    if (!currentPassword || currentSalt) continue;
    const salt = generateSalt();
    const hash = hashPassword(currentPassword, salt);
    sheet.getRange(i + 1, passwordCol + 1).setValue(hash);
    sheet.getRange(i + 1, saltCol + 1).setValue(salt);
    if (updatedAtCol >= 0) sheet.getRange(i + 1, updatedAtCol + 1).setValue(formatDateTime(new Date()));
    migrated += 1;
  }

  return { ok: true, migrated: migrated };
  }

  function requestPasswordReset(email, appBaseUrl) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw fail("email is required", "BAD_REQUEST");
  if (!isValidEmail(normalizedEmail)) throw fail("Invalid email format", "BAD_REQUEST");
  const reqCount = incrementCounter("reset:req:" + normalizedEmail, RESET_REQ_WINDOW_SECONDS);
  if (reqCount > RESET_REQ_LIMIT) throw fail("Too many password reset requests", "RATE_LIMITED");

  const sheet = getUsersSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rowIndex = findUserRowIndexByEmail(values, headers, normalizedEmail);
  if (rowIndex < 1) return { ok: true };

  const row = values[rowIndex];
  const obj = rowToObj(headers, row);
  if (String(obj.status || "").toLowerCase() !== "active") return { ok: true };

  const resetToken = Utilities.base64EncodeWebSafe(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + ":" + Date.now()
  )).replace(/=+$/, "");
  const resetExpiry = Date.now() + RESET_TOKEN_TTL_MS;

  const resetTokenCol = headers.indexOf("resetToken");
  const resetExpiryCol = headers.indexOf("resetExpiry");
  const updatedAtCol = headers.indexOf("updatedAt");
  sheet.getRange(rowIndex + 1, resetTokenCol + 1).setValue(resetToken);
  sheet.getRange(rowIndex + 1, resetExpiryCol + 1).setValue(String(resetExpiry));
  if (updatedAtCol >= 0) sheet.getRange(rowIndex + 1, updatedAtCol + 1).setValue(formatDateTime(new Date()));

  const baseUrl = resolveAppBaseUrl(appBaseUrl);
  const separator = baseUrl.indexOf("?") >= 0 ? "&" : "?";
  const resetLink = baseUrl + separator + "resetToken=" + encodeURIComponent(resetToken);
  const subject = "【語り場ニュース】パスワード再設定";
  const bodyText = [
    "パスワード再設定のリクエストを受け付けました。",
    "",
    "以下のリンクから1時間以内に再設定してください。",
    resetLink,
    "",
    "心当たりがない場合はこのメールを破棄してください。"
  ].join("\n");
  MailApp.sendEmail(normalizedEmail, subject, bodyText);

  return { ok: true };
  }

  function resetPassword(resetToken, newPassword) {
  const token = String(resetToken || "").trim();
  if (!token) throw fail("resetToken is required", "BAD_REQUEST");
  validatePassword(String(newPassword || ""));

  const sheet = getUsersSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw fail("Invalid reset token", "BAD_REQUEST");
  const headers = values[0];
  const tokenCol = headers.indexOf("resetToken");
  const expiryCol = headers.indexOf("resetExpiry");
  const passwordCol = headers.indexOf("password");
  const saltCol = headers.indexOf("salt");
  const updatedAtCol = headers.indexOf("updatedAt");

  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    const rowToken = String(values[i][tokenCol] || "").trim();
    if (rowToken && safeEquals(rowToken, token)) {
      targetRow = i;
      break;
    }
  }
  if (targetRow < 1) throw fail("Invalid reset token", "BAD_REQUEST");

  const expiry = Number(values[targetRow][expiryCol] || 0);
  if (!expiry || Date.now() > expiry) throw fail("Reset token has expired", "BAD_REQUEST");

  const salt = generateSalt();
  const hash = hashPassword(String(newPassword || ""), salt);
  sheet.getRange(targetRow + 1, passwordCol + 1).setValue(hash);
  sheet.getRange(targetRow + 1, saltCol + 1).setValue(salt);
  sheet.getRange(targetRow + 1, tokenCol + 1).setValue("");
  sheet.getRange(targetRow + 1, expiryCol + 1).setValue("");
  if (updatedAtCol >= 0) sheet.getRange(targetRow + 1, updatedAtCol + 1).setValue(formatDateTime(new Date()));

  return { ok: true };
  }

  function saveProfile(userId, profile) {
  const normalized = normalizeIncomingProfile(profile);
  const sheet = getUsersSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw fail("User not found", "AUTH_REQUIRED");
  const headers = values[0];
  const idCol = headers.indexOf("id");
  const nicknameCol = headers.indexOf("nickname");
  const iconUrlCol = headers.indexOf("iconUrl");
  const hobbyCol = headers.indexOf("hobby");
  const interestsCol = headers.indexOf("interests");
  const pointsCol = headers.indexOf("points");
  const updatedAtCol = headers.indexOf("updatedAt");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol] || "") !== String(userId || "")) continue;
    if (nicknameCol >= 0) sheet.getRange(i + 1, nicknameCol + 1).setValue(normalized.nickname);
    if (iconUrlCol >= 0) sheet.getRange(i + 1, iconUrlCol + 1).setValue(normalized.iconUrl);
    if (hobbyCol >= 0) sheet.getRange(i + 1, hobbyCol + 1).setValue(normalized.hobby);
    if (interestsCol >= 0) sheet.getRange(i + 1, interestsCol + 1).setValue(normalized.interests);
    if (updatedAtCol >= 0) sheet.getRange(i + 1, updatedAtCol + 1).setValue(formatDateTime(new Date()));
    let points = Number(values[i][pointsCol] || 0);
    if (!Number.isFinite(points) || points < 0) points = 0;
    return {
      nickname: normalized.nickname,
      iconUrl: normalized.iconUrl,
      hobby: normalized.hobby,
      interests: normalized.interests,
      points: points
    };
  }
  throw fail("User not found", "AUTH_REQUIRED");
  }

  function normalizeIncomingProfile(profile) {
  const nickname = String(profile.nickname || "").trim();
  const iconUrl = String(profile.iconUrl || "").trim();
  const hobby = String(profile.hobby || "").trim();
  const interests = String(profile.interests || "").trim();
  assertMaxLength(nickname, 80, "nickname");
  assertMaxLength(iconUrl, 1000, "iconUrl");
  assertMaxLength(hobby, 400, "hobby");
  assertMaxLength(interests, 1000, "interests");
  return {
    nickname: nickname,
    iconUrl: iconUrl,
    hobby: hobby,
    interests: interests
  };
  }

  function resolveAppBaseUrl(appBaseUrl) {
  const fromRequest = String(appBaseUrl || "").trim();
  if (fromRequest) return fromRequest.replace(/\/+$/, "/");
  const fromProps = String(PropertiesService.getScriptProperties().getProperty(APP_BASE_URL_PROP) || "").trim();
  if (fromProps) return fromProps.replace(/\/+$/, "/");
  throw fail("APP_BASE_URL is not configured", "SERVER_ERROR");
  }

  function getPosts(includeAll) {
  const sheet = getPostsSheetForRead();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  const rows = values.slice(1);
  const posts = rows.map(row => normalizePostRow(rowToObj(headers, row), { includeMetrics: includeAll }));
  const visiblePosts = includeAll ? posts : posts.filter(post => post.status === "public");
  return visiblePosts.sort(comparePostsByPublishedAtDesc);
  }

  function getEvents(includeAll) {
  const sheet = getEventsSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  const rows = values.slice(1);
  const events = rows.map(row => normalizeEventRow(rowToObj(headers, row)));
  if (includeAll) return events;
  return events
    .filter(event => event.status === "public")
    .map(stripEventPrivateFields);
  }

function stripEventPrivateFields(event) {
  const e = { ...event };
  e.createdByUserId = "";
  e.createdByEmail = "";
  e.updatedByUserId = "";
  return e;
  }

function savePost(post) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const normalized = normalizeIncomingPost(post);
  const idCol = headers.indexOf("id");

  if (idCol === -1) {
    throw fail("id column not found", "SERVER_ERROR");
  }

  const existingRowIndex = findRowIndexById(values, normalized.id, idCol);
  const isNewPost = existingRowIndex < 0;
  const now = new Date();
  const nowIso = formatIsoDateTime(now);
  let previousStatus = "";
  let existing = null;

  if (isNewPost) {
    if (!normalized.date) normalized.date = formatDateYMD(now);
    if (normalized.totalViews === undefined || normalized.totalViews === null || normalized.totalViews === "") {
      normalized.totalViews = 0;
    }
    if (normalized.uniqueViewCount === undefined || normalized.uniqueViewCount === null || normalized.uniqueViewCount === "") {
      normalized.uniqueViewCount = 0;
    }
    if (!normalized.viewerUserIdsJson) {
      normalized.viewerUserIdsJson = "[]";
    }
  } else {
    existing = rowToObj(headers, values[existingRowIndex]);
    previousStatus = normalizeStatus(existing.status, "public");

    if (!normalized.date) normalized.date = normalizeDateCell(existing.date);

    if (normalized.totalViews === undefined || normalized.totalViews === null || normalized.totalViews === "") {
      normalized.totalViews = parseMetricCell(existing.totalViews);
    }

    if (normalized.uniqueViewCount === undefined || normalized.uniqueViewCount === null || normalized.uniqueViewCount === "") {
      normalized.uniqueViewCount = parseMetricCell(existing.uniqueViewCount);
    }

    if (!normalized.viewerUserIdsJson) {
      normalized.viewerUserIdsJson = String(existing.viewerUserIdsJson || "[]");
    }
  }

  const currentStatus = normalizeStatus(normalized.status, "public");
  normalized.status = currentStatus;

  if (currentStatus === "scheduled") {
    const scheduledDate = parseDateTimeValue(normalized.scheduledAt);
    if (!scheduledDate || scheduledDate.getTime() <= now.getTime()) {
      throw fail("scheduledAt must be a future date and time", "VALIDATION_ERROR");
    }
    normalized.scheduledAt = formatIsoDateTime(scheduledDate);
    normalized.publishedAt = existing ? normalizeDateTimeCell(existing.publishedAt) : "";
    normalized.date = formatDateYMD(scheduledDate);
  } else if (currentStatus === "public") {
    normalized.scheduledAt = "";
    if (isNewPost || previousStatus !== "public") {
      normalized.publishedAt = nowIso;
      normalized.date = formatDateYMD(now);
    } else {
      normalized.publishedAt = normalizeDateTimeCell(existing && existing.publishedAt)
        || buildLegacyPublishedAt(existing && existing.date, existing && existing.updatedAt)
        || nowIso;
      normalized.date = normalizeDateCell(existing && existing.date) || normalized.date || formatDateYMD(now);
    }
  } else {
    normalized.scheduledAt = "";
    normalized.publishedAt = existing ? normalizeDateTimeCell(existing.publishedAt) : "";
    if (!normalized.date) normalized.date = formatDateYMD(now);
  }

  applyPostMetricColumnFormats(sheet);

  const rowData = headers.map(h => {
    const key = h === "images" ? "imageUrls" : h;
    return serializeFieldForSheet(h, normalized[key]);
  });

  if (existingRowIndex >= 0) {
    sheet.getRange(existingRowIndex + 1, 1, 1, headers.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  applyPostMetricColumnFormats(sheet);

  const savedPost = normalizePostRow(normalized, { includeMetrics: true });

  if (shouldSendPostPushNotification(isNewPost, previousStatus, savedPost)) {
    try {
      const pushPayload = buildPostPushPayload(savedPost);
      sendPushNotificationToAllFromGAS(pushPayload);
    } catch (err) {
      console.warn("Push notification failed:", err && err.message ? err.message : err);
    }
  }

  return savedPost;
}

function saveEvent(event, actingUser) {
  const user = actingUser || null;
  if (!canManageEventsRole(user)) {
    throw fail("Event editor privileges required", "FORBIDDEN");
  }

  const sheet = ensureEventsSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const normalized = normalizeIncomingEvent(event);
  const idCol = headers.indexOf("id");
  if (idCol === -1) throw fail("id column not found", "SERVER_ERROR");

  const existingRowIndex = normalized.id ? findRowIndexById(values, normalized.id, idCol) : -1;
  const nowText = formatDateTime(new Date());

  if (existingRowIndex < 0) {
    if (!normalized.id) normalized.id = createEventId();
    if (!normalized.createdAt) normalized.createdAt = nowText;
    normalized.createdByUserId = user.id || "";
    normalized.createdByName = user.name || user.nickname || "";
    normalized.createdByEmail = user.email || "";
  } else {
    const existing = rowToObj(headers, values[existingRowIndex]);
    const existingEvent = normalizeEventRow(existing);

    if (!canEditEventByUser(user, existingEvent)) {
      throw fail("You can edit only events you created", "FORBIDDEN");
    }

    if (!normalized.createdAt) normalized.createdAt = String(existing.createdAt || "");
    normalized.createdByUserId = String(existing.createdByUserId || "");
    normalized.createdByName = String(existing.createdByName || "");
    normalized.createdByEmail = String(existing.createdByEmail || "");
  }

  if (!isAdminRole(user)) {
    normalized.status = "public";
  }

  normalized.updatedByUserId = user.id || "";
  normalized.updatedAt = nowText;

  const rowData = headers.map(h => serializeFieldForSheet(h, normalized[h]));
  if (existingRowIndex >= 0) {
    sheet.getRange(existingRowIndex + 1, 1, 1, headers.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return normalizeEventRow(normalized);
}

function recordPostView(postId, userId) {
  const id = String(postId || "").trim();
  const viewerId = String(userId || "").trim();
  if (!id) throw fail("id is required", "BAD_REQUEST");
  if (!viewerId) throw fail("userId is required", "BAD_REQUEST");

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw fail("Post not found", "BAD_REQUEST");

  const headers = values[0];
  const idCol = headers.indexOf("id");
  const totalViewsCol = headers.indexOf("totalViews");
  const uniqueViewCountCol = headers.indexOf("uniqueViewCount");
  const viewerUserIdsJsonCol = headers.indexOf("viewerUserIdsJson");
  if (idCol === -1 || totalViewsCol === -1 || uniqueViewCountCol === -1 || viewerUserIdsJsonCol === -1) {
    throw fail("Post view columns not found", "SERVER_ERROR");
  }

  const rowIndex = findRowIndexById(values, id, idCol);
  if (rowIndex < 0) throw fail("Post not found", "BAD_REQUEST");

  const row = values[rowIndex];
  const totalViews = parseMetricCell(row[totalViewsCol]) + 1;
  const viewerIds = parseViewerUserIds(row[viewerUserIdsJsonCol]);
  if (viewerIds.indexOf(viewerId) === -1) viewerIds.push(viewerId);
  const uniqueViewCount = viewerIds.length;

  sheet.getRange(rowIndex + 1, totalViewsCol + 1).setNumberFormat("0").setValue(totalViews);
  sheet.getRange(rowIndex + 1, uniqueViewCountCol + 1).setNumberFormat("0").setValue(uniqueViewCount);
  sheet.getRange(rowIndex + 1, viewerUserIdsJsonCol + 1).setNumberFormat("@").setValue(JSON.stringify(viewerIds));

  return {
    totalViews: totalViews,
    uniqueViewCount: uniqueViewCount
  };
}

function parseViewerUserIds(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(v => String(v || "").trim()).filter(Boolean)
      : [];
  } catch (_err) {
    return [];
  }
}

function deletePost(id) {
  if (!id) throw fail("id is required", "BAD_REQUEST");
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf("id");
  if (idCol === -1) throw fail("id column not found", "SERVER_ERROR");
  const existingRowIndex = findRowIndexById(values, id, idCol);
  if (existingRowIndex < 0) return;
  sheet.deleteRow(existingRowIndex + 1);
}

function deleteEvent(id, actingUser) {
  if (!id) throw fail("id is required", "BAD_REQUEST");
  const user = actingUser || null;
  if (!canManageEventsRole(user)) {
    throw fail("Event editor privileges required", "FORBIDDEN");
  }

  const sheet = getEventsSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf("id");
  if (idCol === -1) throw fail("id column not found", "SERVER_ERROR");

  const existingRowIndex = findRowIndexById(values, id, idCol);
  if (existingRowIndex < 0) return;

  const existingEvent = normalizeEventRow(rowToObj(headers, values[existingRowIndex]));
  if (!canEditEventByUser(user, existingEvent)) {
    throw fail("You can delete only events you created", "FORBIDDEN");
  }

  sheet.deleteRow(existingRowIndex + 1);
}

function saveContact(contact) {
  const normalized = normalizeIncomingContact(contact);
  const emailKey = "contact:last:" + normalized.email.toLowerCase();
  if (isKeyPresent(emailKey)) throw fail("Please wait before sending another message", "RATE_LIMITED");
  putKey(emailKey, "1", CONTACT_INTERVAL_SECONDS);

  const sheet = getContactSheet();
  sheet.appendRow([
    normalized.id,
    normalized.name,
    normalized.email,
    normalized.message,
    normalized.createdAt
  ]);
  return normalized;
}

function normalizeIncomingContact(contact) {
  const createdAt = formatDateTime(new Date());
  const name = String(contact.name || "").trim();
  const email = String(contact.email || "").trim();
  const message = String(contact.message || "").trim();
  if (!name) throw fail("name is required", "BAD_REQUEST");
  if (!email) throw fail("email is required", "BAD_REQUEST");
  if (!isValidEmail(email)) throw fail("Invalid email format", "BAD_REQUEST");
  if (!message) throw fail("message is required", "BAD_REQUEST");
  assertMaxLength(name, 100, "name");
  assertMaxLength(message, 2000, "message");
  return {
    id: "c_" + new Date().getTime().toString(36),
    name: name,
    email: email,
    message: message,
    createdAt: createdAt
  };
}

function normalizePostRow(row, options) {
  const opts = options || {};
  const status = normalizeStatus(row.status, "public");
  const normalized = {
    id: row.id || "",
    date: row.date || "",
    channel: row.channel || "article",
    tone: row.tone || "accent",
    badge: row.badge || "",
    title: row.title || "",
    tags: splitField(row.tags),
    summary: splitField(row.summary),
    body: splitBodyField(row.body),
    ctaText: row.ctaText || "",
    ctaUrl: row.ctaUrl || "",
    imageUrls: splitField(row.imageUrls || row.images),
    video: row.video || "",
    status: status,
    publishedAt: normalizeDateTimeCell(row.publishedAt),
    scheduledAt: normalizeDateTimeCell(row.scheduledAt),
    updatedAt: normalizeDateTimeCell(row.updatedAt)
  };
  if (opts.includeMetrics) {
    normalized.totalViews = parseMetricCell(row.totalViews);
    normalized.uniqueViewCount = parseMetricCell(row.uniqueViewCount);
  }
  if (opts.includeViewerIds) {
    normalized.viewerUserIdsJson = String(row.viewerUserIdsJson || "[]");
  }
  return normalized;
}

function normalizeIncomingPost(post) {
  const status = normalizeStatus(post.status, "public");
  const title = String(post.title || "").trim();
  if (!title) throw fail("title is required", "VALIDATION_ERROR");
  const badge = String(post.badge || "").trim();
  const body = Array.isArray(post.body) ? post.body.map(v => String(v || "").trim()).filter(Boolean) : [];
  const joinedBody = body.join("\n\n");

  const rawTotalViews = post.totalViews;
  const rawUniqueViewCount = post.uniqueViewCount;
  const totalViews = rawTotalViews === undefined || rawTotalViews === null || rawTotalViews === ""
    ? ""
    : parseMetricCell(rawTotalViews);
  const uniqueViewCount = rawUniqueViewCount === undefined || rawUniqueViewCount === null || rawUniqueViewCount === ""
    ? ""
    : parseMetricCell(rawUniqueViewCount);
  const viewerUserIdsJson = String(post.viewerUserIdsJson || "").trim();

  assertMaxLength(title, 200, "title");
  assertMaxLength(badge, 80, "badge");
  assertMaxLength(joinedBody, 10000, "body");

  return {
    id: post.id || createId(),
    date: String(post.date || "").trim(),
    channel: String(post.channel || "article").trim(),
    tone: String(post.tone || "accent").trim(),
    badge: badge,
    title: title,
    tags: Array.isArray(post.tags) ? post.tags.map(v => String(v || "").trim()).filter(Boolean) : [],
    summary: Array.isArray(post.summary) ? post.summary.map(v => String(v || "").trim()).filter(Boolean) : [],
    body: body,
    ctaText: String(post.ctaText || "").trim(),
    ctaUrl: String(post.ctaUrl || "").trim(),
    imageUrls: Array.isArray(post.imageUrls) ? post.imageUrls : (Array.isArray(post.images) ? post.images : []),
    video: String(post.video || "").trim(),
    status: status,
    publishedAt: String(post.publishedAt || "").trim(),
    scheduledAt: String(post.scheduledAt || "").trim(),
    updatedAt: formatDateTime(new Date()),
    totalViews: totalViews,
    uniqueViewCount: uniqueViewCount,
    viewerUserIdsJson: viewerUserIdsJson
  };
}

function normalizeEventRow(row) {
  const status = normalizeStatus(row.status, "public");
  return {
    id: row.id || "",
    title: row.title || "",
    date: row.date || "",
    startTime: normalizeTimeField(row.startTime),
    endTime: normalizeTimeField(row.endTime),
    description: row.description || "",
    location: row.location || "",
    imageUrls: splitField(row.imageUrls),
    ctaUrl: row.ctaUrl || "",
    status: status,
    createdAt: row.createdAt || "",
    createdByUserId: row.createdByUserId || "",
    createdByName: row.createdByName || "",
    createdByEmail: row.createdByEmail || "",
    updatedByUserId: row.updatedByUserId || "",
    updatedAt: row.updatedAt || ""
  };
}

function normalizeTimeField(value) {
  if (value === null || value === undefined || value === "") return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm");
  }
  if (typeof value === "number" && isFinite(value)) {
    const totalMinutes = Math.max(0, Math.round((value % 1) * 24 * 60));
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
  }
  const text = String(value).trim();
  if (!text) return "";
  const dateCandidate = new Date(text);
  if (!isNaN(dateCandidate.getTime()) && text.indexOf("T") >= 0) {
    return Utilities.formatDate(dateCandidate, Session.getScriptTimeZone(), "HH:mm");
  }
  return text;
}

function normalizeIncomingEvent(event) {
  const status = normalizeStatus(event.status, "public");
  const title = String(event.title || "").trim();
  const description = String(event.description || "").trim();
  assertMaxLength(title, 200, "title");
  assertMaxLength(description, 5000, "description");
  return {
    id: String(event.id || "").trim(),
    title: title,
    date: String(event.date || "").trim(),
    startTime: String(event.startTime || "").trim(),
    endTime: String(event.endTime || "").trim(),
    description: description,
    location: String(event.location || "").trim(),
    imageUrls: Array.isArray(event.imageUrls) ? event.imageUrls : [],
    ctaUrl: String(event.ctaUrl || "").trim(),
    status: status,
    createdAt: String(event.createdAt || "").trim(),
    createdByUserId: String(event.createdByUserId || "").trim(),
    createdByName: String(event.createdByName || "").trim(),
    createdByEmail: String(event.createdByEmail || "").trim(),
    updatedByUserId: String(event.updatedByUserId || "").trim(),
    updatedAt: String(event.updatedAt || "").trim()
  };
}

function normalizeStatus(raw, fallback) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return fallback || "public";
  if (s === "public" || s === "published" || s === "公開") return "public";
  if (s === "draft" || s === "下書き") return "draft";
  if (s === "private" || s === "非公開") return "private";
  if (s === "scheduled" || s === "予約投稿") return "scheduled";
  return fallback || "public";
}

function validatePassword(password) {
  const p = String(password || "");
  if (!p) throw fail("password is required", "BAD_REQUEST");
  if (p.length < 8) throw fail("Password must be at least 8 characters", "BAD_REQUEST");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function assertMaxLength(value, max, field) {
  if (String(value || "").length > max) {
    throw fail(field + " is too long (max " + max + " chars)", "BAD_REQUEST");
  }
}

function hashPassword(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt || "") + String(password || "")
  );
  return toHex(bytes);
}

function generateSalt() {
  return Utilities.getUuid().replace(/-/g, "");
}

function toHex(bytes) {
  return bytes.map(b => {
    const v = b < 0 ? b + 256 : b;
    const h = v.toString(16);
    return h.length === 1 ? "0" + h : h;
  }).join("");
}

function createToken(userId, role) {
  const payloadObj = {
    uid: String(userId || ""),
    role: normalizeRoleValue(role || "member"),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  const payload = JSON.stringify(payloadObj);
  const payloadB64 = Utilities.base64EncodeWebSafe(Utilities.newBlob(payload).getBytes()).replace(/=+$/, "");
  const sigBytes = Utilities.computeHmacSha256Signature(payloadB64, getAuthSecret());
  const sigB64 = Utilities.base64EncodeWebSafe(sigBytes).replace(/=+$/, "");
  return payloadB64 + "." + sigB64;
}

function verifyToken(token) {
  const t = String(token || "").trim();
  if (!t) throw fail("Authentication required", "AUTH_REQUIRED");
  const parts = t.split(".");
  if (parts.length !== 2) throw fail("Invalid token", "AUTH_REQUIRED");
  const payloadB64 = parts[0];
  const sigB64 = parts[1];
  const expectedSig = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payloadB64, getAuthSecret())
  ).replace(/=+$/, "");
  if (!safeEquals(sigB64, expectedSig)) throw fail("Invalid token signature", "AUTH_REQUIRED");
  let payloadObj = null;
  try {
    const payloadText = Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadB64)).getDataAsString();
    payloadObj = JSON.parse(payloadText);
  } catch (_err) {
    throw fail("Invalid token payload", "AUTH_REQUIRED");
  }
  if (!payloadObj || !payloadObj.uid || !payloadObj.exp) throw fail("Invalid token payload", "AUTH_REQUIRED");
  if (Math.floor(Date.now() / 1000) > Number(payloadObj.exp)) throw fail("Token expired", "AUTH_REQUIRED");
  return payloadObj;
}

function requireAuth(token) {
  const payload = verifyToken(token);
  const user = findUserById(payload.uid);
  if (!user) throw fail("User not found", "AUTH_REQUIRED");
  if (String(user.status || "").toLowerCase() !== "active") throw fail("This account is inactive", "AUTH_REQUIRED");
  return user;
}

function normalizeRoleValue(role) {
  return String(role || "member").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function requireAdmin(token) {
  const user = requireAuth(token);
  if (normalizeRoleValue(user.role) !== "admin") throw fail("Admin privileges required", "FORBIDDEN");
  return user;
}

function isAdminRole(user) {
  return normalizeRoleValue(user && user.role) === "admin";
}

function isEventEditorRole(user) {
  return normalizeRoleValue(user && user.role) === "event_editor";
}

function canManageEventsRole(user) {
  return !!user && (isAdminRole(user) || isEventEditorRole(user));
}

function requireEventEditorOrAdmin(token) {
  const user = requireAuth(token);
  if (!canManageEventsRole(user)) {
    throw fail("Event editor privileges required", "FORBIDDEN");
  }
  return user;
}

function canEditEventByUser(user, eventObj) {
  if (!user || !eventObj) return false;
  if (isAdminRole(user)) return true;
  if (!isEventEditorRole(user)) return false;
  return String(eventObj.createdByUserId || "") === String(user.id || "");
}

function getEditableEvents(user) {
  if (!canManageEventsRole(user)) return [];
  const events = getEvents(true);
  if (isAdminRole(user)) return events;
  return events.filter(event => canEditEventByUser(user, event));
}

function findUserById(userId) {
  const sheet = getUsersSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const idCol = headers.indexOf("id");
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol] || "") === String(userId || "")) {
      const obj = rowToObj(headers, values[i]);
      return {
        id: obj.id || "",
        email: obj.email || "",
        name: obj.name || "",
        role: normalizeRoleValue(obj.role || "member"),
        status: obj.status || "active",
        nickname: obj.nickname || "",
        iconUrl: obj.iconUrl || "",
        hobby: obj.hobby || "",
        interests: obj.interests || "",
        points: Number(obj.points || 0)
      };
    }
  }
  return null;
}

function getAuthSecret() {
  const secret = String(PropertiesService.getScriptProperties().getProperty(AUTH_SECRET_PROP) || "").trim();
  if (!secret) throw fail("AUTH_SECRET is not configured", "SERVER_ERROR");
  return secret;
}

function safeEquals(a, b) {
  const s1 = String(a || "");
  const s2 = String(b || "");
  if (s1.length !== s2.length) return false;
  let diff = 0;
  for (let i = 0; i < s1.length; i++) diff |= (s1.charCodeAt(i) ^ s2.charCodeAt(i));
  return diff === 0;
}

function recordLoginFailure(email) {
  const key = "login:fail:" + String(email || "").toLowerCase();
  const count = incrementCounter(key, LOGIN_LOCK_SECONDS);
  if (count >= LOGIN_FAIL_LIMIT) putKey("login:lock:" + String(email || "").toLowerCase(), "1", LOGIN_LOCK_SECONDS);
}

function clearLoginFailure(email) {
  removeKey("login:fail:" + String(email || "").toLowerCase());
  removeKey("login:lock:" + String(email || "").toLowerCase());
}

function isLoginLocked(email) {
  return isKeyPresent("login:lock:" + String(email || "").toLowerCase());
}

function incrementCounter(key, ttlSeconds) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get(key);
  const current = raw ? Number(raw) : 0;
  const next = current + 1;
  cache.put(key, String(next), ttlSeconds);
  return next;
}

function isKeyPresent(key) {
  return !!CacheService.getScriptCache().get(key);
}

function putKey(key, value, ttlSeconds) {
  CacheService.getScriptCache().put(key, String(value), ttlSeconds);
}

function removeKey(key) {
  CacheService.getScriptCache().remove(key);
}

function rowToObj(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = row[i];
  });
  return obj;
}

function findUserRowIndexByEmail(values, headers, email) {
  const emailCol = headers.indexOf("email");
  for (let i = 1; i < values.length; i++) {
    const rowEmail = String(values[i][emailCol] || "").trim().toLowerCase();
    if (rowEmail === String(email || "").trim().toLowerCase()) return i;
  }
  return -1;
}

function findRowIndexById(values, id, idCol) {
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) return i;
  }
  return -1;
}

function migratePostsImageColumn() {
  const sheet = getSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const imageUrlsCol = headers.indexOf("imageUrls");
  if (imageUrlsCol >= 0) return { ok: true, message: "imageUrls column already exists" };
  const imagesCol = headers.indexOf("images");
  if (imagesCol === -1) throw fail("images column not found", "SERVER_ERROR");
  sheet.getRange(1, imagesCol + 1).setValue("imageUrls");
  return { ok: true, message: "Renamed images to imageUrls" };
}

function migrateEventsFromPosts() {
  const postSheet = getSheet();
  const eventSheet = ensureEventsSheet();
  const postValues = postSheet.getDataRange().getValues();
  if (postValues.length < 2) return { ok: true, moved: 0 };
  const headers = postValues[0];
  const rows = postValues.slice(1);
  const eventHeaders = eventSheet.getRange(1, 1, 1, eventSheet.getLastColumn()).getValues()[0];
  const channelCol = headers.indexOf("channel");
  if (channelCol === -1) throw fail("channel column not found", "SERVER_ERROR");
  const appendRows = [];
  const deleteRowNumbers = [];
  rows.forEach((row, idx) => {
    const channel = String(row[channelCol] || "").trim();
    if (channel !== "event") return;
    const post = normalizePostRow(rowToObj(headers, row));
    const mapped = normalizeIncomingEvent({
      id: post.id || createEventId(),
      title: post.title || "",
      date: post.date || "",
      startTime: "",
      endTime: "",
      description: post.body && post.body.length ? post.body.join("\n\n") : "",
      location: "",
      imageUrls: post.imageUrls || [],
      ctaUrl: post.ctaUrl || "",
      status: post.status || "public",
      createdAt: post.updatedAt || formatDateTime(new Date())
    });
    appendRows.push(eventHeaders.map(h => serializeFieldForSheet(h, mapped[h])));
    deleteRowNumbers.push(idx + 2);
  });
  if (appendRows.length) {
    eventSheet.getRange(eventSheet.getLastRow() + 1, 1, appendRows.length, eventHeaders.length).setValues(appendRows);
  }
  deleteRowNumbers.sort((a, b) => b - a).forEach(rowNumber => postSheet.deleteRow(rowNumber));
  return { ok: true, moved: appendRows.length };
}

function serializeFieldForSheet(key, value) {
  if (Array.isArray(value)) {
    if (key === "body") return value.join("\n\n");
    return value.join("||");
  }
  return value;
}

function splitField(value) {
  if (!value) return [];
  return String(value).split("||").map(s => s.trim()).filter(Boolean);
}

function splitBodyField(value) {
  if (!value) return [];
  return String(value).split("\n\n").map(s => s.trim()).filter(Boolean);
}

function createId() {
  return "p_" + new Date().getTime().toString(36);
}

function createEventId() {
  return "e_" + new Date().getTime().toString(36);
}

function formatDateTime(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

function formatDateYMD(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function fail(message, code) {
  const err = new Error(message);
  err.code = code || "BAD_REQUEST";
  return err;
}

function outputError(err) {
  return outputJson({
    ok: false,
    message: err && err.message ? err.message : String(err),
    code: err && err.code ? err.code : "INTERNAL_ERROR"
  });
}

function outputJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}


const GACHA_SESSIONS_SHEET_NAME = "GachaSessions";
const PT_LOGS_SHEET_NAME = "PtLogs";
const PUSH_SUBSCRIPTIONS_SHEET_NAME = "PushSubscriptions";
const PUSH_WEBHOOK_URL_PROP = "PUSH_WEBHOOK_URL";
const PUSH_WEBHOOK_SECRET_PROP = "PUSH_WEBHOOK_SECRET";

function ensureGachaSessionsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GACHA_SESSIONS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(GACHA_SESSIONS_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ticket",
      "userId",
      "expiresAt",
      "createdAt"
    ]);
  }

  return sheet;
}

function ensurePtLogsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PT_LOGS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(PT_LOGS_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "id",
      "userId",
      "type",
      "change",
      "beforePoints",
      "afterPoints",
      "memo",
      "createdAt"
    ]);
  }

  return sheet;
}

function ensurePushSubscriptionsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PUSH_SUBSCRIPTIONS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(PUSH_SUBSCRIPTIONS_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "id",
      "userId",
      "endpoint",
      "p256dh",
      "auth",
      "createdAt",
      "updatedAt"
    ]);
  }

  return sheet;
}

function savePushSubscription(userId, subscription) {
  const uid = String(userId || "").trim();
  const endpoint = String((subscription && subscription.endpoint) || "").trim();
  const keys = subscription && subscription.keys ? subscription.keys : {};
  const p256dh = String(keys.p256dh || "").trim();
  const auth = String(keys.auth || "").trim();

  if (!uid) throw fail("userId is required", "BAD_REQUEST");
  if (!endpoint) throw fail("subscription.endpoint is required", "BAD_REQUEST");

  const sheet = ensurePushSubscriptionsSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const endpointCol = headers.indexOf("endpoint");
  const userIdCol = headers.indexOf("userId");
  const p256dhCol = headers.indexOf("p256dh");
  const authCol = headers.indexOf("auth");
  const updatedAtCol = headers.indexOf("updatedAt");

  if (endpointCol === -1 || userIdCol === -1 || p256dhCol === -1 || authCol === -1) {
    throw fail("PushSubscriptions columns not found", "SERVER_ERROR");
  }

  const nowText = formatDateTime(new Date());
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][endpointCol] || "").trim() === endpoint) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex >= 0) {
    sheet.getRange(rowIndex + 1, userIdCol + 1).setValue(uid);
    sheet.getRange(rowIndex + 1, p256dhCol + 1).setValue(p256dh);
    sheet.getRange(rowIndex + 1, authCol + 1).setValue(auth);
    if (updatedAtCol >= 0) sheet.getRange(rowIndex + 1, updatedAtCol + 1).setValue(nowText);
  } else {
    const rowObj = {};
    headers.forEach(h => rowObj[h] = "");
    rowObj.id = "sub_" + new Date().getTime().toString(36);
    rowObj.userId = uid;
    rowObj.endpoint = endpoint;
    rowObj.p256dh = p256dh;
    rowObj.auth = auth;
    rowObj.createdAt = nowText;
    rowObj.updatedAt = nowText;
    const rowData = headers.map(h => rowObj[h]);
    sheet.appendRow(rowData);
  }

  return { ok: true };
}

function removePushSubscription(userId, endpoint) {
  const uid = String(userId || "").trim();
  const targetEndpoint = String(endpoint || "").trim();
  if (!uid) throw fail("userId is required", "BAD_REQUEST");
  if (!targetEndpoint) throw fail("endpoint is required", "BAD_REQUEST");

  const sheet = ensurePushSubscriptionsSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true };

  const headers = values[0];
  const endpointCol = headers.indexOf("endpoint");
  const userIdCol = headers.indexOf("userId");
  if (endpointCol === -1 || userIdCol === -1) throw fail("PushSubscriptions columns not found", "SERVER_ERROR");

  for (let i = values.length - 1; i >= 1; i--) {
    const rowEndpoint = String(values[i][endpointCol] || "").trim();
    const rowUserId = String(values[i][userIdCol] || "").trim();
    if (rowEndpoint === targetEndpoint && rowUserId === uid) {
      sheet.deleteRow(i + 1);
    }
  }
  return { ok: true };
}

function listPushSubscriptions() {
  const sheet = ensurePushSubscriptionsSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => rowToObj(headers, row))
    .map(obj => ({
      endpoint: String(obj.endpoint || "").trim(),
      keys: {
        p256dh: String(obj.p256dh || "").trim(),
        auth: String(obj.auth || "").trim()
      }
    }))
    .filter(sub => sub.endpoint);
}

function sendPushNotificationToAll(payload) {
  const webhookUrl = String(PropertiesService.getScriptProperties().getProperty(PUSH_WEBHOOK_URL_PROP) || "").trim();
  const webhookSecret = String(PropertiesService.getScriptProperties().getProperty(PUSH_WEBHOOK_SECRET_PROP) || "").trim();
  if (!webhookUrl || !webhookSecret) return;

  const subscriptions = listPushSubscriptions();
  if (!subscriptions.length) return;
  const endpointMap = {};
  subscriptions.forEach(sub => {
    if (!sub || !sub.endpoint) return;
    endpointMap[sub.endpoint] = sub;
  });
  const dedupedSubscriptions = Object.keys(endpointMap).map(key => endpointMap[key]);

  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        secret: webhookSecret,
        payload: {
          title: String(payload.title || "語り場ニュース"),
          body: String(payload.body || "新しいお知らせがあります。"),
          icon: String(payload.icon || "./favicon.png"),
          url: String(payload.url || "")
        },
        subscriptions: dedupedSubscriptions
      }),
      muteHttpExceptions: true
    });
  } catch (_err) {}
}

function createGachaTicket(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw fail("userId is required", "BAD_REQUEST");
  }

  const sheet = ensureGachaSessionsSheet();

  const ticket = Utilities.getUuid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

  sheet.appendRow([
    ticket,
    normalizedUserId,
    expiresAt,
    formatDateTime(now)
  ]);

  return {
    ok: true,
    ticket: ticket,
    expiresAt: expiresAt.toISOString()
  };
}

function getGachaStatus(ticket) {
  const session = findGachaSessionByTicket(ticket);

  if (!session) {
    return {
      ok: false,
      code: "INVALID_TICKET",
      message: "無効なガチャチケットです。"
    };
  }

  if (session.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      code: "TICKET_EXPIRED",
      message: "ガチャチケットの有効期限が切れています。"
    };
  }

  const pointState = getUserPointState(session.userId);

  return {
    ok: true,
    userId: session.userId,
    points: pointState.points,
    remainingPoints: pointState.points,
    nickname: pointState.nickname || "",
    iconUrl: pointState.iconUrl || ""
  };
  }

  function useGachaPoint(ticket) {
  const normalizedTicket = String(ticket || "").trim();

  if (!normalizedTicket) {
    return {
      ok: false,
      code: "MISSING_TICKET",
      message: "ticket is required"
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const session = findGachaSessionByTicket(normalizedTicket);

    if (!session) {
      return {
        ok: false,
        code: "INVALID_TICKET",
        message: "無効なガチャチケットです。"
      };
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return {
        ok: false,
        code: "TICKET_EXPIRED",
        message: "ガチャチケットの有効期限が切れています。"
      };
    }

    const userId = session.userId;

    const usersSheet = getUsersSheet();
    const values = usersSheet.getDataRange().getValues();
    const headers = values[0];

    const idCol = headers.indexOf("id");
    const pointsCol = headers.indexOf("points");
    const updatedAtCol = headers.indexOf("updatedAt");

    if (idCol === -1 || pointsCol === -1) {
      throw fail("User point columns not found", "SERVER_ERROR");
    }

    const rowIndex = findRowIndexById(values, userId, idCol);

    if (rowIndex < 0) {
      return {
        ok: false,
        code: "USER_NOT_FOUND",
        message: "ユーザーが見つかりません。"
      };
    }

    let beforePoints = Number(values[rowIndex][pointsCol] || 0);
    if (!Number.isFinite(beforePoints) || beforePoints < 0) beforePoints = 0;

    if (beforePoints < 1) {
      return {
        ok: false,
        code: "NOT_ENOUGH_POINTS",
        message: "ptが不足しています。",
        beforePoints: beforePoints,
        remainingPoints: beforePoints,
        remainingPt: beforePoints
      };
    }

    const afterPoints = beforePoints - 1;

    usersSheet.getRange(rowIndex + 1, pointsCol + 1).setValue(afterPoints);

    if (updatedAtCol >= 0) {
      usersSheet.getRange(rowIndex + 1, updatedAtCol + 1).setValue(formatDateTime(new Date()));
    }

    const logsSheet = ensurePtLogsSheet();
    logsSheet.appendRow([
      "pt_" + new Date().getTime().toString(36),
      userId,
      "gacha",
      -1,
      beforePoints,
      afterPoints,
      "語り場ガチャ 1回",
      formatDateTime(new Date())
    ]);

    return {
      ok: true,
      userId: userId,
      beforePoints: beforePoints,
      beforePt: beforePoints,
      remainingPoints: afterPoints,
      remainingPt: afterPoints,
      points: afterPoints
    };

  } finally {
    lock.releaseLock();
  }
  }

  function useGachaPoints(ticket, count) {
  const normalizedTicket = String(ticket || "").trim();
  const requestedCount = Math.max(1, Math.min(10, Math.floor(Number(count || 1))));

  if (!normalizedTicket) {
    return {
      ok: false,
      code: "MISSING_TICKET",
      message: "ticket is required"
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const session = findGachaSessionByTicket(normalizedTicket);

    if (!session) {
      return {
        ok: false,
        code: "INVALID_TICKET",
        message: "無効なガチャチケットです。"
      };
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return {
        ok: false,
        code: "TICKET_EXPIRED",
        message: "ガチャチケットの有効期限が切れています。"
      };
    }

    const userId = session.userId;

    const usersSheet = getUsersSheet();
    const values = usersSheet.getDataRange().getValues();
    const headers = values[0];

    const idCol = headers.indexOf("id");
    const pointsCol = headers.indexOf("points");
    const updatedAtCol = headers.indexOf("updatedAt");

    if (idCol === -1 || pointsCol === -1) {
      throw fail("User point columns not found", "SERVER_ERROR");
    }

    const rowIndex = findRowIndexById(values, userId, idCol);

    if (rowIndex < 0) {
      return {
        ok: false,
        code: "USER_NOT_FOUND",
        message: "ユーザーが見つかりません。"
      };
    }

    let beforePoints = Number(values[rowIndex][pointsCol] || 0);
    if (!Number.isFinite(beforePoints) || beforePoints < 0) beforePoints = 0;

    if (beforePoints < 1) {
      return {
        ok: false,
        code: "NOT_ENOUGH_POINTS",
        message: "ptが不足しています。",
        beforePoints: beforePoints,
        remainingPoints: beforePoints,
        drawCount: 0
      };
    }

    const drawCount = Math.min(requestedCount, beforePoints);
    const afterPoints = beforePoints - drawCount;

    usersSheet.getRange(rowIndex + 1, pointsCol + 1).setValue(afterPoints);

    if (updatedAtCol >= 0) {
      usersSheet.getRange(rowIndex + 1, updatedAtCol + 1).setValue(formatDateTime(new Date()));
    }

    const logsSheet = ensurePtLogsSheet();
    logsSheet.appendRow([
      "pt_" + new Date().getTime().toString(36),
      userId,
      "gacha_multi",
      -drawCount,
      beforePoints,
      afterPoints,
      drawCount + "連ガチャ",
      formatDateTime(new Date())
    ]);

    return {
      ok: true,
      userId: userId,
      beforePoints: beforePoints,
      remainingPoints: afterPoints,
      points: afterPoints,
      drawCount: drawCount
    };

  } finally {
    lock.releaseLock();
  }
}

function refundGachaPoints(ticket, count) {
  const normalizedTicket = String(ticket || "").trim();
  const refundCount = Math.max(1, Math.min(10, Math.floor(Number(count || 1))));

  if (!normalizedTicket) {
    return {
      ok: false,
      code: "MISSING_TICKET",
      message: "ticket is required"
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const session = findGachaSessionByTicket(normalizedTicket);

    if (!session) {
      return {
        ok: false,
        code: "INVALID_TICKET",
        message: "無効なガチャチケットです。"
      };
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return {
        ok: false,
        code: "TICKET_EXPIRED",
        message: "ガチャチケットの有効期限が切れています。"
      };
    }

    const userId = session.userId;
    const usersSheet = getUsersSheet();
    const values = usersSheet.getDataRange().getValues();
    const headers = values[0];

    const idCol = headers.indexOf("id");
    const pointsCol = headers.indexOf("points");
    const updatedAtCol = headers.indexOf("updatedAt");

    if (idCol === -1 || pointsCol === -1) {
      throw fail("User point columns not found", "SERVER_ERROR");
    }

    const rowIndex = findRowIndexById(values, userId, idCol);
    if (rowIndex < 0) {
      return {
        ok: false,
        code: "USER_NOT_FOUND",
        message: "ユーザーが見つかりません。"
      };
    }

    let beforePoints = Number(values[rowIndex][pointsCol] || 0);
    if (!Number.isFinite(beforePoints) || beforePoints < 0) beforePoints = 0;
    const afterPoints = beforePoints + refundCount;

    usersSheet.getRange(rowIndex + 1, pointsCol + 1).setValue(afterPoints);
    if (updatedAtCol >= 0) {
      usersSheet.getRange(rowIndex + 1, updatedAtCol + 1).setValue(formatDateTime(new Date()));
    }

    const logsSheet = ensurePtLogsSheet();
    logsSheet.appendRow([
      "pt_" + new Date().getTime().toString(36),
      userId,
      "gacha_refund",
      refundCount,
      beforePoints,
      afterPoints,
      "ガチャ保存失敗時の返却",
      formatDateTime(new Date())
    ]);

    return {
      ok: true,
      userId: userId,
      refundedPoints: refundCount,
      beforePoints: beforePoints,
      remainingPoints: afterPoints,
      points: afterPoints
    };
  } finally {
    lock.releaseLock();
  }
}
function processGachaDrawResults_(ticket, results, requestId, actionName) {
  const session = requireValidGachaSession(ticket);
  const list = Array.isArray(results) ? results : [];
  if (!list.length) return getGachaCollection(ticket);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const stored = getStoredActionResponse_(session.userId, actionName, requestId);
    if (stored) return stored;

    const rows = getGachaInventoryRowsByUserId(session.userId);
    const workingInventory = buildGachaInventory(rows);
    const pointAdditions = {};
    const drawResults = [];

    list.forEach((result, resultIndex) => {
      const figureId = String(result && (result.figureId || result.id) || "").trim();
      const master = getGachaFigureById_(figureId);
      if (!master || !master.isActive || master.isEx || !master.isDrawTarget) {
        throw fail("抽選対象ではないフィギュアが含まれています。", "INVALID_GACHA_FIGURE");
      }

      const currentQuantity = Math.max(0, Math.floor(Number(workingInventory[master.figureId] || 0)));
      const isNew = currentQuantity <= 0;
      const duplicatePoint = isNew ? 0 : Math.max(0, Number(DUPLICATE_POINT_BY_RARITY[master.rarity] || 0));
      if (duplicatePoint > 0) pointAdditions[master.seriesId] = Number(pointAdditions[master.seriesId] || 0) + duplicatePoint;

      upsertGachaInventory(session.userId, ticket, normalizeGachaResult({ figureId: master.figureId }), 1);
      workingInventory[master.figureId] = currentQuantity + 1;
      drawResults.push({
        resultIndex: resultIndex,
        figureId: Number(master.figureId),
        isNew: isNew,
        duplicatePoint: duplicatePoint,
        seriesId: master.seriesId
      });
    });

    addExchangePoints_(session.userId, pointAdditions);
    const response = getGachaCollection(ticket);
    response.drawResults = drawResults;
    storeActionResponse_(session.userId, actionName, requestId, response);
    return response;
  } finally {
    lock.releaseLock();
  }
}

function saveGachaResults(ticket, results, requestId) {
  return processGachaDrawResults_(ticket, results, requestId, "saveGachaResults");
}

function findGachaSessionByTicket(ticket) {
  const normalizedTicket = String(ticket || "").trim();
  if (!normalizedTicket) return null;

  const sheet = ensureGachaSessionsSheet();
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return null;

  const headers = values[0];
  const ticketCol = headers.indexOf("ticket");
  const userIdCol = headers.indexOf("userId");
  const expiresAtCol = headers.indexOf("expiresAt");

  if (ticketCol === -1 || userIdCol === -1 || expiresAtCol === -1) {
    throw fail("Gacha session columns not found", "SERVER_ERROR");
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][ticketCol] || "") !== normalizedTicket) continue;

    return {
      rowIndex: i,
      ticket: String(values[i][ticketCol] || ""),
      userId: String(values[i][userIdCol] || ""),
      expiresAt: new Date(values[i][expiresAtCol])
    };
  }

  return null;
}

function getUserPointState(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw fail("userId is required", "BAD_REQUEST");
  }

  const sheet = getUsersSheet();
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    throw fail("User not found", "AUTH_REQUIRED");
  }

  const headers = values[0];
  const idCol = headers.indexOf("id");
  const pointsCol = headers.indexOf("points");
  const nicknameCol = headers.indexOf("nickname");
  const iconUrlCol = headers.indexOf("iconUrl");

  if (idCol === -1 || pointsCol === -1) {
    throw fail("User point columns not found", "SERVER_ERROR");
  }

  const rowIndex = findRowIndexById(values, normalizedUserId, idCol);

  if (rowIndex < 0) {
    throw fail("User not found", "AUTH_REQUIRED");
  }

  let points = Number(values[rowIndex][pointsCol] || 0);
  if (!Number.isFinite(points) || points < 0) points = 0;

  return {
    userId: normalizedUserId,
    points: Math.floor(points),
    nickname: nicknameCol >= 0 ? String(values[rowIndex][nicknameCol] || "") : "",
    iconUrl: iconUrlCol >= 0 ? String(values[rowIndex][iconUrlCol] || "") : ""
  };
}


const GACHA_EXCHANGE_POINTS_SHEET_NAME = "gacha_exchange_points";
const GACHA_EXCHANGE_HISTORY_SHEET_NAME = "gacha_exchange_history";
const GACHA_FIGURE_MASTER_SHEET_NAME = "gacha_figure_master";
const GACHA_ACTION_REQUESTS_SHEET_NAME = "gacha_action_requests";
const DUPLICATE_POINT_BY_RARITY = { N: 1, R: 2, SR: 3 };

function getDefaultGachaFigureMaster_() {
  return [
    { figureId: "1", seriesId: "S1", displayNo: "No.1", sortOrder: 100, figureName: "東さん", rarity: "N", concept: "語り場共同オーナー", image: "images/東さん_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "2", seriesId: "S1", displayNo: "No.2", sortOrder: 200, figureName: "よっしー", rarity: "N", concept: "語り場共同オーナー", image: "images/よっしー_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "3", seriesId: "S1", displayNo: "No.3", sortOrder: 300, figureName: "じんさん", rarity: "N", concept: "語り場共同オーナー", image: "images/じんさん_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "4", seriesId: "S1", displayNo: "No.4", sortOrder: 400, figureName: "海賊けん", rarity: "N", concept: "語り場共同オーナー", image: "images/ケンさん_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "5", seriesId: "S1", displayNo: "No.5", sortOrder: 500, figureName: "しゅうへい", rarity: "N", concept: "語り場共同オーナー", image: "images/しゅう_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "6", seriesId: "S1", displayNo: "No.6", sortOrder: 600, figureName: "とっとくん", rarity: "N", concept: "語り場共同オーナー", image: "images/とっとくん_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "7", seriesId: "S1", displayNo: "No.7", sortOrder: 700, figureName: "かずま", rarity: "N", concept: "語り場共同オーナー", image: "images/かずま_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "8", seriesId: "S1", displayNo: "No.8", sortOrder: 800, figureName: "たかちゃん", rarity: "N", concept: "語り場共同オーナー", image: "images/たかちゃん_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "9", seriesId: "S1", displayNo: "No.9", sortOrder: 900, figureName: "だいちさん", rarity: "N", concept: "語り場共同オーナー", image: "images/だいちさん_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "10", seriesId: "S1", displayNo: "No.10", sortOrder: 1000, figureName: "ゆかちゃん", rarity: "N", concept: "語り場共同オーナー", image: "images/ゆかちゃん_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "11", seriesId: "S1", displayNo: "No.11", sortOrder: 1100, figureName: "おかっち", rarity: "N", concept: "語り場共同オーナー", image: "images/おかっち_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "12", seriesId: "S1", displayNo: "No.12", sortOrder: 1200, figureName: "だいちゃん", rarity: "N", concept: "語り場共同オーナー", image: "images/だいちゃん_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "13", seriesId: "S1", displayNo: "No.13", sortOrder: 1300, figureName: "ぐっちょん", rarity: "N", concept: "語り場共同オーナー", image: "images/ぐっちょん_N.png", dropRate: 40, exchangeCost: 10, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "14", seriesId: "S1", displayNo: "No.14", sortOrder: 1400, figureName: "東さん", rarity: "R", concept: "ガンプラ製作中", image: "images/東さん_ガンプラ.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "15", seriesId: "S1", displayNo: "No.15", sortOrder: 1500, figureName: "よっしー", rarity: "R", concept: "LIFE STORY撮影", image: "images/よっしー_LS撮影.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "16", seriesId: "S1", displayNo: "No.16", sortOrder: 1600, figureName: "じんさん", rarity: "R", concept: "ボードゲーム", image: "images/じんさん_ボドゲ.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "17", seriesId: "S1", displayNo: "No.17", sortOrder: 1700, figureName: "海賊けん", rarity: "R", concept: "講演", image: "images/ケンさん_講演.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "18", seriesId: "S1", displayNo: "No.18", sortOrder: 1800, figureName: "しゅうへい", rarity: "R", concept: "乾杯", image: "images/しゅう_乾杯.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "19", seriesId: "S1", displayNo: "No.19", sortOrder: 1900, figureName: "とっとくん", rarity: "R", concept: "ハウスクリーニング", image: "images/とっとくん_ハウスクリーニング.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "20", seriesId: "S1", displayNo: "No.20", sortOrder: 2000, figureName: "かずま", rarity: "R", concept: "内臓整体", image: "images/かずま_内臓整体.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "32", seriesId: "S1", displayNo: "No.21", sortOrder: 2100, figureName: "たかちゃん", rarity: "R", concept: "焼酎呑み", image: "images/たかちゃん_赤兎馬.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "21", seriesId: "S1", displayNo: "No.22", sortOrder: 2200, figureName: "だいちさん", rarity: "R", concept: "算命学", image: "images/だいちさん_占い中.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "22", seriesId: "S1", displayNo: "No.23", sortOrder: 2300, figureName: "ゆかちゃん", rarity: "R", concept: "西洋占星術", image: "images/ゆかちゃん_占い中.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "23", seriesId: "S1", displayNo: "No.24", sortOrder: 2400, figureName: "おかっち", rarity: "R", concept: "よもぎ蒸し", image: "images/おかっち_よもぎ蒸し.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "37", seriesId: "S1", displayNo: "No.25", sortOrder: 2500, figureName: "だいちゃん", rarity: "R", concept: "オンライン講座", image: "images/だいちゃん_オンライン講座.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "24", seriesId: "S1", displayNo: "No.26", sortOrder: 2600, figureName: "ぐっちょん", rarity: "R", concept: "お仕事中", image: "images/ぐっちょん_会計.png", dropRate: 18, exchangeCost: 20, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "25", seriesId: "S1", displayNo: "No.27", sortOrder: 2700, figureName: "東さん", rarity: "SR", concept: "編集長", image: "images/東さん_編集長.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "26", seriesId: "S1", displayNo: "No.28", sortOrder: 2800, figureName: "よっしー", rarity: "SR", concept: "書籍出版", image: "images/よっしー_書籍出版.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "27", seriesId: "S1", displayNo: "No.29", sortOrder: 2900, figureName: "じんさん", rarity: "SR", concept: "木工職人", image: "images/じんさん_木工.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "28", seriesId: "S1", displayNo: "No.30", sortOrder: 3000, figureName: "海賊けん", rarity: "SR", concept: "ベース演奏", image: "images/ケンさん_ベース演奏.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "29", seriesId: "S1", displayNo: "No.31", sortOrder: 3100, figureName: "しゅうへい", rarity: "SR", concept: "LIFE ARTS LIVE", image: "images/しゅう_MC.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "30", seriesId: "S1", displayNo: "No.32", sortOrder: 3200, figureName: "とっとくん", rarity: "SR", concept: "デザイナー", image: "images/とっとくん_デザイナー.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "33", seriesId: "S1", displayNo: "No.33", sortOrder: 3300, figureName: "たかちゃん", rarity: "SR", concept: "オンライン講座", image: "images/たかちゃん_オンライン講座.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "38", seriesId: "S1", displayNo: "No.34", sortOrder: 3400, figureName: "だいちさん", rarity: "SR", concept: "シェアハウスの日常", image: "images/だいちさん_シェアハウス日常.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "34", seriesId: "S1", displayNo: "No.35", sortOrder: 3500, figureName: "ゆかちゃん", rarity: "SR", concept: "あべちゃんメイク", image: "images/ゆか_あべちゃんメイク.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "35", seriesId: "S1", displayNo: "No.36", sortOrder: 3600, figureName: "おかっち", rarity: "SR", concept: "パンプアップ", image: "images/おかっち_ジム.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "39", seriesId: "S1", displayNo: "No.37", sortOrder: 3700, figureName: "だいちゃん", rarity: "SR", concept: "ライブ配信", image: "images/だいちゃん_ライブ配信.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "36", seriesId: "S1", displayNo: "No.38", sortOrder: 3800, figureName: "ぐっちょん", rarity: "SR", concept: "本収集", image: "images/ぐっちょん_本収集.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "31", seriesId: "S1", displayNo: "No.39", sortOrder: 3900, figureName: "かずま", rarity: "SR", concept: "研究", image: "images/かずま_研究.png", dropRate: 10, exchangeCost: 30, isEx: false, isDrawTarget: true, isActive: true },
    { figureId: "40", seriesId: "S1", displayNo: "EX", sortOrder: 9999, figureName: "第1弾EX", rarity: "EX", concept: "ポイント交換限定", image: "images/第1弾_EX.png", dropRate: 0, exchangeCost: 50, isEx: true, isDrawTarget: false, isActive: true }
  ];
}

function ensureSheetColumns_(sheet, requiredHeaders) {
  if (sheet.getLastRow() === 0) sheet.appendRow(requiredHeaders);
  let headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  requiredHeaders.forEach(header => {
    if (headers.indexOf(header) !== -1) return;
    sheet.insertColumnAfter(sheet.getLastColumn());
    sheet.getRange(1, sheet.getLastColumn()).setValue(header);
    headers.push(header);
  });
  return headers;
}

function ensureGachaFigureMasterSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GACHA_FIGURE_MASTER_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(GACHA_FIGURE_MASTER_SHEET_NAME);
  const headers = ensureSheetColumns_(sheet, [
    "figureId", "seriesId", "displayNo", "sortOrder", "figureName", "rarity", "concept", "image",
    "dropRate", "exchangeCost", "isEx", "isDrawTarget", "isActive"
  ]);
  if (sheet.getLastRow() < 2) {
    const rows = getDefaultGachaFigureMaster_().map(item => headers.map(header => item[header] !== undefined ? item[header] : ""));
    if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  return sheet;
}

function ensureGachaExchangePointsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GACHA_EXCHANGE_POINTS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(GACHA_EXCHANGE_POINTS_SHEET_NAME);
  ensureSheetColumns_(sheet, ["id", "userId", "seriesId", "exchangePoints", "updatedAt"]);
  return sheet;
}

function ensureGachaExchangeHistorySheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GACHA_EXCHANGE_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(GACHA_EXCHANGE_HISTORY_SHEET_NAME);
  ensureSheetColumns_(sheet, ["id", "requestId", "userId", "seriesId", "figureId", "exchangeType", "usedPoints", "exchangedAt"]);
  return sheet;
}

function ensureGachaActionRequestsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GACHA_ACTION_REQUESTS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(GACHA_ACTION_REQUESTS_SHEET_NAME);
  ensureSheetColumns_(sheet, ["id", "requestId", "userId", "action", "responseJson", "createdAt"]);
  return sheet;
}

function toBoolean_(value, fallback) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const text = String(value === undefined || value === null ? "" : value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on", "有効"].indexOf(text) >= 0) return true;
  if (["false", "0", "no", "n", "off", "無効"].indexOf(text) >= 0) return false;
  return fallback;
}

function normalizeGachaMasterFigure_(row) {
  const rarity = String(row.rarity || "").trim().toUpperCase();
  return {
    figureId: String(row.figureId || row.id || "").trim(),
    seriesId: String(row.seriesId || "S1").trim(),
    displayNo: String(row.displayNo || row.figureNo || "").trim(),
    sortOrder: Number(row.sortOrder || 999999),
    figureName: String(row.figureName || row.name || "").trim(),
    rarity: rarity,
    concept: String(row.concept || "").trim(),
    image: String(row.image || "").trim(),
    dropRate: Number(row.dropRate || 0),
    exchangeCost: Number(row.exchangeCost || ({ N: 10, R: 20, SR: 30, EX: 50 }[rarity] || 0)),
    isEx: toBoolean_(row.isEx, rarity === "EX"),
    isDrawTarget: toBoolean_(row.isDrawTarget, rarity !== "EX"),
    isActive: toBoolean_(row.isActive, true)
  };
}

function getGachaFigureMaster_() {
  const sheet = ensureGachaFigureMasterSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const fromSheet = values.slice(1)
    .map(row => normalizeGachaMasterFigure_(rowToObj(headers, row)))
    .filter(item => item.figureId);
  const byId = {};
  getDefaultGachaFigureMaster_().forEach(item => { byId[String(item.figureId)] = normalizeGachaMasterFigure_(item); });
  fromSheet.forEach(item => { byId[String(item.figureId)] = item; });
  return Object.keys(byId).map(key => byId[key]).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

function getGachaFigureById_(figureId) {
  const id = String(figureId || "").trim();
  return getGachaFigureMaster_().find(item => String(item.figureId) === id) || null;
}

function toClientGachaFigure_(figure) {
  return {
    id: Number(figure.figureId),
    figureId: String(figure.figureId),
    seriesId: figure.seriesId,
    displayNo: figure.displayNo,
    sortOrder: Number(figure.sortOrder || 0),
    name: figure.figureName,
    figureName: figure.figureName,
    rarity: figure.rarity,
    concept: figure.concept,
    image: figure.image,
    dropRate: Number(figure.dropRate || 0),
    exchangeCost: Number(figure.exchangeCost || 0),
    isEx: !!figure.isEx,
    isDrawTarget: !!figure.isDrawTarget,
    isActive: !!figure.isActive
  };
}

function getExchangePointsMapByUserId_(userId) {
  const sheet = ensureGachaExchangePointsSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};
  const headers = values[0];
  const map = {};
  values.slice(1).map(row => rowToObj(headers, row)).forEach(row => {
    if (String(row.userId || "") !== String(userId || "")) return;
    const seriesId = String(row.seriesId || "").trim();
    if (!seriesId) return;
    map[seriesId] = Math.max(0, Math.floor(Number(row.exchangePoints || 0)));
  });
  return map;
}

function setExchangePointBalance_(userId, seriesId, nextPoints) {
  const sheet = ensureGachaExchangePointsSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const userIdCol = headers.indexOf("userId");
  const seriesIdCol = headers.indexOf("seriesId");
  const pointsCol = headers.indexOf("exchangePoints");
  const updatedAtCol = headers.indexOf("updatedAt");
  const safePoints = Math.max(0, Math.floor(Number(nextPoints || 0)));
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][userIdCol] || "") === String(userId) && String(values[i][seriesIdCol] || "") === String(seriesId)) {
      sheet.getRange(i + 1, pointsCol + 1).setValue(safePoints);
      if (updatedAtCol >= 0) sheet.getRange(i + 1, updatedAtCol + 1).setValue(formatDateTime(new Date()));
      return safePoints;
    }
  }
  const rowObj = {
    id: "gep_" + new Date().getTime().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
    userId: String(userId || ""),
    seriesId: String(seriesId || ""),
    exchangePoints: safePoints,
    updatedAt: formatDateTime(new Date())
  };
  sheet.appendRow(headers.map(header => rowObj[header] !== undefined ? rowObj[header] : ""));
  return safePoints;
}

function addExchangePoints_(userId, additions) {
  const current = getExchangePointsMapByUserId_(userId);
  Object.keys(additions || {}).forEach(seriesId => {
    const add = Math.max(0, Math.floor(Number(additions[seriesId] || 0)));
    if (!add) return;
    current[seriesId] = setExchangePointBalance_(userId, seriesId, Number(current[seriesId] || 0) + add);
  });
  return current;
}

function getExchangeHistoryRowsByUserId_(userId) {
  const sheet = ensureGachaExchangeHistorySheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => rowToObj(headers, row)).filter(row => String(row.userId || "") === String(userId || ""));
}

function appendExchangeHistory_(entry) {
  const sheet = ensureGachaExchangeHistorySheet_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowObj = {
    id: "geh_" + new Date().getTime().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
    requestId: String(entry.requestId || ""),
    userId: String(entry.userId || ""),
    seriesId: String(entry.seriesId || ""),
    figureId: String(entry.figureId || ""),
    exchangeType: String(entry.exchangeType || "NORMAL"),
    usedPoints: Math.max(0, Math.floor(Number(entry.usedPoints || 0))),
    exchangedAt: formatDateTime(new Date())
  };
  sheet.appendRow(headers.map(header => rowObj[header] !== undefined ? rowObj[header] : ""));
}

function getStoredActionResponse_(userId, action, requestId) {
  const rid = String(requestId || "").trim();
  if (!rid) return null;
  const sheet = ensureGachaActionRequestsSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const rows = values.slice(1).map(row => rowToObj(headers, row));
  const found = rows.find(row => String(row.userId || "") === String(userId || "") && String(row.action || "") === String(action || "") && String(row.requestId || "") === rid);
  if (!found || !found.responseJson) return null;
  try { return JSON.parse(String(found.responseJson)); } catch (_err) { return null; }
}

function storeActionResponse_(userId, action, requestId, response) {
  const rid = String(requestId || "").trim();
  if (!rid) return;
  const sheet = ensureGachaActionRequestsSheet_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowObj = {
    id: "gar_" + new Date().getTime().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
    requestId: rid,
    userId: String(userId || ""),
    action: String(action || ""),
    responseJson: JSON.stringify(response || {}),
    createdAt: formatDateTime(new Date())
  };
  sheet.appendRow(headers.map(header => rowObj[header] !== undefined ? rowObj[header] : ""));
}

function buildSeriesStatus_(master, inventory) {
  const status = {};
  master.filter(item => item.isActive).forEach(item => {
    const sid = item.seriesId;
    if (!status[sid]) status[sid] = { ownedNormal: 0, totalNormal: 0, isComplete: false, missingByRarity: { N: 0, R: 0, SR: 0 }, hasEx: false };
    const owned = Number(inventory[item.figureId] || 0) > 0;
    if (item.isEx) {
      status[sid].hasEx = owned;
      return;
    }
    status[sid].totalNormal += 1;
    if (owned) status[sid].ownedNormal += 1;
    else if (status[sid].missingByRarity[item.rarity] !== undefined) status[sid].missingByRarity[item.rarity] += 1;
  });
  Object.keys(status).forEach(sid => {
    status[sid].isComplete = status[sid].totalNormal > 0 && status[sid].ownedNormal >= status[sid].totalNormal;
  });
  return status;
}

function countUserExchanges_(userId) {
  return getExchangeHistoryRowsByUserId_(userId).length;
}


const GACHA_INVENTORY_SHEET_NAME = "GachaInventory";

function ensureGachaInventorySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GACHA_INVENTORY_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(GACHA_INVENTORY_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "id",
      "userId",
      "ticket",
      "figureId",
      "figureNo",
      "figureName",
      "rarity",
      "concept",
      "image",
      "quantity",
      "firstDrawnAt",
      "lastDrawnAt",
      "updatedAt"
    ]);
  }

  const required = [
    "id",
    "userId",
    "ticket",
    "figureId",
    "figureNo",
    "figureName",
    "rarity",
    "concept",
    "image",
    "quantity",
    "firstDrawnAt",
    "lastDrawnAt",
    "updatedAt"
  ];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  required.forEach(col => {
    if (headers.indexOf(col) === -1) {
      sheet.insertColumnAfter(sheet.getLastColumn());
      sheet.getRange(1, sheet.getLastColumn()).setValue(col);
      headers.push(col);
    }
  });

  return sheet;
}

function requireValidGachaSession(ticket) {
  const session = findGachaSessionByTicket(ticket);

  if (!session) {
    throw fail("無効なガチャチケットです。", "INVALID_TICKET");
  }

  if (session.expiresAt && session.expiresAt.getTime && session.expiresAt.getTime() < Date.now()) {
    throw fail("ガチャチケットの有効期限が切れています。", "TICKET_EXPIRED");
  }

  return session;
}
function normalizeGachaResult(result) {
  const figureId = String(result.id || result.figureId || "").trim();
  const master = getGachaFigureById_(figureId);
  if (master) {
    return {
      figureId: master.figureId,
      figureNo: master.displayNo,
      figureName: master.figureName,
      rarity: master.rarity,
      concept: master.concept,
      image: master.image
    };
  }
  return {
    figureId: figureId,
    figureNo: String(result.no || result.figureNo || "").trim(),
    figureName: String(result.name || result.figureName || "").trim(),
    rarity: String(result.rarity || "").trim(),
    concept: String(result.concept || "").trim(),
    image: String(result.image || "").trim()
  };
}

function getGachaInventoryRowsByUserId(userId) {
  const sheet = ensureGachaInventorySheet();
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0];
  const userIdCol = headers.indexOf("userId");

  if (userIdCol === -1) {
    throw fail("GachaInventory userId column not found", "SERVER_ERROR");
  }

  return values
    .slice(1)
    .map(row => rowToObj(headers, row))
    .filter(row => String(row.userId || "") === String(userId || ""));
}

function buildGachaInventory(rows) {
  const inventory = {};

  rows.forEach(row => {
    const figureId = String(row.figureId || "").trim();
    if (!figureId) return;

    const quantity = Math.max(0, Math.floor(Number(row.quantity || 0)));
    inventory[figureId] = (inventory[figureId] || 0) + quantity;
  });

  return inventory;
}
function getGachaTotalSpins(rows, userId) {
  const totalQuantity = rows.reduce((sum, row) => {
    const quantity = Math.max(0, Math.floor(Number(row.quantity || 0)));
    return sum + quantity;
  }, 0);
  const exchangeCount = userId ? countUserExchanges_(userId) : 0;
  return Math.max(0, totalQuantity - exchangeCount);
}
function getGachaCollection(ticket) {
  const session = requireValidGachaSession(ticket);
  const rows = getGachaInventoryRowsByUserId(session.userId);
  const inventory = buildGachaInventory(rows);
  const master = getGachaFigureMaster_();

  return {
    ok: true,
    userId: session.userId,
    inventory: inventory,
    totalSpins: getGachaTotalSpins(rows, session.userId),
    exchangePoints: getExchangePointsMapByUserId_(session.userId),
    seriesStatus: buildSeriesStatus_(master, inventory),
    figures: master.filter(item => item.isActive).map(toClientGachaFigure_),
    results: rows
  };
}
function saveGachaResult(ticket, result, requestId) {
  return processGachaDrawResults_(ticket, [result], requestId, "saveGachaResult");
}

function upsertGachaInventory(userId, ticket, normalized, addQuantity) {
  const sheet = ensureGachaInventorySheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  const userIdCol = headers.indexOf("userId");
  const ticketCol = headers.indexOf("ticket");
  const figureIdCol = headers.indexOf("figureId");
  const figureNoCol = headers.indexOf("figureNo");
  const figureNameCol = headers.indexOf("figureName");
  const rarityCol = headers.indexOf("rarity");
  const conceptCol = headers.indexOf("concept");
  const imageCol = headers.indexOf("image");
  const quantityCol = headers.indexOf("quantity");
  const firstDrawnAtCol = headers.indexOf("firstDrawnAt");
  const lastDrawnAtCol = headers.indexOf("lastDrawnAt");
  const updatedAtCol = headers.indexOf("updatedAt");

  if (userIdCol === -1 || figureIdCol === -1 || quantityCol === -1) {
    throw fail("GachaInventory required columns not found", "SERVER_ERROR");
  }

  const now = formatDateTime(new Date());
  const normalizedUserId = String(userId || "");
  const normalizedFigureId = String(normalized.figureId || "");
  const quantityToAdd = Math.max(0, Math.floor(Number(addQuantity || 0)));

  if (!normalizedUserId || !normalizedFigureId || quantityToAdd <= 0) {
    return;
  }

  let targetRowIndex = -1;

  for (let i = 1; i < values.length; i++) {
    const rowUserId = String(values[i][userIdCol] || "");
    const rowFigureId = String(values[i][figureIdCol] || "");

    if (rowUserId === normalizedUserId && rowFigureId === normalizedFigureId) {
      targetRowIndex = i;
      break;
    }
  }

  if (targetRowIndex >= 1) {
    const currentQuantity = Math.max(0, Math.floor(Number(values[targetRowIndex][quantityCol] || 0)));
    const nextQuantity = currentQuantity + quantityToAdd;
    const sheetRow = targetRowIndex + 1;

    if (ticketCol >= 0) sheet.getRange(sheetRow, ticketCol + 1).setValue(String(ticket || ""));
    if (figureNoCol >= 0) sheet.getRange(sheetRow, figureNoCol + 1).setValue(normalized.figureNo);
    if (figureNameCol >= 0) sheet.getRange(sheetRow, figureNameCol + 1).setValue(normalized.figureName);
    if (rarityCol >= 0) sheet.getRange(sheetRow, rarityCol + 1).setValue(normalized.rarity);
    if (conceptCol >= 0) sheet.getRange(sheetRow, conceptCol + 1).setValue(normalized.concept);
    if (imageCol >= 0) sheet.getRange(sheetRow, imageCol + 1).setValue(normalized.image);
    if (quantityCol >= 0) sheet.getRange(sheetRow, quantityCol + 1).setValue(nextQuantity);
    if (lastDrawnAtCol >= 0) sheet.getRange(sheetRow, lastDrawnAtCol + 1).setValue(now);
    if (updatedAtCol >= 0) sheet.getRange(sheetRow, updatedAtCol + 1).setValue(now);

    return;
  }

  const rowObj = {
    id: "gi_" + new Date().getTime().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
    userId: normalizedUserId,
    ticket: String(ticket || ""),
    figureId: normalized.figureId,
    figureNo: normalized.figureNo,
    figureName: normalized.figureName,
    rarity: normalized.rarity,
    concept: normalized.concept,
    image: normalized.image,
    quantity: quantityToAdd,
    firstDrawnAt: now,
    lastDrawnAt: now,
    updatedAt: now
  };

  const rowData = headers.map(h => rowObj[h] !== undefined ? rowObj[h] : "");
  sheet.appendRow(rowData);
}


function exchangeGachaFigure(ticket, figureId, requestId) {
  const session = requireValidGachaSession(ticket);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const stored = getStoredActionResponse_(session.userId, "exchangeFigure", requestId);
    if (stored) return stored;

    const master = getGachaFigureById_(figureId);
    if (!master || !master.isActive) throw fail("交換対象が見つかりません。", "FIGURE_NOT_FOUND");

    const rows = getGachaInventoryRowsByUserId(session.userId);
    const inventory = buildGachaInventory(rows);
    if (Number(inventory[master.figureId] || 0) > 0) throw fail("すでに所持しています。", "ALREADY_OWNED");

    const status = buildSeriesStatus_(getGachaFigureMaster_(), inventory);
    if (master.isEx && !(status[master.seriesId] && status[master.seriesId].isComplete)) {
      throw fail("通常フィギュアをコンプリートするとEX交換が解放されます。", "SERIES_NOT_COMPLETE");
    }
    if (!master.isEx && !["N", "R", "SR"].includes(master.rarity)) {
      throw fail("交換対象ではありません。", "INVALID_EXCHANGE_FIGURE");
    }

    const points = getExchangePointsMapByUserId_(session.userId);
    const balance = Math.max(0, Math.floor(Number(points[master.seriesId] || 0)));
    const cost = Math.max(0, Math.floor(Number(master.exchangeCost || 0)));
    if (balance < cost) throw fail("交換ptが不足しています。", "NOT_ENOUGH_EXCHANGE_POINTS");

    setExchangePointBalance_(session.userId, master.seriesId, balance - cost);
    upsertGachaInventory(session.userId, ticket, normalizeGachaResult({ figureId: master.figureId }), 1);
    appendExchangeHistory_({
      requestId: requestId,
      userId: session.userId,
      seriesId: master.seriesId,
      figureId: master.figureId,
      exchangeType: master.isEx ? "EX" : "NORMAL",
      usedPoints: cost
    });

    const response = getGachaCollection(ticket);
    response.exchangedFigure = toClientGachaFigure_(master);
    storeActionResponse_(session.userId, "exchangeFigure", requestId, response);
    return response;
  } finally {
    lock.releaseLock();
  }
}

function importLocalGachaInventory(ticket, items) {
  const session = requireValidGachaSession(ticket);
  const existingRows = getGachaInventoryRowsByUserId(session.userId);

  // 既にサーバー側に履歴がある場合は、重複インポートを避ける
  if (existingRows.length > 0) {
    return {
      ok: true,
      skipped: true,
      reason: "server_history_exists",
      userId: session.userId,
      inventory: buildGachaInventory(existingRows),
      totalSpins: getGachaTotalSpins(existingRows, session.userId),
      results: existingRows
    };
  }

  const normalizedItems = Array.isArray(items) ? items : [];

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    normalizedItems.forEach(item => {
      const normalized = normalizeGachaResult(item);
      const count = Math.max(0, Math.floor(Number(item.count || 0)));

      if (!normalized.figureId || count <= 0) return;

      upsertGachaInventory(session.userId, ticket, normalized, count);
    });
  } finally {
    lock.releaseLock();
  }

  return getGachaCollection(ticket);
}

const GACHA_LEGACY_DUPLICATE_MIGRATION_PROPERTY = "GACHA_LEGACY_DUPLICATE_EXCHANGE_POINTS_V1";

function buildLegacyDuplicateExchangePointMigrationPlan_() {
  const inventorySheet = ensureGachaInventorySheet();
  const inventoryValues = inventorySheet.getDataRange().getValues();
  if (inventoryValues.length < 2) return [];

  const inventoryHeaders = inventoryValues[0];
  const inventoryRows = inventoryValues.slice(1).map(row => rowToObj(inventoryHeaders, row));
  const masterById = {};
  getGachaFigureMaster_().forEach(item => {
    masterById[String(item.figureId)] = item;
  });

  // 同一ユーザー・同一figureIdの行が複数あっても、合計数量から重複数を1回だけ計算する。
  const quantityByUserFigure = {};
  inventoryRows.forEach(row => {
    const userId = String(row.userId || "").trim();
    const figureId = String(row.figureId || "").trim();
    const quantity = Math.max(0, Math.floor(Number(row.quantity || 0)));
    if (!userId || !figureId || quantity <= 0) return;
    const key = userId + "||" + figureId;
    if (!quantityByUserFigure[key]) {
      quantityByUserFigure[key] = { userId: userId, figureId: figureId, quantity: 0 };
    }
    quantityByUserFigure[key].quantity += quantity;
  });

  const planMap = {};
  Object.keys(quantityByUserFigure).forEach(key => {
    const entry = quantityByUserFigure[key];
    const master = masterById[entry.figureId];
    if (!master || master.isEx || !master.isActive) return;

    const duplicateUnitPoint = Math.max(0, Math.floor(Number(DUPLICATE_POINT_BY_RARITY[master.rarity] || 0)));
    const duplicateQuantity = Math.max(0, entry.quantity - 1);
    if (duplicateUnitPoint <= 0 || duplicateQuantity <= 0) return;

    const planKey = entry.userId + "||" + master.seriesId;
    if (!planMap[planKey]) {
      planMap[planKey] = {
        userId: entry.userId,
        seriesId: master.seriesId,
        duplicateQuantity: 0,
        calculatedPoints: 0
      };
    }
    planMap[planKey].duplicateQuantity += duplicateQuantity;
    planMap[planKey].calculatedPoints += duplicateQuantity * duplicateUnitPoint;
  });

  const pointsSheet = ensureGachaExchangePointsSheet_();
  const pointValues = pointsSheet.getDataRange().getValues();
  const pointHeaders = pointValues[0] || [];
  const currentMap = {};
  pointValues.slice(1).map(row => rowToObj(pointHeaders, row)).forEach(row => {
    const userId = String(row.userId || "").trim();
    const seriesId = String(row.seriesId || "").trim();
    if (!userId || !seriesId) return;
    currentMap[userId + "||" + seriesId] = Math.max(0, Math.floor(Number(row.exchangePoints || 0)));
  });

  return Object.keys(planMap).map(key => ({
    userId: planMap[key].userId,
    seriesId: planMap[key].seriesId,
    duplicateQuantity: planMap[key].duplicateQuantity,
    calculatedPoints: planMap[key].calculatedPoints,
    currentPoints: Math.max(0, Math.floor(Number(currentMap[key] || 0)))
  })).sort((a, b) => {
    const userCompare = String(a.userId).localeCompare(String(b.userId));
    if (userCompare !== 0) return userCompare;
    return String(a.seriesId).localeCompare(String(b.seriesId));
  });
}

function getExistingNonZeroExchangePointRows_() {
  const sheet = ensureGachaExchangePointsSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .map(row => rowToObj(headers, row))
    .filter(row => Math.max(0, Math.floor(Number(row.exchangePoints || 0))) > 0)
    .map(row => ({
      userId: String(row.userId || ""),
      seriesId: String(row.seriesId || ""),
      exchangePoints: Math.max(0, Math.floor(Number(row.exchangePoints || 0)))
    }));
}

/**
 * Apps Scriptエディタから手動実行する、既存重複分の交換pt移行プレビュー。
 * 実データは変更しない。
 */
function previewExistingDuplicateExchangePointsMigration() {
  const properties = PropertiesService.getScriptProperties();
  const migratedAt = properties.getProperty(GACHA_LEGACY_DUPLICATE_MIGRATION_PROPERTY) || "";
  const plan = buildLegacyDuplicateExchangePointMigrationPlan_();
  return {
    ok: true,
    alreadyMigrated: !!migratedAt,
    migratedAt: migratedAt,
    targetUsers: Array.from(new Set(plan.map(item => item.userId))).length,
    targetRows: plan.length,
    totalDuplicateQuantity: plan.reduce((sum, item) => sum + Number(item.duplicateQuantity || 0), 0),
    totalCalculatedPoints: plan.reduce((sum, item) => sum + Number(item.calculatedPoints || 0), 0),
    existingNonZeroPointRows: getExistingNonZeroExchangePointRows_(),
    plan: plan
  };
}

/**
 * 既存のGachaInventory数量から、(quantity - 1) × レア度別pt をシリーズ別に付与する。
 * 新しい交換pt運用を始める前、gacha_exchange_pointsが空または全て0の状態で1回だけ実行する。
 */
function migrateExistingDuplicateExchangePoints() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const migratedAt = properties.getProperty(GACHA_LEGACY_DUPLICATE_MIGRATION_PROPERTY) || "";
    if (migratedAt) {
      return {
        ok: true,
        skipped: true,
        reason: "already_migrated",
        migratedAt: migratedAt
      };
    }

    const existingNonZero = getExistingNonZeroExchangePointRows_();
    if (existingNonZero.length > 0) {
      throw fail(
        "すでに交換ptが付与されています。二重付与防止のため、移行処理を停止しました。交換開始前の空データで実行してください。",
        "MIGRATION_REQUIRES_EMPTY_EXCHANGE_POINTS"
      );
    }

    const plan = buildLegacyDuplicateExchangePointMigrationPlan_();
    plan.forEach(item => {
      if (Number(item.calculatedPoints || 0) <= 0) return;
      setExchangePointBalance_(item.userId, item.seriesId, item.calculatedPoints);
    });

    const completedAt = formatDateTime(new Date());
    properties.setProperty(GACHA_LEGACY_DUPLICATE_MIGRATION_PROPERTY, completedAt);

    return {
      ok: true,
      skipped: false,
      migratedAt: completedAt,
      targetUsers: Array.from(new Set(plan.map(item => item.userId))).length,
      updatedRows: plan.filter(item => Number(item.calculatedPoints || 0) > 0).length,
      totalDuplicateQuantity: plan.reduce((sum, item) => sum + Number(item.duplicateQuantity || 0), 0),
      totalGrantedPoints: plan.reduce((sum, item) => sum + Number(item.calculatedPoints || 0), 0),
      plan: plan
    };
  } finally {
    lock.releaseLock();
  }
}

function previewGachaResultsMigration() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resultsSheet = ss.getSheetByName("GachaResults");

  if (!resultsSheet) {
    return {
      ok: true,
      message: "GachaResults シートがありません。",
      targetRows: 0,
      targetGroups: 0
    };
  }

  if (resultsSheet.getLastRow() < 2) {
    return {
      ok: true,
      message: "移行対象のGachaResultsがありません。",
      targetRows: 0,
      targetGroups: 0
    };
  }

  ensureGachaResultsMigratedAtColumn(resultsSheet);

  const values = resultsSheet.getDataRange().getValues();
  const headers = values[0];

  const userIdCol = headers.indexOf("userId");
  const figureIdCol = headers.indexOf("figureId");
  const migratedAtCol = headers.indexOf("migratedAt");

  if (userIdCol === -1 || figureIdCol === -1 || migratedAtCol === -1) {
    throw fail("GachaResults required columns not found", "SERVER_ERROR");
  }

  const groups = {};
  let targetRows = 0;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const migratedAt = String(row[migratedAtCol] || "").trim();
    if (migratedAt) continue;

    const userId = String(row[userIdCol] || "").trim();
    const figureId = String(row[figureIdCol] || "").trim();

    if (!userId || !figureId) continue;

    targetRows += 1;
    const key = userId + "||" + figureId;

    if (!groups[key]) {
      groups[key] = {
        userId: userId,
        figureId: figureId,
        count: 0
      };
    }

    groups[key].count += 1;
  }

  return {
    ok: true,
    message: "移行プレビュー完了",
    targetRows: targetRows,
    targetGroups: Object.keys(groups).length,
    groups: groups
  };
}

function migrateGachaResultsToInventory() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const resultsSheet = ss.getSheetByName("GachaResults");

    if (!resultsSheet) {
      return {
        ok: true,
        message: "GachaResults シートがありません。",
        migratedRows: 0,
        migratedGroups: 0
      };
    }

    if (resultsSheet.getLastRow() < 2) {
      return {
        ok: true,
        message: "移行対象のGachaResultsがありません。",
        migratedRows: 0,
        migratedGroups: 0
      };
    }

    ensureGachaResultsMigratedAtColumn(resultsSheet);

    const values = resultsSheet.getDataRange().getValues();
    const headers = values[0];

    const userIdCol = headers.indexOf("userId");
    const ticketCol = headers.indexOf("ticket");
    const figureIdCol = headers.indexOf("figureId");
    const figureNoCol = headers.indexOf("figureNo");
    const figureNameCol = headers.indexOf("figureName");
    const rarityCol = headers.indexOf("rarity");
    const conceptCol = headers.indexOf("concept");
    const imageCol = headers.indexOf("image");
    const migratedAtCol = headers.indexOf("migratedAt");

    if (userIdCol === -1 || figureIdCol === -1 || migratedAtCol === -1) {
      throw fail("GachaResults required columns not found", "SERVER_ERROR");
    }

    const groups = {};
    const migratedRowNumbers = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];

      const migratedAt = String(row[migratedAtCol] || "").trim();
      if (migratedAt) continue;

      const userId = String(row[userIdCol] || "").trim();
      const figureId = String(row[figureIdCol] || "").trim();

      if (!userId || !figureId) continue;

      const key = userId + "||" + figureId;

      if (!groups[key]) {
        groups[key] = {
          userId: userId,
          ticket: ticketCol >= 0 ? String(row[ticketCol] || "") : "",
          normalized: {
            figureId: figureId,
            figureNo: figureNoCol >= 0 ? String(row[figureNoCol] || "") : "",
            figureName: figureNameCol >= 0 ? String(row[figureNameCol] || "") : "",
            rarity: rarityCol >= 0 ? String(row[rarityCol] || "") : "",
            concept: conceptCol >= 0 ? String(row[conceptCol] || "") : "",
            image: imageCol >= 0 ? String(row[imageCol] || "") : ""
          },
          quantity: 0
        };
      }

      groups[key].quantity += 1;
      migratedRowNumbers.push(i + 1);
    }

    const groupList = Object.keys(groups).map(key => groups[key]);

    groupList.forEach(group => {
      upsertGachaInventory(
        group.userId,
        group.ticket,
        group.normalized,
        group.quantity
      );
    });

    const now = formatDateTime(new Date());

    migratedRowNumbers.forEach(rowNumber => {
      resultsSheet.getRange(rowNumber, migratedAtCol + 1).setValue(now);
    });

    return {
      ok: true,
      message: "GachaResultsからGachaInventoryへの移行が完了しました。",
      migratedRows: migratedRowNumbers.length,
      migratedGroups: groupList.length
    };

  } finally {
    lock.releaseLock();
  }
}

function ensureGachaResultsMigratedAtColumn(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  if (headers.indexOf("migratedAt") !== -1) {
    return;
  }

  sheet.insertColumnAfter(lastCol);
  sheet.getRange(1, lastCol + 1).setValue("migratedAt");
}

function normalizeDateCell(value) {
  if (value === null || value === undefined || value === "") return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return formatDateYMD(value);
  }
  return String(value).trim();
}

function normalizeDateTimeCell(value) {
  if (value === null || value === undefined || value === "") return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return formatIsoDateTime(value);
  }
  return String(value).trim();
}

function formatIsoDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function parseDateTimeValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return new Date(value.getTime());
  }
  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function buildLegacyPublishedAt(dateValue, updatedAtValue) {
  const dateText = normalizeDateCell(dateValue);
  if (dateText) {
    const parsedDate = parseDateTimeValue(dateText + "T00:00:00");
    if (parsedDate) return formatIsoDateTime(parsedDate);
  }

  const updated = parseDateTimeValue(updatedAtValue);
  return updated ? formatIsoDateTime(updated) : "";
}

function getPostSortMillis(post) {
  const row = post || {};
  const candidates = [
    normalizeStatus(row.status, "public") === "scheduled" ? row.scheduledAt : "",
    row.publishedAt,
    row.date,
    row.updatedAt
  ];
  for (let i = 0; i < candidates.length; i++) {
    const parsed = parseDateTimeValue(candidates[i]);
    if (parsed) return parsed.getTime();
  }
  return 0;
}

function comparePostsByPublishedAtDesc(a, b) {
  const diff = getPostSortMillis(b) - getPostSortMillis(a);
  if (diff !== 0) return diff;
  return String(b && b.id || "").localeCompare(String(a && a.id || ""));
}

function publishDueScheduledPosts() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, published: 0, skipped: true };

  const publishedPosts = [];
  try {
    const sheet = getSheet();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return { ok: true, published: 0 };

    const headers = values[0];
    const statusCol = headers.indexOf("status");
    const scheduledAtCol = headers.indexOf("scheduledAt");
    const publishedAtCol = headers.indexOf("publishedAt");
    const dateCol = headers.indexOf("date");
    const updatedAtCol = headers.indexOf("updatedAt");
    if ([statusCol, scheduledAtCol, publishedAtCol, dateCol, updatedAtCol].some(i => i < 0)) {
      throw fail("Scheduled post columns not found", "SERVER_ERROR");
    }

    const now = new Date();
    const nowText = formatDateTime(now);
    const changedRows = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (normalizeStatus(row[statusCol], "public") !== "scheduled") continue;
      const scheduledDate = parseDateTimeValue(row[scheduledAtCol]);
      if (!scheduledDate || scheduledDate.getTime() > now.getTime()) continue;

      row[statusCol] = "public";
      row[publishedAtCol] = formatIsoDateTime(scheduledDate);
      row[dateCol] = formatDateYMD(scheduledDate);
      row[scheduledAtCol] = "";
      row[updatedAtCol] = nowText;
      changedRows.push({ rowNumber: i + 1, values: row.slice() });
      publishedPosts.push(normalizePostRow(rowToObj(headers, row), { includeMetrics: true }));
    }

    changedRows.forEach(item => {
      sheet.getRange(item.rowNumber, 1, 1, headers.length).setValues([item.values]);
    });
  } finally {
    lock.releaseLock();
  }

  publishedPosts.forEach(post => {
    try {
      sendPushNotificationToAllFromGAS(buildPostPushPayload(post));
    } catch (err) {
      console.warn("Scheduled post push failed:", err && err.message ? err.message : err);
    }
  });

  return { ok: true, published: publishedPosts.length };
}

function setupScheduledPostTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === "publishDueScheduledPosts")
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("publishDueScheduledPosts")
    .timeBased()
    .everyMinutes(1)
    .create();

  return { ok: true, message: "予約投稿の1分間隔トリガーを設定しました。" };
}

function migrateExistingPostPublishedAt() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return { ok: true, updated: 0 };

    const headers = values[0];
    const statusCol = headers.indexOf("status");
    const dateCol = headers.indexOf("date");
    const updatedAtCol = headers.indexOf("updatedAt");
    const publishedAtCol = headers.indexOf("publishedAt");
    if ([statusCol, dateCol, updatedAtCol, publishedAtCol].some(i => i < 0)) {
      throw fail("Post publication columns not found", "SERVER_ERROR");
    }

    let updated = 0;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (normalizeStatus(row[statusCol], "public") !== "public") continue;
      if (normalizeDateTimeCell(row[publishedAtCol])) continue;

      const base = buildLegacyPublishedAt(row[dateCol], row[updatedAtCol]);
      if (!base) continue;
      row[publishedAtCol] = base;
      sheet.getRange(i + 1, publishedAtCol + 1).setValue(base);
      updated += 1;
    }

    return { ok: true, updated: updated };
  } finally {
    lock.releaseLock();
  }
}

function shouldSendPostPushNotification(isNewPost, previousStatus, post) {
  const currentStatus = normalizeStatus(post.status, "public");

  if (currentStatus !== "public") {
    return false;
  }

  // 新規公開記事
  if (isNewPost) {
    return true;
  }

  // 下書き/非公開から公開に切り替えた場合
  if (previousStatus && previousStatus !== "public") {
    return true;
  }

  return false;
}

function buildPostPushPayload(post) {
  const channel = String(post.channel || "article").trim();
  const isOps = channel === "ops";

  const title = isOps
    ? "運営からのお知らせ"
    : "新しい記事が投稿されました";

  const body = post.title
    ? "「" + post.title + "」を読む"
    : (isOps ? "運営からのお知らせがあります。" : "新しい記事があります。");

  const appBaseUrl = getPushAppBaseUrl();
  const url = appBaseUrl;

  return {
    type: isOps ? "ops_notice" : "new_post",
    title: title,
    body: body,
    url: url,
    icon: joinUrlForPush(appBaseUrl, "favicon.png"),
    postId: String(post.id || ""),
    channel: channel
  };
}

function sendPushNotificationToAllFromGAS(payload) {
  const props = PropertiesService.getScriptProperties();

  const webhookUrl = String(props.getProperty("PUSH_WEBHOOK_URL") || "").trim();
  const secret = String(props.getProperty("PUSH_WEBHOOK_SECRET") || "").trim();

  if (!webhookUrl) {
    throw fail("PUSH_WEBHOOK_URL is not configured", "SERVER_ERROR");
  }

  if (!secret) {
    throw fail("PUSH_WEBHOOK_SECRET is not configured", "SERVER_ERROR");
  }

  const res = UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify({
      secret: secret,
      payload: payload
    })
  });

  const status = res.getResponseCode();
  const text = res.getContentText();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_err) {
    throw fail("Push webhook response is not JSON: " + text.slice(0, 200), "SERVER_ERROR");
  }

  if (status < 200 || status >= 300 || !data.ok) {
    throw fail(
      data.message || data.error || ("Push webhook failed: " + status),
      "SERVER_ERROR"
    );
  }

  return data;
}

function getPushAppBaseUrl() {
  const props = PropertiesService.getScriptProperties();
  const fromProps = String(props.getProperty("APP_BASE_URL") || "").trim();

  if (fromProps) {
    return fromProps.replace(/\/+$/, "/");
  }

  // demo用の保険
  return "https://araragi0040-jpg.github.io/community-news-pwa/demo/";
}

function joinUrlForPush(baseUrl, path) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return base + "/" + p;
}

/************************************************************
 * SNS用イベントカレンダー画像出力
 * - スプレッドシートのカスタムメニューから起動
 * - eventsシートの public イベントのみ使用
 * - サイトは介さず、GASダイアログ上で1080×1350 PNGを生成
 ************************************************************/

function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu("SNSカレンダー")
    .addItem("SNS用カレンダーを出力", "showSnsCalendarExportDialog")
    .addSeparator()
    .addItem("今月分を出力", "showSnsCalendarThisMonth")
    .addItem("来月分を出力", "showSnsCalendarNextMonth")
    .addToUi();
}

function showSnsCalendarExportDialog() {
  const now = new Date();
  showSnsCalendarExportDialog_(now.getFullYear(), now.getMonth() + 1);
}

function showSnsCalendarThisMonth() {
  const now = new Date();
  showSnsCalendarExportDialog_(now.getFullYear(), now.getMonth() + 1);
}

function showSnsCalendarNextMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  showSnsCalendarExportDialog_(d.getFullYear(), d.getMonth() + 1);
}

function showSnsCalendarExportDialog_(defaultYear, defaultMonth) {
  const events = getSnsCalendarPublicEvents_();
  const html = HtmlService
    .createHtmlOutput(buildSnsCalendarExportHtml_(events, defaultYear, defaultMonth))
    .setWidth(980)
    .setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, "SNS用イベントカレンダー出力");
}

function getSnsCalendarPublicEvents_() {
  const sheet = ensureEventsSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h || "").trim());
  return values.slice(1)
    .map(row => rowToObj(headers, row))
    .map(obj => normalizeSnsCalendarEvent_(obj))
    .filter(ev => ev.status === "public" && ev.date && ev.title)
    .sort((a, b) => {
      const dateCmp = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCmp !== 0) return dateCmp;
      return String(a.startTime || "99:99").localeCompare(String(b.startTime || "99:99"));
    });
}

function normalizeSnsCalendarEvent_(obj) {
  return {
    id: String(obj.id || "").trim(),
    title: String(obj.title || "").trim(),
    date: normalizeSnsCalendarDate_(obj.date),
    startTime: normalizeTimeField(obj.startTime),
    endTime: normalizeTimeField(obj.endTime),
    location: String(obj.location || "").trim(),
    // スプシ側だけで管理する表示用担当者。
    // 列名は「担当者」を推奨。既存運用に備えて ownerName 等も拾います。
    ownerName: String(obj["担当者"] || obj.ownerName || obj.tantou || obj.personInCharge || obj.owner || "").trim(),
    status: normalizeStatus(obj.status, "public")
  };
}

function normalizeSnsCalendarDate_(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  const text = String(value || "").trim();
  if (!text) return "";

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
    const parts = text.split("-");
    return parts[0] + "-" + String(parts[1]).padStart(2, "0") + "-" + String(parts[2]).padStart(2, "0");
  }

  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(text)) {
    const parts = text.split("/");
    return parts[0] + "-" + String(parts[1]).padStart(2, "0") + "-" + String(parts[2]).padStart(2, "0");
  }

  const d = new Date(text);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return "";
}

function buildSnsCalendarExportHtml_(events, defaultYear, defaultMonth) {
  const safeEventsJson = JSON.stringify(events).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  const year = Number(defaultYear || new Date().getFullYear());
  const month = Number(defaultMonth || (new Date().getMonth() + 1));

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root{
      --bg:#fffaf3;
      --panel:#ffffff;
      --text:#2d251f;
      --muted:#8a7969;
      --accent:#b07d4f;
      --accent2:#d9b38c;
      --line:#eadbca;
    }
    *{ box-sizing:border-box; }
    body{
      margin:0;
      padding:18px;
      background:#f6efe7;
      color:var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif;
    }
    .layout{
      display:grid;
      grid-template-columns: 260px 1fr;
      gap:18px;
      align-items:start;
    }
    .panel{
      background:#fff;
      border:1px solid var(--line);
      border-radius:18px;
      padding:16px;
      box-shadow:0 10px 24px rgba(80,50,25,.08);
    }
    .title{
      font-weight:800;
      font-size:18px;
      margin:0 0 8px;
    }
    .sub{
      font-size:12px;
      line-height:1.7;
      color:var(--muted);
      margin:0 0 14px;
    }
    label{
      display:block;
      font-size:12px;
      color:var(--muted);
      margin:12px 0 6px;
      font-weight:700;
    }
    select, button{
      width:100%;
      border:1px solid var(--line);
      border-radius:12px;
      padding:10px 12px;
      font:inherit;
      background:#fff;
      color:var(--text);
    }
    button{
      cursor:pointer;
      font-weight:800;
      background:linear-gradient(135deg,#b07d4f,#d9b38c);
      color:#fff;
      border:0;
      margin-top:12px;
      box-shadow:0 8px 18px rgba(176,125,79,.22);
    }
    button.secondary{
      background:#fff;
      color:var(--text);
      border:1px solid var(--line);
      box-shadow:none;
    }
    .note{
      margin-top:14px;
      font-size:11px;
      line-height:1.6;
      color:var(--muted);
    }
    .preview{
      background:#fff;
      border:1px solid var(--line);
      border-radius:18px;
      padding:16px;
      min-height:720px;
      box-shadow:0 10px 24px rgba(80,50,25,.08);
    }
    #svgWrap{
      display:flex;
      justify-content:center;
      align-items:flex-start;
    }
    #svgWrap svg{
      width:min(100%, 540px);
      height:auto;
      border-radius:18px;
      box-shadow:0 12px 28px rgba(80,50,25,.12);
      background:#fff;
    }
    .count{
      margin-top:10px;
      font-size:12px;
      color:var(--muted);
      text-align:center;
    }
    @media (max-width: 820px){
      .layout{ grid-template-columns:1fr; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="panel">
      <h1 class="title">SNS用カレンダー出力</h1>
      <p class="sub">eventsシートの public イベントのみを読み込み、Instagram投稿向けの1080×1350画像として保存します。</p>

      <label for="yearSel">年</label>
      <select id="yearSel"></select>

      <label for="monthSel">月</label>
      <select id="monthSel"></select>

      <button type="button" id="downloadBtn">PNG画像を保存</button>
      <button type="button" class="secondary" id="refreshBtn">プレビュー更新</button>

      <div class="note">
        ・予定が多い月でも崩れにくいよう、週数に応じてレイアウトを自動調整します。<br>
        ・スプシの「担当者」列に入力がある場合だけ表示します。<br>
        ・担当者が空欄の場合は、担当者行も余白も出しません。<br>
        ・ポスター画像は使用せず、日付・時間・イベント名・担当者を見やすく整えます。
      </div>
    </aside>

    <main class="preview">
      <div id="svgWrap"></div>
      <div class="count" id="eventCount"></div>
      <div class="count" id="errorBox" style="color:#c56a5c;font-weight:700;"></div>
    </main>
  </div>

<script>
const EVENTS = ${safeEventsJson};
const DEFAULT_YEAR = ${year};
const DEFAULT_MONTH = ${month};
const W = 1080;
const H = 1350;

function pad2(n){ return String(n).padStart(2, "0"); }
function ymd(y,m,d){ return y + "-" + pad2(m) + "-" + pad2(d); }
function esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
function truncateText(text, max){
  const chars = Array.from(String(text || ""));
  if(chars.length <= max) return chars.join("");
  return chars.slice(0, Math.max(0, max - 1)).join("") + "…";
}
function displayTime(value){
  if(!value) return "";
  const parts = String(value).split(":");
  if(parts.length < 2) return String(value);
  return parts[0] + ":" + parts[1];
}
function charUnits(ch){
  ch = String(ch || "");
  if(!ch) return 0;
  return ch.charCodeAt(0) <= 127 ? 0.55 : 1;
}
function wrapTextFull(text, maxUnits){
  const chars = Array.from(String(text || "").trim());
  const lines = [];
  let line = "";
  let units = 0;

  for(let i = 0; i < chars.length; i++){
    const ch = chars[i];
    const u = charUnits(ch);
    if(line && units + u > maxUnits){
      lines.push(line);
      line = ch;
      units = u;
    } else {
      line += ch;
      units += u;
    }
  }

  if(line) lines.push(line);
  return lines.length ? lines : [""];
}
function buildEventTextBlocks(events, maxUnits, availableH){
  // 時間 / タイトル全文 / 担当者を、余白を詰めて配置します。
  // 担当者が空欄の場合は担当者行を作らず、その分のスペースも空けません。
  const betweenCards = 5;

  for(let fs = 12; fs >= 7; fs--){
    const titleLineH = fs + 3;
    const ownerFs = Math.max(7, fs - 1);
    const ownerLineH = ownerFs + 3;
    const timeFs = Math.max(8, fs - 2);
    const timeH = timeFs + 4;
    const units = maxUnits * (12 / fs);

    const blocks = events.map(ev => {
      const titleLines = wrapTextFull(ev.title || "", units);
      const ownerText = String(ev.ownerName || "").trim();
      const ownerLines = ownerText ? wrapTextFull("" + ownerText, units) : [];
      const hasTime = !!displayTime(ev.startTime);
      const padTop = 7;
      const padBottom = 6;
      const timeBlockH = hasTime ? timeH + 2 : 0;
      const ownerBlockH = ownerLines.length ? ownerLines.length * ownerLineH + 2 : 0;
      const h = padTop + timeBlockH + titleLines.length * titleLineH + ownerBlockH + padBottom;
      return { ev, titleLines, ownerLines, fs, titleLineH, ownerFs, ownerLineH, timeFs, timeH, h, hasTime };
    });

    const total = blocks.reduce((sum, b) => sum + b.h, 0) + Math.max(0, blocks.length - 1) * betweenCards;
    if(total <= availableH) {
      blocks.forEach(b => b.betweenCards = betweenCards);
      return blocks;
    }
  }

  const fs = 7;
  const titleLineH = 10;
  const ownerFs = 7;
  const ownerLineH = 10;
  const timeFs = 8;
  const timeH = 11;
  const units = maxUnits * (12 / fs);
  return events.map(ev => {
    const titleLines = wrapTextFull(ev.title || "", units);
    const ownerText = String(ev.ownerName || "").trim();
    const ownerLines = ownerText ? wrapTextFull("担当：" + ownerText, units) : [];
    const hasTime = !!displayTime(ev.startTime);
    const h = 5 + (hasTime ? timeH + 1 : 0) + titleLines.length * titleLineH + (ownerLines.length ? ownerLines.length * ownerLineH + 1 : 0) + 5;
    return { ev, titleLines, ownerLines, fs, titleLineH, ownerFs, ownerLineH, timeFs, timeH, h, hasTime, betweenCards: 4 };
  });
}
function eventsForMonth(year, month){
  const prefix = year + "-" + pad2(month) + "-";
  return EVENTS.filter(ev => String(ev.date || "").startsWith(prefix));
}
function groupByDate(items){
  const map = {};
  items.forEach(ev => {
    if(!map[ev.date]) map[ev.date] = [];
    map[ev.date].push(ev);
  });
  Object.keys(map).forEach(date => {
    map[date].sort((a,b) => String(a.startTime || "99:99").localeCompare(String(b.startTime || "99:99")));
  });
  return map;
}
function svgText(text, x, y, attrs){
  return '<text x="' + x + '" y="' + y + '" ' + (attrs || "") + '>' + esc(text) + '</text>';
}
function buildSvg(year, month){
  const monthEvents = eventsForMonth(year, month);
  const byDate = groupByDate(monthEvents);
  const first = new Date(year, month - 1, 1);
  const startDow = first.getDay();
  const lastDay = new Date(year, month, 0).getDate();
  const weeks = Math.max(5, Math.ceil((startDow + lastDay) / 7));
  const dows = ["日", "月", "火", "水", "木", "金", "土"];

  const gridX = 64;
  const gridY = 300;
  const gridW = 952;
  const dowH = 54;
  const cellW = gridW / 7;
  const bodyBottom = 1195;
  const cellH = Math.floor((bodyBottom - (gridY + dowH)) / weeks);
  const gridH = dowH + cellH * weeks;
  const footerY = gridY + gridH + 64;
  const maxEventsPerDay = weeks >= 6 ? 2 : 3;

  let svg = '';
  svg += '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
  svg += '<rect width="1080" height="1350" fill="#fffaf3"/>';
  svg += '<circle cx="80" cy="80" r="180" fill="#f4dcc2" opacity="0.45"/>';
  svg += '<circle cx="990" cy="1180" r="220" fill="#f1e4d6" opacity="0.75"/>';
  svg += '<rect x="42" y="42" width="996" height="1266" rx="42" fill="#ffffff" stroke="#eadbca" stroke-width="2"/>';

  svg += svgText("語り場イベントカレンダー", 540, 118, 'text-anchor="middle" font-size="42" font-weight="800" fill="#2d251f" font-family="Noto Sans JP, system-ui, sans-serif"');
  svg += svgText(year + "年 " + month + "月", 540, 178, 'text-anchor="middle" font-size="62" font-weight="900" fill="#b07d4f" font-family="Noto Sans JP, system-ui, sans-serif"');
  svg += svgText("KATARIBA EVENT CALENDAR", 540, 222, 'text-anchor="middle" font-size="22" font-weight="700" letter-spacing="4" fill="#bca58f" font-family="system-ui, sans-serif"');

  svg += '<rect x="' + gridX + '" y="' + gridY + '" width="' + gridW + '" height="' + gridH + '" rx="26" fill="#fffdf9" stroke="#eadbca" stroke-width="2"/>';

  dows.forEach((dow, i) => {
    const x = gridX + cellW * i;
    const fill = i === 0 ? '#c56a5c' : (i === 6 ? '#4f7ea8' : '#8a7969');
    svg += '<rect x="' + x + '" y="' + gridY + '" width="' + cellW + '" height="' + dowH + '" fill="#fbf3ea" stroke="#eadbca" stroke-width="1"/>';
    svg += svgText(dow, x + cellW / 2, gridY + 35, 'text-anchor="middle" font-size="22" font-weight="800" fill="' + fill + '" font-family="Noto Sans JP, system-ui, sans-serif"');
  });

  for(let i=0; i<weeks * 7; i++){
    const dayNum = i - startDow + 1;
    const col = i % 7;
    const row = Math.floor(i / 7);
    const x = gridX + col * cellW;
    const y = gridY + dowH + row * cellH;
    const inMonth = dayNum >= 1 && dayNum <= lastDay;
    const fill = inMonth ? '#ffffff' : '#f8f1e9';
    svg += '<rect x="' + x + '" y="' + y + '" width="' + cellW + '" height="' + cellH + '" fill="' + fill + '" stroke="#eadbca" stroke-width="1"/>';

    if(!inMonth) continue;

    const dateStr = ymd(year, month, dayNum);
    const dayEvents = byDate[dateStr] || [];
    const dowFill = col === 0 ? '#c56a5c' : (col === 6 ? '#4f7ea8' : '#2d251f');
    svg += svgText(dayNum, x + 15, y + 32, 'font-size="27" font-weight="900" fill="' + dowFill + '" font-family="system-ui, sans-serif"');

    const shown = dayEvents.slice(0, maxEventsPerDay);
    const eventAreaTop = y + 45;
    const eventAreaH = cellH - 56;
    // 右端で文字が切れないよう、実際の枠幅より少し短めに折り返します。
    const blocks = buildEventTextBlocks(shown, 7.7, eventAreaH);
    let cursorY = eventAreaTop;

    blocks.forEach((block, blockIdx) => {
      const ev = block.ev;
      const cardX = x + 9;
      const cardY = cursorY;
      const cardW = cellW - 18;
      const textX = cardX + 8;
      const cardH = Math.max(26, block.h);
      const time = displayTime(ev.startTime);
      const clipId = 'clip_' + year + '_' + month + '_' + dayNum + '_' + blockIdx;

      svg += '<defs><clipPath id="' + clipId + '"><rect x="' + (cardX + 6) + '" y="' + (cardY + 4) + '" width="' + (cardW - 18) + '" height="' + (cardH - 8) + '" rx="8"/></clipPath></defs>';
      svg += '<rect x="' + cardX + '" y="' + cardY + '" width="' + cardW + '" height="' + cardH + '" rx="10" fill="#fff3e4" stroke="#efd7bd" stroke-width="1"/>';
      svg += '<g clip-path="url(#' + clipId + ')">';

      let textY = cardY + 7;
      if(time){
        textY += block.timeFs + 2;
        svg += svgText(time, textX, textY, 'font-size="' + block.timeFs + '" font-weight="900" fill="#9a6b3f" font-family="system-ui, sans-serif"');
        textY += 3;
      }

      block.titleLines.forEach((line) => {
        textY += block.titleLineH;
        svg += svgText(line, textX, textY, 'font-size="' + block.fs + '" font-weight="750" fill="#4a3728" font-family="Noto Sans JP, system-ui, sans-serif"');
      });

      if(block.ownerLines && block.ownerLines.length){
        textY += 3;
        block.ownerLines.forEach((line) => {
          textY += block.ownerLineH;
          svg += svgText(line, textX, textY, 'font-size="' + block.ownerFs + '" font-weight="700" fill="#8a6341" font-family="Noto Sans JP, system-ui, sans-serif"');
        });
      }

      svg += '</g>';
      cursorY += cardH + (block.betweenCards || 4);
    });

    if(dayEvents.length > maxEventsPerDay){
      svg += svgText('+' + (dayEvents.length - maxEventsPerDay) + '件', x + cellW - 12, y + cellH - 10, 'text-anchor="end" font-size="14" font-weight="800" fill="#b07d4f" font-family="Noto Sans JP, system-ui, sans-serif"');
    }
  }

  const eventCountText = monthEvents.length ? monthEvents.length + " events" : "No events";
  svg += '<rect x="210" y="' + (footerY - 35) + '" width="660" height="70" rx="24" fill="#fff8ee" stroke="#eadbca" stroke-width="2"/>';
  svg += svgText(eventCountText, 540, footerY - 2, 'text-anchor="middle" font-size="22" font-weight="900" fill="#b07d4f" font-family="system-ui, sans-serif"');
  svg += svgText("イベント詳細は各案内をご確認ください", 540, footerY + 27, 'text-anchor="middle" font-size="19" font-weight="700" fill="#8a7969" font-family="Noto Sans JP, system-ui, sans-serif"');
  svg += '</svg>';
  return svg;
}
function fillSelectors(){
  const years = new Set();
  EVENTS.forEach(ev => {
    const y = Number(String(ev.date || '').slice(0,4));
    if(y) years.add(y);
  });
  years.add(DEFAULT_YEAR);
  years.add(new Date().getFullYear());
  years.add(new Date().getFullYear() + 1);

  const yearSel = document.getElementById('yearSel');
  const monthSel = document.getElementById('monthSel');
  yearSel.innerHTML = Array.from(years).sort((a,b)=>a-b).map(y => '<option value="' + y + '">' + y + '年</option>').join('');
  monthSel.innerHTML = Array.from({length:12}, (_,i) => i + 1).map(m => '<option value="' + m + '">' + m + '月</option>').join('');
  yearSel.value = String(DEFAULT_YEAR);
  monthSel.value = String(DEFAULT_MONTH);
}
function render(){
  const y = Number(document.getElementById('yearSel').value);
  const m = Number(document.getElementById('monthSel').value);
  document.getElementById('svgWrap').innerHTML = buildSvg(y, m);
  document.getElementById('eventCount').textContent = y + '年' + m + '月：' + eventsForMonth(y,m).length + '件の公開イベント';
}
function downloadPng(){
  const y = Number(document.getElementById('yearSel').value);
  const m = Number(document.getElementById('monthSel').value);
  const svgText = buildSvg(y, m);
  const img = new Image();
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  img.onload = function(){
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, W, H);
    const a = document.createElement('a');
    a.download = 'katariba_events_' + y + '_' + pad2(m) + '.png';
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  img.onerror = function(){ alert('画像化に失敗しました。もう一度お試しください。'); };
  img.src = svgUrl;
}
try {
  fillSelectors();
  render();
  document.getElementById('yearSel').addEventListener('change', render);
  document.getElementById('monthSel').addEventListener('change', render);
  document.getElementById('refreshBtn').addEventListener('click', render);
  document.getElementById('downloadBtn').addEventListener('click', downloadPng);
} catch (err) {
  const box = document.getElementById('errorBox');
  if (box) box.textContent = 'カレンダー表示エラー: ' + (err && err.message ? err.message : String(err));
  console.error(err);
}
</script>
</body>
</html>`;
}
