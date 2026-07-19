// ============================================================
//  Login  (front-end PLACEHOLDER — not real security)
// ------------------------------------------------------------
//  These credentials live in the browser and can be read by
//  anyone. This only gates the UI. Before going live, replace
//  this with a real backend login (server verifies a hashed
//  password and returns a session token over HTTPS).
// ============================================================
const USERS = {
  admin: "viking123",
};

// If already signed in, skip the login screen
if (sessionStorage.getItem("crc_authed") === "1") {
  location.replace("index.html");
}

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;
  const err = document.getElementById("loginError");

  if (USERS[user] && USERS[user] === pass) {
    sessionStorage.setItem("crc_authed", "1");
    sessionStorage.setItem("crc_user", user);
    location.replace("index.html");
  } else {
    err.textContent = "Incorrect username or password.";
    err.hidden = false;
    document.getElementById("password").value = "";
  }
});
