/* Community News Wire Sample
   + Schedule Tab
   + Admin: Create/Edit/Delete posts (localStorage)
   + Export / Import JSON
*/

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const LS_KEY_SAVED = "community_news_saved_v1";
const LS_KEY_USER = "community_news_user_v1";
const LS_KEY_POSTS_CACHE = "community_news_posts_cache_v1";
const ITEMS_PER_PAGE = 10;

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
    name: "東",
    instagram: "https://x.gd/tLcAs",
  },
  {
    name: "しゅう",
    instagram: "https://x.gd/2a58h",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
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
};

let cloudPosts = [];
let cloudEvents = [];
let latestPostKey = "";
let deferredInstallPrompt = null;

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
    status: post.status || "public"
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

async function callApi(action, payload = {}) {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) throw new Error("GAS_API_URL is not set");
  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await parseApiJson(res, action);
  if (!data.ok) throw new Error(data.message || "API error");
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
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) throw new Error("GAS_API_URL is not set");
  const url = `${base}?action=listPosts&t=${Date.now()}`;
  const res = await fetch(url, {
    cache: "no-store"
  });
  const data = await parseApiJson(res, "listPosts");
  if (!data.ok) throw new Error(data.message || "Failed to fetch posts");
  return (data.posts || []).map(mapApiPost);
}

async function fetchAllPostsFromApi() {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) throw new Error("GAS_API_URL is not set");
  const url = `${base}?action=listAllPosts&t=${Date.now()}`;
  const res = await fetch(url, {
    cache: "no-store"
  });
  const data = await parseApiJson(res, "listAllPosts");
  if (!data.ok) throw new Error(data.message || "Failed to fetch posts");
  return (data.posts || []).map(mapApiPost);
}

async function fetchEventsFromApi() {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) throw new Error("GAS_API_URL is not set");
  const url = `${base}?action=listEvents&t=${Date.now()}`;
  const res = await fetch(url, {
    cache: "no-store"
  });
  const data = await parseApiJson(res, "listEvents");
  if (!data.ok) throw new Error(data.message || "Failed to fetch events");
  return (data.events || []).map(mapApiEvent);
}

