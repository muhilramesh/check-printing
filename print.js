// ============================================================
//  Check print overlay  (pre-printed stock — prints only data)
// ============================================================

// ---- Static info that lives on the PRE-PRINTED stock ----
//  (shown faint on screen as an alignment guide; NOT printed)
const COMPANY = {
  name: "Viking CRC Inc",
  dba: "dba CRC Concrete Raising and Repair",
  addr1: "470 Kellar Drive",
  addr2: "Park City, IL 60085",
};
const BANK = {
  name: "Huntington National Bank",
  addr1: "7 Easton Oval",
  addr2: "Columbus, OH 43219",
  fraction: "25-2/440",
  routing: "044000024",
  account: "0106012435",
};

// ---- Field positions on the page, in INCHES (top-left origin) ----
//  Tweak here, or use the on-screen nudge arrows to calibrate.
const POS = {
  // --- Check face (top panel) ---
  checkNo:     { left: 7.80, top: 0.32, w: 0.65, align: "right", size: 11, bold: true },
  checkDate:   { left: 6.55, top: 0.85, w: 1.6,  align: "center", size: 10 },
  payee:       { left: 1.45, top: 1.32, w: 5.4,  align: "left",  size: 11 },
  amountBox:   { left: 6.80, top: 1.40, w: 1.35, align: "right", size: 11, bold: true },
  amountWords: { left: 0.55, top: 1.63, w: 7.2,  align: "left",  size: 10 },
  mailingAddr: { left: 1.45, top: 2.12, w: 3.5,  align: "left",  size: 10 },
  memo:        { left: 0.80, top: 2.90, w: 3.6,  align: "left",  size: 9 },

  // --- Stub 1 (middle panel) ---
  stub1Addr:   { left: 0.90, top: 3.88, w: 3.2,  align: "left",  size: 10 },
  stub1Memo:   { left: 3.35, top: 4.02, w: 2.4,  align: "left",  size: 10 },
  stub1Date:   { left: 5.90, top: 3.88, w: 1.3,  align: "left",  size: 10 },
  stub1Amount: { left: 6.85, top: 4.08, w: 1.5,  align: "right", size: 10 },
  stub1Bank:   { left: 0.20, top: 6.45, w: 2.0,  align: "left",  size: 10 },
  stub1Memo2:  { left: 2.30, top: 6.45, w: 2.6,  align: "left",  size: 10 },
  stub1Amount2:{ left: 6.85, top: 6.45, w: 1.5,  align: "right", size: 10 },

  // --- Stub 2 (bottom panel) ---
  stub2Addr:   { left: 0.90, top: 7.38, w: 3.2,  align: "left",  size: 10 },
  stub2Memo:   { left: 3.35, top: 7.52, w: 2.4,  align: "left",  size: 10 },
  stub2Date:   { left: 5.90, top: 7.38, w: 1.3,  align: "left",  size: 10 },
  stub2Amount: { left: 6.85, top: 7.58, w: 1.5,  align: "right", size: 10 },
  stub2Bank:   { left: 0.20, top: 9.95, w: 2.0,  align: "left",  size: 10 },
  stub2Memo2:  { left: 2.30, top: 9.95, w: 2.6,  align: "left",  size: 10 },
  stub2Amount2:{ left: 6.85, top: 9.95, w: 1.5,  align: "right", size: 10 },
};

