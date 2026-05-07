/* Community News Wire Sample
   + Schedule Tab
   + Admin: Create/Edit/Delete posts (localStorage)
   + Export / Import JSON
*/

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const LS_KEY_SAVED = "community_news_saved_v1";
const LS_KEY_USER = "community_news_user_v1";
const LS_KEY_TOKEN = "community_news_token_v1";
const LS_KEY_POSTS_CACHE = "community_news_posts_cache_v1";
const LS_KEY_EVENTS_CACHE = "community_news_events_cache_v1";
const LS_KEY_DAILY_POINT_DATE_PREFIX = "community_news_daily_point_date_v1:";
const ITEMS_PER_PAGE = 10;

function getGachaAppUrl() {
  return String(window.APP_CONFIG?.GACHA_APP_URL || "").trim();
}

const CHANNELS = [
  { key:"all", label:"All", tone:"accent" },
  { key:"article", label:"記事", tone:"accent" },
  { key:"ops", label:"運営", tone:"warn" },
];

const ADMIN_CHANNELS = [
  { key: "article", label: "記事" },
  { key: "ops", label: "運営" },
];


// ==== Contact data ====
const OWNERS = [
  {
    name: "おかっち",
    instagram: "https://www.instagram.com/okacchi_4ugroup?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    name: "かずま",
    instagram: "https://www.instagram.com/kazuma07_31?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    name: "けん",
    instagram: "https://www.instagram.com/kaizokuken?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    name: "しゅう",
    instagram: "https://x.gd/2a58h",
  },
  {
    name: "じん",
    instagram: "https://www.instagram.com/jin_wcrft?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    name: "たかちゃん",
    instagram: "https://www.instagram.com/tk_hfpa?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    name: "だいち",
    instagram: "https://www.instagram.com/daichi_kanae?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    name: "だいちゃん",
    instagram: "https://www.instagram.com/daichan.1014?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    name: "とっとくん",
    instagram: "https://www.instagram.com/tot_575_tot?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    name: "東",
    instagram: "https://x.gd/tLcAs",
  },

  {
    name: "ゆか",
    instagram: "https://www.instagram.com/yuu.adorable_days?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    name: "よっしー",
    instagram: "https://www.instagram.com/yoshi_yoshi828?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    name: "ぐっちょん",
  },
];

// ===== State =====
let state = {
  channel: "all",
  query: "",
  sortOrder: "desc",
  currentPage: 1,
  drawerOpen: false,
  activeArticleId: null,

  // schedule
  calYear: null,
  calMonth: null, // 0-11
  selectedDate: null, // YYYY-MM-DD
  scheduleView: "month", // "month" | "2w" | "1w"
  scheduleCursor: null,  // Date

  // admin
  editingId: null, // post id
  adminTab: "editor", // "editor" | "list" | "edit"
  eventAdminTab: "list", // "list" | "editor"
  editingEventId: null,
  activePage: "home",
  newEditorDraftId: null,
  newEditorLastSavedSignature: "",
  editEditorLastSavedSignature: "",
};

let cloudPosts = [];
let cloudEvents = [];
let latestPostKey = "";
let latestPostSnapshot = null;
let deferredInstallPrompt = null;
let installHelpTimerId = null;

// ===== Helpers =====
function safeJsonParse(s, fallback){
  try { return JSON.parse(s); } catch { return fallback; }
}

function loadSaved(){
  return safeJsonParse(localStorage.getItem(LS_KEY_SAVED) || "[]", []);
}
function saveSaved(arr){
  localStorage.setItem(LS_KEY_SAVED, JSON.stringify(arr));
}
function isSaved(id){
  return loadSaved().includes(id);
}

function loadCachedPosts(){
  const posts = safeJsonParse(localStorage.getItem(LS_KEY_POSTS_CACHE) || "[]", []);
  return Array.isArray(posts) ? posts.map(normalizePost) : [];
}

function saveCachedPosts(posts){
  localStorage.setItem(LS_KEY_POSTS_CACHE, JSON.stringify(Array.isArray(posts) ? posts : []));
}

function loadCachedEvents(){
  const events = safeJsonParse(localStorage.getItem(LS_KEY_EVENTS_CACHE) || "[]", []);
  return Array.isArray(events) ? events.map(mapApiEvent) : [];
}

function saveCachedEvents(events){
  localStorage.setItem(LS_KEY_EVENTS_CACHE, JSON.stringify(Array.isArray(events) ? events : []));
}

function allArticles(){
  return cloudPosts.filter(post => post.status === "public");
}

