// nav.js
// 1. Scroll spy: highlights the top-bar link of the section you are looking at.
// 2. "Back to top" button: shown only after you scroll past the first screen.
// (Smooth scrolling itself is one line of CSS: scroll-behavior: smooth.)

const navLinks = document.querySelectorAll(".nav a");

// Mark one link as the current one (aria-current also tells screen readers).
function setActiveLink(sectionId) {
  for (const link of navLinks) {
    if (link.getAttribute("href") === "#" + sectionId) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  }
}

// IntersectionObserver tells us when a section enters or leaves a band near the
// top of the screen (just under the sticky bar). We keep the ids that are inside it.
const visible = new Set();

// If several sections are in the band (short ones), the TOPMOST one wins.
function updateActiveLink() {
  for (const link of navLinks) {
    const id = link.getAttribute("href").slice(1); // "#overview" -> "overview"
    if (visible.has(id)) return setActiveLink(id);
  }
}

const spy = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) visible.add(entry.target.id);
    else visible.delete(entry.target.id);
  }
  updateActiveLink();
}, { rootMargin: "-80px 0px -70% 0px" });

for (const link of navLinks) {
  const section = document.querySelector(link.getAttribute("href"));
  if (section) spy.observe(section);
}

// At the very bottom, the last sections are too short to reach the band.
// There we highlight the link you clicked, or else the last link.
let clickedId = null;
for (const link of navLinks) {
  link.addEventListener("click", () => {
    clickedId = link.getAttribute("href").slice(1);
    setActiveLink(clickedId); // right away, even if the page does not need to scroll
  });
}
// Forget the click only when YOU scroll (wheel, touch, keys), not during the smooth scroll.
for (const eventName of ["wheel", "touchstart", "keydown"]) {
  window.addEventListener(eventName, () => { clickedId = null; }, { passive: true });
}

function isAtBottom() {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
}

// Back to top: visible after one screen of scrolling.
const backToTop = document.getElementById("back-to-top");
window.addEventListener("scroll", () => {
  backToTop.hidden = window.scrollY < window.innerHeight;
  if (isAtBottom()) {
    setActiveLink(clickedId || navLinks[navLinks.length - 1].getAttribute("href").slice(1));
  } else {
    updateActiveLink();
  }
}, { passive: true });
backToTop.addEventListener("click", () => window.scrollTo({ top: 0 }));
