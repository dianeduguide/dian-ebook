# Book sales page: 250+ in JAMB, A1 in WAEC

A one-page site where students enter their first name and email, then download the book.
It's plain HTML, CSS and JavaScript with no build step, so any static host will serve it.

```
public/          everything that goes online
  index.html     the page
  styles.css     Dian Education colours and layout
  app.js         form handling and download
  config.js      the one setting you need to fill in (your Google Sheet link)
  assets/        logo, icons, book cover and the PDF itself
apps-script/     the small script that saves signups into a Google Sheet (not published)
wrangler.jsonc   Cloudflare settings: serve public/ as a static site
```

## 1. Make the Google Sheet

1. Create a new Google Sheet, e.g. "Dian book signups". Use the Google account that should own the list.
2. In the Sheet, open **Extensions → Apps Script**.
3. Delete what's there, paste in everything from `apps-script/Code.gs`, and click **Save**.

## 2. Turn the script into a web link

1. Click **Deploy → New deployment**. For the type, pick **Web app**.
2. Set **Execute as: Me** and **Who has access: Anyone**. ("Anyone" is needed so students who
   aren't signed in to Google can submit. They can only add a row; they can't see the sheet.)
3. Click **Deploy**, allow the permissions Google asks for, and copy the **Web app URL**
   (it ends in `/exec`).
4. Paste it into `public/config.js`:

   ```js
   window.DIAN_SIGNUP_URL = "https://script.google.com/macros/s/XXXX/exec";
   ```

Test it: open the page, sign up with your own email, and check that a row appears in the Sheet.

If you edit the script later, use **Deploy → Manage deployments → Edit → New version** so the
same URL keeps working.

## 3. Put it online (GitHub + Cloudflare)

1. Push this folder to its own GitHub repository.
2. In Cloudflare: **Workers & Pages → Create → Import a repository** and pick the repository.
3. Keep the project name **`dian-sales`** (it must match `name` in `wrangler.jsonc`), leave the
   build command empty and the deploy command as `npx wrangler deploy`. Click **Deploy**.
4. To use your own domain, open the project's **Settings → Domains & Routes** and add it.

Every push to `main` after that redeploys the page automatically.

To preview it on your computer first, run `npx serve public` in this folder.

Then:

- In `public/index.html`, replace `https://example.com` in the `og:image` line with your real domain,
  so the book cover shows when the link is shared on WhatsApp or in Instagram DMs.

## 4. Tracking where signups come from

Add UTM tags to the links you share and they'll show up in the Sheet's Source and Campaign columns:

- Instagram bio: `https://yourdomain.com/?utm_source=instagram&utm_campaign=bio`
- An ad: `https://yourdomain.com/?utm_source=meta_ads&utm_campaign=book_nov`

## Good to know

- **Why Google Sheets and not Cloudinary?** Cloudinary stores files (images, video, PDFs); it isn't
  built to collect form entries. You *can* host the PDF on Cloudinary if you'd like, by uploading it
  and putting its link in the `download-link` `href` in `public/index.html`. Keeping it in `public/assets/` is simpler.
- **Moving to Mailchimp later:** download the Sheet as CSV and import it into Mailchimp (or any
  email tool). The consent line under the form already tells students they'll get study tips.
- **The PDF link is public.** Anyone with the direct link can download it without signing up.
  That's normal for a free book, and fine. If it ever becomes paid, it needs a different setup.
- **Privacy:** keep the Sheet private (don't share it publicly) and honour any request to remove
  someone's details. The page's FAQ promises this.
- **Returning visitors:** someone who has already signed up on the same phone sees the download
  button straight away instead of the form. Clear the site data to see the form again while testing.
