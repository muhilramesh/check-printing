// ---- Category options (QuickBooks-style expense accounts) ----
const CATEGORIES = [
  "Advertising",
  "Auto and Truck Expenses",
  "Bank Service Charges",
  "Bill",
  "Business Licenses and Permits",
  "Computer and Internet Expenses",
  "Construction Supplies",
  "Depreciation Expense", 
  "Insurance Expense",
  "Interest Expense",
  "Marketing",
  "Meals and Entertainment",
  "Office Supplies",
  "Payroll Expenses",
  "Professional Fees",
  "Rent Expense",
  "Repairs and Maintenance",
  "Travel Expense",
  "Utilities",
];

const lineBody = document.getElementById("lineBody");
let rowCount = 0;

function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function buildCategoryOptions(selected) {
  const opts = ['<option value="">&nbsp;</option>']
    .concat(
      CATEGORIES.map(
        (c) =>
          `<option value="${c}"${c === selected ? " selected" : ""}>${c}</option>`
      )
    )
    .join("");
  return opts;
}

function addRow() {
  rowCount += 1;
  const tr = document.createElement("tr");
  tr.className = "line-row";
  tr.innerHTML = `
    <td class="col-grip"><span class="grip" title="Drag to reorder">&#9776;</span></td>
    <td class="row-num"></td>
    <td>
      <div class="select-wrap">
        <select class="cat-select">${buildCategoryOptions()}</select>
        <span class="caret">&#9662;</span>
      </div>
    </td>
    <td><input type="text" class="desc-input" /></td>
    <td><input type="text" class="amt-input" inputmode="decimal" placeholder="0.00" /></td>
    <td>
      <div class="row-actions">
        <button class="icon-btn copy-row" type="button" title="Copy">&#10697;</button>
        <button class="icon-btn del-row" type="button" title="Delete">&#128465;</button>
      </div>
    </td>`;
  lineBody.appendChild(tr);
  renumber();
}

function renumber() {
  [...lineBody.querySelectorAll(".line-row")].forEach((tr, i) => {
    tr.querySelector(".row-num").textContent = i + 1;
  });
}

function recalcTotal() {
  let total = 0;
  lineBody.querySelectorAll(".amt-input").forEach((inp) => {
    const v = parseFloat(inp.value.replace(/[^0-9.\-]/g, ""));
    if (!isNaN(v)) total += v;
  });
  document.getElementById("linesTotal").textContent = fmt(total);
  document.getElementById("amountDisplay").textContent = fmt(total);
}

// ---- Event delegation ----
lineBody.addEventListener("input", (e) => {
  if (e.target.classList.contains("amt-input")) recalcTotal();
});

lineBody.addEventListener("blur", (e) => {
  if (e.target.classList.contains("amt-input")) {
    const v = parseFloat(e.target.value.replace(/[^0-9.\-]/g, ""));
    e.target.value = isNaN(v) ? "" : v.toFixed(2);
    recalcTotal();
  }
}, true);

lineBody.addEventListener("click", (e) => {
  const delBtn = e.target.closest(".del-row");
  const copyBtn = e.target.closest(".copy-row");
  if (delBtn) {
    delBtn.closest("tr").remove();
    if (!lineBody.querySelector(".line-row")) addRow();
    renumber();
    recalcTotal();
  } else if (copyBtn) {
    const src = copyBtn.closest("tr");
    addRow();
    const dst = lineBody.lastElementChild;
    dst.querySelector(".cat-select").value = src.querySelector(".cat-select").value;
    dst.querySelector(".desc-input").value = src.querySelector(".desc-input").value;
    dst.querySelector(".amt-input").value = src.querySelector(".amt-input").value;
    recalcTotal();
  }
});

// ---- Controls ----
document.getElementById("addLines").addEventListener("click", () => {
  addRow();
  addRow();
});

document.getElementById("clearLines").addEventListener("click", () => {
  lineBody.innerHTML = "";
  rowCount = 0;
  addRow();
  addRow();
  recalcTotal();
});