// ---- Helpers ----
function money(n) {
  return Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function numberToWords(amount) {
  const dollars = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - dollars) * 100);
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
    "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
    "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty",
    "Seventy", "Eighty", "Ninety"];

  function under1000(n) {
    let s = "";
    if (n >= 100) {
      s += ones[Math.floor(n / 100)] + " Hundred";
      n %= 100;
      if (n) s += " ";
    }
    if (n >= 20) {
      s += tens[Math.floor(n / 10)];
      if (n % 10) s += "-" + ones[n % 10];
    } else if (n > 0) {
      s += ones[n];
    }
    return s;
  }

  const scales = ["", " Thousand", " Million", " Billion"];
  let words = "";
  if (dollars === 0) {
    words = "Zero";
  } else {
    let n = dollars;
    const groups = [];
    while (n > 0) {
      groups.push(n % 1000);
      n = Math.floor(n / 1000);
    }
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i]) {
        if (words) words += " ";
        words += under1000(groups[i]) + scales[i];
      }
    }
  }
  const centsStr = String(cents).padStart(2, "0");
  let line = `${words} and ${centsStr}/100`;
  // pad with asterisks to discourage alteration
  const fill = Math.max(0, 70 - line.length);
  if (fill) line += " " + "*".repeat(fill);
  return line;
}

// ---- Load data (from the form via localStorage, else sample) ----
function loadData() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem("checkPrintData"));
  } catch (e) { /* ignore */ }
  if (!data) {
    // Sample matching the photo, so the page is viewable on its own
    data = {
      payee: "29834 10th Ave SW",
      mailingAddress: "29834 10th Ave SW\nFederal Way\nWA 98023",
      bankAccount: "Huntington Bank",
      checkNo: "1620",
      date: "2020-08-18",
      memo: "8/2/2020 - 8/15/2020",
      total: 1080.0,
      lines: [],
    };
  }
  return data;
}

