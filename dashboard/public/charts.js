// charts.js
// The two Chart.js charts: "Emails over time" and "Types of scams".

const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-11-03" -> a date at midnight UTC (UTC so the time zone cannot shift the day).
function toDate(day) {
  return new Date(day + "T00:00:00Z");
}

// "Nov 3"
function shortDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Turn per-day counts into EVEN buckets on a real time line, empty days included:
// one bucket per day if the range is up to 31 days, otherwise one per week (Monday start).
function toBuckets(timeline) {
  const days = timeline.filter((d) => d.day !== "unknown");
  if (days.length === 0) return { byWeek: false, buckets: [] };
  const first = toDate(days[0].day);
  const last = toDate(days[days.length - 1].day);
  const byWeek = (last - first) / DAY_MS > 31;
  const step = byWeek ? 7 * DAY_MS : DAY_MS;
  // Weeks start on Monday: go back from the first day to its Monday. (getUTCDay: Sunday=0)
  const start = byWeek ? new Date(first - ((first.getUTCDay() + 6) % 7) * DAY_MS) : first;
  const buckets = [];
  for (let t = start.getTime(); t <= last.getTime(); t += step) {
    buckets.push({ label: shortDate(new Date(t)), malicious: 0, suspicious: 0, "likely safe": 0 });
  }
  for (const d of days) {
    const bucket = buckets[Math.floor((toDate(d.day) - start) / step)];
    for (const key of ["malicious", "suspicious", "likely safe"]) bucket[key] += d[key];
  }
  return { byWeek, buckets };
}

// How many emails have no date: shown as a note, not as a bar.
function countUnknown(timeline) {
  const unknown = timeline.find((d) => d.day === "unknown");
  if (!unknown) return 0;
  return unknown.malicious + unknown.suspicious + unknown["likely safe"];
}

function drawTimeline(timeline) {
  const canvas = document.getElementById("timeline");
  const missing = countUnknown(timeline);
  let note = "";
  if (missing === 1) note = "1 email has no date and is not shown.";
  if (missing > 1) note = missing + " emails have no date and are not shown.";
  document.getElementById("timeline-note").textContent = note;
  const { byWeek, buckets } = toBuckets(timeline);
  if (buckets.length === 0) return showEmptyChart(canvas);
  const datasets = Object.keys(VERDICTS).reverse().map((key) => ({
    label: VERDICTS[key].word, data: buckets.map((b) => b[key]), backgroundColor: color(VERDICTS[key].token),
  }));
  return new Chart(canvas, {
    type: "bar",
    data: { labels: buckets.map((b) => b.label), datasets },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true },
          title: { display: true, text: byWeek ? "Week starting" : "Day" } },
        y: { stacked: true, ticks: { precision: 0 }, title: { display: true, text: "Emails" } },
      },
    },
  });
}

// Writes the number at the end of each bar (a tiny Chart.js plugin, no extra library).
const barNumbers = {
  id: "barNumbers",
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    ctx.save();
    ctx.fillStyle = color("--text");
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    chart.getDatasetMeta(0).data.forEach((bar, i) => ctx.fillText(chart.data.datasets[0].data[i], bar.x + 8, bar.y));
    ctx.restore();
  },
};

function drawScamTypes(scamTypes) {
  const canvas = document.getElementById("scamTypes");
  const labels = Object.keys(scamTypes).sort((a, b) => scamTypes[b] - scamTypes[a]); // largest first
  if (labels.length === 0) return showEmptyChart(canvas);
  return new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ label: "Emails", data: labels.map((l) => scamTypes[l]), backgroundColor: color("--accent"), borderRadius: 4 }] },
    plugins: [barNumbers],
    options: {
      indexAxis: "y", maintainAspectRatio: false,
      layout: { padding: { right: 32 } }, // room for the numbers
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => item.raw + " emails (estimate)" } } },
      scales: { x: { ticks: { precision: 0 }, grid: { display: false } }, y: { grid: { display: false } } },
    },
  });
}

// Hide the canvas and show "No data yet" in its place. Returns null: no chart was made.
function showEmptyChart(canvas) {
  canvas.hidden = true;
  if (!canvas.parentElement.querySelector(".empty")) { // only once, also after a theme redraw
    canvas.parentElement.appendChild(el("p", "No data yet.", "empty"));
  }
  return null;
}