function parseDate(value){
  if(!value) return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  if (typeof value === "string" && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(value)) {
    const [y, m, d] = value.split("/");
    return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  const dt = new Date(value);
  if (!isNaN(dt.getTime())) {
    return ymd(dt);
  }
  return String(value);
}

function formatDateJP(value){
  const parsed = parseDate(value);
  if (parsed === "-") return "-";
  const [y, m, d] = parsed.split("-");
  if (!y || !m || !d) return parsed;
  return `${y}/${m}/${d}`;
}

function relativeDate(value){
  const parsed = parseDate(value);
  if (parsed === "-") return "-";
  const target = new Date(parsed);
  if (isNaN(target.getTime())) return formatDateJP(value);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.floor((now - target) / 86400000);
  if (diff === 0) return "今日";
  if (diff < 0) {
    const days = Math.abs(diff);
    if (days === 1) return "明日";
    if (days < 7) return `${days}日後`;
    return formatDateJP(parsed);
  }
  if (diff === 1) return "1日前";
  if (diff < 7) return `${diff}日前`;
  if (diff < 30) return `${Math.floor(diff / 7)}週間前`;
  return formatDateJP(parsed);
}

function formatEventTime(timeStr){
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  if (parts.length < 2) return String(timeStr);
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return String(timeStr);
  return `${hour}時${String(minute).padStart(2, "0")}分`;
}

function ymd(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function todayYMD(){ return ymd(new Date()); }

function toneColor(tone){
  const css = getComputedStyle(document.documentElement);
  const map = {
    accent: css.getPropertyValue("--accent").trim() || "#b07d4f",
    good: css.getPropertyValue("--good").trim() || "#7aa67a",
    warn: css.getPropertyValue("--warn").trim() || "#c48a4a",
    danger: css.getPropertyValue("--danger").trim() || "#c56a5c",
  };
  return map[tone] || (css.getPropertyValue("--accent2").trim() || "#d9b38c");
}

function channelLabel(key){
  return CHANNELS.find(c=>c.key===key)?.label || ADMIN_CHANNELS.find(c=>c.key===key)?.label || key;
}

function badgeTextFromChannel(ch){
  const map = { article:"記事", event:"イベント概要", ops:"運営" };
  return map[ch] || "Info";
}

function normalizeChannelKey(ch){
  if (ch === "announce") return "article";
  if (ch === "tips") return "ops";
  return ch;
}

function normalizeStatusValue(value, fallback = "public"){
  const s = String(value || "").trim().toLowerCase();
  if (!s) return fallback;
  if (s === "public" || s === "published" || s === "公開") return "public";
  if (s === "draft" || s === "下書き") return "draft";
  if (s === "private" || s === "非公開") return "private";
  return fallback;
}

function normalizePost(input){
  const a = { ...input };
  a.id = a.id || `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  a.channel = normalizeChannelKey(a.channel || "article");
  a.tone = a.tone || "accent";
  a.badge = a.badge || badgeTextFromChannel(a.channel);
  a.date = a.date || todayYMD();
  a.title = a.title || "(no title)";
  a.tags = Array.isArray(a.tags) ? a.tags : [];
  a.summary = Array.isArray(a.summary) ? a.summary : [];
  a.body = Array.isArray(a.body) ? a.body : [];
  if(a.cta && (!a.cta.url || String(a.cta.url).trim()==="")) a.cta = null;
  a.media = a.media || {};
  a.media.images = Array.isArray(a.media.images) ? a.media.images : [];
  a.media.video = a.media.video || "";
  a.status = normalizeStatusValue(a.status, "public");
  const totalViews = Number(a.totalViews || 0);
  const uniqueViewCount = Number(a.uniqueViewCount || 0);
  a.totalViews = Number.isFinite(totalViews) && totalViews >= 0 ? Math.floor(totalViews) : 0;
  a.uniqueViewCount = Number.isFinite(uniqueViewCount) && uniqueViewCount >= 0 ? Math.floor(uniqueViewCount) : 0;
  return a;
}

function mapApiPost(post){
  return normalizePost({
    id: post.id,
    channel: post.channel,
    tone: post.tone,
    badge: post.badge,
    date: post.date,
    title: post.title,
    tags: post.tags || [],
    summary: post.summary || [],
    body: post.body || [],
    cta: post.ctaUrl ? {
      text: post.ctaText || "開く",
      url: post.ctaUrl
    } : null,
    media: {
      images: post.imageUrls || post.images || [],
      video: post.video || ""
    },
    status: post.status || "public",
    totalViews: post.totalViews || 0,
    uniqueViewCount: post.uniqueViewCount || 0
  });
}

function mapApiEvent(event){
  return {
    id: event.id || "",
    title: event.title || "",
    date: event.date || "",
    startTime: event.startTime || "",
    endTime: event.endTime || "",
    description: event.description || "",
    location: event.location || "",
    imageUrls: Array.isArray(event.imageUrls) ? event.imageUrls : [],
    ctaUrl: event.ctaUrl || "",
    status: normalizeStatusValue(event.status, "public"),
    createdAt: event.createdAt || ""
  };
}

function getAuthToken() {
  return (localStorage.getItem(LS_KEY_TOKEN) || "").trim();
}

function saveAuthToken(token) {
  localStorage.setItem(LS_KEY_TOKEN, String(token || ""));
}

function clearAuthToken() {
  localStorage.removeItem(LS_KEY_TOKEN);
}

function isAuthError(err){
  const code = err?.code || "";
  return code === "AUTH_REQUIRED" || code === "FORBIDDEN";
}

function buildApiGetUrl(action, includeAuth = true){
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) throw new Error("GAS_API_URL is not set");
  const token = includeAuth ? getAuthToken() : "";
  const params = new URLSearchParams({
    action,
    t: String(Date.now())
  });
  if (token) params.set("token", token);
  return `${base}?${params.toString()}`;
}

function handleAuthFailure(message = "セッションの有効期限が切れました。再ログインしてください。"){
  clearCurrentUser();
  clearAuthToken();
  applyAuthUI();
  const msg = $("#loginMsg");
  if (msg) msg.textContent = message;
}

async function callApi(action, payload = {}, opts = {}) {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) throw new Error("GAS_API_URL is not set");
  const includeAuth = opts.auth !== false;
  const token = includeAuth ? getAuthToken() : "";
  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action,
      ...(token ? { token } : {}),
      ...payload
    })
  });
  const data = await parseApiJson(res, action);
  if (!data.ok) {
    const err = new Error(data.message || "API error");
    err.code = data.code || "";
    if (includeAuth && isAuthError(err)) {
      handleAuthFailure(err.message || "セッションの有効期限が切れました。");
    }
    throw err;
  }
  return data;
}

async function parseApiJson(res, actionLabel){
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${actionLabel} failed: response is not JSON (status ${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data?.message || `${actionLabel} failed (status ${res.status})`);
  }
  return data;
}

async function fetchPostsFromApi() {
  const url = buildApiGetUrl("listPosts", true);
  const res = await fetch(url, {
    cache: "no-store"
  });
  const data = await parseApiJson(res, "listPosts");
  if (!data.ok) throw new Error(data.message || "Failed to fetch posts");
  return (data.posts || []).map(mapApiPost);
}

async function fetchAllPostsFromApi() {
  const url = buildApiGetUrl("listAllPosts", true);
  const res = await fetch(url, {
    cache: "no-store"
  });
  const data = await parseApiJson(res, "listAllPosts");
  if (!data.ok) throw new Error(data.message || "Failed to fetch posts");
  return (data.posts || []).map(mapApiPost);
}

async function fetchEventsFromApi() {
  const url = buildApiGetUrl("listEvents", true);
  const res = await fetch(url, {
    cache: "no-store"
  });
  const data = await parseApiJson(res, "listEvents");
  if (!data.ok) throw new Error(data.message || "Failed to fetch events");
  return (data.events || []).map(mapApiEvent);
}

async function fetchAllEventsFromApi() {
  const url = buildApiGetUrl("listAllEvents", true);
  const res = await fetch(url, {
    cache: "no-store"
  });
  const data = await parseApiJson(res, "listAllEvents");
  if (!data.ok) throw new Error(data.message || "Failed to fetch events");
  return (data.events || []).map(mapApiEvent);
}

async function deletePostFromApi(id) {
  await callApi("deletePost", { id });
  return true;
}

async function deleteEventFromApi(id) {
  await callApi("deleteEvent", { id });
  return true;
}

async function savePostToApi(post) {
  const rawTitle = String(post?.title || "").trim();
  if (!rawTitle) {
    const err = new Error("タイトルは必須です。");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  const data = await callApi("savePost", {
    post: {
      id: post.id || "",
      date: post.date || "",
      channel: post.channel || "article",
      tone: post.tone || "accent",
      badge: post.badge || "",
      title: rawTitle,
      tags: post.tags || [],
      summary: post.summary || [],
      body: post.body || [],
      ctaText: post.cta?.text || "",
      ctaUrl: post.cta?.url || "",
      imageUrls: post.media?.images || [],
      video: post.media?.video || "",
      status: post.status || "public"
    }
  });
  return data.post;
}

async function saveEventToApi(event) {
  const data = await callApi("saveEvent", {
    event: {
      id: event.id || "",
      title: event.title || "",
      date: event.date || "",
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      description: event.description || "",
      location: event.location || "",
      imageUrls: event.imageUrls || [],
      ctaUrl: event.ctaUrl || "",
      status: event.status || "public",
      createdAt: event.createdAt || ""
    }
  });
  return mapApiEvent(data.event || {});
}

async function saveContactToApi(contact) {
  const data = await callApi("saveContact", {
    contact: {
      name: contact.name || "",
      email: contact.email || "",
      message: contact.message || ""
    }
  });
  return data.contact;
}

async function recordPostViewToApi(postId) {
  const data = await callApi("recordPostView", { id: postId });
  return {
    totalViews: Number(data.totalViews || 0),
    uniqueViewCount: Number(data.uniqueViewCount || 0)
  };
}

async function fetchProfileFromApi() {
  const data = await callApi("getProfile");
  return data.profile || {};
}

async function saveProfileToApi(profile) {
  const data = await callApi("saveProfile", {
    profile: {
      nickname: profile.nickname || "",
      iconUrl: profile.iconUrl || "",
      hobby: profile.hobby || "",
      interests: profile.interests || ""
    }
  });
  return data.profile || {};
}

async function touchDailyPointToApi() {
  const data = await callApi("touchDailyPoint");
  return Number(data.points || 0);
}

async function createGachaTicketToApi() {
  const data = await callApi("createGachaTicket");
  return {
    ticket: data.ticket || "",
    expiresAt: data.expiresAt || ""
  };
}

async function uploadImageToApi(file) {
  const dataUrl = await compressImage(file);
  const data = await callApi("uploadImage", {
    fileName: file.name,
    mimeType: "image/jpeg",
    dataUrl
  });
  return data.url;
}

function compressImage(file, quality = 0.9, maxWidth = 2400) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("画像サイズの取得に失敗しました。"));
        return;
      }
      if (w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("画像処理コンテキストの初期化に失敗しました。"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      URL.revokeObjectURL(objectUrl);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("画像の読み込みに失敗しました。"));
    };
    img.src = objectUrl;
  });
}

/* ログイン関数 */
async function loginToApi(email, password) {
  const data = await callApi("login", { email, password }, { auth: false });
  return {
    user: data.user,
    token: data.token || ""
  };
}

async function registerToApi(name, email, password) {
  const data = await callApi("register", {
    user: { name, email, password }
  }, { auth: false });
  return data.user;
}

async function requestPasswordResetToApi(email){
  await callApi("requestPasswordReset", {
    email,
    appBaseUrl: window.location.origin
  }, { auth: false });
}

async function resetPasswordToApi(resetToken, newPassword){
  await callApi("resetPassword", {
    resetToken,
    newPassword
  }, { auth: false });
}

function getCurrentUser() {
  return safeJsonParse(localStorage.getItem(LS_KEY_USER) || "null", null);
}

function saveCurrentUser(user) {
  const u = user || {};
  const parsedPoints = Number(u.points || 0);
  const safeUser = {
    ...u,
    nickname: String(u.nickname || "").trim(),
    iconUrl: String(u.iconUrl || "").trim(),
    hobby: String(u.hobby || "").trim(),
    interests: String(u.interests || "").trim(),
    points: Number.isFinite(parsedPoints) && parsedPoints >= 0 ? Math.floor(parsedPoints) : 0
  };
  localStorage.setItem(LS_KEY_USER, JSON.stringify(safeUser));
}

async function awardDailyVisitPointIfNeeded() {
  const user = getCurrentUser();
  const token = getAuthToken();
  if (!user || !token || !user.id) return;
  const today = todayYMD();
  const cacheKey = `${LS_KEY_DAILY_POINT_DATE_PREFIX}${user.id}`;
  if (localStorage.getItem(cacheKey) === today) return;

  const points = await touchDailyPointToApi();
  const merged = {
    ...user,
    points: Number.isFinite(points) && points >= 0 ? Math.floor(points) : Number(user.points || 0)
  };
  saveCurrentUser(merged);
  updateProfileButton(merged);
  updateProfilePoints(merged.points);
  localStorage.setItem(cacheKey, today);
}

function clearCurrentUser() {
  localStorage.removeItem(LS_KEY_USER);
  localStorage.removeItem(LS_KEY_TOKEN);
}

function normalizePostContentParts(post){
  const src = post || {};
  const normalized = normalizePost({ ...src, title: "__KEEP_RAW_TITLE__" });
  return {
    channel: normalized.channel || "article",
    title: String(src.title || ""),
    tags: Array.isArray(normalized.tags) ? normalized.tags : [],
    body: Array.isArray(normalized.body) ? normalized.body : [],
    ctaText: normalized.cta?.text || "",
    ctaUrl: normalized.cta?.url || "",
    images: Array.isArray(normalized.media?.images) ? normalized.media.images : [],
    video: normalized.media?.video || ""
  };
}

function buildPostContentSignature(post){
  return JSON.stringify(normalizePostContentParts(post));
}

function hasMeaningfulPostContent(post){
  const parts = normalizePostContentParts(post);
  return Boolean(
    parts.title.trim() ||
    parts.tags.length ||
    parts.body.length ||
    parts.ctaText.trim() ||
    parts.ctaUrl.trim() ||
    parts.images.length ||
    parts.video.trim()
  );
}

function validatePostCtaFields(ctaText, ctaUrl, silentError = false){
  const hasUrl = !!String(ctaUrl || "").trim();
  const hasText = !!String(ctaText || "").trim();

  if (hasUrl && !hasText) {
    if (!silentError) {
      alert("CTA URLを入力する場合は、CTAテキストも入力してください。");
    }
    return false;
  }
  return true;
}

function getPostSaveToastMessage(status){
  const s = normalizeStatusValue(status, "public");
  if (s === "draft") return "下書き保存しました";
  if (s === "private") return "非公開で保存しました";
  return "投稿しました";
}

function isArticleAdminEditingActive(){
  const adminPage = document.querySelector('.page[data-page="admin"]');
  return !!(
    adminPage &&
    adminPage.classList.contains("page--active") &&
    (state.adminTab === "editor" || state.adminTab === "edit")
  );
}

function hasUnsavedNewEditorChanges(){
  if (!isArticleAdminEditingActive() || state.adminTab !== "editor") return false;
  const draft = collectForm();
  const signature = buildPostContentSignature(draft);
  return hasMeaningfulPostContent(draft) && signature !== state.newEditorLastSavedSignature;
}

function hasUnsavedEditEditorChanges(){
  if (!isArticleAdminEditingActive() || state.adminTab !== "edit" || !state.editingId) return false;
  const draft = collectEditForm();
  const signature = buildPostContentSignature(draft);
  return hasMeaningfulPostContent(draft) && signature !== state.editEditorLastSavedSignature;
}

function getNewEditorPersistStatus(){
  if (!state.newEditorDraftId) return "draft";
  const current = cloudPosts.find(x => x.id === state.newEditorDraftId);
  return normalizeStatusValue(current?.status, "draft");
}

function getEditingPostPersistStatus(){
  const current = cloudPosts.find(x => x.id === state.editingId);
  return normalizeStatusValue(current?.status, "draft");
}

async function confirmArticleChangesBeforeLeave(){
  if (!isArticleAdminEditingActive()) return true;

  const hasNewChanges = hasUnsavedNewEditorChanges();
  const hasEditChanges = hasUnsavedEditEditorChanges();

  if (!hasNewChanges && !hasEditChanges) return true;

  const wantsSave = confirm(
    "未保存の変更があります。\n\nOK：保存して移動\nキャンセル：次の確認へ"
  );

  if (wantsSave) {
    const saved = hasNewChanges
      ? await saveEditor(getNewEditorPersistStatus())
      : await saveEditForm(getEditingPostPersistStatus());

    return !!saved;
  }

  const wantsDiscard = confirm(
    "保存せずに移動しますか？\n\nOK：保存せず移動\nキャンセル：現在の画面に残る"
  );

  return wantsDiscard;
}

async function autoSaveCurrentPostDraftIfNeeded(){
  return false;
}

function updateProfileButton(user = getCurrentUser()) {
  const btn = $("#btnProfile");
  const img = $("#profileBtnIcon");
  const fallback = $("#profileBtnFallback");
  if (!btn || !img || !fallback) return;
  if (!user) {
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  const iconUrl = String(user.iconUrl || "").trim();
  if (iconUrl) {
    img.src = iconUrl;
    img.hidden = false;
    fallback.hidden = true;
  } else {
    img.hidden = true;
    fallback.hidden = false;
  }
}

function clearInstallHelpTimer() {
  if (!installHelpTimerId) return;
  clearTimeout(installHelpTimerId);
  installHelpTimerId = null;
}

function scheduleInstallButtonVisibility() {
  const btn = $("#btnInstall");
  clearInstallHelpTimer();
  if (!btn) return;
  btn.hidden = true;

  if (!getCurrentUser() || isStandaloneMode()) return;

  if (deferredInstallPrompt) {
    btn.hidden = false;
    return;
  }

  installHelpTimerId = setTimeout(() => {
    installHelpTimerId = null;
    if (!getCurrentUser() || isStandaloneMode() || deferredInstallPrompt) return;
    const installBtn = $("#btnInstall");
    if (installBtn) installBtn.hidden = false;
  }, 3000);
}

/* 画面切り替え関数 */
function applyAuthUI() {
  const user = getCurrentUser();

  const authGate = document.getElementById("authGate");
  const appRoot = document.getElementById("appRoot");
  const adminNav = document.querySelector('.navitem[data-nav="admin"]');
  const adminPage = document.querySelector('.page[data-page="admin"]');

  if (!authGate || !appRoot) return;

  if (!user) {
    authGate.hidden = false;
    appRoot.hidden = true;
    if (adminNav) adminNav.style.display = "none";
    if (adminPage) adminPage.style.display = "none";
    updateProfileButton(null);
    const installBtn = document.getElementById("btnInstall");
    if (installBtn) installBtn.hidden = true;
    clearInstallHelpTimer();
    return;
  }

  authGate.hidden = true;
  appRoot.hidden = false;

  const isAdmin = user.role === "admin";

  if (adminNav) adminNav.style.display = isAdmin ? "flex" : "none";
  if (adminPage) adminPage.style.display = isAdmin ? "" : "none";
  updateProfileButton(user);
  scheduleInstallButtonVisibility();
}

// ===== Rendering: Chips =====
function renderChips(){
  const row = $("#chipRow");
  row.innerHTML = CHANNELS.map(ch => {
    const active = (state.channel === ch.key) ? " chip--active" : "";
    return `
      <button class="chip${active}" data-chip="${ch.key}" data-tone="${ch.tone}">
        <span class="chip__dot"></span>
        <span>${ch.label}</span>
      </button>
    `;
  }).join("");

  $$(".chip", row).forEach(btn => {
    btn.addEventListener("click", () => {
      state.channel = btn.dataset.chip;
      state.currentPage = 1;
      renderChips();
      renderFeed();
    });
  });
}

// ===== Feed =====
function filteredArticles(){
  const q = state.query.trim().toLowerCase();
  return allArticles()
    .filter(a => {
      if (state.channel === "all") return a.channel !== "event";
      return a.channel === state.channel;
    })
    .filter(a => {
      if(!q) return true;
      return (
        (a.title||"").toLowerCase().includes(q) ||
        (a.tags||[]).join(" ").toLowerCase().includes(q) ||
        (a.badge||"").toLowerCase().includes(q)
      );
    })
    .sort((a,b) => {
      const av = parseDate(a.date);
      const bv = parseDate(b.date);
      return state.sortOrder === "asc"
        ? (av > bv ? 1 : -1)
        : (av < bv ? 1 : -1);
    });
}

function renderCard(a){
  const thumb = (a.media?.images && a.media.images.length) ? a.media.images[0] : "";
  const mediaHtml = thumb
    ? `<div class="card__media"><img src="${escapeAttr(thumb)}" alt="" loading="lazy"></div>`
    : `<div class="card__media card__media--placeholder" aria-hidden="true"></div>`;
  return `
    <article class="card" data-article="${escapeAttr(a.id)}">
      ${mediaHtml}
      <div class="card__content">
        <div class="card__main">
          <div class="card__top">
            <span class="card__badge">${escapeHtml(channelLabel(a.channel))}</span>
          </div>
          <div class="card__title">${escapeHtml(a.title||"")}</div>
        </div>
        <div class="card__date">${relativeDate(a.date)}</div>
      </div>
    </article>
  `;
}

function renderFeed(){
  const items = filteredArticles();
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;
  const start = (state.currentPage - 1) * ITEMS_PER_PAGE;
  const pagedItems = items.slice(start, start + ITEMS_PER_PAGE);

  const hint = $("#feedHint");
  const title = $("#feedTitle");
  if(hint) hint.textContent = `${items.length}件`;
  if(title){
    title.textContent = state.channel === "all"
      ? "Latest"
      : (CHANNELS.find(c=>c.key===state.channel)?.label || "Latest");
  }
  const sortBtn = $("#btnSortToggle");
  if(sortBtn){
    sortBtn.textContent = state.sortOrder === "desc" ? "新しい順" : "古い順";
  }

  const cards = $("#cards");
  if(!cards) return;
  if (items.length === 0) {
    cards.innerHTML = `
      <div class="empty">
        <div class="empty__icon">🔎</div>
        <div class="empty__title">該当する記事がありません</div>
        <div class="empty__text">キーワードやチャンネルを変更して再検索してください。</div>
      </div>
    `;
    renderPagination(totalPages);
    return;
  }
  cards.innerHTML = pagedItems.map(renderCard).join("");

  $$(".card", cards).forEach(el => {
    el.addEventListener("click", () => openDrawer(el.dataset.article));
  });

  renderPagination(totalPages);
}

function renderPagination(totalPages){
  const root = $("#feedPagination");
  if (!root) return;

  if (totalPages <= 1) {
    root.innerHTML = "";
    root.hidden = true;
    return;
  }

  root.hidden = false;

  const prevDisabled = state.currentPage <= 1 ? "disabled" : "";
  const nextDisabled = state.currentPage >= totalPages ? "disabled" : "";
  const pageButtons = Array.from({ length: totalPages }, (_, i) => {
    const page = i + 1;
    const active = page === state.currentPage ? " pagination__btn--active" : "";
    return `<button class="pagination__btn${active}" type="button" data-page="${page}">${page}</button>`;
  }).join("");

  root.innerHTML = `
    <button class="pagination__btn" type="button" data-page-nav="prev" ${prevDisabled}>前へ</button>
    ${pageButtons}
    <button class="pagination__btn" type="button" data-page-nav="next" ${nextDisabled}>次へ</button>
  `;

  $$(".pagination__btn", root).forEach(btn => {
    btn.addEventListener("click", () => {
      const nav = btn.dataset.pageNav;
      const pageStr = btn.dataset.page;

      if (nav === "prev" && state.currentPage > 1) {
        state.currentPage -= 1;
      } else if (nav === "next" && state.currentPage < totalPages) {
        state.currentPage += 1;
      } else if (pageStr) {
        state.currentPage = Number(pageStr);
      }
      renderFeed();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function setFeedLoading(visible, text = "記事を読み込んでいます..."){
  const loading = $("#feedLoading");
  if (!loading) return;
  const textNode = $("#feedLoadingText");
  if (textNode) textNode.textContent = text;
  loading.hidden = !visible;
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){
  return escapeHtml(s).replaceAll("`","&#096;");
}

function insertAtCursor(textarea, text){
  if(!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = `${before}${text}${after}`;
  const nextPos = start + text.length;
  textarea.selectionStart = nextPos;
  textarea.selectionEnd = nextPos;
  textarea.focus();
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function renderImagePicker(textareaId, pickerId, bodyTextareaId){
  const textarea = document.getElementById(textareaId);
  const picker = document.getElementById(pickerId);
  const bodyTextarea = document.getElementById(bodyTextareaId);
  if (!textarea || !picker || !bodyTextarea) return;

  const urls = (textarea.value || "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  if (!urls.length) {
    picker.innerHTML = "";
    return;
  }

  picker.innerHTML = urls.map((url, idx) => {
    let label = `追加画像${idx + 1}`;
    if (idx === 0) label = "トップ画";
    if (idx === 1) label = "画像1";
    if (idx === 2) label = "画像2";
    const marker = idx === 1 ? "{{画像1}}" : (idx === 2 ? "{{画像2}}" : "");
    const insertButton = marker
      ? `<button class="img-picker__insert" type="button" data-marker="${escapeAttr(marker)}">本文に挿入</button>`
      : "";
    return `
      <div class="img-picker__item">
        <img class="img-picker__thumb" src="${escapeAttr(url)}" alt="${escapeAttr(label)}" loading="lazy">
        <div class="img-picker__label">${escapeHtml(label)}</div>
        ${insertButton}
      </div>
    `;
  }).join("");

  $$(".img-picker__insert", picker).forEach(btn => {
    btn.addEventListener("click", () => {
      const marker = btn.dataset.marker || "";
      if (!marker) return;
      const needsBreak = bodyTextarea.value.trim().length > 0;
      const text = needsBreak ? `\n\n${marker}\n\n` : `${marker}\n\n`;
      insertAtCursor(bodyTextarea, text);
    });
  });
}

function renderVidInsertButton(videoInputId, bodyTextareaId, containerId){
  const input = document.getElementById(videoInputId);
  const bodyTextarea = document.getElementById(bodyTextareaId);
  const container = document.getElementById(containerId);
  if (!input || !bodyTextarea || !container) return;

  const videoUrl = (input.value || "").trim();
  if (!videoUrl) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `<button class="img-picker__insert" type="button">本文に動画を挿入</button>`;
  const btn = container.querySelector("button");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const needsBreak = bodyTextarea.value.trim().length > 0;
    const text = needsBreak ? `\n\n{{動画}}\n\n` : `{{動画}}\n\n`;
    insertAtCursor(bodyTextarea, text);
  });
}

const INLINE_IMG_RE = /\{\{画像([12])(?::([^}]+))?\}\}/;
const INLINE_VID_RE = /\{\{動画\}\}/;
const INLINE_TOKEN_RE = /\{\{画像([12])(?::([^}]+))?\}\}|\{\{動画\}\}/g;

