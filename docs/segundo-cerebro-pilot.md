# Segundo cerebro para estudiar y trabajar — October 2026

The Spanish application page is `/segundo-cerebro/`. Contact for this pilot:
`villafortech@gmail.com`. The existing portfolio contact address is unchanged.

Five free **individual** places, 75 minutes each, on **October 15 or 16**.
Promotion through Tuesday October 13; preparation and confirmation Wednesday
October 14. Registration closes October 13 at **23:59 Ecuador mainland**
(`2026-10-14T04:59:00Z`). That cutoff time is an operating proposal for review.
One session per selected participant, not a two-day group workshop.

Students and professionals are both eligible. Each session can focus on a subject,
thesis or work project. The existing role field asks what the applicant studies or
does for work; no additional question or employment requirement was added.

**Review only. Do not publish without Roberto's explicit approval.** The public
site was rolled back and production auto-assignment remains disabled. Keep all
changes on `codex/segundo-cerebro-inscripcion`; push only that branch for a
protected Vercel preview. Master's rollback commit is `71294e3`.

The form has six required answers: name, email, studies/occupation, current tools/information,
monthly AI tool budget and date-specific availability. WhatsApp is optional,
accepts a country prefix and is stored privately with the application when provided.
Missing or empty WhatsApp never blocks submission. Budgets include $0, under $20, $20–99,
$100–199 and $200+. Budget does not determine eligibility; no purchase required.
The previous project/outcome/materials essays and separate
commitment checkbox were removed. One unselected data-use checkbox remains.

Schema version 2 keeps multiple availability values (six day/time windows), a
monthly budget enum and an optional allowlisted campaign source (`utm_source`).
Old records remain unchanged in the same private folder. Source defaults to
`direct` without JavaScript. No account, file upload or third-party form is used.
Submission confirms durable receipt, not a reserved appointment. Selection and
exact times are confirmed manually by email on October 14.

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
duplicates; review email addresses before assigning places.

## Verification and operation

`npm run verify` checks the static site and the API behavior tests. The
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
