/* Community News – sample (no backend) */
(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // --- Data (sample) ---
  const CHANNELS = [
    { id: "all", label: "全部", tone: "accent" },
    { id: "announce", label: "お知らせ", tone: "accent" },
    { id: "event", label: "イベント", tone: "warn" },
    { id: "report", label: "活動レポ", tone: "good" },
    { id: "learn", label: "学び共有", tone: "accent" },
    { id: "recruit", label: "募集", tone: "warn" },
  ];

  const ARTICLES = [
    {
      id: "a1",
      channel: "announce",
      tone: "accent",
      badge: "お知らせ",
      date: "2026-02-09",
      read: "3分",
      author: "運営",
      pinned: true,
      title: "今週の連絡：新チャンネル追加と投稿ルール",
      desc: "投稿が増えてきたので、チャンネルを整理しました。運営投稿・メンバー投稿の使い分けも合わせて確認をお願いします。",
      summary: [
        "「学び共有」「募集」を追加",
        "投稿は「要点→本文→CTA」の順に統一",
        "重要連絡は通知で「重要」扱いにします"
      ],
      body: [
        { type: "p", text: "コミュニティ内の発信が増えてきたので、見つけやすさ重視でチャンネルを整理しました。今後は、基本的に「要点（箇条書き）→本文→CTA（必要ならリンク）」の順で投稿してください。" },
        { type: "h3", text: "投稿ルール（最小）" },
        { type: "p", text: "・タイトルは短く具体的に（〜について / 〜のお知らせ）\n・要点を3つまで（読む前に全体像が掴める）\n・本文は長くなってもOK（見出しを増やす）" },
        { type: "h3", text: "次の一手" },
        { type: "p", text: "来週から「今週のまとめ」を毎週月曜に出します。気づきや提案があれば、運営にDMください。" },
      ],
      cta: { text: "投稿テンプレを見る", href: "https://example.com" }
    },
    {
      id: "a2",
      channel: "event",
      tone: "warn",
      badge: "イベント",
      date: "2026-02-08",
      read: "2分",
      author: "運営",
      pinned: false,
      title: "2/16 オンライン交流会（初参加歓迎）",
      desc: "30分だけ近況シェア→15分テーマトーク→最後に次のアクション決め、の軽めの回です。",
      summary: [
        "2/16（日）20:00〜20:45",
        "テーマ：最近の“良かった行動”",
        "参加リンクは当日この投稿に追記"
      ],
      body: [
        { type: "p", text: "今回の交流会は「初参加でも温度差なく入れる」設計にします。\n近況シェアは1人30秒〜1分でOK。最後に、各自の次アクションを1つだけ決めて終わります。" },
        { type: "h3", text: "当日の流れ" },
        { type: "p", text: "1) 近況（全員）\n2) テーマトーク（小グループ）\n3) 次の一手（全員）" },
      ],
      cta: { text: "カレンダーに追加", href: "https://example.com" }
    },
    {
      id: "a3",
      channel: "report",
      tone: "good",
      badge: "活動レポ",
      date: "2026-02-05",
      read: "4分",
      author: "メンバーA",
      pinned: false,
      title: "先週の小さな改善：投稿が読まれる形に整えた話",
      desc: "サムネ・要点・CTAを揃えるだけで反応が変わりました。具体的に何を変えたかを共有します。",
      summary: [
        "サムネは“雰囲気”より“内容の手がかり”",
        "要点は3つで十分",
        "最後に「何してほしいか」を1行で書く"
      ],
      body: [
        { type: "p", text: "投稿が増えると「読みたいけど追えない」が起きます。なので、最初の1画面に『理解に必要な情報』が揃っている形に寄せました。" },
        { type: "h3", text: "変えたこと" },
        { type: "p", text: "・タイトルを短く\n・要点を先頭に\n・最後に“お願い”を1行（返信/参加/シェアなど）" },
        { type: "p", text: "たったこれだけですが、反応が読みやすくなりました。良ければ皆さんも試してみてください。" },
      ],
      cta: null
    },
    {
      id: "a4",
      channel: "learn",
      tone: "accent",
      badge: "学び共有",
      date: "2026-01-30",
      read: "5分",
      author: "運営",
      pinned: false,
      title: "コミュニティ発信が続くコツ：『負担を下げる』設計",
      desc: "“気合い”で続けるのではなく、手間を減らす。テンプレ・締め切り・担当をどう置くか。",
      summary: [
        "テンプレで迷いを減らす",
        "担当を回して“属人化”を防ぐ",
        "締め切りより“頻度”を先に決める"
      ],
      body: [
        { type: "p", text: "継続の敵は『迷い』です。今日のテーマは、迷いを減らす仕組みづくり。" },
        { type: "h3", text: "テンプレ（例）" },
        { type: "p", text: "タイトル：何について\n要点：3つ\n本文：詳細\nCTA：何してほしい？" },
        { type: "p", text: "この形に揃えるだけで、読む側も探す側もラクになります。" },
      ],
      cta: { text: "テンプレをコピー", href: "https://example.com" }
    },
    {
      id: "a5",
      channel: "recruit",
      tone: "warn",
      badge: "募集",
      date: "2026-01-28",
      read: "1分",
      author: "運営",
      pinned: false,
      title: "デザイン相談できる人（30分）探してます",
      desc: "アプリのトップ画面を整えたいです。UIを見て改善ポイントを出してくれる人、お願いします。",
      summary: [
        "所要：30分（オンライン）",
        "内容：トップ画面の改善点洗い出し",
        "お礼：コミュ内で紹介＋次回イベント招待"
      ],
      body: [
        { type: "p", text: "ニュースアプリのUIを“読まれる形”に寄せたいです。改善点を一緒に出してくれる方がいたら助かります。" },
        { type: "p", text: "興味ある方は、運営に連絡ください！" }
      ],
      cta: { text: "運営に連絡", href: "https://example.com" }
    },
  ];

  const NOTIFS = [
    { id:"n1", important:true,  time:"今日 12:10", title:"重要：投稿ルール更新", text:"「要点→本文→CTA」の順に統一しました。確認お願いします。" },
    { id:"n2", important:false, time:"昨日 20:05", title:"イベント：交流会が近づいてます", text:"2/16（日）20:00〜。初参加歓迎です。" },
    { id:"n3", important:false, time:"2日前", title:"新着：活動レポが追加されました", text:"『投稿が読まれる形に整えた話』が公開。" },
  ];

  // --- State ---
  let state = {
    route: "home",
    channel: "all",
    q: "",
    drawerOpen: false,
    currentArticleId: null,
    saved: loadSaved(),
    importantOnly: false,
  };

  // --- Elements ---
  const pageHome = $("#pageHome");
  const pageSaved = $("#pageSaved");
  const pageNotif = $("#pageNotif");
  const cardList = $("#cardList");
  const chipRow = $("#chipRow");
  const qInput = $("#q");
  const btnClear = $("#btnClear");
  const feedHint = $("#feedHint");

  const savedList = $("#savedList");
  const savedEmpty = $("#savedEmpty");

  const notifList = $("#notifList");
  const toggleImportant = $("#toggleImportant");

  const drawer = $("#drawer");
  const drawerScrim = $("#drawerScrim");
  const btnClose = $("#btnClose");
  const btnSave = $("#btnSave");

  // Article fields
  const articleBadge = $("#articleBadge");
  const articleDate = $("#articleDate");
  const articleTitle = $("#articleTitle");
  const articleRead = $("#articleRead");
  const articleAuthor = $("#articleAuthor");
  const articlePin = $("#articlePin");
  const articleSummary = $("#articleSummary");
  const articleBody = $("#articleBody");
  const articleCTA = $("#articleCTA");
  const ctaText = $("#ctaText");
  const ctaLink = $("#ctaLink");

  // Nav
  const navItems = $$(".navitem");

  // Header quick buttons
  $("#btnBell").addEventListener("click", () => goto("notif"));
  $("#btnProfile").addEventListener("click", () => goto("profile"));

  // --- Init ---
  renderChips();
  bindEvents();
  renderAll();

  // --- Routing (simple) ---
  function goto(route){
    if(route === "channels"){
      // for this sample, channels is just home with chip row focus
      state.route = "home";
      showToast("チャンネルはHomeの上部で切替できます");
      renderPages();
      return;
    }
    if(route === "profile"){
      showToast("プロフィールはサンプルでは未実装です");
      return;
    }
    state.route = route;
    renderPages();
  }

  function renderPages(){
    // active nav
    navItems.forEach(btn => {
      const active = (btn.dataset.route === state.route) || (state.route==="home" && btn.dataset.route==="home");
      btn.classList.toggle("navitem--active", active);
    });

    // pages
    [pageHome, pageSaved, pageNotif].forEach(p => p.classList.remove("page--active"));
    if(state.route === "saved") pageSaved.classList.add("page--active");
    else if(state.route === "notif") pageNotif.classList.add("page--active");
    else pageHome.classList.add("page--active");
  }

  // --- Events ---
  function bindEvents(){
    navItems.forEach(btn => btn.addEventListener("click", () => goto(btn.dataset.route)));

    qInput.addEventListener("input", (e) => {
      state.q = e.target.value.trim();
      renderFeed();
    });
    btnClear.addEventListener("click", () => {
      qInput.value = "";
      state.q = "";
      renderFeed();
      qInput.focus();
    });

    drawerScrim.addEventListener("click", closeDrawer);
    btnClose.addEventListener("click", closeDrawer);

    btnSave.addEventListener("click", () => {
      if(!state.currentArticleId) return;
      toggleSaved(state.currentArticleId);
      // update icon state visually
      renderDrawerSaveState();
      renderSaved();
    });

    toggleImportant.addEventListener("change", () => {
      state.importantOnly = toggleImportant.checked;
      renderNotifs();
    });

    // ESC close drawer
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && state.drawerOpen) closeDrawer();
    });
  }

  // --- UI render ---
  function renderAll(){
    renderPages();
    renderFeed();
    renderSaved();
    renderNotifs();
  }

  function renderChips(){
    chipRow.innerHTML = "";
    CHANNELS.forEach(ch => {
      const btn = document.createElement("button");
      btn.className = "chip" + (state.channel === ch.id ? " chip--active" : "");
      btn.dataset.channel = ch.id;
      btn.dataset.tone = ch.tone;
      btn.innerHTML = `<span class="chip__dot" aria-hidden="true"></span><span>${escapeHtml(ch.label)}</span>`;
      btn.addEventListener("click", () => {
        state.channel = ch.id;
        // update selected
        $$(".chip", chipRow).forEach(x => x.classList.toggle("chip--active", x.dataset.channel === ch.id));
        renderFeed();
      });
      chipRow.appendChild(btn);
    });
  }

  function renderFeed(){
    const items = filteredArticles();
    cardList.innerHTML = "";

    if(state.channel === "all") feedHint.textContent = "チャンネルを選ぶと絞り込みできます";
    else {
      const label = CHANNELS.find(c => c.id === state.channel)?.label ?? state.channel;
      feedHint.textContent = `「${label}」で絞り込み中`;
    }

    // pinned first
    const pinned = items.filter(a => a.pinned);
    const normal = items.filter(a => !a.pinned);

    [...pinned, ...normal].forEach(a => {
      const card = document.createElement("article");
      card.className = "card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");

      const badgeTone = a.tone || "accent";
      card.innerHTML = `
        <div class="card__row">
          <div class="card__thumb" aria-hidden="true"></div>
          <div class="card__body">
            <div class="card__top">
              <div class="badge" data-tone="${escapeHtml(badgeTone)}">
                <span class="badge__dot" aria-hidden="true"></span>
                <span>${escapeHtml(a.badge)}${a.pinned ? " · ピン" : ""}</span>
              </div>
              <div class="card__date">${fmtDate(a.date)}</div>
            </div>
            <div class="card__title">${escapeHtml(a.title)}</div>
            <div class="card__desc">${escapeHtml(a.desc)}</div>
            <div class="card__meta">
              <span class="pill">⏱ ${escapeHtml(a.read)}</span>
              <span class="pill">✍️ ${escapeHtml(a.author)}</span>
              ${state.saved.includes(a.id) ? `<span class="pill">🔖 保存済み</span>` : ``}
            </div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => openArticle(a.id));
      card.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          openArticle(a.id);
        }
      });

      cardList.appendChild(card);
    });

    if(items.length === 0){
      cardList.innerHTML = `
        <div class="empty">
          <div class="empty__icon" aria-hidden="true">📰</div>
          <div class="empty__title">該当する記事がありません</div>
          <div class="empty__text">検索語やチャンネルを変えてみてください。</div>
        </div>
      `;
    }
  }

  function renderSaved(){
    const savedArticles = ARTICLES.filter(a => state.saved.includes(a.id));
    savedList.innerHTML = "";
    savedEmpty.style.display = savedArticles.length ? "none" : "block";

    savedArticles.forEach(a => {
      const card = document.createElement("article");
      card.className = "card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");

      card.innerHTML = `
        <div class="card__row">
          <div class="card__thumb" aria-hidden="true"></div>
          <div class="card__body">
            <div class="card__top">
              <div class="badge" data-tone="${escapeHtml(a.tone || "accent")}">
                <span class="badge__dot" aria-hidden="true"></span>
                <span>${escapeHtml(a.badge)}</span>
              </div>
              <div class="card__date">${fmtDate(a.date)}</div>
            </div>
            <div class="card__title">${escapeHtml(a.title)}</div>
            <div class="card__desc">${escapeHtml(a.desc)}</div>
            <div class="card__meta">
              <span class="pill">🔖 保存</span>
              <span class="pill">⏱ ${escapeHtml(a.read)}</span>
            </div>
          </div>
        </div>
      `;
      card.addEventListener("click", () => openArticle(a.id));
      card.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          openArticle(a.id);
        }
      });
      savedList.appendChild(card);
    });
  }

  function renderNotifs(){
    const items = state.importantOnly ? NOTIFS.filter(n => n.important) : NOTIFS;
    notifList.innerHTML = "";

    items.forEach(n => {
      const div = document.createElement("div");
      div.className = "notif" + (n.important ? " notif--important" : "");
      div.innerHTML = `
        <div class="notif__top">
          <div class="notif__title">${escapeHtml(n.title)}</div>
          <div class="notif__time">${escapeHtml(n.time)}</div>
        </div>
        <div class="notif__text">${escapeHtml(n.text)}</div>
      `;
      notifList.appendChild(div);
    });

    if(items.length === 0){
      notifList.innerHTML = `
        <div class="empty">
          <div class="empty__icon" aria-hidden="true">🔔</div>
          <div class="empty__title">重要通知はありません</div>
          <div class="empty__text">「重要のみ」を解除すると全て表示できます。</div>
        </div>
      `;
    }
  }

  // --- Drawer / Article detail ---
  function openArticle(id){
    const a = ARTICLES.find(x => x.id === id);
    if(!a) return;

    state.currentArticleId = id;

    articleBadge.textContent = a.badge;
    articleBadge.setAttribute("data-tone", a.tone || "accent");
    articleDate.textContent = fmtDate(a.date);
    articleTitle.textContent = a.title;
    articleRead.textContent = `⏱ ${a.read}`;
    articleAuthor.textContent = `✍️ ${a.author}`;
    articlePin.hidden = !a.pinned;

    // summary
    articleSummary.innerHTML = `<ul>${(a.summary || []).map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`;

    // body
    articleBody.innerHTML = (a.body || []).map(block => {
      if(block.type === "h3") return `<h3>${escapeHtml(block.text)}</h3>`;
      if(block.type === "p") return `<p>${linkify(escapeHtml(block.text)).replace(/\n/g, "<br>")}</p>`;
      return "";
    }).join("");

    // CTA
    if(a.cta && a.cta.href){
      articleCTA.hidden = false;
      ctaText.textContent = a.cta.text || "開く";
      ctaLink.href = a.cta.href;
      ctaLink.textContent = "開く";
    }else{
      articleCTA.hidden = true;
    }

    renderDrawerSaveState();

    drawer.classList.add("drawer--open");
    drawer.setAttribute("aria-hidden", "false");
    state.drawerOpen = true;

    // small UX: if opening from notifs/saved, return to home is not needed; drawer is overlay
  }

  function closeDrawer(){
    drawer.classList.remove("drawer--open");
    drawer.setAttribute("aria-hidden", "true");
    state.drawerOpen = false;
    state.currentArticleId = null;
  }

  function renderDrawerSaveState(){
    const saved = state.currentArticleId && state.saved.includes(state.currentArticleId);
    btnSave.title = saved ? "保存済み（解除）" : "保存";
    btnSave.style.background = saved ? "rgba(34,197,94,.18)" : "rgba(255,255,255,.04)";
    btnSave.style.borderColor = saved ? "rgba(34,197,94,.35)" : "rgba(255,255,255,.10)";
  }

  // --- Filtering ---
  function filteredArticles(){
    const q = state.q.toLowerCase();
    return ARTICLES
      .filter(a => state.channel === "all" ? true : a.channel === state.channel)
      .filter(a => {
        if(!q) return true;
        const hay = (a.title + " " + a.desc + " " + (a.badge||"") + " " + (a.author||"")).toLowerCase();
        return hay.includes(q);
      })
      .sort((a,b) => {
        // pinned first, then date desc
        if(!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return (b.date || "").localeCompare(a.date || "");
      });
  }

  // --- Saved (localStorage) ---
  function loadSaved(){
    try{
      const raw = localStorage.getItem("cn_saved");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch(e){
      return [];
    }
  }
  function persistSaved(){
    localStorage.setItem("cn_saved", JSON.stringify(state.saved));
  }
  function toggleSaved(id){
    const i = state.saved.indexOf(id);
    if(i >= 0){
      state.saved.splice(i,1);
      showToast("保存を解除しました");
    }else{
      state.saved.unshift(id);
      showToast("保存しました");
    }
    persistSaved();
    renderFeed(); // update pills
  }

  // --- Utils ---
  function fmtDate(iso){
    // iso: YYYY-MM-DD -> YYYY/MM/DD
    if(!iso) return "";
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!m) return iso;
    return `${m[1]}/${m[2]}/${m[3]}`;
  }
  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }
  function linkify(text){
    // very small linkify for http(s)
    return text.replace(/(https?:\/\/[^\s<]+)/g, (m) => {
      const safe = m.replaceAll('"', "%22");
      return `<a href="${safe}" target="_blank" rel="noopener">${m}</a>`;
    });
  }

  // --- Tiny toast ---
  let toastTimer = null;
  function showToast(msg){
    let el = $("#toast");
    if(!el){
      el = document.createElement("div");
      el.id = "toast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.transform = "translateX(-50%)";
      el.style.bottom = "calc(92px + env(safe-area-inset-bottom, 0px))";
      el.style.zIndex = "50";
      el.style.padding = "10px 12px";
      el.style.borderRadius = "14px";
      el.style.background = "rgba(15,23,42,.92)";
      el.style.border = "1px solid rgba(255,255,255,.14)";
      el.style.color = "rgba(255,255,255,.92)";
      el.style.fontSize = "13px";
      el.style.boxShadow = "0 14px 40px rgba(0,0,0,.28)";
      el.style.maxWidth = "min(92vw, 520px)";
      el.style.textAlign = "center";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.opacity = "0";
    }, 1500);
  }
})();
