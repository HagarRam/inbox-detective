// motion.js
// All the animations in one place: small, fast, and only once.
// If the system asks for less motion (prefers-reduced-motion), nothing moves:
// numbers and bars appear at their final value right away.

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Run "callback" once, the first time the element scrolls into view.
function onFirstView(element, callback) {
  if (REDUCED_MOTION) return callback();
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      observer.disconnect(); // only once
      callback();
    }
  }, { threshold: 0.15 });
  observer.observe(element);
}

// Sections fade and slide in when they enter the screen.
// The "reveal" class is added by JS, so without JS everything is simply visible.
function setupReveal() {
  if (REDUCED_MOTION) return;
  for (const section of document.querySelectorAll(".section")) {
    section.classList.add("reveal");
    onFirstView(section, () => section.classList.add("visible"));
  }
}

// A number counts up from 0 to "target" in about 0.6 seconds (slows down at the end).
function countUp(element, target) {
  if (REDUCED_MOTION || target === 0) {
    element.textContent = target;
    return;
  }
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / 600, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // "ease out": fast first, then slow
    element.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  element.textContent = "0";
  requestAnimationFrame(step);
}

// Chart.js animates by itself; we only set a short duration, or turn it off.
function setupChartMotion() {
  Chart.defaults.animation = REDUCED_MOTION ? false : { duration: 500 };
}
