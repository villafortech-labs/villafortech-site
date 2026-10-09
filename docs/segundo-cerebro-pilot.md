# Segundo cerebro profesional — October 2026

The Spanish application page is `/segundo-cerebro/`. Contact for this pilot:
`villafortech@gmail.com`. The existing portfolio contact address is unchanged.

Five free places; applications close **2026-10-11 at 18:00 Ecuador mainland**
(`2026-10-11T23:00:00Z`). Contact selected applicants October 12; coordinate
75-minute sessions October 13–15. Selection is manual, based on a concrete need,
available materials, a feasible single-project scope, and availability to try it.

## Response storage

The Vercel project `villafortech-site` is connected to the **private** Blob store
`segundo-cerebro-aplicaciones` (`store_JzgeQRt0cx8WUgHq`) in `iad1`.
Production and Preview use the project connection and OIDC through `BLOB_STORE_ID`.
No long-lived read/write token is required in the client or repository.

Owner dashboard:
<https://vercel.com/villafortechs-projects/villafortech-site/stores/blob/store_JzgeQRt0cx8WUgHq/manage-blobs>

Each accepted response is a private JSON object under
`segundo-cerebro-2026-10/`. Open that folder in the dashboard to review or download
responses while signed in. Objects are not exposed by a public read API. The API
only accepts POST and returns a receipt after Blob confirms persistence. Failed
requests leave the form contents in the browser for retry. The honeypot, body
limit, validation, origin check and server-side deadline provide basic controls;
this is not a CAPTCHA or a distributed rate limiter.

`villafortech@gmail.com` is the visible contact address. **Automatic email
notifications are not configured.** Check the owner dashboard for applications.
No marketing list or automatic applicant emails are created.

Do not commit downloaded responses. Keep any exports under ignored `output/`,
restrict access locally, and fulfill correction/deletion requests received at the
contact email. Synthetic QA entries identify themselves as tests and use
`example.invalid`; exclude them from selection. Retry submissions can produce
duplicates; review email addresses before ranking applicants.

## Verification and operation

`npm run verify` checks the static site and the seven API behavior tests. The
campaign is intentionally Spanish-only, noindex, and excluded from the sitemap;
the existing bilingual route checks remain enforced.

`npm run dev` previews the static Astro page. Root `api/` functions execute on
Vercel; test storage on a deployment with the private store connected. Neither
successful build nor a visible form alone proves persistence. Submit synthetic
data, verify the saved JSON in the owner dashboard, and verify its URL rejects
unauthenticated reads before announcing the link.

Change the deadline in `src/data/pilot.ts` and update page copy together. On
closure the browser hides the form and the server rejects further submissions.
The page does not modify the social media bio link or publish an announcement.

Rollback baseline: `c642ad2848b955d85a09397728123e3ea8c52706`. Preserve the private
store even if reverting the page so submitted applications are not lost.
