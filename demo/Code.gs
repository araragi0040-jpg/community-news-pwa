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
  return outputJson(saveGachaResult(body.ticket || "", body.result || body.figure || {}));
}

if (action === "saveGachaResults") {
  return outputJson(saveGachaResults(body.ticket || "", body.results || []));
}

if (action === "importLocalGachaInventory") {
  return outputJson(importLocalGachaInventory(body.ticket || "", body.items || []));
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
    role: obj.role || "member",
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
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  const rows = values.slice(1);
  const posts = rows.map(row => normalizePostRow(rowToObj(headers, row), { includeMetrics: includeAll }));
  return includeAll ? posts : posts.filter(post => post.status === "public");
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

  let previousStatus = "";
  let isNewPost = existingRowIndex < 0;

  if (existingRowIndex < 0) {
    if (!normalized.date) normalized.date = formatDateYMD(new Date());
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
    const existing = rowToObj(headers, values[existingRowIndex]);
    previousStatus = normalizeStatus(existing.status, "public");

    if (!normalized.date) normalized.date = String(existing.date || "");

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

  // 新規公開、または下書き/非公開から公開になった時だけPush通知
  if (shouldSendPostPushNotification(isNewPost, previousStatus, savedPost)) {
    try {
      const pushPayload = buildPostPushPayload(savedPost);
      sendPushNotificationToAllFromGAS(pushPayload);
    } catch (err) {
      // Push送信に失敗しても、記事保存自体は成功扱いにする
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
    updatedAt: row.updatedAt || ""
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
    role: String(role || "member"),
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

function requireAdmin(token) {
  const user = requireAuth(token);
  if (String(user.role || "member") !== "admin") throw fail("Admin privileges required", "FORBIDDEN");
  return user;
}

function isAdminRole(user) {
  return String((user && user.role) || "member") === "admin";
}

function isEventEditorRole(user) {
  return String((user && user.role) || "member") === "event_editor";
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
        role: obj.role || "member",
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

function saveGachaResults(ticket, results) {
  const session = requireValidGachaSession(ticket);
  const list = Array.isArray(results) ? results : [];

  if (!list.length) {
    return getGachaCollection(ticket);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    list.forEach(result => {
      const normalized = normalizeGachaResult(result);
      if (!normalized.figureId) return;

      upsertGachaInventory(
        session.userId,
        ticket,
        normalized,
        1
      );
    });
  } finally {
    lock.releaseLock();
  }

  return getGachaCollection(ticket);
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
  return {
    figureId: String(result.id || result.figureId || "").trim(),
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

function getGachaTotalSpins(rows) {
  return rows.reduce((sum, row) => {
    const quantity = Math.max(0, Math.floor(Number(row.quantity || 0)));
    return sum + quantity;
  }, 0);
}

function getGachaCollection(ticket) {
  const session = requireValidGachaSession(ticket);
  const rows = getGachaInventoryRowsByUserId(session.userId);
  const inventory = buildGachaInventory(rows);

  return {
    ok: true,
    userId: session.userId,
    inventory: inventory,
    totalSpins: getGachaTotalSpins(rows),
    results: rows
  };
}

function saveGachaResult(ticket, result) {
  const session = requireValidGachaSession(ticket);
  const normalized = normalizeGachaResult(result);

  if (!normalized.figureId) {
    throw fail("figureId is required", "BAD_REQUEST");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    upsertGachaInventory(session.userId, ticket, normalized, 1);
  } finally {
    lock.releaseLock();
  }

  return getGachaCollection(ticket);
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
      totalSpins: getGachaTotalSpins(existingRows),
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
