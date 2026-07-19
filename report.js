// ============================================================
//  Check register report
// ============================================================
const STORAGE_KEY = "savedChecks";

function loadSavedChecks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function money(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso || "";
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// ---- Period handling ----
function getRange() {
  const period = document.getElementById("periodSelect").value;
  const year = new Date().getFullYear();
  if (period === "thisYear") return { from: `${year}-01-01`, to: `${year}-12-31`, label: `January 1 – December 31, ${year}` };
  if (period === "lastYear") return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31`, label: `January 1 – December 31, ${year - 1}` };
  if (period === "custom") {
    const from = document.getElementById("fromDate").value || "0000-01-01";
    const to = document.getElementById("toDate").value || "9999-12-31";
    return { from, to, label: `${fmtDate(from)} – ${fmtDate(to)}` };
  }
  return { from: "0000-01-01", to: "9999-12-31", label: "All time" };
}

// ---- Table rendering ----
function linesCol(check, field) {
  const vals = (check.lines || [])
    .map((l) => (l[field] || "").trim())
    .filter(Boolean);
  return vals.length ? vals.map(escapeHtml).join("<br>") : "&mdash;";
}

function tableHtml(checks, withSubtotal) {
  const rows = checks
    .map((c) => `
      <tr>
        <td>${fmtDate(c.date)}</td>
        <td>${c.checkNo && c.checkNo !== "To print" ? escapeHtml(c.checkNo) : "To print"}</td>
        <td>${escapeHtml(c.payee) || "&mdash;"}</td>
        <td>${linesCol(c, "category")}</td>
        <td>${linesCol(c, "description")}</td>
        <td>${escapeHtml(c.memo) || "&mdash;"}</td>
        <td class="num">${money(c.total)}</td>
      </tr>`)
    .join("");
  const subtotal = withSubtotal
    ? `<tr class="subtotal">
        <td colspan="5"></td>
        <td>Subtotal (${checks.length})</td>
        <td class="num">${money(checks.reduce((s, c) => s + (c.total || 0), 0))}</td>
      </tr>`
    : "";
  return `
    <table class="report-table">
      <thead>
        <tr>
          <th style="width:80px">Date</th>
          <th style="width:80px">Check no.</th>
          <th>Payee</th>
          <th>Category</th>
          <th>Description</th>
          <th>Memo</th>
          <th class="num" style="width:100px">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}${subtotal}</tbody>
    </table>`;
}

function render() {
  const range = getRange();
  const group = document.getElementById("groupSelect").value;

  const checks = loadSavedChecks()
    .filter((c) => c.date >= range.from && c.date <= range.to)
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") ||
                    (a.checkNo || "").localeCompare(b.checkNo || "", undefined, { numeric: true }));

  document.getElementById("periodLabel").textContent = range.label;
  document.getElementById("generatedDate").textContent =
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const body = document.getElementById("reportBody");
  const summary = document.getElementById("reportSummary");

  if (!checks.length) {
    body.innerHTML = `<div class="empty-state"><h2>No checks in this period</h2>
      <p>Checks you save will show up in reports.</p></div>`;
    summary.innerHTML = "";
    return;
  }

  if (group === "none") {
    body.innerHTML = tableHtml(checks, false);
  } else {
    const buckets = new Map();
    checks.forEach((c) => {
      let key;
      if (group === "payee") {
        key = c.payee || "(no payee)";
      } else {
        const m = /^(\d{4})-(\d{2})/.exec(c.date || "");
        key = m ? `${MONTHS[+m[2] - 1]} ${m[1]}` : "(no date)";
      }
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(c);
    });
    body.innerHTML = [...buckets.entries()]
      .map(([title, list]) =>
        `<div class="report-group-title">${escapeHtml(title)}</div>` +
        tableHtml(list, true))
      .join("");
  }

  const total = checks.reduce((s, c) => s + (c.total || 0), 0);
  summary.innerHTML = `
    <span>${checks.length} check${checks.length === 1 ? "" : "s"}</span>
    <span class="grand">Total ${money(total)}</span>`;
}

// ---- Wiring ----
document.getElementById("periodSelect").addEventListener("change", () => {
  const custom = document.getElementById("periodSelect").value === "custom";
  document.getElementById("customRange").hidden = !custom;
  document.getElementById("customRange2").hidden = !custom;
  render();
});
document.getElementById("fromDate").addEventListener("change", render);
document.getElementById("toDate").addEventListener("change", render);
document.getElementById("groupSelect").addEventListener("change", render);
document.getElementById("printReportBtn").addEventListener("click", () => window.print());

// default custom range = this year
const yr = new Date().getFullYear();
document.getElementById("fromDate").value = `${yr}-01-01`;
document.getElementById("toDate").value = `${yr}-12-31`;

render();
