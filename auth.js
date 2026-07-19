// ============================================================
//  Page gate  (front-end only — see note below)
// ------------------------------------------------------------
//  NOTE: This is a UI gate, NOT real security. Anyone can read
//  this file. Real authentication must be enforced by a backend
//  server before this app handles real data. Replace the check
//  in login.js (and this gate) with a server session/token.
// ============================================================
(function () {
  var authed = sessionStorage.getItem("crc_authed") === "1";
  var page = location.pathname.split("/").pop() || "index.html";
  if (!authed && page !== "login.html") {
    location.replace("login.html");
  }
})();

function crcLogout() {
  sessionStorage.removeItem("crc_authed");
  sessionStorage.removeItem("crc_user");
  location.replace("login.html");
}
