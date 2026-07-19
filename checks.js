// ============================================================
//  Saved checks register
// ============================================================
const STORAGE_KEY = "savedChecks";

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

let toastTimer;
function toast(msg, isError) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.toggle("error", !!isError);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

function toPrintPayload(check) {
  return {
    payee: check.payee,
    mailingAddress: check.mailingAddress,
    bankAccount: check.bankAccount,
    checkNo: (check.checkNo || "").replace(/[^0-9]/g, ""),
    date: check.date,
    memo: check.memo,
    total: check.total,
    lines: (check.lines || []).map((l) => ({
      type: l.category || "",
      description: l.description || "",
      ref: l.description || "",
      amount: l.amount,
    })),
  };
}

// ---- Render ----
function render() {
  const list = loadSavedChecks().sort(
    (a, b) => (b.savedAt || 0) - (a.savedAt || 0)
  );
  const wrap = document.getElementById("listWrap");
  const count = document.getElementById("count");

  if (!list.length) {
    count.textContent = "";
    wrap.innerHTML = `
      <div class="empty-state">
        <h2>No saved checks yet</h2>
        <p>Checks you save will show up here.</p>
        <p><a class="btn primary" href="index.html">+ New check</a></p>
      </div>`;
    return;
  }

  count.textContent = `${list.length} check${list.length === 1 ? "" : "s"}`;
  const rows = list
    .map((c) => {
      const memo = c.memo ? escapeHtml(c.memo) : "&mdash;";
      const checkNo = c.checkNo && c.checkNo !== "To print"
        ? escapeHtml(c.checkNo)
        : '<span class="muted-cell">To print</span>';
      return `
      <tr data-id="${c.id}">
        <td>${fmtDate(c.date)}</td>
        <td>${checkNo}</td>
        <td class="payee-cell">${escapeHtml(c.payee) || "&mdash;"}</td>
        <td class="muted-cell">${memo}</td>
        <td class="num amount-cell">${money(c.total)}</td>
        <td class="num">
          <div class="row-action-btns">
            <button data-act="edit">Open</button>
            <button data-act="print">Print</button>
            <button data-act="delete" class="danger">Delete</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  wrap.innerHTML = `
    <table class="register-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Check no.</th>
          <th>Payee</th>
          <th>Memo</th>
          <th class="num">Amount</th>
          <th class="num"></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ---- Actions ----
document.getElementById("listWrap").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.closest("tr").dataset.id;
  const act = btn.dataset.act;

  if (act === "edit") {
    localStorage.setItem("editCheckId", id);
    window.location.href = "index.html";
  } else if (act === "print") {
    const check = loadSavedChecks().find((c) => c.id === id);
    if (check) {
      localStorage.setItem("checkPrintData", JSON.stringify(toPrintPayload(check)));
      window.location.href = "print.html";
    }
  } else if (act === "delete") {
    const check = loadSavedChecks().find((c) => c.id === id);
    const label = check && check.payee ? `the check to ${check.payee}` : "this check";
    if (confirm(`Delete ${label}? This can't be undone.`)) {
      writeSavedChecks(loadSavedChecks().filter((c) => c.id !== id));
      render();
      toast("Check deleted");
    }
  }
});

render();