function bodyHasMarkers(a){
  return (a.body || []).some(p => INLINE_IMG_RE.test(p.trim()) || INLINE_VID_RE.test(p.trim()));
}

function mediaHtml(a, heroOnly){
  const images = a.media?.images || [];
  const videoUrl = a.media?.video || "";

  if(heroOnly){
    if(!images.length) return "";
    return `<div class="media">
      <div class="media__img">
        <img src="${escapeAttr(images[0])}" alt="" loading="lazy" />
      </div>
    </div>`;
  }

  const imgs = images
    .map(url => `
      <div class="media__img">
        <img src="${escapeAttr(url)}" alt="" loading="lazy" />
      </div>
    `).join("");
  const video = videoUrl ? renderVideoEmbed(videoUrl) : "";
  if(!imgs && !video) return "";
  return `<div class="media">${imgs}${video}</div>`;
}

function renderInlineImage(url, caption){
  let html = `<div class="media-inline"><div class="media__img">
    <img src="${escapeAttr(url)}" alt="" loading="lazy" />
  </div>`;
  if(caption){
    html += `<div class="media-caption">${escapeHtml(caption)}</div>`;
  }
  html += `</div>`;
  return html;
}

function renderBodyWithInlineMedia(a){
  const images = a.media?.images || [];
  const videoUrl = a.media?.video || "";
  const paragraphs = a.body || [];

  return paragraphs.map(p => {
    const source = String(p || "");
    const parts = [];
    let lastIndex = 0;

    source.replace(INLINE_TOKEN_RE, (match, imgIdx, caption, offset) => {
      const before = source.slice(lastIndex, offset).trim();
      if (before) parts.push(`<p>${escapeHtml(before)}</p>`);

      if (match.startsWith("{{画像")) {
        const idx = Number(imgIdx);
        const url = images[idx];
        if (url) parts.push(renderInlineImage(url, caption || ""));
      } else if (videoUrl) {
        parts.push(`<div class="media-inline">${renderVideoEmbed(videoUrl)}</div>`);
      }

      lastIndex = offset + match.length;
      return match;
    });

    const tail = source.slice(lastIndex).trim();
    if (tail) parts.push(`<p>${escapeHtml(tail)}</p>`);

    if (parts.length) return parts.join("");
    if (!source.trim()) return "";
    return `<p>${escapeHtml(source)}</p>`;
  }).join("");
}

function renderVideoEmbed(url){
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if(yt){
    const id = yt[1];
    return `
      <div class="media__video">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${id}"
          title="YouTube video"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>`;
  }
  if(url.toLowerCase().endsWith(".mp4")){
    return `
      <div class="media__video">
        <video controls playsinline preload="metadata" src="${escapeAttr(url)}"></video>
      </div>`;
  }
  return `<div class="media__link"><a href="${escapeAttr(url)}" target="_blank" rel="noopener">動画を開く</a></div>`;
}

// ===== Drawer =====
function applyPostViewStatsLocally(postId, stats = {}) {
  const idx = cloudPosts.findIndex(post => post.id === postId);
  if (idx < 0) return;
  const current = cloudPosts[idx] || {};
  cloudPosts[idx] = normalizePost({
    ...current,
    totalViews: Number(stats.totalViews || current.totalViews || 0),
    uniqueViewCount: Number(stats.uniqueViewCount || current.uniqueViewCount || 0)
  });
}

function openDrawer(articleId){
  const a = allArticles().find(x => x.id === articleId);
  if(!a) return;

  state.drawerOpen = true;
  state.activeArticleId = a.id;

  $("#drawer").classList.add("drawer--open");
  $("#drawer").setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");

  // badge
  const badge = $("#drawerBadge");
  badge.setAttribute("data-tone", a.tone || "accent");
  $("#drawerBadgeText").textContent = a.badge || "Info";
  $("#drawerDate").textContent = formatDateJP(a.date);

  $("#aTitle").textContent = a.title || "";
  const meta = $("#aMeta");
  const tags = a.tags || [];
  if (meta) {
    meta.innerHTML = tags.map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("");
    meta.style.display = tags.length ? "" : "none";
  }

  const sum = $("#aSummaryList");
  sum.innerHTML = (a.summary||[]).map(x => `<li>${escapeHtml(x)}</li>`).join("");
  $("#aSummary").style.display = (a.summary && a.summary.length) ? "block" : "none";

  const body = $("#aBody");
  const hasMarkers = bodyHasMarkers(a);
  body.innerHTML =
    mediaHtml(a, hasMarkers) +
    (hasMarkers
      ? renderBodyWithInlineMedia(a)
      : (a.body||[]).map(p => `<p>${escapeHtml(p)}</p>`).join(""));

  const cta = $("#cta");
  if(a.cta && a.cta.url){
    cta.style.display = "flex";
    $("#ctaText").textContent = a.cta.text || "リンク";
    $("#ctaBtn").href = a.cta.url;
  }else{
    cta.style.display = "none";
  }
  renderSaveBtn();

  if (getCurrentUser()) {
    recordPostViewToApi(a.id)
      .then(stats => {
        applyPostViewStatsLocally(a.id, stats);
      })
      .catch(err => {
        if (isAuthError(err)) {
          handleAuthFailure(err.message || "セッションの有効期限が切れました。");
          return;
        }
        console.warn("Failed to record post view:", err);
      });
  }
}

