// finding.js
// Every check returns "findings" with the same shape:
//   { id, points, title, detail }
//   points > 0  -> looks bad
//   points < 0  -> looks good (reassuring signal)
//   points = 0  -> worth knowing, does not change the score

function finding(id, points, title, detail) {
  return { id, points, title, detail };
}

module.exports = { finding };
