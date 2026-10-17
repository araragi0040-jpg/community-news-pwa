(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const U = AnalyticsUI;
  const tokenKey = "katariba_news_analytics_prod_token_v1";
  let report = null;
  let requestSerial = 0;
  let sort = { key:"totalViews", direction:-1 };
  const token = () => sessionStorage.getItem(tokenKey) || "";
  const apiUrl = () => {
    if (window.APP_CONFIG?.MODE !== "prod" || !window.APP_CONFIG?.GAS_API_URL) {
      throw new Error("本番用の設定を読み込めませんでした。config.jsの配置を確認してください。");
    }
    return window.APP_CONFIG.GAS_API_URL;
  };
  async function responseJson(response) {
    let data;
    try { data = JSON.parse(await response.text()); }
    catch (_) { throw new Error("APIの応答を読み取れませんでした。GASのデプロイとアクセス設定を確認してください。"); }
    if (!response.ok || !data.ok) {
      const message = data.message === "Unknown action"
        ? "分析APIがまだ反映されていません。本番用Code.gsを更新し、GASを再デプロイしてください。"
        : data.message || "データの取得に失敗しました。";
      throw Object.assign(new Error(message), { code:data.code });
    }
    return data;
  }
  function showLogin(message = "") {
    $("#dashboard").hidden = true;
    $("#loginOverlay").hidden = false;
    $("#loginMsg").textContent = message;
  }
  function showDashboard() {
    $("#loginOverlay").hidden = true;
    $("#dashboard").hidden = false;
  }
  function status(message, error = false) {
    $("#status").textContent = message;
    $("#status").classList.toggle("error", error);
  }
  function rangeFromPeriod() {
    const today = U.todayJST();
    $("#endDate").max = today;
    $("#startDate").max = today;
    if ($("#period").value === "custom") return;
    $("#endDate").value = today;
    $("#startDate").value = $("#period").value === "all"
      ? report?.startedOn || "2000-01-01"
      : U.dayOffset(today, 1 - Number($("#period").value));
  }
  function updateOptions(select, options, label) {
    const previous = select.value;
    select.replaceChildren(new Option(label, ""), ...options.map(item => new Option(item.label, item.value)));
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
    else if (previous) select.add(new Option("（指定した項目）", previous, true, true));
  }
  function selectedMetrics() {
    return [...document.querySelectorAll("#metricControls input:checked")].map(input => input.value);
  }
  function renderCharts() {
    $("#activityChart").innerHTML = U.chart(report?.series || [], selectedMetrics());
    $("#rateChart").innerHTML = U.chart(report?.series || [], ["rate"], true);
  }
  function articleRows() {
    return U.sortArticles(report?.articles || [], sort);
  }
  function renderArticles() {
    const rows = articleRows();
    $("#articleBody").innerHTML = rows.length ? rows.map((row,i) => `<tr><td>${U.number(i+1)}</td><td class="publication-date">${U.escape(row.publishedDate ? row.publishedDate.replace(/-/g,"/") : "—")}</td><td class="title-cell">${U.escape(row.title || "（タイトルなし）")}</td><td class="num cumulative">${U.number(row.totalViews)}</td><td class="num cumulative">${U.number(row.uniqueViewCount)}</td><td class="num">${U.number(row.views)}</td><td class="num">${U.number(row.readers)}</td></tr>`).join("") : '<tr><td colspan="7" class="empty">この条件に該当する記事はありません。</td></tr>';
    $("#articleCount").textContent = `${U.number(rows.length)}記事`;
    document.querySelectorAll("[data-sort]").forEach(button => {
      const labels = { publishedDate:"アップ日", title:"記事タイトル", totalViews:"累計閲覧回数", uniqueViewCount:"累計閲覧人数", views:"期間内閲覧回数", readers:"期間内閲覧人数" };
      const active = button.dataset.sort === sort.key;
      button.textContent = labels[button.dataset.sort] + " " + (active ? sort.direction === 1 ? "▲" : "▼" : "↕");
      button.closest("th").setAttribute("aria-sort", active ? sort.direction === 1 ? "ascending" : "descending" : "none");
    });
  }
  function render() {
    const s = report.summary;
    $("#usersValue").textContent = U.number(s.users);
    $("#viewsValue").textContent = U.number(s.views);
    $("#readersValue").textContent = U.number(s.readers);
    $("#rateValue").textContent = U.number(s.averageDailyRate, 1);
    $("#memberCount").textContent = U.number(s.registeredMembers);
    $("#goalProgress").value = Math.min(s.goal, s.registeredMembers);
    $("#goalRate").textContent = U.number(s.registeredMembers / s.goal * 100, 1) + "%";
    $("#goalProgress").setAttribute("aria-label", `登録会員${s.registeredMembers}人、目標${s.goal}人`);
    $("#updatedAt").textContent = "更新 " + new Date(report.generatedAt).toLocaleString("ja-JP", { timeZone:"Asia/Tokyo", month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" });
    updateOptions($("#postFilter"), report.filters.posts.map(p => ({value:p.id, label:p.title})), "すべての記事");
    updateOptions($("#tagFilter"), report.filters.tags.map(tag => ({value:tag, label:tag})), "すべてのタグ");
    renderCharts();
    renderArticles();
    $("#dailyBody").innerHTML = report.daily.length ? report.daily.slice().reverse().map(row => `<tr><td>${U.escape(row.date)}</td><td class="num">${U.number(row.users)}</td><td class="num">${U.number(row.eligibleMembers)}</td><td class="num">${row.rate == null ? "—" : U.number(row.rate,1)+"%"}</td><td class="num">${U.number(row.views)}</td><td class="num">${U.number(row.readers)}</td><td class="num">${U.number(row.registeredMembers)}</td></tr>`).join("") : '<tr><td colspan="7" class="empty">この期間に計測データはありません。</td></tr>';
    $("#activityNote").textContent = report.granularity === "day"
      ? "各点にカーソルを合わせると値を確認できます。再閲覧を含む回数と、重複を除いた人数を表示しています。"
      : "人数は各週・各月の中で重複を除いています。登録会員数は各期間の最後に記録された値です。週は月曜日始まりです。";
    $("#trackingNote").textContent = `計測開始：${report.startedOn} ／ 日本時間（JST） ／ 登録会員数は現在値（テスト用を除く）。利用率の分母は日別の利用可能会員数です。`;
    $("#dailyCsv").disabled = !report.daily.length;
    $("#articleCsv").disabled = !report.articles.length;
    const range = report.daily.length ? `${report.start} 〜 ${report.end}` : "指定期間に計測データはありません。";
    status(`${range} ／ ${report.daily.length}日分。${report.daily.length ? "今日は途中経過です。" : ""}${report.missingMemberDays ? ` 会員数が未記録の${report.missingMemberDays}日分は利用率を表示していません。` : ""}`);
  }
  async function refresh() {
    if (!token()) return showLogin();
    rangeFromPeriod();
    if (!$("#filterForm").reportValidity()) return;
    if ($("#startDate").value > $("#endDate").value) return status("開始日は終了日以前を指定してください。", true);
    const serial = ++requestSerial;
    $("#refreshBtn").disabled = true;
    $("#dashboard").setAttribute("aria-busy", "true");
    status("データを集計しています…");
    const params = new URLSearchParams({ action:"analyticsReport", token:token(), start:$("#startDate").value, end:$("#endDate").value, granularity:$("#granularity").value, postId:$("#postFilter").value, tag:$("#tagFilter").value });
    try {
      const data = await responseJson(await fetch(`${apiUrl()}?${params}`, {cache:"no-store"}));
      if (serial !== requestSerial) return;
      if (data.report.articleMetricsVersion !== 2) {
        throw new Error("累計閲覧数・アップ日を取得するには、本番用Code.gsを更新してGASを再デプロイしてください。");
      }
      report = data.report;
      render();
    } catch (err) {
      if (serial !== requestSerial) return;
      if (["AUTH_REQUIRED","FORBIDDEN"].includes(err.code)) {
        sessionStorage.removeItem(tokenKey);
        clearReport();
        showLogin(err.code === "FORBIDDEN" ? "管理者アカウントでログインしてください。" : "セッションの有効期限が切れました。再ログインしてください。");
      } else status((report ? "更新に失敗しました。前回取得した結果を表示しています。 " : "") + err.message, true);
    } finally {
      if (serial === requestSerial) {
        $("#refreshBtn").disabled = false;
        $("#dashboard").removeAttribute("aria-busy");
      }
    }
  }
  function clearReport() {
    report = null;
    ["usersValue","viewsValue","readersValue","rateValue","memberCount","goalRate"].forEach(id => $("#"+id).textContent = "—");
    $("#goalProgress").value = 0;
    $("#articleBody").replaceChildren();
    $("#dailyBody").replaceChildren();
    $("#activityChart").replaceChildren();
    $("#rateChart").replaceChildren();
    $("#dailyCsv").disabled = true;
    $("#articleCsv").disabled = true;
  }
  function download(filename, rows) {
    const url = URL.createObjectURL(new Blob([U.csv(rows)], {type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $("#loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    $("#loginBtn").disabled = true;
    $("#loginMsg").textContent = "確認しています…";
    try {
      const data = await responseJson(await fetch(apiUrl(), {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({action:"login", email:$("#email").value.trim(), password:$("#password").value})}));
      if (data.user?.role !== "admin") throw new Error("管理者アカウントでログインしてください。");
      sessionStorage.setItem(tokenKey, data.token);
      $("#password").value = "";
      showDashboard();
      await refresh();
    } catch (err) { showLogin(err.message); }
    finally { $("#loginBtn").disabled = false; }
  });
  $("#logoutBtn").addEventListener("click", () => {
    requestSerial++;
    sessionStorage.removeItem(tokenKey);
    clearReport();
    $("#refreshBtn").disabled = false;
    $("#dashboard").removeAttribute("aria-busy");
    showLogin();
  });
  $("#refreshBtn").addEventListener("click", refresh);
  $("#filterForm").addEventListener("submit", event => { event.preventDefault(); refresh(); });
  $("#period").addEventListener("change", rangeFromPeriod);
  ["startDate","endDate"].forEach(id => $("#"+id).addEventListener("change", () => { $("#period").value = "custom"; }));
  $("#metricControls").addEventListener("change", renderCharts);
  document.querySelectorAll("[data-sort]").forEach(button => button.addEventListener("click", () => {
    sort = {key:button.dataset.sort, direction:sort.key === button.dataset.sort ? -sort.direction : button.dataset.sort === "title" ? 1 : -1};
    renderArticles();
  }));
  $("#dailyCsv").addEventListener("click", () => {
    if (!report) return;
    download(`news-daily-${report.start}-${report.end}.csv`, [["日付(JST)","利用人数","利用可能会員数","利用率(%)","記事閲覧回数","記事閲覧人数","登録会員数"], ...report.daily.map(r => [r.date,r.users,r.eligibleMembers,r.rate == null ? "" : r.rate.toFixed(2),r.views,r.readers,r.registeredMembers])]);
  });
  $("#articleCsv").addEventListener("click", () => {
    if (!report) return;
    download(`news-articles-${report.requestedStart || report.start}-${report.requestedEnd || report.end}.csv`, U.articleCsvRows(report, articleRows()));
  });
  rangeFromPeriod();
  if (token()) { showDashboard(); refresh(); }
  else showLogin();
})();
