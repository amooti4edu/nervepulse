# Supabase Removal and Self-Hosted PostgreSQL Plan

## Status

Planning only. This document does not authorize or implement application changes.

The application is new, with no users, production data, or files to preserve. This is a replacement of the Supabase integration before launch, not a production data migration.

## Goal

Remove Supabase completely and run the application on infrastructure controlled by the project, without requiring a hosted database, authentication, storage, or realtime service.

Open-source libraries running inside the application are acceptable. Avoid unnecessary operational components, and preserve the existing UI, domain model, and explanatory guidance for new users.

## Proposed architecture

```text
Your server / Docker host
|
+-- Reverse proxy — HTTPS
|
+-- Next.js application
|   +-- Authentication and sessions
|   +-- Permission checks
|   +-- Application operations
|   +-- Attachment handling
|
+-- PostgreSQL — private network only
|
+-- Persistent attachment storage
```

Recommended initial deployment: Docker Compose on a single server, with persistent volumes for PostgreSQL and attachments.

The browser must never connect directly to PostgreSQL. All reads and mutations go through authenticated, authorized server operations.

## Proposed technology choices

| Area | Recommendation |
| --- | --- |
| Deployment | Docker Compose on a project-controlled server |
| HTTPS | Reverse proxy with automated certificate renewal |
| Database | Standard PostgreSQL, not exposed publicly |
| Queries and migrations | Drizzle, with explicit SQL where appropriate |
| Authentication | Self-hosted authentication library; evaluate Better Auth before committing |
| Sessions | Database-backed sessions and secure, HTTP-only cookies |
| Authorization | Centralized server-side permission checks |
| Attachments | Protected local persistent storage initially |
| Discussion updates | Polling initially |
| Notifications | Durable records in PostgreSQL |
| Backups | Automated database and attachment backups, copied off the server |

These are proposed choices. Confirm library compatibility and deployment requirements before implementation. Do not implement password hashing or session security from scratch.

## Scope

### Preserve

- Existing visual refresh and branding.
- Organizations, memberships, roles, and spaces.
- Signals, ownership, participants, forwarding, and related signals.
- Signal-scoped discussions and mentions.
- Following and notification semantics.
- Personal inbox and type-appropriate workflows.
- Manual capture and optional AI-assisted classification.
- Contextual notes, onboarding guidance, and helpful empty/error states.
- React Query where useful for client-side data fetching and cache invalidation.

### Replace or remove

- Supabase authentication and sessions.
- Direct browser-to-Supabase queries and mutations.
- Supabase-specific identity helpers, policies, and database dependencies.
- Supabase Storage access.
- Supabase realtime subscriptions.
- Supabase packages, environment variables, setup instructions, and obsolete migrations.

### Not part of this change

- A new product redesign.
- General chat, private direct messages, or read receipts.
- WebSocket infrastructure unless a demonstrated requirement emerges.
- Multi-server deployment or distributed storage initially.
- Operating a mail server as part of the initial deployment.
- Removing optional AI-provider dependencies; those must be evaluated separately if full offline operation is required.

## Database plan

Create a complete, reproducible schema rather than relying on the current incomplete foundational Supabase migrations.

The schema must cover:

- Users, authentication records, and sessions required by the chosen auth library.
- Organizations and memberships.
- Spaces and relevant membership relationships.
- Signals and participants.
- Comments and mention events.
- Ownership and forwarding records.
- Followers and notifications.
- Attachment metadata.
- Related-signal relationships.

Preserve useful application concepts while removing dependencies on Supabase-managed schemas and functions.

Use foreign keys, uniqueness constraints, indexes, and other database constraints to enforce structural integrity. Define deletion and retention behavior explicitly, including attachment cleanup and account removal.

Separate migration privileges from normal application database privileges. The runtime database role should have only the permissions needed to operate the application.

The existing collaboration migration is a reference for intended behavior, not a migration to apply unchanged to the new database. Its Supabase-specific identity and realtime configuration must not be carried forward blindly.

## Authentication and account provisioning

Use an established authentication library running inside the application. Evaluate Better Auth against the selected Next.js version, deployment model, PostgreSQL integration, and account-provisioning requirements.

Required foundations:

- Secure password handling through the auth library.
- Database-backed sessions.
- Secure, HTTP-only cookies and appropriate same-site behavior.
- Logout and session revocation.
- Login throttling and abuse protection.
- Request validation and CSRF/origin protections appropriate to the chosen endpoints.
- A safe first-administrator bootstrap procedure that cannot be reused after setup.

