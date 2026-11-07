/* Local QR decoding. Camera frames are never uploaded or stored. */
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  let stream = null, timer = null, sequence = 0, resultHandler = null;
  const frame = document.createElement("canvas");
  function status(message) {
    const text = el("ecScannerStatus");
    if (text.textContent !== message) text.textContent = message;
  }
  function releaseCamera() {
    sequence++;
    if (timer !== null) { clearTimeout(timer); timer = null; }
    if (stream) {
      stream.getTracks().forEach(track => { track.onended = null; track.stop(); });
      stream = null;
    }
    const video = el("ecScannerVideo");
    video.pause(); video.srcObject = null; video.hidden = true;
    frame.width = frame.height = 0;
  }
  function close() {
    releaseCamera();
    resultHandler = null;
    if (el("ecScannerDialog").open) el("ecScannerDialog").close();
  }
  function fail(message) {
    releaseCamera();
    status(message);
    el("ecScannerRetry").hidden = false;
  }
  function tokenFromQr(text) {
    try {
      const url = new URL(text);
      const base = new URL(".", window.location.href);
      if (!["https:", "http:"].includes(url.protocol) || url.origin !== base.origin || url.username || url.password || url.search ||
          ![base.pathname, base.pathname + "index.html"].includes(url.pathname)) return "";
      const match = url.hash.match(/^#collection-claim=([^&]+)$/);
      if (!match) return "";
      const token = decodeURIComponent(match[1]);
      return token.length <= 200 && /^[a-f0-9-]+\.[A-Za-z0-9_-]+$/i.test(token) ? token : "";
    } catch (_) { return ""; }
  }
  function readFrame(id) {
    if (id !== sequence || !stream || !el("ecScannerDialog").open) return;
    const video = el("ecScannerVideo");
    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      try {
        const ratio = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
        frame.width = Math.round(video.videoWidth * ratio); frame.height = Math.round(video.videoHeight * ratio);
        const context = frame.getContext("2d", { willReadFrequently: true });
        if (!context) { fail("カメラの映像を読み込めません。ブラウザを開き直してお試しください。"); return; }
        context.drawImage(video, 0, 0, frame.width, frame.height);
        const pixels = context.getImageData(0, 0, frame.width, frame.height);
        const code = window.jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "dontInvert" });
        if (code) {
          const token = tokenFromQr(code.data);
          if (token) {
            const handler = resultHandler;
            close();
            handler?.(token);
            return;
          }
          status("このニュースサイトのイベントQRコードをかざしてください。");
        }
      } catch (_) { fail("映像を読み込めませんでした。もう一度カメラを起動してください。"); return; }
    }
    timer = setTimeout(() => readFrame(id), 140);
  }
  async function startCamera() {
    releaseCamera();
    const id = sequence;
    el("ecScannerRetry").hidden = true;
    if (window.isSecureContext === false || !navigator.mediaDevices?.getUserMedia) {
      fail("このブラウザではカメラを起動できません。HTTPSのニュースサイトをSafariまたはChromeで開いてください。"); return;
    }
    if (typeof window.jsQR !== "function") { fail("読み取り機能を読み込めません。アプリを開き直してお試しください。"); return; }
    status("カメラを起動しています。アクセス許可が表示されたら許可してください。");
    try {
      const incoming = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (id !== sequence || !el("ecScannerDialog").open || document.hidden) { incoming.getTracks().forEach(track => track.stop()); return; }
      stream = incoming;
      stream.getTracks().forEach(track => { track.onended = () => fail("カメラとの接続が切れました。もう一度お試しください。"); });
      const video = el("ecScannerVideo");
      video.srcObject = stream; video.muted = true; video.hidden = false;
      await video.play();
      if (id !== sequence || !stream) return;
      status("会場のQRコードを枠の中央にかざしてください。読み取るとカードを獲得します。");
      readFrame(id);
    } catch (err) {
      if (id !== sequence) return;
      const messages = {
        NotAllowedError: "カメラへのアクセスが許可されていません。ブラウザのサイト設定でカメラを許可し、もう一度お試しください。",
        NotFoundError: "利用できるカメラが見つかりません。カメラのあるスマートフォンでお試しください。",
        NotReadableError: "カメラを使用できません。他のカメラアプリを閉じて、もう一度お試しください。"
      };
      fail(messages[err.name] || "カメラを起動できませんでした。もう一度お試しください。");
    }
  }
  function open(handler) {
    if (el("ecScannerDialog").open) return;
    resultHandler = handler;
    el("ecScannerDialog").showModal();
    startCamera();
  }
  el("ecScannerClose").addEventListener("click", close);
  el("ecScannerRetry").addEventListener("click", startCamera);
  el("ecScannerDialog").addEventListener("cancel", event => { event.preventDefault(); close(); });
  el("ecScannerDialog").addEventListener("close", () => { if (!el("ecScannerDialog").open) { releaseCamera(); resultHandler = null; } });
  document.addEventListener("visibilitychange", () => { if (document.hidden) close(); });
  window.addEventListener("pagehide", close);
  window.CollectionScanner = { open, close };
})();
