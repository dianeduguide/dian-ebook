(function () {
  var form = document.getElementById("lead-form");
  var success = document.getElementById("success");
  var errorBox = form.querySelector(".form-error");
  var button = form.querySelector("button[type=submit]");
  var label = button.querySelector(".btn__label");
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  document.getElementById("year").textContent = new Date().getFullYear();

  function showError(msg, field) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    form.querySelectorAll("input").forEach(function (i) { i.removeAttribute("aria-invalid"); });
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  }

  function showSuccess(name) {
    document.getElementById("success-name").textContent = name;
    form.hidden = true;
    success.hidden = false;
    success.focus();
    try { localStorage.setItem("dian_book_name", name); } catch (e) {}
    // Start the download straight away; the button stays there in case the browser blocks it.
    document.getElementById("download-link").click();
  }

  // Someone who already signed up on this device goes straight to the download button.
  try {
    var saved = localStorage.getItem("dian_book_name");
    if (saved) {
      document.getElementById("success-name").textContent = saved;
      form.hidden = true;
      success.hidden = false;
    }
  } catch (e) {}

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorBox.hidden = true;

    var nameEl = form.elements.name;
    var emailEl = form.elements.email;
    var name = nameEl.value.trim();
    var email = emailEl.value.trim().toLowerCase();

    if (!name) return showError("Please enter your first name.", nameEl);
    if (!EMAIL_RE.test(email)) return showError("That email doesn't look right. Please check it.", emailEl);

    // Bots fill in the hidden field. Pretend it worked and save nothing.
    if (form.elements.company.value) return showSuccess(name);

    var url = window.DIAN_SIGNUP_URL;
    if (!url) {
      console.warn("DIAN_SIGNUP_URL is empty in config.js, so this signup was not saved.");
      return showSuccess(name);
    }

    button.disabled = true;
    label.textContent = "One moment…";

    var params = new URLSearchParams(window.location.search);
    var body = new URLSearchParams({
      name: name,
      email: email,
      source: params.get("utm_source") || "",
      campaign: params.get("utm_campaign") || "",
      page: window.location.pathname
    });

    fetch(url, { method: "POST", body: body })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.error) || "save failed");
        showSuccess(name);
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