async function fetchAllEventsFromApi() {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) throw new Error("GAS_API_URL is not set");
  const url = `${base}?action=listAllEvents&t=${Date.now()}`;
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
  const data = await callApi("savePost", {
    post: {
      id: post.id || "",
      date: post.date || "",
      channel: post.channel || "article",
      tone: post.tone || "accent",
      badge: post.badge || "",
      title: post.title || "",
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

async function uploadImageToApi(file) {
  const dataUrl = await compressImage(file);
  const data = await callApi("uploadImage", {
    fileName: file.name,
    mimeType: "image/jpeg",
    dataUrl
  });
  return data.url;
}

function compressImage(file, maxSize = 2200, quality = 0.9) {
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
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w = Math.max(1, Math.round(w * ratio));
        h = Math.max(1, Math.round(h * ratio));
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
  const data = await callApi("login", { email, password });
  return data.user;
}

async function registerToApi(name, email, password) {
  const data = await callApi("register", {
    user: { name, email, password }
  });
  return data.user;
}

function getCurrentUser() {
  return safeJsonParse(localStorage.getItem(LS_KEY_USER) || "null", null);
}

function saveCurrentUser(user) {
  localStorage.setItem(LS_KEY_USER, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(LS_KEY_USER);
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
    return;
  }

  authGate.hidden = true;
  appRoot.hidden = false;

  const isAdmin = user.role === "admin";

  if (adminNav) adminNav.style.display = isAdmin ? "flex" : "none";
  if (adminPage) adminPage.style.display = isAdmin ? "" : "none";
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
  const saved = isSaved(a.id);
  const savedMark = saved ? "★" : "☆";
  const thumb = (a.media?.images && a.media.images.length) ? a.media.images[0] : "";
  const mediaHtml = thumb
    ? `<div class="card__media"><img src="${escapeAttr(thumb)}" alt="" loading="lazy"></div>`
    : `<div class="card__media card__media--placeholder" aria-hidden="true"></div>`;
  const savedBadge = `<span class="card__saved${saved ? " card__saved--active" : ""}" aria-label="${saved ? "保存済み" : "未保存"}" title="${saved ? "保存済み" : "未保存"}">${savedMark}</span>`;
  const bodyPreview = (a.body && a.body.length) ? a.body.join(" ") : "";
  const tagsHtml = (a.tags && a.tags.length)
    ? `<div class="card__meta">${a.tags.map(t => `<span class="card__tag">${escapeHtml(t)}</span>`).join("")}</div>`
    : "";
  return `
    <article class="card" data-article="${escapeAttr(a.id)}">
      ${savedBadge}
      ${mediaHtml}
      <div class="card__content">
        <div class="card__top">
          <span class="card__badge">${escapeHtml(a.badge || "Info")}</span>
          <span class="card__date">${relativeDate(a.date)}</span>
        </div>
        <div class="card__title">${escapeHtml(a.title||"")}</div>
        ${bodyPreview ? `<div class="card__desc">${escapeHtml(bodyPreview)}</div>` : ""}
        ${tagsHtml}
        <div class="card__author">#${escapeHtml(channelLabel(a.channel))}</div>
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

function mediaHtml(a){
  const imgs = (a.media?.images || [])
    .map(url => `
      <div class="media__img">
        <img src="${escapeAttr(url)}" alt="" loading="lazy" />
      </div>
    `).join("");
  const videoUrl = a.media?.video || "";
  const video = videoUrl ? renderVideoEmbed(videoUrl) : "";
  if(!imgs && !video) return "";
  return `<div class="media">${imgs}${video}</div>`;
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
  $("#aMeta").textContent = `#${a.channel}  /  ${(a.tags||[]).join("・") || "-"}`;

  const stats = $("#aStats");
  stats.innerHTML = (a.tags||[]).map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("");

  const sum = $("#aSummaryList");
  sum.innerHTML = (a.summary||[]).map(x => `<li>${escapeHtml(x)}</li>`).join("");
  $("#aSummary").style.display = (a.summary && a.summary.length) ? "block" : "none";

  const body = $("#aBody");
  body.innerHTML =
    mediaHtml(a) +
    (a.body||[]).map(p => `<p>${escapeHtml(p)}</p>`).join("");

  const cta = $("#cta");
  if(a.cta && a.cta.url){
    cta.style.display = "flex";
    $("#ctaText").textContent = a.cta.text || "リンク";
    $("#ctaBtn").href = a.cta.url;
  }else{
    cta.style.display = "none";
  }
  renderSaveBtn();
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
  btn.title = saved ? "保存済み" : "保存";
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
    .sort((a,b) => (a.date < b.date ? -1 : 1));
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
      ${ev.startTime ? `<div class="eventdetail__meta">時間: ${escapeHtml(ev.startTime)}${ev.endTime ? ` - ${escapeHtml(ev.endTime)}` : ""}</div>` : ""}
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

  const isAdmin = getCurrentUser()?.role === "admin";
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
      ${isAdmin ? `<button class="cal__addEvent" id="btnToggleEventEditor" type="button">イベント追加</button>` : ""}
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

  const toggleEventEditorBtn = $("#btnToggleEventEditor", calRoot);
  if (toggleEventEditorBtn) {
    toggleEventEditorBtn.addEventListener("click", () => {
      state.eventAdminTab = "editor";
      clearEventForm();
      renderCalendar();
    });
  }

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
  $("#postForm").reset();
  $("#pChannel").value = "article";
  $("#pTags").value = "";
  $("#pBody").value = "";
  $("#pCtaText").value = "";
  $("#pCtaUrl").value = "";
  $("#pImages").value = "";
  $("#pVideo").value = "";
  const statusView = $("#pStatusView");
  if (statusView) statusView.textContent = "未設定（投稿すると状態が反映されます）";
  syncAdminButtons();
}

function clearEditForm(){
  const form = $("#editForm");
  if(form) form.reset();
  $("#eChannel").value = "article";
  $("#eTags").value = "";
  $("#eBody").value = "";
  $("#eCtaText").value = "";
  $("#eCtaUrl").value = "";
  $("#eImages").value = "";
  $("#eVideo").value = "";
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
  const statusView = $("#eStatusView");
  if (statusView) statusView.textContent = a.status || "public";
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

  // ★ここを追加（画像URLと動画URLを読む）
  const images = ($("#pImages").value || "")
    .split("\n").map(s=>s.trim()).filter(Boolean);
  const video = ($("#pVideo").value || "").trim();

  const a = normalizePost({
    channel,
    tone: "accent",
    badge: badgeTextFromChannel(channel),
    title,
    tags,
    summary: [],
    body,
    cta: ctaUrl ? { text: ctaText || "開く", url: ctaUrl } : null,

    // ★ここを追加（a の中に media を入れる）
    media: { images, video }
  });

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

  return normalizePost({
    id: state.editingId || undefined,
    channel,
    tone: "accent",
    badge: badgeTextFromChannel(channel),
    date: current?.date || "",
    title,
    tags,
    summary: [],
    body,
    cta: ctaUrl ? { text: ctaText || "開く", url: ctaUrl } : null,
    media: { images, video }
  });
}

async function saveEditor(status){
  const a = collectForm();
  if(!a.title){
    alert("タイトルは必須です。");
    return;
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

    // cloudPosts を即更新
    const cidx = cloudPosts.findIndex(x => x.id === normalized.id);
    if(cidx >= 0) cloudPosts[cidx] = normalized;
    else cloudPosts.unshift(normalized);

    renderAll();

    const statusView = $("#pStatusView");
    if (statusView) statusView.textContent = normalized.status || a.status;
    syncAdminButtons();

    if (btnSave) {
      btnSave.textContent = "保存済み";
    }

    setTimeout(() => {
      if (btnSave) btnSave.textContent = oldText || "投稿";
    }, 1000);

    refreshFromCloud({ silent: false, skipNotify: true }).catch(err => {
      console.warn("Cloud resync failed:", err);
    });

  } catch (err) {
    console.error(err);
    alert("保存に失敗しました。\n" + (err.message || err));
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      if (btnSave.textContent === "保存中...") {
        btnSave.textContent = oldText || "投稿";
      }
    }
  }
}

async function saveEditForm(status){
  if (!state.editingId) {
    alert("編集対象の記事が見つかりません。");
    return;
  }

  const a = collectEditForm();
  if(!a.title){
    alert("タイトルは必須です。");
    return;
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

    renderAll();

    const statusView = $("#eStatusView");
    if (statusView) statusView.textContent = normalized.status || a.status;
    syncEditButtons();

    if (btnSave) {
      btnSave.textContent = "保存済み";
    }

    setTimeout(() => {
      if (btnSave) btnSave.textContent = oldText || "投稿";
    }, 1000);

    refreshFromCloud({ silent: false, skipNotify: true }).catch(err => {
      console.warn("Cloud resync failed:", err);
    });
  } catch (err) {
    console.error(err);
    alert("保存に失敗しました。\n" + (err.message || err));
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
    return;
  }
  const sorted = posts
    .slice()
    .sort((a, b) => (parseDate(a.date) < parseDate(b.date) ? 1 : -1));
  const top = sorted[0];
  latestPostKey = `${top.id}:${parseDate(top.date)}`;
}

function showNotifyBanner(){
  const banner = $("#notifyBanner");
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
    updateLatestPostKey(posts);
    if (!opts.silent) renderAll();
    setFeedLoading(false);
    if (!opts.skipNotify && prevKey && prevKey !== latestPostKey) {
      showNotifyBanner();
    }
  } catch (err) {
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
    const btn = $("#btnInstall");
    if (btn) btn.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    const btn = $("#btnInstall");
    if (btn) btn.hidden = true;
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
    navRoot.addEventListener("click", (e) => {
      const btn = e.target.closest(".navitem");
      if(!btn) return;
      const key = btn.dataset.nav;
      if(!key) return;
      setActivePage(key);
    });
  }

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
  on("#btnNewPost", "click", () => {
    state.adminTab = "editor";
    clearEditor();
    syncAdminButtons();
    renderAdmin();
  });

  on("#adminTabEditor", "click", () => {
    state.adminTab = "editor";
    renderAdmin();
  });
  on("#adminTabList", "click", () => {
    state.adminTab = "list";
    renderAdmin();
  });
  on("#adminTabEdit", "click", () => {
    if (!state.editingId) return;
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
        alert("送信に失敗しました。\n" + (err.message || err));
      }
    });
  }

  // login / register switch
  const showRegisterBtn = $("#showRegisterBtn");
  const showLoginBtn = $("#showLoginBtn");
  const loginForm = $("#loginForm");
  const registerForm = $("#registerForm");
  const loginMsg = $("#loginMsg");

  if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", () => {
      if (loginForm) loginForm.style.display = "none";
      if (registerForm) registerForm.style.display = "grid";
      showRegisterBtn.style.display = "none";
      if (showLoginBtn) showLoginBtn.style.display = "inline-block";
      if (loginMsg) loginMsg.textContent = "";
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", () => {
      if (loginForm) loginForm.style.display = "grid";
      if (registerForm) registerForm.style.display = "none";
      if (showRegisterBtn) showRegisterBtn.style.display = "inline-block";
      showLoginBtn.style.display = "none";
      if (loginMsg) loginMsg.textContent = "";
    });
  }

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

        const user = await loginToApi(email, password);
        saveCurrentUser(user);
        applyAuthUI();
        setActivePage("home");
        const cachedPosts = loadCachedPosts();
        const hasCache = cachedPosts.length > 0;
        if (hasCache) {
          cloudPosts = cachedPosts;
          updateLatestPostKey(cachedPosts);
        }
        renderAll();
        setFeedLoading(!hasCache);

        refreshFromCloud({ silent: false, skipNotify: true, showError: !hasCache }).catch((refreshErr) => {
          console.warn(refreshErr);
          if (msg && !hasCache) {
            msg.textContent = formatErrorMessage(refreshErr, "記事の読み込みに失敗しました。");
          }
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

        if (loginForm) loginForm.style.display = "grid";
        registerForm.style.display = "none";
        if (showRegisterBtn) showRegisterBtn.style.display = "inline-block";
        if (showLoginBtn) showLoginBtn.style.display = "none";

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
      alert("画像をアップロードしました");
    } catch (err) {
      console.error(err);
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

  on("#btnInstall", "click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    const btn = $("#btnInstall");
    if (btn) btn.hidden = true;
  });
  on("#btnAppDownload", "click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      const btn = $("#btnInstall");
      if (btn) btn.hidden = true;
      return;
    }

    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) {
      alert("Safariの共有ボタンから「ホーム画面に追加」を選んでください。");
      return;
    }
    if (/Android/i.test(ua)) {
      alert("ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選んでください。");
      return;
    }
    alert("ブラウザメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。");
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

// ===== Init =====
async function init(){
  bind();
  setupInstallButton();
  setupPostWatcher();

  applyAuthUI();

  if (!getCurrentUser()) {
    return;
  }

  const cachedPosts = loadCachedPosts();
  const hasCache = cachedPosts.length > 0;
  if (hasCache) {
    cloudPosts = cachedPosts;
    updateLatestPostKey(cachedPosts);
  }

  setActivePage("home");
  renderAll();
  setFeedLoading(!hasCache);

  refreshFromCloud({ silent: false, skipNotify: true, showError: !hasCache }).catch((err) => {
    console.warn("Cloud refresh failed:", err);
  });
}
init();