// ---- Check no. / Print later sync ----
const printLater = document.getElementById("printLater");
const checkNo = document.getElementById("checkNo");
const checkNoTitle = document.getElementById("checkNoTitle");

function syncCheckNo() {
  if (printLater.checked) {
    checkNo.value = "To print";
    checkNo.dataset.manual = "";
    checkNoTitle.textContent = "To print";
  } else if (checkNo.value === "To print") {
    checkNo.value = "";
    checkNoTitle.textContent = "";
  }
}
printLater.addEventListener("change", syncCheckNo);
checkNo.addEventListener("input", () => {
  checkNoTitle.textContent = checkNo.value || "To print";
});

// ---- Gather the full form state into one check object ----
function gatherCheck() {
  const lines = [];
  lineBody.querySelectorAll(".line-row").forEach((tr) => {
    const category = tr.querySelector(".cat-select").value;
    const description = tr.querySelector(".desc-input").value;
    const amt = parseFloat(tr.querySelector(".amt-input").value.replace(/[^0-9.\-]/g, ""));
    if (category || description || !isNaN(amt)) {
      lines.push({ category, description, amount: isNaN(amt) ? 0 : amt });
    }
  });
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return {
    payee: document.getElementById("payee").value.trim(),
    mailingAddress: document.getElementById("mailingAddress").value,
    bankAccount: document.getElementById("bankAccount").value,
    checkNo: document.getElementById("checkNo").value.trim(),
    printLater: document.getElementById("printLater").checked,
    date: document.getElementById("paymentDate").value,
    memo: document.getElementById("memo").value,
    lines,
    total,
  };
}

// ---- Map a check object into the print-view payload ----
function toPrintPayload(check) {
  return {
    payee: check.payee,
    mailingAddress: check.mailingAddress,
    bankAccount: check.bankAccount,
    checkNo: (check.checkNo || "").replace(/[^0-9]/g, ""),
    date: check.date,
    memo: check.memo,
    total: check.total,
    lines: check.lines.map((l) => ({
      type: l.category || "",
      description: l.description || "",
      ref: l.description || "",
      amount: l.amount,
    })),
  };
}

document.getElementById("printCheck").addEventListener("click", (e) => {
  e.preventDefault();
  // Auto-save first so every printed check shows up in the register/reports.
  const saved = saveCheck();
  if (!saved) return; // validation failed (toast already shown)
  localStorage.setItem("checkPrintData", JSON.stringify(toPrintPayload(saved)));
  saveDraft(); // so "Back to check" restores the same form
  window.location.href = "print.html";
});

// ---- Draft (in-progress form) persistence ----
function saveDraft() {
  const draft = gatherCheck();
  draft.editId = currentEditId;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}
function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
let draftTimer;
function scheduleDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 300);
}
// autosave the draft as the user edits any form field
document.querySelector(".cw-body").addEventListener("input", scheduleDraft);
document.querySelector(".cw-body").addEventListener("change", scheduleDraft);

// ============================================================
//  Save functionality
// ============================================================
const STORAGE_KEY = "savedChecks";
const DRAFT_KEY = "checkDraft";
let currentEditId = null;

