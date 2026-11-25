(function () {
  var form = document.getElementById("lead-form");
  var success = document.getElementById("success");
  var downloadLink = document.getElementById("download-link");
  var errorBox = form.querySelector(".form-error");
  var button = form.querySelector("button[type=submit]");
  var label = button.querySelector(".btn__label");
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var STORE_KEY = "dian_book";

  document.getElementById("year").textContent = new Date().getFullYear();

  function showError(msg, field) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    form.querySelectorAll("input").forEach(function (i) { i.removeAttribute("aria-invalid"); });
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  }

  function showSuccess(name, url) {
    document.getElementById("success-name").textContent = name;
    downloadLink.href = url;
    form.hidden = true;
    success.hidden = false;
  }

  // The download link works for an hour. Someone who signed up on this device within
  // that time sees the download button straight away; after that they see the form again.
  try {
    localStorage.removeItem("dian_book_name"); // left over from the older version of this page
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && saved.url && saved.expires * 1000 > Date.now()) showSuccess(saved.name, saved.url);
    else localStorage.removeItem(STORE_KEY);
  } catch (e) { /* storage blocked: the form just shows */ }

  if (!form.hidden && new URLSearchParams(window.location.search).get("link") === "expired") {
    showError("That download link has expired. Enter your details again for a fresh one.");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorBox.hidden = true;

    var nameEl = form.elements.name;
    var emailEl = form.elements.email;
    var name = nameEl.value.trim();
    var email = emailEl.value.trim().toLowerCase();

    if (!name) return showError("Please enter your first name.", nameEl);
    if (!EMAIL_RE.test(email)) return showError("That email doesn't look right. Please check it.", emailEl);

    button.disabled = true;
    label.textContent = "One moment…";

    var params = new URLSearchParams(window.location.search);
    fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        company: form.elements.company.value,
        source: params.get("utm_source") || "",
        campaign: params.get("utm_campaign") || "",
        page: window.location.pathname
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !data.url) throw new Error((data && data.error) || "save failed");
        try { localStorage.setItem(STORE_KEY, JSON.stringify({ name: name, url: data.url, expires: data.expires })); } catch (e) { /* not remembered */ }
        showSuccess(name, data.url);
        success.focus();
        // Start the download straight away; the button stays there in case the browser blocks it.
        downloadLink.click();
      })
      .catch(function () {
        showError("Something went wrong on our side. Please check your internet connection and try again.");
      })
      .finally(function () {
        button.disabled = false;
        label.textContent = "Download the free book";
      });
  });
})();