function fmtDate(iso) {
  if (!iso) return "";
  // accept yyyy-mm-dd or already-formatted
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

// ---- Render ----
function el(cls, pos, text) {
  const d = document.createElement("div");
  d.className = cls;
  d.style.left = pos.left + "in";
  d.style.top = pos.top + "in";
  d.style.width = pos.w + "in";
  d.style.textAlign = pos.align || "left";
  if (pos.size) d.style.fontSize = pos.size + "pt";
  if (pos.bold) d.style.fontWeight = "700";
  d.textContent = text;
  return d;
}

function renderOverlay(data) {
  const layer = document.getElementById("overlay");
  layer.innerHTML = "";
  const dateStr = fmtDate(data.date);
  const amt = money(data.total);

  const bank = data.bankAccount || "Huntington Bank";

  // check face — note: the check number is NOT printed (it's pre-printed
  // on the stock); it's only stored with the check for the reports/register
  layer.appendChild(el("ov", POS.checkDate, dateStr));
  layer.appendChild(el("ov multiline", POS.payee, data.payee || ""));
  layer.appendChild(el("ov", POS.amountBox, "**" + amt));
  layer.appendChild(el("ov", POS.amountWords, numberToWords(data.total)));
  if (data.mailingAddress) {
    layer.appendChild(el("ov multiline", POS.mailingAddr, data.mailingAddress));
  }
  if (data.memo) layer.appendChild(el("ov", POS.memo, data.memo));

  // stubs — address under company name, memo + date + amount,
  // then bank / memo / amount along the bottom of each stub
  [
    { addr: POS.stub1Addr, memo: POS.stub1Memo, date: POS.stub1Date, amount: POS.stub1Amount,
      bank: POS.stub1Bank, memo2: POS.stub1Memo2, amount2: POS.stub1Amount2 },
    { addr: POS.stub2Addr, memo: POS.stub2Memo, date: POS.stub2Date, amount: POS.stub2Amount,
      bank: POS.stub2Bank, memo2: POS.stub2Memo2, amount2: POS.stub2Amount2 },
  ].forEach((s) => {
    if (data.payee) layer.appendChild(el("ov multiline", s.addr, data.payee));
    if (data.memo) layer.appendChild(el("ov", s.memo, data.memo));
    layer.appendChild(el("ov", s.date, dateStr));
    layer.appendChild(el("ov", s.amount, amt));
    layer.appendChild(el("ov", s.bank, bank));
    if (data.memo) layer.appendChild(el("ov", s.memo2, data.memo));
    layer.appendChild(el("ov", s.amount2, amt));
  });
}

function renderGuide(data) {
  const g = document.getElementById("guide");
  g.innerHTML = "";
  function add(left, top, w, html, extra) {
    const d = document.createElement("div");
    d.className = "gd " + (extra || "");
    d.style.left = left + "in";
    d.style.top = top + "in";
    if (w) d.style.width = w + "in";
    d.innerHTML = html;
    g.appendChild(d);
  }
  // panel separators
  [3.5, 7.0].forEach((y) =>
    add(0, y, 8.5, "", "sep")
  );
  // company + bank (check face)
  add(1.45, 0.45, 3,
    `<b>${COMPANY.name}</b><br>${COMPANY.dba}<br>${COMPANY.addr1}<br>${COMPANY.addr2}`);
  add(5.3, 0.45, 2.3,
    `<b>${BANK.name}</b><br>${BANK.addr1}<br>${BANK.addr2}<br>${BANK.fraction}`);
  // labels
  add(0.15, 1.42, 2, "PAY TO THE<br>ORDER OF");
  add(6.85, 1.5, 0.2, "$");
  add(7.55, 1.95, 0.9, "DOLLARS", "rt");
  add(0.15, 3.00, 0.6, "MEMO");
  add(6.4, 2.95, 1.6, "AUTHORIZED SIGNATURE", "rt small");
  // MICR  —  ⑈checkNo⑈  ⑆routing⑆  account⑈   (on-us = U+2448, transit = U+2446)
  const micrCheckNo = (data.checkNo || "").replace(/\D/g, "").padStart(6, "0");
  add(1.2, 3.15, 6, `&#x2448;${micrCheckNo}&#x2448; ` +
    `&#x2446;${BANK.routing}&#x2446; ${BANK.account}&#x2448;`, "micr");
  // stub headers
  add(0.20, 3.70, 3, `<b>${COMPANY.name}</b>`);
  add(7.6, 3.70, 0.9, data.checkNo || "", "rt");
  add(0.20, 7.20, 3, `<i>${COMPANY.name}</i>`);
  add(7.6, 7.20, 0.9, data.checkNo || "", "rt");
}

// ---- Calibration (global nudge, persisted) ----
function getOffset() {
  try {
    return JSON.parse(localStorage.getItem("printOffset")) || { x: 0, y: 0 };
  } catch (e) {
    return { x: 0, y: 0 };
  }
}
function applyOffset() {
  const o = getOffset();
  document.getElementById("overlay").style.transform =
    `translate(${o.x}in, ${o.y}in)`;
  document.getElementById("offsetLabel").textContent =
    `X ${o.x.toFixed(2)}″  Y ${o.y.toFixed(2)}″`;
}
function nudge(dx, dy) {
  const o = getOffset();
  o.x = +(o.x + dx).toFixed(2);
  o.y = +(o.y + dy).toFixed(2);
  localStorage.setItem("printOffset", JSON.stringify(o));
  applyOffset();
}

// ---- Init ----
const DATA = loadData();
renderOverlay(DATA);
renderGuide(DATA);
applyOffset();

document.getElementById("nLeft").onclick = () => nudge(-0.05, 0);
document.getElementById("nRight").onclick = () => nudge(0.05, 0);
document.getElementById("nUp").onclick = () => nudge(0, -0.05);
document.getElementById("nDown").onclick = () => nudge(0, 0.05);
document.getElementById("nReset").onclick = () => {
  localStorage.setItem("printOffset", JSON.stringify({ x: 0, y: 0 }));
  applyOffset();
};
document.getElementById("toggleGuide").onclick = (e) => {
  document.body.classList.toggle("hide-guide");
  e.target.textContent = document.body.classList.contains("hide-guide")
    ? "Show guide" : "Hide guide";
};
document.getElementById("printBtn").onclick = () => window.print();

// "New check" — discard the in-progress draft and start fresh
const newCheckLink = document.getElementById("newCheckLink");
if (newCheckLink) {
  newCheckLink.addEventListener("click", () => {
    localStorage.removeItem("checkDraft");
    localStorage.removeItem("editCheckId");
  });
}
