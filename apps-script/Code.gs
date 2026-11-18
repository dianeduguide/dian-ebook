/**
 * Dian Education: book signups → Google Sheet.
 *
 * Paste this into Extensions → Apps Script on the Google Sheet that should
 * collect signups, then deploy it as a web app (see README.md).
 * The first time it runs it adds a header row to the first tab.
 */

var HEADERS = ["Date", "First name", "Email", "Source", "Campaign", "Page"];

function doPost(e) {
  var p = (e && e.parameter) || {};
  var name = clean_(p.name, 60);
  var email = clean_(p.email, 120).toLowerCase();

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json_({ ok: false, error: "invalid" });
  }

  // Stops two signups arriving at the same moment from overwriting each other.
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      new Date(),
      name,
      email,
      clean_(p.source, 60),
      clean_(p.campaign, 60),
      clean_(p.page, 100)
    ]);
  } finally {
    lock.releaseLock();
  }

  return json_({ ok: true });
}

// Visiting the URL in a browser just confirms it's running.
function doGet() {
  return json_({ ok: true, message: "Dian signup endpoint is running." });
}

// Trims, limits length, and stops values starting with = + - @ from being
// treated as spreadsheet formulas (someone could otherwise type a formula as their name).
function clean_(value, max) {
  var s = String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
