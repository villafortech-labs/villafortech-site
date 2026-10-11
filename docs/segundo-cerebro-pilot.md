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

The site was launched with explicit authorization on October 10. Security hardening
was subsequently authorized with “Hazlo”. Keep changes on
`codex/segundo-cerebro-inscripcion`. Production auto-assignment stays disabled;
verify an exact production build before explicitly promoting it. Media publication
has its own authorization and status in the social media project.

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

`utm_source` accepts only known channel names. JavaScript is required for the
antispam check; a noscript notice explains this. Success appears only after storage
confirms persistence. On fetch/storage failure the browser keeps entered data
and refreshes the single-use security token for retry. An immutable private email
claim ensures retries keep the original application and UUID, including concurrent
requests and a crash between claiming an email and persisting its application.
The email is trimmed/lowercased; no provider-specific alias assumptions are made.
Reapplying does not overwrite the original answers. Correction requests go to Roberto.
No applicant account, marketing list or third-party form is created. Owner notifications are separate from application acceptance.
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
these remain alongside the Turnstile and distributed rate controls described below.

`villafortech@gmail.com` is the fixed recipient of owner notifications through
Resend Free. The sender is `aplicaciones@avisos.villafortech.com`; sending requires
verified DNS and `RESEND_API_KEY` plus `PILOT_REVIEW_URL` in the target environment.
The integration is connected to **Preview and Production**. No applicant
automation or marketing list is enabled; the notification goes only to the owner.

The application is saved first. `waitUntil` then attempts the email independently,
so a failed email cannot turn a stored application into a rejected submission.
Private notification state supports bounded retries with the same idempotency key
and a manual retry from the table. `sent` means accepted by Resend, not confirmed
in the recipient inbox. An uncertain delivery older than 24 hours needs provider
inspection before any resend. No scheduled sweeper is installed; recover pending
or failed notifications from the table.

## Private review table

`/segundo-cerebro/revision/` is a noindex static shell with no embedded responses.
`/api/pilot-admin` requires a separate private access key (`PILOT_ADMIN_SECRET`, at
least 32 characters). Login issues a signed 12-hour HttpOnly/Secure/SameSite cookie.
The API checks same-origin JSON mutations and never returns private data without a
valid session. The key is not sent in a URL or stored in browser localStorage.

Review states: pending, shortlist, selected, waitlist, not_selected. Notes and
selection persist in private Blob with ETag conditional writes. Five is a global
**selection** maximum, including simultaneous changes; duplicate emails and QA
entries cannot occupy two places or test places respectively. Selecting does not
email an applicant or book a time. Pages contain 20 records; searches and CSV use
loaded records. Load more to include older pages. Test entries are hidden by default.
Draft notes survive filters and pagination. Closing the session clears responses
and invalidates in-flight UI requests. CSV escapes spreadsheet formula prefixes.

## Capacity and operating limits

There is **no five-application cap**. Deadline, payload validation and provider
quotas are the limits. A local test submits 100 applications concurrently; this
verifies isolated handler logic with a stubbed security check, not a remote load
benchmark. Real verified application attempts are limited to 60 per minute globally.

Verified plan: Vercel Hobby, private Blob active. The usage dashboard observed 33
advanced and 11 simple Blob operations in the previous 30 days before this QA;
usage reporting can lag. Hobby includes 2,000 advanced and 10,000 simple operations
per month. A new accepted application with notification uses five writes:
one shared rate counter, one email claim, one application, one notification claim
and one final notification state. Successful login attempts also write a counter. Review
changes, list pages and retries consume additional operations. Do not equate the
quota with 2,000 candidates. A few hundred applications are a reasonable campaign
scale; an exact guaranteed count depends on remaining/shared consumption.

Resend Free allows 100 messages per UTC day and 3,000 per month. Above the daily
email quota, applications remain saved; retry their notifications after reset.
UTC midnight is 19:00 in Ecuador mainland. No paid plan was purchased.

Sources checked October 10, 2026:

- https://vercel.com/docs/vercel-blob/usage-and-pricing
- https://vercel.com/docs/plans/hobby
- https://resend.com/docs/knowledge-base/account-quotas-and-limits
- https://resend.com/docs/dashboard/emails/idempotency-keys

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

## Antispam and abuse protection — October 10, 2026

- Cloudflare Turnstile Managed runs on both application and admin login. The
  widget uses interaction-only appearance; most visitors see no extra task.
- The server calls Siteverify before accepting a submission or testing the
  admin key. It requires success plus the exact origin hostname and action
  (`pilot_apply` or `pilot_admin`). Tokens are single-use and expire in five minutes.
- Missing credentials, provider errors/timeouts and unavailable counter storage
  reject the operation instead of silently disabling protection. Requests preserve
  the visitor's answers so they can retry. Public responses never echo secrets.
- A Cloudflare Free rate rule covers both API paths, with and without a trailing
  slash: 20 requests / 10 seconds / IP, then a 10-second block. This protects
  traffic routed through Cloudflare, not direct Vercel aliases.
- Separate server budgets permit 60 verified application attempts/minute and
  5 verified admin login attempts/minute, globally across instances. These are
  deliberately global circuit breakers, not per-person limits. They use uncached
  private Blob reads and conditional ETag writes; there are only two counter
  records, reused after expiry. Blocked attempts receive HTTP 429 + Retry-After.
  Logged-in review actions do not consume the login budget.
- Client-supplied IP headers are not trusted. Cloudflare sees visitor IPs at its
  edge; Vercel may see Cloudflare proxy IPs. The application counters do not
  pretend those are individual visitor IPs.
- Email claims use an independent HMAC secret and atomic no-overwrite writes.
  Notification idempotency uses the winning application UUID, so retries cannot
  create another owner email after a successful delivery. Historical applications
  are retained. A server-only HMAC-to-UUID migration map preserves their original
  IDs; their claims materialize atomically on the first retry.
- Required environment: `PUBLIC_TURNSTILE_SITE_KEY` (public build value),
  `TURNSTILE_SECRET_KEY`, and `PILOT_DEDUP_SECRET` (server-only). Preserve the
  dedup secret; rotating it requires a claim migration. The optional
  `PILOT_LEGACY_APPLICATION_IDS` map contains no raw emails. Never use test keys in
  deployed environments. Preview hostnames must be explicitly allowed by the widget.
- Vercel and Cloudflare automatic DDoS defenses remain active. No protection
  guarantees immunity or unlimited capacity. Solved challenges and legitimate
  traffic still consume hosting/storage/email quotas. No paid plan was added.

References:

- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/
- https://developers.cloudflare.com/waf/rate-limiting-rules/
- https://vercel.com/docs/headers/request-headers