function closeDrawer(){
  state.drawerOpen = false;
  state.activeArticleId = null;
  $("#drawer").classList.remove("drawer--open");
  $("#drawer").setAttribute("aria-hidden","true");
  document.body.classList.remove("no-scroll");
}

function renderSaveBtn(){
  const id = state.activeArticleId;
  const btn = $("#btnSave");
  if(!id) return;
  const saved = isSaved(id);
  btn.textContent = saved ? "★" : "☆";
  btn.title = saved ? "お気に入り済み" : "お気に入りに追加";
}

// ===== Saved =====
function renderSaved(){
  const saved = loadSaved();
  const list = saved
    .map(id => allArticles().find(a => a.id === id))
    .filter(Boolean)
    .sort((a,b)=> (parseDate(a.date) < parseDate(b.date) ? 1 : -1));

  const cards = $("#savedCards");
  const empty = $("#savedEmpty");

  if(list.length === 0){
    cards.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  cards.innerHTML = list.map(renderCard).join("");

  $$(".card", cards).forEach(el => {
    el.addEventListener("click", () => openDrawer(el.dataset.article));
  });
}

// ===== Contact =====
function renderContact(){
  const root = document.getElementById("ownerList");
  if(!root) return;

  root.innerHTML = OWNERS.map(o => `
    <div class="owner-card">
      <div class="owner-name">${escapeHtml(o.name || "")}</div>
      <div class="owner-links">
        ${o.instagram ? `<a href="${escapeAttr(o.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}
        ${o.x ? `<a href="${escapeAttr(o.x)}" target="_blank" rel="noopener">X</a>` : ""}
      </div>
    </div>
  `).join("");
}

// ===== Navigation =====
function setActivePage(key){
  const user = getCurrentUser();

  if (key === "admin" && (!user || user.role !== "admin")) {
    key = "home";
  }

  state.activePage = key;
  $$(".page").forEach(p => p.classList.remove("page--active"));
  const page = $(`.page[data-page="${key}"]`);
  if(page) page.classList.add("page--active");

  $$(".navitem").forEach(b => b.classList.remove("navitem--active"));
  const nav = $(`.navitem[data-nav="${key}"]`);
  if(nav) nav.classList.add("navitem--active");

  if(key === "saved") renderSaved();
  if(key === "contact") renderContact();
  if(key === "schedule") renderCalendar();
  if(key === "admin") renderAdmin();
}

// ===== Schedule =====
function scheduleItems(){
  return cloudEvents
    .filter(e => e.status === "public")
    .map(e => ({
      id: e.id,
      title: e.title || "",
      date: normalizeDateForCalendar(e.date),
      startTime: e.startTime || "",
      endTime: e.endTime || "",
      description: e.description || "",
      location: e.location || "",
      imageUrls: Array.isArray(e.imageUrls) ? e.imageUrls : [],
      ctaUrl: e.ctaUrl || "",
      status: e.status || "public"
    }))
    .filter(it => !!it.date)
    .sort((a, b) => {
      const dateCmp = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCmp !== 0) return dateCmp;

      const aTime = String(a.startTime || "99:99");
      const bTime = String(b.startTime || "99:99");
      const timeCmp = aTime.localeCompare(bTime);
      if (timeCmp !== 0) return timeCmp;

      return String(a.title || "").localeCompare(String(b.title || ""));
    });
}

function normalizeDateForCalendar(value){
  const parsed = parseDate(value);
  return parsed === "-" ? "" : parsed;
}

function addDays(date, n){
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date){
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - dow);
  return d;
}

function buildRangeDays(view, cursor){
  // cursor: Date
  const base = cursor ? new Date(cursor) : new Date();
  base.setHours(0,0,0,0);

  if(view === "month"){
    const y = base.getFullYear();
    const m = base.getMonth();
    // 月表示は “月の全日 + 前後埋め” を42マスで作る（見栄え安定）
    return buildMonthMatrix(y, m);
  }

  // 2w / 1w は週始まりから並べる
  const start = startOfWeek(base);
  const len = (view === "2w") ? 14 : 7;
  const days = [];
  for(let i=0;i<len;i++) days.push(addDays(start, i));
  return days;
}

function buildMonthMatrix(year, month){
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const start = new Date(year, month, 1 - startDow);
  const days = [];
  for(let i=0;i<42;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    days.push(d);
  }
  return days;
}

function eventsByDate(){
  const map = new Map();
  for(const it of scheduleItems()){
    if(!map.has(it.date)) map.set(it.date, []);
    map.get(it.date).push(it);
  }
  return map;
}

function clearEventForm(){
  const form = $("#eventForm");
  if (form) form.reset();
  const imageUrls = $("#evImageUrls");
  if (imageUrls) imageUrls.value = "";
  const statusView = $("#evStatusView");
  if (statusView) statusView.textContent = "未設定";
  state.editingEventId = null;
  syncEventButtons();
}

function startEditEvent(id){
  const event = cloudEvents.find(e => e.id === id);
  if (!event) return;
  state.editingEventId = event.id;
  state.eventAdminTab = "editor";

  $("#evTitle").value = event.title || "";
  $("#evDate").value = event.date || "";
  $("#evStartTime").value = event.startTime || "";
  $("#evEndTime").value = event.endTime || "";
  $("#evDescription").value = event.description || "";
  $("#evLocation").value = event.location || "";
  $("#evImageUrls").value = (event.imageUrls || []).join("\n");
  $("#evCtaUrl").value = event.ctaUrl || "";
  const statusView = $("#evStatusView");
  if (statusView) statusView.textContent = event.status || "public";

  syncEventButtons();
  renderCalendar();
}

function syncEventButtons(){
  const btnPublish = $("#btnEventPublish");
  const btnDraft = $("#btnEventDraft");
  const btnPrivate = $("#btnEventPrivate");
  const titleInput = $("#evTitle");
  const dateInput = $("#evDate");
  const startInput = $("#evStartTime");
  const btnDelete = $("#btnEventDelete");

  const canSave = !!(titleInput?.value || "").trim() && !!(dateInput?.value || "") && !!(startInput?.value || "");
  [btnPublish, btnDraft, btnPrivate].forEach(btn => {
    if (btn) btn.disabled = !canSave;
  });
  if (btnDelete) btnDelete.disabled = !state.editingEventId;
}

function collectEventForm(){
  return {
    id: state.editingEventId || "",
    title: ($("#evTitle").value || "").trim(),
    date: $("#evDate").value || "",
    startTime: $("#evStartTime").value || "",
    endTime: $("#evEndTime").value || "",
    description: ($("#evDescription").value || "").trim(),
    location: ($("#evLocation").value || "").trim(),
    imageUrls: ($("#evImageUrls").value || "").split("\n").map(s => s.trim()).filter(Boolean),
    ctaUrl: ($("#evCtaUrl").value || "").trim(),
    status: "public"
  };
}

async function saveEventEditor(status){
  const event = collectEventForm();
  if (!event.title || !event.date || !event.startTime) {
    alert("イベント名・開催日・開始時間は必須です。");
    return;
  }
  event.status = status || "public";

  const buttonMap = {
    public: "#btnEventPublish",
    draft: "#btnEventDraft",
    private: "#btnEventPrivate"
  };
  const btn = $(buttonMap[event.status] || "#btnEventPublish");
  const oldText = btn ? btn.textContent : "";

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "保存中...";
    }
    const saved = await saveEventToApi(event);
    const idx = cloudEvents.findIndex(e => e.id === saved.id);
    if (idx >= 0) cloudEvents[idx] = saved;
    else cloudEvents.unshift(saved);
    const statusView = $("#evStatusView");
    if (statusView) statusView.textContent = saved.status || event.status;
    renderAll();
    showToast("イベントを保存しました");
  } catch (err) {
    console.error(err);
    alert("イベント保存に失敗しました。\n" + (err.message || err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText || "保存";
    }
  }
}

async function deleteCurrentEvent(){
  if (!state.editingEventId) return;
  if (!confirm("このイベントを削除しますか？")) return;
  try {
    await deleteEventFromApi(state.editingEventId);
    cloudEvents = cloudEvents.filter(e => e.id !== state.editingEventId);
    clearEventForm();
    state.eventAdminTab = "list";
    renderAll();
  } catch (err) {
    console.error(err);
    alert("イベント削除に失敗しました。\n" + (err.message || err));
  }
}

function renderEventAdminPanel(){
  const panel = $("#eventFormPanel");
  const list = $("#eventAdminItems");
  const btnList = $("#btnEventListTab");
  const btnNew = $("#btnEventNewTab");
  const user = getCurrentUser();
  if (!panel || !list) return;

  const isAdmin = user?.role === "admin";
  panel.hidden = !isAdmin;
  if (!isAdmin) return;

  const events = cloudEvents
    .slice()
    .sort((a, b) => (parseDate(a.date) < parseDate(b.date) ? 1 : -1));

  list.innerHTML = events.length ? events.map(ev => `
    <button class="event-admin-item" type="button" data-evid="${escapeAttr(ev.id)}">
      <span>${escapeHtml(ev.title || "(no title)")}</span>
      <span>${escapeHtml(formatDateJP(ev.date))} / ${escapeHtml(ev.status || "public")}</span>
    </button>
  `).join("") : `<div class="empty__text">イベントがありません。</div>`;

  $$(".event-admin-item", list).forEach(btn => {
    btn.addEventListener("click", () => startEditEvent(btn.dataset.evid));
  });

  const editor = $("#eventEditor");
  const listPanel = $("#eventListPanel");
  if (btnList) btnList.classList.toggle("admin-tab--active", state.eventAdminTab === "list");
  if (btnNew) btnNew.classList.toggle("admin-tab--active", state.eventAdminTab === "editor");
  if (editor) editor.hidden = state.eventAdminTab !== "editor";
  if (listPanel) listPanel.hidden = state.eventAdminTab !== "list";
}

function openEventModal(dateStr, events){
  const modal = $("#eventModal");
  const title = $("#eventModalTitle");
  const body = $("#eventModalBody");

  if(!modal || !title || !body) return;

  title.textContent = `${formatDateJP(dateStr)} のイベント`;

  body.innerHTML = events.map(ev => `
    <div class="eventdetail">
      <div class="eventdetail__date">${formatDateJP(ev.date)}</div>
      <div class="eventdetail__name">${escapeHtml(ev.title || "")}</div>
      ${ev.startTime ? `<div class="eventdetail__meta">開始：${escapeHtml(formatEventTime(ev.startTime))}</div>` : ""}
      ${ev.endTime ? `<div class="eventdetail__meta">終了：${escapeHtml(formatEventTime(ev.endTime))}</div>` : ""}
      ${ev.location ? `<div class="eventdetail__meta">場所: ${escapeHtml(ev.location)}</div>` : ""}
      ${ev.description ? `<div class="eventdetail__desc">${escapeHtml(ev.description)}</div>` : ""}
      ${(ev.imageUrls || []).length ? `
        <div class="media media--images">
          ${(ev.imageUrls || []).map(url => `
            <div class="media__img"><img src="${escapeAttr(url)}" alt="" loading="lazy"></div>
          `).join("")}
        </div>
      ` : ""}
      ${ev.ctaUrl ? `<div class="eventdetail__meta"><a href="${escapeAttr(ev.ctaUrl)}" target="_blank" rel="noopener">詳細リンクを開く</a></div>` : ""}
    </div>
  `).join("");

  modal.classList.add("eventmodal--open");
  modal.setAttribute("aria-hidden", "false");
}

function closeEventModal(){
  const modal = $("#eventModal");
  if(!modal) return;
  modal.classList.remove("eventmodal--open");
  modal.setAttribute("aria-hidden", "true");
}

function isIOSDevice() {
  const ua = window.navigator.userAgent || "";
  const isIOSUA = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return isIOSUA || isIPadOS;
}

function openInstallHelpModal(){
  const modal = $("#installHelpModal");
  const title = $("#installHelpTitle");
  const body = $("#installHelpBody");

  const lines = isIOSDevice()
    ? [
        "この端末ではアプリの自動インストールに対応していません。",
        "",
        "ホーム画面に追加する手順",
        "1. Safariの共有ボタン（□↑）をタップ",
        "2. 「ホーム画面に追加」を選択",
        "3. 右上の「追加」をタップ"
      ]
    : [
        "この端末・ブラウザではアプリの自動インストールに対応していません。",
        "",
        "ホーム画面に追加する手順",
        "1. ブラウザ右上のメニュー（⋮ / ⋯）を開く",
        "2. 「ホーム画面に追加」または「アプリをインストール」を選択",
        "3. 画面の案内に沿って追加する"
      ];

  if (!modal || !title || !body) {
    alert(lines.join("\n"));
    return;
  }

  title.textContent = "インストールのご案内";
  body.innerHTML = `
    <div class="installhelp__lead">${escapeHtml(lines[0])}</div>
    <div class="installhelp__sub">${escapeHtml(lines[2])}</div>
    <ol class="installhelp__list">
      <li>${escapeHtml(lines[3])}</li>
      <li>${escapeHtml(lines[4])}</li>
      <li>${escapeHtml(lines[5])}</li>
    </ol>
  `;
  modal.classList.add("eventmodal--open");
  modal.setAttribute("aria-hidden", "false");
}

function closeInstallHelpModal(){
  const modal = $("#installHelpModal");
  if(!modal) return;
  modal.classList.remove("eventmodal--open");
  modal.setAttribute("aria-hidden", "true");
}

function updateProfilePreview(url) {
  const preview = $("#profileIconPreview");
  if (!preview) return;
  const safe = String(url || "").trim();
  preview.src = safe || "./favicon.png";
}

function updateProfilePoints(pointsValue) {
  const pointEl = $("#profilePoints");
  if (!pointEl) return;
  const points = Number(pointsValue || 0);
  const safePoints = Number.isFinite(points) && points >= 0 ? Math.floor(points) : 0;
  pointEl.textContent = `${safePoints}pt`;
}

function fillProfileForm(userLike = {}){
  const nicknameInput = $("#profileNickname");
  const iconUrlInput = $("#profileIconUrl");
  const hobbyInput = $("#profileHobby");
  const interestsInput = $("#profileInterests");

  const nickname = String(userLike.nickname || "").trim();
  const iconUrl = String(userLike.iconUrl || "").trim();
  const hobby = String(userLike.hobby || "").trim();
  const interests = String(userLike.interests || "").trim();
  const points = Number(userLike.points || 0);

  if (nicknameInput) nicknameInput.value = nickname;
  if (iconUrlInput) iconUrlInput.value = iconUrl;
  if (hobbyInput) hobbyInput.value = hobby;
  if (interestsInput) interestsInput.value = interests;
  updateProfilePreview(iconUrl);
  updateProfilePoints(points);
}

async function loadProfileIntoModal() {
  const user = getCurrentUser();
  if (!user) return;

  const profile = await fetchProfileFromApi();
  const merged = {
    ...user,
    nickname: String(profile.nickname ?? user.nickname ?? "").trim(),
    iconUrl: String(profile.iconUrl ?? user.iconUrl ?? "").trim(),
    hobby: String(profile.hobby ?? user.hobby ?? "").trim(),
    interests: String(profile.interests ?? user.interests ?? "").trim(),
    points: Number(profile.points ?? user.points ?? 0)
  };
  saveCurrentUser(merged);
  updateProfileButton(merged);
  fillProfileForm(merged);
}

async function openProfileModal() {
  const modal = $("#profileModal");
  if (!modal) return;
  modal.classList.add("eventmodal--open");
  modal.setAttribute("aria-hidden", "false");
  const msg = $("#profileMsg");
  if (msg) msg.textContent = "";
  const user = getCurrentUser();
  if (user) fillProfileForm(user);
  try {
    await loadProfileIntoModal();
  } catch (err) {
    console.warn(err);
    const msgText = formatErrorMessage(err, "プロフィールの読み込みに失敗しました。");
    const msg = $("#profileMsg");
    if (msg) msg.textContent = msgText;
  }
}

function closeProfileModal() {
  const modal = $("#profileModal");
  if (!modal) return;
  modal.classList.remove("eventmodal--open");
  modal.setAttribute("aria-hidden", "true");
}

async function saveProfileFromModal() {
  const msg = $("#profileMsg");
  if (msg) msg.textContent = "";
  const nickname = ($("#profileNickname")?.value || "").trim();
  const iconUrl = ($("#profileIconUrl")?.value || "").trim();
  const hobby = ($("#profileHobby")?.value || "").trim();
  const interests = ($("#profileInterests")?.value || "").trim();

  const btn = $("#profileSaveBtn");
  const oldText = btn ? btn.textContent : "";
  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "保存中...";
    }
    const profile = await saveProfileToApi({ nickname, iconUrl, hobby, interests });
    const current = getCurrentUser();
    if (current) {
      const merged = { ...current, ...profile };
      saveCurrentUser(merged);
      updateProfileButton(merged);
      updateProfilePoints(merged.points);
    }
    updateProfilePreview(profile.iconUrl || iconUrl);
    if (msg) msg.textContent = "プロフィールを保存しました。";
  } catch (err) {
    console.error(err);
    if (isAuthError(err)) {
      handleAuthFailure(err.message || "セッションの有効期限が切れました。");
      closeProfileModal();
      return;
    }
    if (msg) msg.textContent = formatErrorMessage(err, "プロフィールの保存に失敗しました。");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText || "保存";
    }
  }
}

async function openGachaFromProfile() {
  const msg = $("#profileMsg");
  if (msg) msg.textContent = "";

  const user = getCurrentUser();
  if (!user) {
    if (msg) msg.textContent = "ログイン後に語り場ガチャを利用できます。";
    return;
  }

  const gachaUrl = getGachaAppUrl();
  if (!gachaUrl) {
    if (msg) msg.textContent = "語り場ガチャのURLが設定されていません。";
    return;
  }

  const btn = $("#profileGachaBtn");
  const oldText = btn ? btn.textContent : "";
  let isRedirecting = false;

  try {
    showGachaConnectOverlay();

    if (btn) {
      btn.disabled = true;
      btn.textContent = "接続中...";
    }

    const data = await createGachaTicketToApi();

    if (!data.ticket) {
      throw new Error("ガチャ用チケットの発行に失敗しました。");
    }

    const url = new URL(gachaUrl, window.location.href);
    url.searchParams.set("ticket", data.ticket);
    url.searchParams.set("from", "news");

    isRedirecting = true;
    window.location.href = url.toString();

  } catch (err) {
    console.error(err);

    hideGachaConnectOverlay();

    if (isAuthError(err)) {
      handleAuthFailure(err.message || "セッションの有効期限が切れました。");
      closeProfileModal();
      return;
    }

    if (msg) {
      msg.textContent = formatErrorMessage(err, "語り場ガチャを開けませんでした。");
    }

  } finally {
    if (!isRedirecting) {
      hideGachaConnectOverlay();
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText || "語り場ガチャへ";
    }
  }
}

function renderCalendar(){
  const calRoot = $("#cal");
  if(!calRoot) return;

  const now = new Date();
  if(!state.scheduleCursor){
    state.scheduleCursor = new Date(now);
    state.scheduleCursor.setHours(0,0,0,0);
  }
  if(!state.scheduleView) state.scheduleView = "month";

  const cursor = new Date(state.scheduleCursor);
  const map = eventsByDate();
  const days = buildRangeDays(state.scheduleView, cursor);

  let title = "";
  if(state.scheduleView === "month"){
    title = `${cursor.getFullYear()}年 ${String(cursor.getMonth()+1).padStart(2,"0")}月`;
  } else {
    const start = days[0];
    const end = days[days.length - 1];
    title = `${formatDateJP(ymd(start))} 〜 ${formatDateJP(ymd(end))}`;
  }

  const head = `
    <div class="cal__head">
      <div class="cal__left">
        <button class="cal__nav" id="calPrev" type="button" aria-label="前へ">‹</button>
        <button class="cal__nav" id="calToday" type="button">
          ${state.scheduleView === "month" ? "今月" : "今週"}
        </button>
        <button class="cal__nav" id="calNext" type="button" aria-label="次へ">›</button>
        <div class="cal__month" id="calMonth">${title}</div>
      </div>
    </div>
  `;

  let gridHtml = "";

  if(state.scheduleView === "month"){
    const dows = ["日","月","火","水","木","金","土"];
    const currentYear = cursor.getFullYear();
    const currentMonth = cursor.getMonth();

    const dowRow = dows.map(w => `<div class="cal__cell cal__dow">${w}</div>`).join("");

    const cells = days.map(d => {
      const dateStr = ymd(d);
      const inMonth = (d.getFullYear() === currentYear && d.getMonth() === currentMonth);
      const outCls = !inMonth ? " is-out" : "";
      const evs = (map.get(dateStr) || []).slice(0, 2);

      const evHtml = evs.map(ev => `
        <button class="cal__ev" type="button" data-event-date="${dateStr}">
          <span class="cal__evtitle">${escapeHtml(ev.title || "")}</span>
        </button>
      `).join("");

      return `
        <div class="cal__cell${outCls}">
          <div class="cal__daynum">${d.getDate()}</div>
          ${evHtml}
        </div>
      `;
    }).join("");

    gridHtml = `
      <div class="cal__grid" id="calGrid">
        ${dowRow}
        ${cells}
      </div>
    `;
  } else {
    gridHtml = `
      <div class="cal2w" id="calGrid">
        ${days.map(d => {
          const dateStr = ymd(d);
          const evs = map.get(dateStr) || [];
          const dow = ["日","月","火","水","木","金","土"][d.getDay()];

          return `
            <div class="cal2w__day">
              <div class="cal2w__head">
                <div class="cal2w__date">${formatDateJP(dateStr)}</div>
                <div class="cal2w__dow">${dow}</div>
              </div>
              <div class="cal2w__body">
                ${evs.length ? evs.map(ev => `
                  <button class="cal2w__event" type="button" data-event-date="${dateStr}">
                    <div class="cal2w__eventTitle">${escapeHtml(ev.title || "")}</div>
                  </button>
                `).join("") : `<div class="cal2w__empty">イベントなし</div>`}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  calRoot.innerHTML = `
    ${head}
    ${gridHtml}
  `;
  renderEventAdminPanel();

  // イベント詳細ポップアップ
  $$(".cal__ev, .cal2w__event", calRoot).forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const dateStr = btn.dataset.eventDate;
      const events = map.get(dateStr) || [];
      openEventModal(dateStr, events);
    });
  });

  // 前後移動
  const prevBtn = $("#calPrev", calRoot);
  const nextBtn = $("#calNext", calRoot);
  const todayBtn = $("#calToday", calRoot);

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const c = new Date(state.scheduleCursor || new Date());
      if (state.scheduleView === "month") {
        c.setMonth(c.getMonth() - 1);
      } else {
        c.setDate(c.getDate() - 14);
      }
      state.scheduleCursor = c;
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const c = new Date(state.scheduleCursor || new Date());
      if (state.scheduleView === "month") {
        c.setMonth(c.getMonth() + 1);
      } else {
        c.setDate(c.getDate() + 14);
      }
      state.scheduleCursor = c;
      renderCalendar();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener("click", () => {
      state.scheduleCursor = new Date();
      state.scheduleCursor.setHours(0,0,0,0);
      renderCalendar();
    });
  }

  // 表示切替ボタンの見た目更新（外側のsegを使う）
  const schedViewSeg = $("#schedViewSeg");
  if (schedViewSeg) {
    $$(".seg__btn", schedViewSeg).forEach(btn => {
      btn.classList.toggle("seg__btn--active", btn.dataset.view === state.scheduleView);
    });
  }
}
// ===== Admin: list / editor =====
function adminArticles(){
  return cloudPosts.slice().sort((a,b)=> (a.date < b.date ? 1 : -1));
}

function renderAdmin(){
  const adminCount = $("#adminCount");
  const list = $("#adminItems");
  const tabEditor = $("#adminTabEditor");
  const tabList = $("#adminTabList");
  const tabEdit = $("#adminTabEdit");
  const panelEditor = $("#adminPanelEditor");
  const panelList = $("#adminPanelList");
  const panelEdit = $("#adminPanelEdit");
  const pChannel = $("#pChannel");
  const eChannel = $("#eChannel");

  if(!adminCount || !list) return;
  if (state.adminTab === "edit" && !state.editingId) {
    state.adminTab = "list";
  }
  const hasEditing = !!state.editingId;
  if (tabEditor) tabEditor.classList.toggle("admin-tab--active", state.adminTab === "editor");
  if (tabList) tabList.classList.toggle("admin-tab--active", state.adminTab === "list");
  if (tabEdit) {
    tabEdit.hidden = !hasEditing;
    tabEdit.classList.toggle("admin-tab--active", state.adminTab === "edit");
  }
  if (panelEditor) panelEditor.hidden = state.adminTab !== "editor";
  if (panelList) panelList.hidden = state.adminTab !== "list";
  if (panelEdit) panelEdit.hidden = state.adminTab !== "edit";
  if (pChannel && pChannel.options.length === 0) {
    pChannel.innerHTML = ADMIN_CHANNELS
      .map(({ key, label }) => `<option value="${escapeAttr(key)}">${escapeHtml(label)}</option>`)
      .join("");
  }
  if (eChannel && eChannel.options.length === 0) {
    eChannel.innerHTML = ADMIN_CHANNELS
      .map(({ key, label }) => `<option value="${escapeAttr(key)}">${escapeHtml(label)}</option>`)
      .join("");
  }

  const items = adminArticles();
  adminCount.textContent = `${items.length}件`;

  if(items.length === 0){
    list.innerHTML = `
      <div class="empty">
        <div class="empty__icon">✍️</div>
        <div class="empty__title">まだ記事がありません</div>
        <div class="empty__text">「＋ 新規記事」から作成できます。</div>
      </div>
    `;
  }else{
    list.innerHTML = items.map(a => `
      <div class="aitem" data-eid="${escapeAttr(a.id)}">
        <div class="aitem__top">
          <div class="aitem__title">${escapeHtml(a.title)}</div>
          <div class="aitem__date">${formatDateJP(a.date)}</div>
        </div>
        <div class="aitem__sub">#${escapeHtml(channelLabel(a.channel))} / ${escapeHtml(a.badge || "")} / ${escapeHtml(a.status || "public")}</div>
        <div class="aitem__stats">
          <span class="aitem__stat">総閲覧数 ${Number(a.totalViews || 0)}</span>
          <span class="aitem__stat">閲覧ユーザー数 ${Number(a.uniqueViewCount || 0)}</span>
        </div>
      </div>
    `).join("");

    $$(".aitem", list).forEach(el=>{
      el.addEventListener("click", ()=>{
        const id = el.dataset.eid;
        startEdit(id);
        renderAdmin();
      });
    });
  }

  syncAdminButtons();
  syncEditButtons();
}

function clearEditor(){
  state.editingId = null;
  state.newEditorDraftId = null;
  state.newEditorLastSavedSignature = "";
  $("#postForm").reset();
  $("#pChannel").value = "article";
  $("#pTags").value = "";
  $("#pBody").value = "";
  $("#pCtaText").value = "";
  $("#pCtaUrl").value = "";
  $("#pImages").value = "";
  $("#pVideo").value = "";
  renderImagePicker("pImages", "pImagePicker", "pBody");
  renderVidInsertButton("pVideo", "pBody", "pVidInsert");
  const statusView = $("#pStatusView");
  if (statusView) statusView.textContent = "未設定（投稿すると状態が反映されます）";
  syncAdminButtons();
}

function clearEditForm(){
  state.editEditorLastSavedSignature = "";
  const form = $("#editForm");
  if(form) form.reset();
  $("#eChannel").value = "article";
  $("#eTags").value = "";
  $("#eBody").value = "";
  $("#eCtaText").value = "";
  $("#eCtaUrl").value = "";
  $("#eImages").value = "";
  $("#eVideo").value = "";
  renderImagePicker("eImages", "eImagePicker", "eBody");
  renderVidInsertButton("eVideo", "eBody", "eVidInsert");
  const statusView = $("#eStatusView");
  if (statusView) statusView.textContent = "未設定";
  syncEditButtons();
}

function startEdit(id){
  const a = cloudPosts.find(x => x.id === id);
  if(!a) return;

  state.editingId = a.id;
  state.adminTab = "edit";

  $("#eTitle").value = a.title || "";
  $("#eChannel").value = a.channel || "article";
  $("#eTags").value = (a.tags || []).join(",");
  $("#eBody").value = (a.body || []).join("\n\n");
  $("#eCtaText").value = a.cta?.text || "";
  $("#eCtaUrl").value = a.cta?.url || "";
  $("#eImages").value = (a.media?.images || []).join("\n");
  $("#eVideo").value = a.media?.video || "";
  renderImagePicker("eImages", "eImagePicker", "eBody");
  renderVidInsertButton("eVideo", "eBody", "eVidInsert");
  const statusView = $("#eStatusView");
  if (statusView) statusView.textContent = a.status || "public";
  state.editEditorLastSavedSignature = buildPostContentSignature(a);
  syncEditButtons();
}

function syncAdminButtons(){
  const btnPublish = $("#btnPublishPost");
  const btnDraft = $("#btnDraftPost");
  const btnPrivate = $("#btnPrivatePost");
  const titleInput = $("#pTitle");

  if(!btnPublish || !btnDraft || !btnPrivate) return;

  const canSave = ((titleInput?.value || "").trim().length > 0);
  btnPublish.disabled = !canSave;
  btnDraft.disabled = !canSave;
  btnPrivate.disabled = !canSave;
}

function syncEditButtons(){
  const btnPublish = $("#btnEditPublishPost");
  const btnDraft = $("#btnEditDraftPost");
  const btnPrivate = $("#btnEditPrivatePost");
  const titleInput = $("#eTitle");

  if(!btnPublish || !btnDraft || !btnPrivate) return;

  const canSave = ((titleInput?.value || "").trim().length > 0);
  btnPublish.disabled = !canSave;
  btnDraft.disabled = !canSave;
  btnPrivate.disabled = !canSave;
}

function collectForm(){
  const title = $("#pTitle").value.trim();
  const channel = $("#pChannel").value;
  const tags = $("#pTags").value.split(",").map(s=>s.trim()).filter(Boolean);
  const body = $("#pBody").value
    .split("\n\n")
    .map(s=>s.trim())
    .filter(Boolean);

  const ctaText = $("#pCtaText").value.trim();
  const ctaUrl = $("#pCtaUrl").value.trim();

  const images = ($("#pImages").value || "")
    .split("\n").map(s=>s.trim()).filter(Boolean);
  const video = ($("#pVideo").value || "").trim();

  const a = normalizePost({
    id: state.newEditorDraftId || undefined,
    channel,
    tone: "accent",
    badge: badgeTextFromChannel(channel),
    title,
    tags,
    summary: [],
    body,
    cta: ctaUrl ? { text: ctaText, url: ctaUrl } : null,
    media: { images, video }
  });

  a.title = title;
  return a;
}

function collectEditForm(){
  const title = $("#eTitle").value.trim();
  const channel = $("#eChannel").value;
  const current = cloudPosts.find(x => x.id === state.editingId);
  const tags = $("#eTags").value.split(",").map(s=>s.trim()).filter(Boolean);
  const body = $("#eBody").value
    .split("\n\n")
    .map(s=>s.trim())
    .filter(Boolean);

  const ctaText = $("#eCtaText").value.trim();
  const ctaUrl = $("#eCtaUrl").value.trim();
  const images = ($("#eImages").value || "")
    .split("\n").map(s=>s.trim()).filter(Boolean);
  const video = ($("#eVideo").value || "").trim();

  const a = normalizePost({
    id: state.editingId || undefined,
    channel,
    tone: "accent",
    badge: badgeTextFromChannel(channel),
    date: current?.date || "",
    title,
    tags,
    summary: [],
    body,
    cta: ctaUrl ? { text: ctaText, url: ctaUrl } : null,
    media: { images, video }
  });

  a.title = title;
  return a;
}

async function saveEditor(status, opts = {}){
  const rawTitle = (("#pTitle" && $("#pTitle")) ? $("#pTitle").value : "").trim();
  if(!rawTitle){
    if (!opts.silentError) alert("タイトルは必須です。");
    return null;
  }

  const a = collectForm();
  a.title = rawTitle;

  if(!a.title){
    if (!opts.silentError) alert("タイトルは必須です。");
    return null;
  }

  if (!validatePostCtaFields(a.cta?.text || "", a.cta?.url || "", opts.silentError)) {
    return null;
  }

  a.status = status || "public";

  const statusBtnMap = {
    public: "#btnPublishPost",
    draft: "#btnDraftPost",
    private: "#btnPrivatePost"
  };
  const btnSave = $(statusBtnMap[a.status] || "#btnPublishPost");
  const oldText = btnSave ? btnSave.textContent : "";

  try {
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "保存中...";
    }

    const saved = await savePostToApi(a);
    const normalized = mapApiPost(saved);

    const cidx = cloudPosts.findIndex(x => x.id === normalized.id);
    if (cidx >= 0) cloudPosts[cidx] = normalized;
    else cloudPosts.unshift(normalized);

    if (normalizeStatusValue(normalized.status || a.status, "public") === "public") {
      clearEditor();
    } else {
      state.newEditorDraftId = normalized.id || state.newEditorDraftId;
      state.newEditorLastSavedSignature = buildPostContentSignature(normalized);
      const statusView = $("#pStatusView");
      if (statusView) statusView.textContent = normalized.status || a.status;
      syncAdminButtons();
    }

    renderAll();

    if (!opts.silentSuccess) {
      showToast(getPostSaveToastMessage(normalized.status || a.status));
    }

    if (!opts.skipRefresh) {
      refreshFromCloud({ silent: false, skipNotify: true }).catch(err => {
        console.warn("Cloud resync failed:", err);
      });
    }

    return normalized;
  } catch (err) {
    console.error(err);
    if (!opts.silentError) {
      alert("保存に失敗しました。\n" + (err.message || err));
      return null;
    }
    throw err;
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      if (btnSave.textContent === "保存中...") {
        btnSave.textContent = oldText || "投稿";
      }
    }
  }
}

async function saveEditForm(status, opts = {}){
  if (!state.editingId) {
    if (!opts.silentError) alert("編集対象の記事が見つかりません。");
    return null;
  }

  const rawTitle = (("#eTitle" && $("#eTitle")) ? $("#eTitle").value : "").trim();
  if(!rawTitle){
    if (!opts.silentError) alert("タイトルは必須です。");
    return null;
  }

  const a = collectEditForm();
  a.title = rawTitle;

  if(!a.title){
    if (!opts.silentError) alert("タイトルは必須です。");
    return null;
  }

  if (!validatePostCtaFields(a.cta?.text || "", a.cta?.url || "", opts.silentError)) {
    return null;
  }

  a.status = status || "public";

  const statusBtnMap = {
    public: "#btnEditPublishPost",
    draft: "#btnEditDraftPost",
    private: "#btnEditPrivatePost"
  };
  const btnSave = $(statusBtnMap[a.status] || "#btnEditPublishPost");
  const oldText = btnSave ? btnSave.textContent : "";

  try {
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "保存中...";
    }

    const saved = await savePostToApi(a);
    const normalized = mapApiPost(saved);

    const cidx = cloudPosts.findIndex(x => x.id === normalized.id);
    if(cidx >= 0) cloudPosts[cidx] = normalized;
    else cloudPosts.unshift(normalized);

    const finalStatus = normalizeStatusValue(normalized.status || a.status, "public");

    if (finalStatus === "public") {
      state.adminTab = "list";
      state.editingId = null;
      clearEditForm();
    } else {
      state.editEditorLastSavedSignature = buildPostContentSignature(normalized);
      const statusView = $("#eStatusView");
      if (statusView) statusView.textContent = normalized.status || a.status;
      syncEditButtons();
    }

    renderAll();

    if (!opts.silentSuccess) {
      showToast(getPostSaveToastMessage(normalized.status || a.status));
    }

    if (!opts.skipRefresh) {
      refreshFromCloud({ silent: false, skipNotify: true }).catch(err => {
        console.warn("Cloud resync failed:", err);
      });
    }

    return normalized;
  } catch (err) {
    console.error(err);
    if (!opts.silentError) {
      alert("保存に失敗しました。\n" + (err.message || err));
      return null;
    }
    throw err;
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      if (btnSave.textContent === "保存中...") {
        btnSave.textContent = oldText || "投稿";
      }
    }
  }
}

function renderAll(){
  renderChips();
  renderFeed();
  renderSaved();
  renderContact();
  renderAdmin();
  if ($(`.page[data-page="schedule"]`)?.classList.contains("page--active")) {
    renderCalendar();
  }
}

function updateLatestPostKey(posts){
  if(!Array.isArray(posts) || posts.length === 0){
    latestPostKey = "";
    latestPostSnapshot = null;
    return;
  }
  const sorted = posts
    .slice()
    .sort((a, b) => (parseDate(a.date) < parseDate(b.date) ? 1 : -1));
  const top = sorted[0];
  latestPostKey = `${top.id}:${parseDate(top.date)}`;
  latestPostSnapshot = {
    id: top.id || "",
    title: top.title || "",
    date: parseDate(top.date)
  };
}

function showNotifyBanner(postTitle = ""){
  const banner = $("#notifyBanner");
  const text = $("#notifyBannerText");
  if (text) {
    text.textContent = postTitle
      ? `新しい記事が投稿されました。「${postTitle}」を読む`
      : "新しい記事があります";
  }
  if (banner) banner.hidden = false;
}

function hideNotifyBanner(){
  const banner = $("#notifyBanner");
  if (banner) banner.hidden = true;
}

function formatErrorMessage(err, fallback){
  if (!err) return fallback;
  if (typeof err === "string") return err;
  return err.message || fallback;
}

function showToast(message, duration = 2500){
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(el._tid);
  el._tid = setTimeout(() => {
    el.hidden = true;
  }, duration);
}

function isStandaloneMode() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function requestSystemNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  Notification.requestPermission().catch(() => {});
}

function showNewPostSystemNotification(post) {
  if (!post?.title) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const notification = new Notification("新しい記事が投稿されました。", {
    body: `「${post.title}」を読む`,
    icon: "./favicon.png",
    badge: "./favicon.png",
    tag: `new-post-${post.id || post.date || Date.now()}`
  });
  notification.onclick = () => {
    window.focus();
    const target = allArticles().find(a => a.id === post.id);
    if (target) openDrawer(target.id);
    notification.close();
  };
  setTimeout(() => notification.close(), 12000);
}

async function refreshFromCloud(opts = {}){
  try {
    const user = getCurrentUser();
    const [posts, events] = await Promise.all([
      user?.role === "admin"
        ? fetchAllPostsFromApi()
        : fetchPostsFromApi(),
      user?.role === "admin"
        ? fetchAllEventsFromApi()
        : fetchEventsFromApi()
    ]);
    const prevKey = latestPostKey;
    cloudPosts = posts;
    cloudEvents = events;
    saveCachedPosts(posts);
    saveCachedEvents(events);
    updateLatestPostKey(posts);
    if (!opts.silent) renderAll();
    setFeedLoading(false);
    if (!opts.skipNotify && prevKey && prevKey !== latestPostKey) {
      showNotifyBanner(latestPostSnapshot?.title || "");
      showNewPostSystemNotification(latestPostSnapshot);
    }
  } catch (err) {
    if (isAuthError(err)) {
      handleAuthFailure(err.message || "セッションが無効です。再ログインしてください。");
      throw err;
    }
    setFeedLoading(false, "記事の読み込みに失敗しました。時間をおいて再読み込みしてください。");
    const msg = formatErrorMessage(err, "データの取得に失敗しました。");
    if (!opts.silent && opts.showError !== false) {
      alert(`データ更新に失敗しました。\n${msg}`);
    }
    throw err;
  }
}

function setupInstallButton(){
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    clearInstallHelpTimer();
    if (getCurrentUser() && !isStandaloneMode()) {
      const btn = $("#btnInstall");
      if (btn) btn.hidden = false;
    }
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    applyAuthUI();
  });
}

function setupPostWatcher(){
  setInterval(() => {
    if (!getCurrentUser()) return;
    refreshFromCloud({ silent: true, skipNotify: false, showError: false }).catch(() => {});
  }, 60000);
}

// ===== Bindings =====
function bind(){
  // helper
  const on = (sel, ev, fn, root=document) => {
    const el = root.querySelector(sel);
    if(!el) return null;
    el.addEventListener(ev, fn);
    return el;
  };

  // Event modal
  on("#eventModalScrim", "click", closeEventModal);
  on("#eventModalClose", "click", closeEventModal);
  on("#installHelpModalScrim", "click", closeInstallHelpModal);
  on("#installHelpModalClose", "click", closeInstallHelpModal);
  on("#profileModalScrim", "click", closeProfileModal);
  on("#profileModalClose", "click", closeProfileModal);

  // search
  on("#q", "input", (e) => {
    state.query = e.target.value;
    state.currentPage = 1;
    renderFeed();
  });

  on("#btnClear", "click", () => {
    const q = $("#q");
    if(q) q.value = "";
    state.query = "";
    state.currentPage = 1;
    renderFeed();
  });
  on("#btnSortToggle", "click", () => {
    state.sortOrder = state.sortOrder === "desc" ? "asc" : "desc";
    state.currentPage = 1;
    renderFeed();
  });

  // nav
  const navRoot = document.querySelector(".bottomnav");
  if(navRoot){
    navRoot.addEventListener("click", async (e) => {
      const btn = e.target.closest(".navitem");
      if(!btn) return;

      const key = btn.dataset.nav;
      if(!key) return;
      if (key === state.activePage) return;

      const canLeave = await confirmArticleChangesBeforeLeave();
      if (!canLeave) return;

      setActivePage(key);
    });
  }

  on("#btnProfile", "click", () => {
    openProfileModal();
  });

   on("#profileGachaBtn", "click", (e) => {
  e.preventDefault();
  openGachaFromProfile();
});

  on("#btnProfileLogout", "click", () => {
    if (!confirm("ログアウトしますか？")) return;
    clearCurrentUser();
    clearAuthToken();
    hideNotifyBanner();
    closeProfileModal();
    applyAuthUI();
    const msg = $("#loginMsg");
    if (msg) msg.textContent = "ログアウトしました。";
  });

  // schedule view switch
  const schedViewSeg = $("#schedViewSeg");
  if (schedViewSeg) {
    schedViewSeg.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg__btn");
      if (!btn) return;

      const view = btn.dataset.view;
      if (!view) return;

      state.scheduleView = view;

      if (view === "2w") {
        state.scheduleCursor = new Date();
        state.scheduleCursor.setHours(0,0,0,0);
      }

      if (view === "month" && !state.scheduleCursor) {
        state.scheduleCursor = new Date();
        state.scheduleCursor.setHours(0,0,0,0);
      }

      renderCalendar();
    });
  }

  on("#btnEventListTab", "click", () => {
    state.eventAdminTab = "list";
    renderCalendar();
  });
  on("#btnEventNewTab", "click", () => {
    state.eventAdminTab = "editor";
    clearEventForm();
    renderCalendar();
  });
  on("#btnEventPublish", "click", (e) => {
    e.preventDefault();
    saveEventEditor("public");
  });
  on("#btnEventDraft", "click", (e) => {
    e.preventDefault();
    saveEventEditor("draft");
  });
  on("#btnEventPrivate", "click", (e) => {
    e.preventDefault();
    saveEventEditor("private");
  });
  on("#btnEventDelete", "click", (e) => {
    e.preventDefault();
    deleteCurrentEvent();
  });

  ["evTitle","evDate","evStartTime","evEndTime","evDescription","evLocation","evImageUrls","evCtaUrl"].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("input", syncEventButtons);
    el.addEventListener("change", syncEventButtons);
  });

  // drawer
  on("#drawerScrim", "click", closeDrawer);
  on("#btnClose", "click", closeDrawer);

  on("#btnSave", "click", () => {
    const id = state.activeArticleId;
    if(!id) return;
    const arr = loadSaved();
    const idx = arr.indexOf(id);
    if(idx >= 0) arr.splice(idx, 1);
    else arr.push(id);
    saveSaved(arr);
    renderSaveBtn();
    renderSaved();
  });

  // admin
  on("#btnNewPost", "click", (e) => {
    e.preventDefault();
    state.adminTab = "editor";
    clearEditor();
    syncAdminButtons();
    renderAdmin();
  });

  on("#adminTabEditor", "click", async () => {
    if (state.adminTab === "editor") return;

    const canLeave = await confirmArticleChangesBeforeLeave();
    if (!canLeave) return;

    state.adminTab = "editor";
    renderAdmin();
  });

  on("#adminTabList", "click", async () => {
    if (state.adminTab === "list") return;

    const canLeave = await confirmArticleChangesBeforeLeave();
    if (!canLeave) return;

    state.adminTab = "list";
    renderAdmin();
  });

  on("#adminTabEdit", "click", async () => {
    if (!state.editingId) return;
    if (state.adminTab === "edit") return;

    const canLeave = await confirmArticleChangesBeforeLeave();
    if (!canLeave) return;

    state.adminTab = "edit";
    renderAdmin();
  });

  on("#btnPublishPost", "click", (e) => {
    e.preventDefault();
    saveEditor("public");
  });
  on("#btnDraftPost", "click", (e) => {
    e.preventDefault();
    saveEditor("draft");
  });
  on("#btnPrivatePost", "click", (e) => {
    e.preventDefault();
    saveEditor("private");
  });
  on("#btnEditPublishPost", "click", (e) => {
    e.preventDefault();
    saveEditForm("public");
  });
  on("#btnEditDraftPost", "click", (e) => {
    e.preventDefault();
    saveEditForm("draft");
  });
  on("#btnEditPrivatePost", "click", (e) => {
    e.preventDefault();
    saveEditForm("private");
  });

  ["pTitle","pChannel","pTags","pBody","pCtaText","pCtaUrl"].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("input", syncAdminButtons);
    el.addEventListener("change", syncAdminButtons);
  });
  ["eTitle","eChannel","eTags","eBody","eCtaText","eCtaUrl"].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("input", syncEditButtons);
    el.addEventListener("change", syncEditButtons);
  });

  const postForm = document.getElementById("postForm");
  if (postForm) {
    postForm.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }
  const editForm = document.getElementById("editForm");
  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }
  const eventForm = document.getElementById("eventForm");
  if (eventForm) {
    eventForm.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  // contact
  const contactForm = document.getElementById("contactForm");
  if(contactForm){
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = ($("#cName")?.value || "").trim();
      const email = ($("#cEmail")?.value || "").trim();
      const message = ($("#cMessage")?.value || "").trim();

      if (!name || !email || !message) {
        alert("お名前・メールアドレス・お問い合わせ内容を入力してください。");
        return;
      }

      try {
        await saveContactToApi({ name, email, message });
        alert("送信ありがとうございます。");
        contactForm.reset();
      } catch (err) {
        console.error(err);
        if (isAuthError(err)) {
          handleAuthFailure(err.message || "セッションの有効期限が切れました。");
          return;
        }
        alert("送信に失敗しました。\n" + (err.message || err));
      }
    });
  }

  // login / register / reset switch
  const showRegisterBtn = $("#showRegisterBtn");
  const showLoginBtn = $("#showLoginBtn");
  const showResetRequestBtn = $("#showResetRequestBtn");
  const loginForm = $("#loginForm");
  const registerForm = $("#registerForm");
  const resetRequestForm = $("#resetRequestForm");
  const resetPasswordForm = $("#resetPasswordForm");
  const resetTokenInput = $("#resetToken");
  const loginMsg = $("#loginMsg");

  function setAuthView(view){
    if (loginForm) loginForm.style.display = view === "login" ? "grid" : "none";
    if (registerForm) registerForm.style.display = view === "register" ? "grid" : "none";
    if (resetRequestForm) resetRequestForm.style.display = view === "reset-request" ? "grid" : "none";
    if (resetPasswordForm) resetPasswordForm.style.display = view === "reset-password" ? "grid" : "none";
    if (showRegisterBtn) showRegisterBtn.style.display = view === "login" ? "inline-block" : "none";
    if (showResetRequestBtn) showResetRequestBtn.style.display = view === "login" ? "inline-block" : "none";
    if (showLoginBtn) showLoginBtn.style.display = view === "login" ? "none" : "inline-block";
    if (loginMsg) loginMsg.textContent = "";
  }

  const resetTokenFromUrl = new URLSearchParams(window.location.search).get("resetToken");
  if (resetTokenFromUrl && resetTokenInput) {
    resetTokenInput.value = resetTokenFromUrl;
    setAuthView("reset-password");
  } else {
    setAuthView("login");
  }

  if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", () => setAuthView("register"));
  }
  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", () => setAuthView("login"));
  }
  if (showResetRequestBtn) {
    showResetRequestBtn.addEventListener("click", () => setAuthView("reset-request"));
  }
  on("#cancelResetRequestBtn", "click", () => setAuthView("login"));
  on("#cancelResetPasswordBtn", "click", () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("resetToken");
    window.history.replaceState({}, "", url.toString());
    setAuthView("login");
  });

  // login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = ($("#loginEmail")?.value || "").trim();
      const password = ($("#loginPassword")?.value || "").trim();
      const msg = $("#loginMsg");
      const btn = $("#loginBtn");
      if (msg) msg.textContent = "";
      if (!email || !password) {
        if (msg) msg.textContent = "メールアドレスとパスワードを入力してください。";
        return;
      }

      const oldText = btn ? btn.textContent : "";
      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = "ログイン中...";
        }
        const auth = await loginToApi(email, password);
        saveCurrentUser(auth.user);
        saveAuthToken(auth.token || "");
        applyAuthUI();
        awardDailyVisitPointIfNeeded().catch(err => console.warn("Daily point update failed:", err));
        requestSystemNotificationPermission();
        setActivePage("home");
        const cachedPosts = loadCachedPosts();
        const cachedEvents = loadCachedEvents();
        const hasPostCache = cachedPosts.length > 0;
        if (hasPostCache) {
          cloudPosts = cachedPosts;
          updateLatestPostKey(cachedPosts);
        }
        if (cachedEvents.length > 0) {
          cloudEvents = cachedEvents;
        }
        renderAll();
        setFeedLoading(!hasPostCache);
        refreshFromCloud({ silent: false, skipNotify: true, showError: !hasPostCache }).catch((refreshErr) => {
          console.warn(refreshErr);
          if (msg && !hasPostCache) msg.textContent = formatErrorMessage(refreshErr, "記事の読み込みに失敗しました。");
        });
        if (msg) msg.textContent = "";
      } catch (err) {
        console.error(err);
        if (msg) msg.textContent = err.message || "ログインに失敗しました。";
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText || "ログイン";
        }
      }
    });
  }

  // register
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = ($("#registerName")?.value || "").trim();
      const email = ($("#registerEmail")?.value || "").trim();
      const password = ($("#registerPassword")?.value || "").trim();
      const msg = $("#loginMsg");
      const btn = $("#registerBtn");
      if (msg) msg.textContent = "";
      if (!name || !email || !password) {
        if (msg) msg.textContent = "お名前・メールアドレス・パスワードを入力してください。";
        return;
      }
      const oldText = btn ? btn.textContent : "";
      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = "登録中...";
        }
        await registerToApi(name, email, password);
        if (msg) msg.textContent = "登録が完了しました。ログインしてください。";
        registerForm.reset();
        setAuthView("login");
        const loginEmail = $("#loginEmail");
        if (loginEmail) loginEmail.value = email;
      } catch (err) {
        console.error(err);
        if (msg) msg.textContent = err.message || "新規登録に失敗しました。";
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText || "新規登録";
        }
      }
    });
  }

  // reset request
  if (resetRequestForm) {
    resetRequestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = ($("#resetRequestEmail")?.value || "").trim();
      const msg = $("#loginMsg");
      const btn = $("#resetRequestBtn");
      if (msg) msg.textContent = "";
      if (!email) {
        if (msg) msg.textContent = "メールアドレスを入力してください。";
        return;
      }
      const oldText = btn ? btn.textContent : "";
      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = "送信中...";
        }
        await requestPasswordResetToApi(email);
        if (msg) msg.textContent = "再設定メールを送信しました。";
        resetRequestForm.reset();
      } catch (err) {
        console.error(err);
        if (msg) msg.textContent = err.message || "再設定メールの送信に失敗しました。";
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText || "再設定メールを送る";
        }
      }
    });
  }

  // reset password
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = ($("#resetToken")?.value || "").trim();
      const next = ($("#resetPasswordNew")?.value || "").trim();
      const confirm = ($("#resetPasswordConfirm")?.value || "").trim();
      const msg = $("#loginMsg");
      const btn = $("#resetPasswordBtn");
      if (msg) msg.textContent = "";
      if (!token || !next || !confirm) {
        if (msg) msg.textContent = "必要な項目を入力してください。";
        return;
      }
      if (next !== confirm) {
        if (msg) msg.textContent = "パスワード確認が一致しません。";
        return;
      }
      const oldText = btn ? btn.textContent : "";
      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = "更新中...";
        }
        await resetPasswordToApi(token, next);
        const url = new URL(window.location.href);
        url.searchParams.delete("resetToken");
        window.history.replaceState({}, "", url.toString());
        resetPasswordForm.reset();
        setAuthView("login");
        if (msg) msg.textContent = "パスワードを更新しました。ログインしてください。";
      } catch (err) {
        console.error(err);
        if (msg) msg.textContent = err.message || "パスワード更新に失敗しました。";
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText || "パスワードを更新";
        }
      }
    });
  }

  async function handleImageUpload(fileInput, textareaId){
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;

    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const url = await uploadImageToApi(file);
        uploadedUrls.push(url);
      }

      const current = textarea.value.trim();
      textarea.value = [current, ...uploadedUrls]
        .filter(Boolean)
        .join("\n");
      if (textareaId === "pImages") {
        renderImagePicker("pImages", "pImagePicker", "pBody");
      } else if (textareaId === "eImages") {
        renderImagePicker("eImages", "eImagePicker", "eBody");
      }
      showToast("画像をアップロードしました");
    } catch (err) {
      console.error(err);
      if (isAuthError(err)) {
        handleAuthFailure(err.message || "セッションの有効期限が切れました。");
        return;
      }
      alert("画像アップロードに失敗しました。画像サイズを小さくして再試行してください。\n" + (err.message || err));
    } finally {
      fileInput.value = "";
    }
  }

  const pImageFiles = document.getElementById("pImageFiles");
  if (pImageFiles) {
    pImageFiles.addEventListener("change", () => {
      handleImageUpload(pImageFiles, "pImages");
    });
  }
  const eImageFiles = document.getElementById("eImageFiles");
  if (eImageFiles) {
    eImageFiles.addEventListener("change", () => {
      handleImageUpload(eImageFiles, "eImages");
    });
  }
  const evImageFiles = document.getElementById("evImageFiles");
  if (evImageFiles) {
    evImageFiles.addEventListener("change", () => {
      handleImageUpload(evImageFiles, "evImageUrls");
    });
  }

  const pImages = document.getElementById("pImages");
  if (pImages) {
    pImages.addEventListener("input", () => {
      renderImagePicker("pImages", "pImagePicker", "pBody");
    });
  }
  const eImages = document.getElementById("eImages");
  if (eImages) {
    eImages.addEventListener("input", () => {
      renderImagePicker("eImages", "eImagePicker", "eBody");
    });
  }
  const pVideo = document.getElementById("pVideo");
  if (pVideo) {
    pVideo.addEventListener("input", () => {
      renderVidInsertButton("pVideo", "pBody", "pVidInsert");
    });
  }
  const eVideo = document.getElementById("eVideo");
  if (eVideo) {
    eVideo.addEventListener("input", () => {
      renderVidInsertButton("eVideo", "eBody", "eVidInsert");
    });
  }
  renderImagePicker("pImages", "pImagePicker", "pBody");
  renderImagePicker("eImages", "eImagePicker", "eBody");
  renderVidInsertButton("pVideo", "pBody", "pVidInsert");
  renderVidInsertButton("eVideo", "eBody", "eVidInsert");

  const profileIconFile = document.getElementById("profileIconFile");
  if (profileIconFile) {
    const preview = $("#profileIconPreview");
    if (preview) {
      preview.addEventListener("click", () => {
        profileIconFile.click();
      });
    }
    profileIconFile.addEventListener("change", async () => {
      const file = profileIconFile.files && profileIconFile.files[0];
      if (!file) return;
      const msg = $("#profileMsg");
      if (msg) msg.textContent = "";
      try {
        const url = await uploadImageToApi(file);
        const iconUrlInput = $("#profileIconUrl");
        if (iconUrlInput) iconUrlInput.value = url;
        updateProfilePreview(url);
        if (msg) msg.textContent = "アイコンをアップロードしました。";
      } catch (err) {
        console.error(err);
        if (isAuthError(err)) {
          handleAuthFailure(err.message || "セッションの有効期限が切れました。");
          closeProfileModal();
          return;
        }
        if (msg) msg.textContent = formatErrorMessage(err, "アイコンアップロードに失敗しました。");
      } finally {
        profileIconFile.value = "";
      }
    });
  }

  on("#profileSaveBtn", "click", (e) => {
    e.preventDefault();
    saveProfileFromModal();
  });

  on("#btnInstall", "click", async () => {
    if (!deferredInstallPrompt) {
      openInstallHelpModal();
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    applyAuthUI();
  });
  on("#notifyRefresh", "click", async () => {
    try {
      await refreshFromCloud({ silent: false, skipNotify: true });
    } finally {
      hideNotifyBanner();
    }
  });
  on("#notifyDismiss", "click", () => {
    hideNotifyBanner();
  });
}

function showGachaConnectOverlay() {
  const overlay = document.getElementById("gachaConnectOverlay");
  if (!overlay) return;
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
}

function hideGachaConnectOverlay() {
  const overlay = document.getElementById("gachaConnectOverlay");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
}

// ===== Init =====
async function init(){
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js?v=46").catch(err => {
      console.warn("SW registration failed:", err);
    });
  }

  bind();
  setupInstallButton();
  setupPostWatcher();

  applyAuthUI();

  if (!getCurrentUser() || !getAuthToken()) {
    const base = window.APP_CONFIG?.GAS_API_URL;
    if (base) {
      fetch(`${base}?action=ping&t=${Date.now()}`, {
        mode: "no-cors"
      }).catch(() => {});
    }
    clearCurrentUser();
    applyAuthUI();
    return;
  }

  const cachedPosts = loadCachedPosts();
  const cachedEvents = loadCachedEvents();
  const hasPostCache = cachedPosts.length > 0;
  if (hasPostCache) {
    cloudPosts = cachedPosts;
    updateLatestPostKey(cachedPosts);
  }
  if (cachedEvents.length > 0) {
    cloudEvents = cachedEvents;
  }

  requestSystemNotificationPermission();
  setActivePage("home");
  renderAll();
  setFeedLoading(!hasPostCache);
  awardDailyVisitPointIfNeeded().catch(err => console.warn("Daily point update failed:", err));

  refreshFromCloud({ silent: false, skipNotify: true, showError: !hasPostCache }).catch((err) => {
    console.warn("Cloud refresh failed:", err);
  });
}
init();
