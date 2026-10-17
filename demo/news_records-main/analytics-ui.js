(function(root) {
  "use strict";
  const metrics = {
    users: { label: "利用人数", color: "#4f7655", unit: "人" },
    views: { label: "記事閲覧回数", color: "#ce7748", unit: "回" },
    readers: { label: "記事閲覧人数", color: "#5d86b0", unit: "人" },
    registeredMembers: { label: "登録会員数", color: "#93805b", unit: "人" },
    rate: { label: "日次利用率", color: "#4f7655", unit: "%" }
  };
  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function number(value, decimals = 0) {
    return value == null ? "—" : new Intl.NumberFormat("ja-JP", { maximumFractionDigits: decimals }).format(value);
  }
  function dayOffset(date, offset) {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  }
  function todayJST() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(new Date());
    return ["year","month","day"].map(k => parts.find(p => p.type === k).value).join("-");
  }
  function chart(series, keys, isRate = false) {
    if (!series.length) return '<div class="chart-empty">この期間に計測データはありません。</div>';
    if (!keys.length) return '<div class="chart-empty">表示したい指標を選択してください。</div>';
    const width = 1120, height = isRate ? 180 : 245;
    const left = 50, right = 32, top = 18, bottom = 34;
    const values = series.flatMap(row => keys.map(key => row[key])).filter(v => v != null && Number.isFinite(v));
    if (!values.length) return '<div class="chart-empty">会員数の記録がないため、利用率を算出できません。</div>';
    const rawMax = Math.max(isRate ? 100 : 1, ...values);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const step = [1,2,2.5,5,10].find(value => value >= rawMax / magnitude) || 10;
    const max = step * magnitude;
    const x = i => series.length === 1 ? (width + left - right) / 2 : left + i * (width - left - right) / (series.length - 1);
    const y = v => top + (1 - v / max) * (height - top - bottom);
    const fmt = n => Number(n.toFixed(2));
    let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(keys.map(k => metrics[k].label).join("・"))}の推移"><title>${escape(series[0].start)}〜${escape(series[series.length - 1].end)}の推移。日別データとCSVでも確認できます。</title>`;
    for (let i = 0; i <= 4; i++) {
      const value = max * i / 4;
      if (!isRate && value !== Math.floor(value)) continue;
      svg += `<line x1="${left}" x2="${width-right}" y1="${fmt(y(value))}" y2="${fmt(y(value))}" stroke="#eee9e2"/><text x="${left-12}" y="${fmt(y(value)+4)}" text-anchor="end">${number(value,1)}${isRate ? "%" : ""}</text>`;
    }
    const tickStep = Math.max(1, Math.ceil((series.length - 1) / 6));
    series.forEach((row, i) => {
      if (i % tickStep !== 0 && i !== series.length-1) return;
      // Keep the final two axis labels from overlapping.
      if (i !== series.length-1 && i > series.length-1-tickStep/2) return;
      svg += `<text x="${fmt(x(i))}" y="${height-10}" text-anchor="middle">${escape(row.date.replace(/-/g,"/"))}</text>`;
    });
    keys.forEach(key => {
      const metric = metrics[key];
      let path = "", pen = false;
      series.forEach((row,i) => {
        if (row[key] == null || !Number.isFinite(row[key])) { pen = false; return; }
        path += `${pen ? "L" : "M"}${fmt(x(i))},${fmt(y(row[key]))} `;
        pen = true;
      });
      svg += `<path d="${path}" fill="none" stroke="${metric.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
      series.forEach((row,i) => {
        if (row[key] == null || !Number.isFinite(row[key])) return;
        svg += `<circle cx="${fmt(x(i))}" cy="${fmt(y(row[key]))}" r="${series.length > 180 ? 1.6 : 3}" fill="${metric.color}" stroke="white" stroke-width="1"><title>${escape(row.start === row.end ? row.start : row.start+"〜"+row.end)}：${metric.label} ${number(row[key],isRate?1:0)}${metric.unit}</title></circle>`;
      });
    });
    return svg + "</svg>";
  }
  function csv(rows) {
    const cell = value => {
      let s = String(value ?? "");
      if (/^[\s\uFEFF]*[=+\-@]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    return "\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n");
  }
  const api = { metrics, escape, number, dayOffset, todayJST, chart, csv };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AnalyticsUI = api;
})(globalThis);
