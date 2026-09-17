# strapi-audit-log

Audit log for Strapi 5 admin panels: **who did what, when, from which IP** — one row per mutating
admin request (`entry.*`, `media.*`, `media-folder.*`, `user.*`, `role.*`, `permission.update`,
`content-type.*`, `component.*`, `admin-auth.login|logout|reset`, `audit-log.purge`, `admin.other`),
including failed attempts (4xx). Deleted media rows carry the file name, URL and how many entries
referenced it. Visible on an admin page (side menu → **Audit Log**) with filters, CSV/JSON export,
retention and purge controls. Super Admin only by default (RBAC actions
`plugin::audit-log.read` / `plugin::audit-log.purge`).

## Install

```bash
pnpm add strapi-audit-log   # or npm i / yarn add
```

```ts
// config/plugins.ts
'audit-log': {
  enabled: true,
  config: {
    retentionDays: 180,     // 0 = keep forever; a plugin timer purges older rows every 6 h
    logSuccessOnly: false,  // true = drop 4xx/5xx rows
    excludeActions: [],     // e.g. ['admin-auth.logout']
  },
},
```

Then `pnpm build` (the admin panel bundles the plugin page) and restart Strapi. The
`audit_log_events` table is created on first start.

Developing it in place instead? Copy the repo to `src/plugins/strapi-audit-log`, run
`pnpm install && pnpm build` inside it, and add
`resolve: './src/plugins/strapi-audit-log'` next to `enabled`.

### Reverse proxy

The recorded IP is the **first `X-Forwarded-For` hop**, so it is only reliable evidence when a
trusted proxy in front of Strapi **overwrites** that header with the real client address (never
appends to it) and the Strapi port itself is not reachable directly:

- Caddy: `header_up X-Forwarded-For {remote_host}`
- nginx: `proxy_set_header X-Forwarded-For $remote_addr;` — **not** `$proxy_add_x_forwarded_for`
  (which appends and lets a client spoof the recorded IP)

Also set `proxy: true` in `config/server.ts` so Strapi itself trusts the header.

## Develop

```bash
pnpm install
pnpm test            # vitest unit tests
pnpm build && pnpm verify
```

## Notes

- Rows live in `audit_log_events`, hidden from the Content Manager. Never edited, only purged.
- Request bodies are never stored — only field names, ids and the login email.
- Two people sharing one admin account are told apart by IP + user agent on every row.
- Strapi adds `document_id`, `created_at`, `updated_at`, `published_at`, `created_by_id`,
  `updated_by_id` to every content type; the audited entry's own id is `target_document_id`, not
  `document_id`.