function loadSavedChecks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function writeSavedChecks(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ---- Toast notification ----
let toastTimer;
function toast(msg, isError) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.toggle("error", !!isError);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// ---- Validation ----
function clearErrors() {
  document.querySelectorAll(".field-error").forEach((el) =>
    el.classList.remove("field-error")
  );
}

function validateCheck(check) {
  clearErrors();
  if (!check.payee) {
    document.getElementById("payee").classList.add("field-error");
    return "Add a payee before saving.";
  }
  if (!(check.total > 0)) {
    lineBody.querySelectorAll(".amt-input").forEach((el) =>
      el.classList.add("field-error")
    );
    return "Enter an amount before saving.";
  }
  return null;
}

// ---- Save (core) ----
function saveCheck() {
  const check = gatherCheck();
  const error = validateCheck(check);
  if (error) {
    toast(error, true);
    return null;
  }
  const list = loadSavedChecks();
  if (currentEditId) {
    const i = list.findIndex((c) => c.id === currentEditId);
    if (i !== -1) {
      list[i] = { ...list[i], ...check, updatedAt: Date.now() };
    } else {
      check.id = currentEditId;
      check.savedAt = Date.now();
      list.push(check);
    }
  } else {
    check.id = "chk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    check.savedAt = Date.now();
    list.push(check);
    currentEditId = check.id;
  }
  writeSavedChecks(list);
  return check;
}

// ---- Reset the form to a fresh blank check ----
function resetForm() {
  currentEditId = null;
  clearErrors();
  document.getElementById("payee").value = "";
  document.getElementById("mailingAddress").value = "";
  document.getElementById("memo").value = "";
  document.getElementById("printLater").checked = false;
  document.getElementById("checkNo").value = "";
  checkNoTitle.textContent = "To print";
  document.getElementById("paymentDate").value = new Date().toISOString().slice(0, 10);
  lineBody.innerHTML = "";
  rowCount = 0;
  addRow();
  addRow();
  recalcTotal();
  clearDraft();
}

// ---- Button wiring ----
document.getElementById("saveBtn").addEventListener("click", () => {
  if (saveCheck()) toast("Check saved");
});

document.getElementById("saveCloseBtn").addEventListener("click", () => {
  if (saveCheck()) {
    toast("Check saved");
    resetForm();
  }
});

document.getElementById("saveNewBtn").addEventListener("click", () => {
  document.getElementById("saveMenu").hidden = true;
  if (saveCheck()) {
    toast("Check saved");
    resetForm();
  }
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  resetForm();
  toast("Cleared");
});

// ---- Save split-button menu ----
const saveMenu = document.getElementById("saveMenu");
document.getElementById("saveMenuBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  saveMenu.hidden = !saveMenu.hidden;
});
document.addEventListener("click", () => (saveMenu.hidden = true));

// ---- Populate the form from a saved check or draft ----
function populateForm(check, editId) {
  currentEditId = editId !== undefined ? editId : (check.id || null);
  document.getElementById("payee").value = check.payee || "";
  document.getElementById("mailingAddress").value = check.mailingAddress || "";
  if (check.bankAccount) document.getElementById("bankAccount").value = check.bankAccount;
  document.getElementById("printLater").checked = !!check.printLater;
  checkNo.value = check.checkNo || (check.printLater ? "To print" : "");
  checkNoTitle.textContent = checkNo.value || "To print";
  if (check.date) document.getElementById("paymentDate").value = check.date;
  document.getElementById("memo").value = check.memo || "";

  lineBody.innerHTML = "";
  rowCount = 0;
  const lines = check.lines && check.lines.length ? check.lines : [null, null];
  lines.forEach((ln) => {
    addRow();
    if (ln) {
      const tr = lineBody.lastElementChild;
      tr.querySelector(".cat-select").value = ln.category || "";
      tr.querySelector(".desc-input").value = ln.description || "";
      tr.querySelector(".amt-input").value =
        ln.amount != null ? Number(ln.amount).toFixed(2) : "";
    }
  });
  recalcTotal();
}

// ---- Init ----
document.getElementById("paymentDate").value = new Date().toISOString().slice(0, 10);

// "?new=1" — explicit New check: discard any draft/edit state and start blank
if (new URLSearchParams(location.search).get("new") === "1") {
  localStorage.removeItem("editCheckId");
  clearDraft();
  history.replaceState(null, "", "index.html"); // clean the URL
}

const editId = localStorage.getItem("editCheckId");
let draft = null;
try {
  draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
} catch (e) { /* ignore */ }

if (editId) {
  // Opening a saved check from the register — clear any stale draft
  localStorage.removeItem("editCheckId");
  clearDraft();
  const saved = loadSavedChecks().find((c) => c.id === editId);
  if (saved) {
    populateForm(saved, saved.id);
  } else {
    addRow();
    addRow();
  }
} else if (draft) {
  // Returning to an in-progress check (e.g. from Print check)
  populateForm(draft, draft.editId || null);
} else {
  addRow();
  addRow();
}
recalcTotal();
