# Contact email proxy

All backend email logic lives in this directory. The main Worker only mounts the admin router and dispatches email, queue and maintenance events. The admin UI lives in the existing frontend.

## Behavior

- Public address: `contact@vrcstorage.lat`.
- Incoming mail: Cloudflare Email Routing. Outgoing mail: Resend only.
- One administrator, configured through `EMAIL_ADMIN`, replies from Gmail.
- Each outbound message gets a random `reply+TOKEN@vrcstorage.lat` address. Only the token hash is retained in D1; the plaintext exists temporarily in private R2 metadata and in the recipient's mailbox.
- Conversation participants, message IDs and delivery states do not expire automatically. Neither bodies nor attachments are stored in D1.
- Respect one valid `Reply-To` on the initial contact; otherwise use `From`. Later replies cannot change the conversation's destination.
- Forward text, HTML, attachments and CID images. A provider rejection fails the entire message. MIME safety limits are 32 nesting levels, 1,000 parts and 256 KiB of aggregate headers. Attached RFC822 messages remain attachments.
- Strip only explicitly marked proxy blocks. Do not remove arbitrary signatures or quoted history. Personal information written in a signature or attached message is not anonymized.
- Reject automatic responses, mailing lists, delivery reports, unknown addresses and proxy loops. Administrator replies require an exact `From` match and a passing DMARC result from Cloudflare's first `Authentication-Results` header. Do not trust envelope sender equality as authentication.
- Maximum incoming message size: 25 MiB, including MIME encoding and attachments. Unsupported Resend attachment types become failed deliveries, not silently discarded files.
- Per-envelope-sender admission uses the existing login rate-limit binding with a separate hashed email key: 10 messages/minute. This is not a global spam filter or a guarantee against exhausting Resend's quota.

## Delivery and retention

1. Store the original MIME email in the dedicated private `EMAIL_BUCKET`.
2. Commit minimal conversation/delivery metadata in D1, then enqueue only the delivery UUID.
3. A leased consumer parses the original and streams a deterministic JSON request to Resend with `Idempotency-Key: contact/UUID`.
4. Retry network errors, HTTP 408/429/5xx and transient 409 responses, honoring `Retry-After` and the daily quota reset. The retry window ends 23 hours after admission, within Resend's 24-hour idempotency window.
5. Once Resend accepts the email, mark it sent before deleting the original. Acceptance is not proof of inbox delivery; no delivery-status webhook is implemented.
6. Permanent failures and exhausted retry windows remain visible at `/admin#email`. Originals remain downloadable for 30 days **after failure**, then are deleted. Administrators can delete them earlier. There is no manual resend action.

Maintenance runs every five minutes. It recovers missed queue admissions, expired consumer leases, exhausted retry windows and deferred content deletion. The existing daily media cleanup retains its original schedule. Each maintenance invocation handles up to 15 due jobs and 15 cleanup objects to stay within the Workers Free subrequest budget; backlogs can delay cleanup. Access to an expired original is denied immediately even if physical deletion is delayed.

Repeated SMTP deliveries with the same `From`, envelope recipient and valid `Message-ID` share one delivery. Messages without a valid ID cannot be reliably deduplicated. Queue messages may be duplicated and are protected by D1 leases and Resend idempotency; exactly-once delivery is not guaranteed. If Resend accepted a request but its response was lost, a final failure can have an unknown delivery outcome.

## Production setup (not performed automatically)

These commands change remote resources. Review the account and authorize them before running.

1. Configure `RESEND_API_KEY` as a Worker secret and `EMAIL_ADMIN` as the administrator's full email address. Wrangler keeps dashboard variables on deployment. Neither value belongs in source control. Local `.dev.vars` values are separate from deployed settings.
2. Verify `vrcstorage.lat` for sending in Resend. Keep Cloudflare's receiving MX records; add Resend's DKIM and Return-Path/SPF records at their specified names. Do not enable Resend inbound receiving on the same receiving domain.
3. Create the private bucket and queue, then apply D1 migrations **before deploying** the updated Worker:

   ```powershell
   npx wrangler r2 bucket create vrcstorage-email
   npx wrangler queues create vrcstorage-email
   npx wrangler d1 migrations apply vrcstorage --remote
   ```

   Do not enable public access on the email bucket, use it for public media, or attach it to the CDN Worker.

4. Add a lifecycle safety net for orphaned writes that never reached D1 (for example, a crash between R2 storage and the D1 commit):

   ```powershell
   npx wrangler r2 bucket lifecycle add vrcstorage-email email-safety-net raw/ --expire-days 32
   ```

   Normal deletion happens immediately after accepted sends or 30 days after failure. The 32-day lifecycle is only a fallback; Cloudflare lifecycle deletion is asynchronous. It does not replace the maintenance cron.

5. Enable **subaddressing** in Cloudflare Email Routing settings. `wrangler.jsonc` declares `contact@vrcstorage.lat` and `reply@vrcstorage.lat` routed to this Worker. With subaddressing enabled, the latter also receives `reply+TOKEN`, preserving the token in `message.to`. No catch-all is needed. Check for older rules that could take precedence.
6. Deploy the Worker and rebuilt frontend together using the existing deployment workflow. No Cloudflare `send_email` binding or reply-signing secret is needed.
7. Send a real contact message from an account you control; reply from the configured Gmail; reply again from the contact. Verify threading, text/HTML, attachments and inline images. Confirm that private mailbox information is absent from outgoing headers, and inspect failures at `/admin#email`.

Resend Free permits 100 sends/day and 3,000/month. Every forwarded message consumes one send, including copies to the administrator. Resend retains its own email content and metadata for 30 days under its standard policy. Workers, D1, R2 and Queues have separate quotas and charges.

## Tests

`test/backend/platform/email-proxy.test.ts` uses isolated local D1/R2 and mocked Resend calls. No real email or production resources are used. Frontend API tests cover listing, original downloads and deletion. Browser interaction, real Gmail authentication/threading, provider attachment policy and large-message memory use still require live/staging validation.

## References

- https://developers.cloudflare.com/email-service/api/route-emails/email-handler/
- https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/
- https://developers.cloudflare.com/queues/configuration/javascript-apis/
- https://developers.cloudflare.com/r2/buckets/object-lifecycles/
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/knowledge-base/account-quotas-and-limits
- https://resend.com/docs/knowledge-base/what-attachment-types-are-not-supported
