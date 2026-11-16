// Errors.gs
// Turns technical errors into short, friendly sentences for the user.
// The full technical error is still written to the log (console.error) for us.

function friendlyError(message) {
  const text = String(message || "");
  if (/not configured/.test(text)) {
    return "The add-on is not set up yet. Add BACKEND_URL and API_KEY in Script Properties.";
  }
  if (/rejected the API key/.test(text)) {
    return "The analysis server did not accept the key. Check API_KEY in Script Properties.";
  }
  if (/too large/.test(text)) return text;
  // The server is off, the tunnel is down, or the address is wrong.
  if (/status (404|502|503|504)|DNS|Address unavailable|Timeout|timed out|Request failed|unable to connect/i.test(text)) {
    return "Could not reach the analysis server. Is it running?";
  }
  if (/status 5\d\d/.test(text)) return "The analysis server had a problem. Please try again in a moment.";
  if (/Gmail API answered 40[13]/.test(text)) {
    return "Gmail did not allow this. Open the add-on again and approve the permissions.";
  }
  return "Something went wrong. Please try again.";
}
