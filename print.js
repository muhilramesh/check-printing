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
  checkNo:     { left: 7.55, top: 0.42, w: 0.9,  align: "right", size: 11, bold: true },
  checkDate:   { left: 6.55, top: 1.28, w: 1.5,  align: "left",  size: 10 },
  payee:       { left: 1.45, top: 1.52, w: 5.4,  align: "left",  size: 11 },
  amountBox:   { left: 7.00, top: 1.50, w: 1.35, align: "right", size: 11, bold: true },
  mailingAddr: { left: 0.45, top: 2.05, w: 3.5,  align: "left",  size: 9 },
  memo:        { left: 0.80, top: 2.86, w: 3.6,  align: "left",  size: 9 },
  checkAmount: { left: 7.00, top: 2.74, w: 1.35, align: "right", size: 10 },

  detailTop: 2.50,   // first detail data row (check face)
  detailRowH: 0.17,

  // --- Stub 1 (middle panel) ---
  stub1Payee:  { left: 0.20, top: 5.55, w: 5.0,  align: "left",  size: 11 },
  stub1Amount: { left: 6.85, top: 5.55, w: 1.5,  align: "right", size: 11 },
  stub1Memo:   { left: 1.45, top: 6.32, w: 4.0,  align: "left",  size: 10 },

  // --- Stub 2 (bottom panel) ---
  stub2Payee:  { left: 0.20, top: 9.05, w: 5.0,  align: "left",  size: 11 },
  stub2Amount: { left: 6.85, top: 9.05, w: 1.5,  align: "right", size: 11 },
  stub2Memo:   { left: 1.45, top: 9.82, w: 4.0,  align: "left",  size: 10 },
};

// Detail-table column x positions (check face), in inches
const COLS = {
  date:     { left: 0.30, w: 0.90, align: "left" },
  type:     { left: 1.22, w: 0.62, align: "left" },
  ref:      { left: 1.88, w: 2.25, align: "left" },
  origAmt:  { left: 4.05, w: 1.00, align: "right" },
  balDue:   { left: 5.10, w: 1.00, align: "right" },
  discount: { left: 6.10, w: 0.85, align: "right" },
  payment:  { left: 7.00, w: 0.95, align: "right" },
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
      payee: "Huntington Bank",
      mailingAddress: "Olson Oil",
      checkNo: "1566",
      date: "2020-06-16",
      memo: "",
      total: 2219.28,
      lines: [
        { type: "Bill", ref: "", date: "6/16/2020", amount: 2219.28 },
      ],
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

  // check face
  layer.appendChild(el("ov", POS.checkNo, data.checkNo || ""));
  layer.appendChild(el("ov", POS.checkDate, dateStr));
  layer.appendChild(el("ov", POS.payee, data.payee || ""));
  layer.appendChild(el("ov", POS.amountBox, amt));
  if (data.mailingAddress) {
    const addr = el("ov multiline", POS.mailingAddr, data.mailingAddress);
    layer.appendChild(addr);
  }
  if (data.memo) layer.appendChild(el("ov", POS.memo, data.memo));
  layer.appendChild(el("ov", POS.checkAmount, amt));

  // detail rows (check face) from line items
  (data.lines || []).forEach((ln, i) => {
    const top = POS.detailTop + i * POS.detailRowH;
    const rowCols = {
      date: ln.date || dateStr,
      type: ln.type || "",
      ref: ln.ref || ln.description || "",
      origAmt: money(ln.amount),
      balDue: money(ln.amount),
      discount: "",
      payment: money(ln.amount),
    };
    Object.keys(COLS).forEach((key) => {
      const c = COLS[key];
      layer.appendChild(
        el("ov small", { left: c.left, top, w: c.w, align: c.align, size: 9 }, rowCols[key])
      );
    });
  });

  // stubs
  layer.appendChild(el("ov", POS.stub1Payee, data.payee || ""));
  layer.appendChild(el("ov", POS.stub1Amount, amt));
  if (data.memo) layer.appendChild(el("ov", POS.stub1Memo, data.memo));

  layer.appendChild(el("ov", POS.stub2Payee, data.payee || ""));
  layer.appendChild(el("ov", POS.stub2Amount, amt));
  if (data.memo) layer.appendChild(el("ov", POS.stub2Memo, data.memo));
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
  add(0.15, 2.86, 0.6, "MEMO");
  add(6.4, 2.95, 1.6, "AUTHORIZED SIGNATURE", "rt small");
  // detail header
  ["Date", "Type", "Reference", "Original Amt.", "Balance Due", "Discount", "Payment"]
    .forEach((h, i) => {
      const c = Object.values(COLS)[i];
      add(c.left, 2.30, c.w, h, "small " + (c.align === "right" ? "rt" : ""));
    });
  // MICR  —  ⑈checkNo⑈  ⑆routing⑆  account⑈   (on-us = U+2448, transit = U+2446)
  const micrCheckNo = (data.checkNo || "").replace(/\D/g, "").padStart(6, "0");
  add(1.2, 3.15, 6, `&#x2448;${micrCheckNo}&#x2448; ` +
    `&#x2446;${BANK.routing}&#x2446; ${BANK.account}&#x2448;`, "micr");
  // stub headers
  add(0.20, 3.70, 3, `<b>${COMPANY.name}</b>`);
  add(7.6, 3.70, 0.9, data.checkNo || "", "rt");
  add(0.85, 6.32, 1, "Memo:");
  add(0.20, 7.20, 3, `<i>${COMPANY.name}</i>`);
  add(7.6, 7.20, 0.9, data.checkNo || "", "rt");
  add(0.85, 9.82, 1, "Memo:");
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
