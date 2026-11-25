# Book sales page: 250+ in JAMB, A1 in WAEC

A one-page site where students enter their first name and email, then download the book.
It's plain HTML, CSS and JavaScript with no build step, so any static host will serve it.

```
public/          everything that is public on the site
  index.html     the page
  styles.css     Dian Education colours and layout
  app.js         form handling
  assets/        logo, icons and book cover
book/            the PDF. Not public: it is only sent through a signup download link
src/worker.js    the small server: saves the signup, then gives out the download link
apps-script/     the script that saves signups into a Google Sheet (not published)
wrangler.jsonc   Cloudflare settings
```

## How the download is protected

The PDF has no public address. When a student submits the form, the server saves their
signup to the Google Sheet and only then returns a download link. That link stops working
after one hour, and it can't be guessed or edited. Search engines are told not to index it,
and the book's old public address now answers "gone".

A student can still pass the PDF file itself to a friend once they have it. No website can
stop that.

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
4. Paste it into `wrangler.jsonc` as the value of `SIGNUP_URL`.

Test it: open the page, sign up with your own email, and check that a row appears in the Sheet.

If you edit the script later, use **Deploy → Manage deployments → Edit → New version** so the
same URL keeps working.

## 3. Put it online (GitHub + Cloudflare)

1. Push this folder to its own GitHub repository.
2. In Cloudflare: **Workers & Pages → Create → Import a repository** and pick the repository.
3. Keep the project name **`dian-sales`** (it must match `name` in `wrangler.jsonc`), leave the
   build command empty and the deploy command as `npx wrangler deploy`. Click **Deploy**.
4. Add the download secret, once: open the project's **Settings → Variables and Secrets → Add**,
   choose type **Secret**, name it `DOWNLOAD_SECRET`, and for the value paste a long random
   string (run `openssl rand -hex 32` in a terminal to make one). Click **Deploy**.
   Without it the form shows an error and gives out no links.
5. To use your own domain, open the project's **Settings → Domains & Routes** and add it.

Every push to `main` after that redeploys the page automatically.

To run it on your computer, create a file named `.dev.vars` in this folder containing
`DOWNLOAD_SECRET="anything-long-for-local-testing"`, then run `npx wrangler dev`.
Signups made this way are saved to the real Google Sheet.

## 4. Tracking where signups come from

Add UTM tags to the links you share and they'll show up in the Sheet's Source and Campaign columns:

- Instagram bio: `https://yourdomain.com/?utm_source=instagram&utm_campaign=bio`
- An ad: `https://yourdomain.com/?utm_source=meta_ads&utm_campaign=book_nov`

## Good to know

- **Why Google Sheets and not Cloudinary?** Cloudinary stores files (images, video, PDFs); it isn't
  built to collect form entries. You *can* host the PDF on Cloudinary,
  but then anyone with that link can download it without signing up, which is what this setup avoids.
- **Moving to Mailchimp later:** download the Sheet as CSV and import it into Mailchimp (or any
  email tool). The consent line under the form already tells students they'll get study tips.
- **Removing the old PDF from Google:** the old address now answers "gone", so Google drops it
  on its own within days to weeks. To speed it up, use **Google Search Console → Removals**.
- **Privacy:** keep the Sheet private (don't share it publicly) and honour any request to remove
  someone's details. The page's FAQ promises this.
- **Returning visitors:** someone who signed up on the same phone within the last hour sees the
  download button straight away. After that they see the form again and need to re-enter
  their details for a fresh link (this adds a second row for them in the Sheet).