### Account-creation decision

Choose before implementation:

1. **Administrator-provisioned accounts:** suitable for an internal application. Use a short-lived, single-use setup credential delivered through a trusted channel and require a password change on first login.
2. **Self-registration:** suitable if users must join independently. Define organization joining, verification, recovery, and abuse controls before enabling it.

### Email limitations

Authentication can run locally, but sending email still requires mail infrastructure.

Without email delivery, do not claim to support:

- Email verification.
- Password-reset emails.
- Emailed invitations.

An initial internal deployment may instead use administrator-assisted recovery and secure account setup. Document recovery procedures, audit sensitive actions, and avoid exposing existing passwords or distributing reusable credentials.

If email becomes necessary, choose separately between an existing SMTP server, a delivery provider, or self-hosted mail infrastructure. Do not add a mail server merely to complete this database replacement.

## Server-side application boundary

Replace direct Supabase access with this flow:

```text
UI -> server operation -> validation and permission checks -> PostgreSQL
```

Centralize authorization for:

- Organization membership and cross-organization isolation.
- Roles and management operations.
- Signal visibility and space access.
- Commenting, mentioning, following, forwarding, and assignment.
- Status changes and ownership changes.
- Notification visibility and read/unread updates.
- Attachment upload, download, and deletion.

Never rely on hidden UI controls as the security boundary. Check access to every referenced resource and do not trust organization IDs supplied by clients.

The AI assistant's data-access tools must use the same authorization layer as normal application operations.

Application-side authorization is the proposed primary mechanism. PostgreSQL RLS may be added as defense in depth if justified, but Supabase-specific policies cannot simply be removed without replacement checks. Any future request-scoped database identity must be transaction-local and safe with connection pooling.

## Transactional collaboration behavior

Prefer explicit application-side transactions for collaboration operations, rather than recreating all notification triggers.

For example, posting a reply should atomically:

1. Validate access and input.
2. Save the comment.
3. Save its mention events and any intended participant changes.
4. Determine eligible notification recipients.
5. Create durable notification records.
6. Commit all database changes together.

Preserve these semantics:

- Mention means attention, forward requests input, and assign changes responsibility.
- Creators and newly assigned personal owners are automatically subscribed as defined by the product rules.
- Following controls general reply/status alerts.
- Unfollowing does not suppress direct mentions or assignment notifications.
- Suppress direct self-notifications.
- Deduplicate a mention and generic reply alert for the same recipient and comment without deleting unrelated alerts.
- Space assignments and forwards use the defined primary-space recipient rules.
- Notifications, subscriptions, and participant records must not accidentally grant signal access.
- Opening the Notifications page alone does not mark everything read.
- Read/unread state is separate from resolving work or responding.

Database records are the source of truth. Future realtime delivery must not be required for a notification to exist.

## Attachment storage

Use a persistent local directory outside the public web directory for the initial single-server deployment.

Requirements:

- Store metadata and ownership references in PostgreSQL.
- Generate storage keys server-side; do not trust client filenames as paths.
- Enforce upload size limits and an explicit file-type policy.
- Authorize uploads, downloads, and deletions against the associated resource.
- Serve private files through permission-checked endpoints with safe response headers.
- Handle orphan files and interrupted uploads with cleanup procedures.
- Include attachment files in backups and restore testing.

Filesystem writes and PostgreSQL transactions are not one atomic transaction. Define staging, finalization, and cleanup behavior rather than implying that database rollback also removes uploaded files.

If multiple application servers become necessary, move to shared or S3-compatible storage later. MinIO is an option, not an initial requirement.

## Realtime replacement

Start with polling and React Query cache invalidation:

- Refresh relevant queries immediately after the current user's mutations.
- Poll active discussion threads periodically.
- Poll notification counts and relevant inbox data.
- Refresh when the browser tab becomes active.
- Reduce or pause polling in background tabs.
- Show understandable loading, retry, and connection-error states.

Do not promise typing indicators, presence, or instantaneous delivery. Consider server-sent events later if polling proves insufficient, without changing the durable comment/notification model.

## Deployment and operations

The initial Compose setup should include:

- Application, PostgreSQL, and an HTTPS reverse proxy.
- Private database networking with no public PostgreSQL port.
- Persistent database and attachment volumes.
- Secrets provided outside the repository.
- Health checks and restart policies.
- A controlled migration command or deployment step.
- Documented startup, upgrade, backup, and restore procedures.

