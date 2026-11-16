// theme.js
// Light / dark mode. Loaded in <head>, before the page is drawn, so there is
// no white flash. (It is a separate file because our CSP blocks inline scripts.)
//
// - No saved choice: follow the system setting (prefers-color-scheme).
// - Clicking the sun/moon button saves the choice in localStorage.
// - localStorage can be blocked (private mode), so every use is in try/catch:
//   the page still works, it just does not remember the choice.

const THEME_KEY = "inbox-detective-theme";

function savedTheme() {
  try {
    return localStorage.getItem(THEME_KEY); // "light", "dark" or null
  } catch (err) {
    return null;
  }
}

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || systemTheme();
}

// Set the theme on <html> and tell the charts to redraw in the new colors.
function setTheme(theme, remember) {
  document.documentElement.setAttribute("data-theme", theme);
  if (remember) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      // storage blocked: the theme still changes, it is just not remembered
    }
  }
  document.dispatchEvent(new Event("themechange"));
}

// Runs right away: use the saved choice, otherwise the system setting.
setTheme(savedTheme() || systemTheme(), false);

// If the system switches light/dark while the page is open, follow it,
// unless the user already picked a theme with the button.
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (!savedTheme()) setTheme(systemTheme(), false);
});

// The toggle button exists only after the page is parsed.
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("theme-toggle");
  button.addEventListener("click", () => {
    setTheme(currentTheme() === "dark" ? "light" : "dark", true);
  });
});
