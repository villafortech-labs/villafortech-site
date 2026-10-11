# Segundo cerebro para estudiar y trabajar — October 2026

The Spanish application page is `/segundo-cerebro/`. Contact for this pilot:
`villafortech@gmail.com`. The existing portfolio contact address is unchanged.

Five free **individual** places, 75 minutes each, on **October 15 or 16**.
Promotion through Tuesday October 13; preparation and confirmation Wednesday
October 14. Registration closes October 13 at **23:59 Ecuador mainland**
(`2026-10-14T04:59:00Z`). That cutoff time is an operating proposal for review.
One session per selected participant, not a two-day group workshop.

Professionals and students are eligible. Public copy leads with five free 1:1
sessions, dates, a second brain built with the participant and a guide to maintain
it. The session duration is internal planning; public copy does not announce it.

**Review only. Do not publish without Roberto's explicit approval.** The public
site was rolled back and production auto-assignment remains disabled. Keep all
changes on `codex/segundo-cerebro-inscripcion`; push only that branch for a
protected Vercel preview. Master's rollback commit is `71294e3`.

## Low-friction application (schema 3)

Seven required answers: name, email, area, priority, current information/tools,
monthly AI tool budget and availability. Only name and email require typing;
area/priority use native selects, and tools/budget/time use native choices.
WhatsApp, country and a short project note are optional. No essays or uploads.
The note can clarify an “other” selection without adding a conditional blocker.
One unselected data-use checkbox remains. The submit button says **Enviar mi
aplicación**; clicking the link or choosing a time is not a completed application.

Contact fields use stable labels, ids, names and standard autocomplete tokens:
`name`, `email`, `tel`, `country-name`. The form allows autocomplete, uses email
and phone keyboard types, and does not split phone numbers across controls.
Country suggestions are not an allowlist; any country can be entered or autofilled.
This enables browser/contact autofill when users have saved data and the browser
supports it. It is not Google/Apple sign-in, and cannot force an in-app browser
to offer autofill. No personal contact card is copied during QA.

Budget choices remain $0, under $20, $20–99, $100–199 and $200+ per month.
No choice is preselected. Budget is not a selection or purchase requirement.
Availability refers to October 15/16 and Ecuador mainland time (UTC−5).
Both client and server reject missing groups; the server validates option enums,
deduplicates tools/slots, bounds text length and excludes the honeypot.
Old records remain unchanged in the private folder; schema 3 stores tool codes
as an array, area/goal codes, and optional country/project strings.

`utm_source` accepts only known channel names. Without JavaScript it defaults to
`direct`; a native valid POST still works. Success appears only after storage
confirms persistence. On fetch/storage failure the browser keeps entered data
and enables retry. Applications may still be duplicated after an ambiguous
network failure; deduplicate by email before selection.
No account, automatic emails, marketing list or third-party form is created.
Selection and exact times are confirmed manually by email on October 14.

## Guidance used

- Browser autofill: https://web.dev/learn/forms/autofill/
- Safari contact autofill: https://support.apple.com/en-lamr/guide/iphone/iphccfb450b7/ios
- Native selection controls keep keyboard and assistive-technology behavior.
- The protected preview and public route must be checked separately. Passing
  fixture tests is not proof of a real saved application or iPhone autofill.

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