Do not bake placeholder database credentials or authentication secrets into release artifacts.

### Backups

- Automate PostgreSQL backups and attachment backups.
- Coordinate them sufficiently to restore usable database/file references.
- Copy backups off the application server; local volumes alone are not backups.
- Define retention, encryption, and access controls.
- Rehearse restoration into a clean environment.

Self-hosting removes hosted-service dependencies but transfers responsibility for upgrades, monitoring, capacity, security, and disaster recovery to the project operator.

## Implementation sequence

### Phase 1 — Confirm operating decisions and inventory integrations

- Choose the hosting environment and confirm persistent-disk support.
- Choose administrator-provisioned accounts or self-registration.
- Decide whether launch requires email delivery.
- Inventory Supabase calls across UI, server code, middleware/proxy, AI tools, storage, tests, and configuration.
- Document the intended permission model and collaboration behavior.
- Verify relevant Next.js documentation before implementation.

### Phase 2 — Build the PostgreSQL foundation

- Add database tooling and the complete schema.
- Create versioned migrations that work on an empty PostgreSQL instance.
- Add a minimal, safe administrator/bootstrap workflow.
- Establish migration and runtime database roles.

### Phase 3 — Implement authentication and authorization

- Integrate the selected self-hosted authentication library.
- Implement sessions, login/logout, and the selected account-creation flow.
- Establish centralized validation and permission helpers.
- Test role boundaries and organization isolation before exposing application operations.

### Phase 4 — Replace application data access

- Move reads and writes behind server operations feature by feature.
- Keep existing UI contracts where practical.
- Implement transactional comments, mentions, assignments, forwards, and notifications.
- Update the AI assistant's data-access tools.
- Preserve helpful guidance and error handling beside relevant controls.

### Phase 5 — Replace storage and live updates

- Implement protected local uploads/downloads and cleanup.
- Replace Supabase subscriptions with polling and invalidation.
- Document actual update timing and notification behavior.

### Phase 6 — Remove Supabase

- Remove Supabase packages and adapters.
- Remove Supabase-specific environment variables and configuration.
- Replace obsolete migrations with the complete PostgreSQL migration history.
- Update setup documentation and deployment configuration.
- Verify no runtime path still calls Supabase.

### Phase 7 — Validate deployment readiness

- Deploy from an empty database using only documented steps.
- Run automated checks and authenticated multi-user smoke tests.
- Validate backups by restoring into a clean environment.
- Confirm the application starts and functions without Supabase credentials or network access to Supabase.

Because there is no existing production data, there is no need for data-transfer rehearsal, dual-writing, account-ID mapping, or a production maintenance window. A coherent feature-branch replacement is preferable to maintaining two backends long term.

## Testing and acceptance criteria

### Functional

- Fresh setup creates a usable workspace and administrator safely.
- Users can authenticate, log out, and use the chosen provisioning/recovery flow.
- Capture, search, filtering, inbox, status changes, ownership, and forwarding work.
- Comments, repeated mentions, following, and notifications follow documented semantics.
- Attachment access is protected and persists across restarts.
- AI-assisted features retain the same access boundaries when enabled.

### Security

- One organization cannot read or modify another organization's resources.
- Users cannot impersonate another user through request parameters.
- Non-managers cannot perform restricted management actions.
- Notifications and following do not bypass signal access rules.
- Revoked sessions and removed memberships lose access appropriately.
- Unauthorized attachment requests fail even if a file identifier is known.
- Authentication endpoints have suitable abuse protections.

### Reliability and operations

- Database failures do not leave partially committed collaboration records.
- Upload failures have a documented cleanup path.
- Polling recovers after temporary network failures.
- Production build, TypeScript checks, targeted lint, and tests pass.
- Remaining unrelated lint issues are tracked separately rather than hidden.
- A clean deployment and a backup restoration are both demonstrated.
- No Supabase package, environment variable, or service is required at runtime.

## Decisions still required

1. Where will the application run: an existing VPS, a dedicated server, or another Docker-capable host?
2. Will users self-register or be provisioned by an administrator?
3. Is email delivery required at launch?
4. Does the application need public internet access, private-network access, or both?
5. Is optional hosted AI acceptable, or is fully offline operation also a future goal?

## Recommended starting point

One server, Docker Compose, Next.js, PostgreSQL, an established self-hosted authentication library, and a persistent attachments volume. Start with polling, protected local storage, centralized authorization, and off-server backups. Add infrastructure only when a concrete requirement justifies it.
