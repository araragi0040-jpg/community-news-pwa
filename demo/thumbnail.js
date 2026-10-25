/* Thumbnail settings are independent of article images. No canvas/CORS dependency. */
(function(root) {
  "use strict";
  const editors = new Map();
  const clamp = (value, min, max, fallback) => {
    if (value === "" || value == null || !Number.isFinite(Number(value))) return fallback;
    return Math.round(Math.min(max, Math.max(min, Number(value))) * 10000) / 10000;
  };
  function normalize(value) {
    const src = value && typeof value === "object" ? value : {};
    return {
      url: String(src.url || "").trim().slice(0, 2048),
      fit: src.fit === "contain" ? "contain" : "cover",
      x: clamp(src.x, 0, 100, 50), y: clamp(src.y, 0, 100, 50),
      zoom: clamp(src.zoom, 1, 3, 1)
    };
  }
  function style(value) {
    const t = normalize(value);
    if (t.fit === "contain") return "object-fit:contain;object-position:50% 50%;transform:none";
    return `object-fit:cover;object-position:${t.x}% ${t.y}%;transform:scale(${t.zoom});transform-origin:${t.x}% ${t.y}%`;
  }
  function source(post) {
    return normalize(post.thumbnail).url || post.media?.images?.[0] || "";
  }
  function overflow(width, height, imageWidth, imageHeight, zoom) {
    if (!imageWidth || !imageHeight) return { x: 0, y: 0 };
    const scale = Math.max(width / imageWidth, height / imageHeight) * zoom;
    return { x: Math.max(0, imageWidth * scale - width), y: Math.max(0, imageHeight * scale - height) };
  }
  function createEditor(prefix, options) {
    const anchor = document.getElementById(prefix + "ImagePicker");
    if (!anchor || editors.has(prefix)) return;
    const panel = document.createElement("section");
    panel.className = "thumbnail-editor";
    panel.setAttribute("aria-labelledby", prefix + "ThumbnailHeading");
    panel.innerHTML = `
      <h3 id="${prefix}ThumbnailHeading">一覧用サムネイル</h3>
      <p class="thumbnail-editor__help">一覧の画像は16:9で統一されます。ここでの調整は、記事を開いたときのトップ画像には影響しません。</p>
      <label class="field"><span class="field__label">使用する画像</span>
        <select class="input" data-thumb="source" aria-label="サムネイルに使用する画像">
          <option value="top">トップ画像を使う</option><option value="custom">別の画像を使う</option>
        </select>
      </label>
      <div data-thumb="custom" hidden>
        <label class="field"><span class="field__label">サムネイル専用画像をアップロード</span>
          <input class="input" type="file" accept="image/*" data-thumb="file">
        </label>
        <label class="field"><span class="field__label">または画像URL</span>
          <input class="input" type="url" placeholder="https://..." data-thumb="url">
        </label>
      </div>
      <div class="thumbnail-editor__layout">
        <div>
          <div class="thumbnail-editor__caption">一覧での表示プレビュー</div>
          <div class="card thumbnail-editor__preview">
            <div class="card__media" data-thumb="frame">
              <img alt="サムネイルの表示範囲" draggable="false" data-thumb="image" hidden>
              <span class="thumbnail-editor__empty" data-thumb="empty">トップ画像を追加してください</span>
            </div>
            <div class="card__content"><div class="card__main"><div class="card__top"><span class="card__badge" data-thumb="badge">記事</span></div><div class="card__title" data-thumb="title">記事タイトル</div></div><div class="card__date">一覧での表示イメージ</div></div>
          </div>
        </div>
        <div class="thumbnail-editor__controls">
          <label class="field"><span class="field__label">表示方法</span>
            <select class="input" data-thumb="fit"><option value="cover">枠いっぱいに表示（切り抜き）</option><option value="contain">画像全体を表示（余白あり）</option></select>
          </label>
          <fieldset data-thumb="crop"><legend>表示範囲の調整</legend>
            <label class="field"><span class="field__label">ズーム <output data-thumb="zoomValue">1.00倍</output></span><input aria-label="サムネイルのズーム" data-thumb="zoom" type="range" min="1" max="3" step="0.01" value="1"></label>
            <label class="field"><span class="field__label">横位置</span><input aria-label="サムネイルの横位置" data-thumb="x" type="range" min="0" max="100" step="0.1" value="50"></label>
            <label class="field"><span class="field__label">縦位置</span><input aria-label="サムネイルの縦位置" data-thumb="y" type="range" min="0" max="100" step="0.1" value="50"></label>
          </fieldset>
          <p class="thumbnail-editor__help">画像をドラッグして位置を調整できます。チラシなどの文字を全部見せたいときは「画像全体を表示」を選んでください。</p>
          <button class="btn btn--ghost" type="button" data-thumb="reset">位置とズームをリセット</button>
        </div>
      </div>
      <p class="thumbnail-editor__message" data-thumb="message" role="status" aria-live="polite"></p>`;
    anchor.after(panel);
    const el = name => panel.querySelector(`[data-thumb="${name}"]`);
    let value = normalize(), useCustom = false, uploadRevision = 0, uploading = false, imageFailed = false;
    let currentSource = "";
    function update() {
      const url = useCustom ? value.url : options.topImage();
      if (url !== currentSource) {
        currentSource = url;
        imageFailed = false;
        el("image").hidden = true;
        if (url) el("image").src = url;
        else el("image").removeAttribute("src");
      }
      el("source").value = useCustom ? "custom" : "top";
      el("custom").hidden = !useCustom;
      el("url").value = value.url;
      el("fit").value = value.fit;
      for (const key of ["x", "y", "zoom"]) el(key).value = value[key];
      el("zoomValue").textContent = value.zoom.toFixed(2) + "倍";
      el("crop").disabled = value.fit === "contain" || !url;
      el("image").style.cssText = style(value);
      el("frame").classList.toggle("thumbnail-frame--contain", value.fit === "contain");
      el("frame").classList.toggle("thumbnail-frame--draggable", value.fit === "cover" && !!url && !imageFailed);
      el("empty").hidden = !!url && !imageFailed;
      el("empty").textContent = imageFailed ? "画像を読み込めません。URLを確認してください。" : (useCustom ? "専用画像を追加してください" : "トップ画像を追加してください");
      el("title").textContent = options.title() || "記事タイトル";
      el("badge").textContent = options.channel();
    }
    function changed() { update(); options.onChange(); }
    el("image").addEventListener("load", () => { imageFailed = false; el("image").hidden = false; update(); });
    el("image").addEventListener("error", () => { imageFailed = true; el("image").hidden = true; update(); });
    el("source").addEventListener("change", () => {
      useCustom = el("source").value === "custom";
      uploadRevision++; uploading = false; el("file").disabled = false;
      el("message").textContent = "";
      changed();
    });
    el("url").addEventListener("input", () => {
      uploadRevision++; uploading = false; el("file").disabled = false;
      value = normalize({ ...value, url: el("url").value, x: 50, y: 50, zoom: 1 });
      el("message").textContent = "";
      changed();
    });
    el("fit").addEventListener("change", () => { value.fit = el("fit").value; changed(); });
    for (const key of ["x", "y", "zoom"]) {
      el(key).addEventListener("input", () => { value = normalize({ ...value, [key]: el(key).value }); changed(); });
    }
    el("reset").addEventListener("click", () => { value = normalize({ ...value, x: 50, y: 50, zoom: 1 }); changed(); });
    el("file").addEventListener("change", async () => {
      const file = el("file").files?.[0];
      if (!file) return;
      const revision = ++uploadRevision;
      uploading = true; el("file").disabled = true;
      el("message").textContent = "サムネイル画像をアップロードしています…";
      try {
        const url = await options.upload(file);
        if (revision !== uploadRevision) return;
        value = normalize({ ...value, url, x: 50, y: 50, zoom: 1 });
        el("message").textContent = "画像を追加しました。記事を保存するとサムネイルも保存されます。";
        changed();
      } catch (err) {
        if (revision === uploadRevision) el("message").textContent = "アップロードに失敗しました。再度お試しください。 " + (err.message || "");
      } finally {
        if (revision === uploadRevision) { uploading = false; el("file").disabled = false; el("file").value = ""; }
      }
    });
    let drag = null;
    const frame = el("frame");
    frame.addEventListener("pointerdown", event => {
      if (event.button !== 0 || value.fit !== "cover" || !currentSource || imageFailed || !el("image").naturalWidth) return;
      const rect = frame.getBoundingClientRect();
      drag = { id: event.pointerId, px: event.clientX, py: event.clientY, x: value.x, y: value.y,
        overflow: overflow(rect.width, rect.height, el("image").naturalWidth, el("image").naturalHeight, value.zoom) };
      frame.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    frame.addEventListener("pointermove", event => {
      if (!drag || drag.id !== event.pointerId) return;
      value = normalize({ ...value,
        x: drag.overflow.x > 0.01 ? drag.x - (event.clientX - drag.px) / drag.overflow.x * 100 : value.x,
        y: drag.overflow.y > 0.01 ? drag.y - (event.clientY - drag.py) / drag.overflow.y * 100 : value.y });
      changed();
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) frame.addEventListener(type, () => { drag = null; });
    const editor = {
      get() { return normalize({ ...value, url: useCustom ? value.url : "" }); },
      validate() {
        if (uploading) throw new Error("サムネイル画像のアップロード完了を待ってから保存してください。");
        if (useCustom && !value.url) throw new Error("サムネイル専用画像を追加するか、「トップ画像を使う」を選んでください。");
        if (currentSource && imageFailed) throw new Error("サムネイル画像を読み込めません。画像URLを確認してください。");
      },
      set(config) {
        uploadRevision++; uploading = false; drag = null;
        value = normalize(config); useCustom = !!value.url;
        el("file").disabled = false; el("file").value = ""; el("message").textContent = "";
        update();
      },
      update
    };
    editors.set(prefix, editor);
    update();
  }
  const api = { normalize, style, source, overflow, createEditor,
    get: prefix => editors.get(prefix)?.get() || normalize(),
    set: (prefix, value) => editors.get(prefix)?.set(value),
    update: prefix => editors.get(prefix)?.update(),
    validate: prefix => editors.get(prefix)?.validate()
  };
  root.NewsThumbnail = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window === "object" ? window : globalThis);
