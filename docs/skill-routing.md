# Skill routing — Gourmand

Which installed Claude Code skill to use for which task. Pick by the task at
hand; never run every skill on every change. Read a skill's installed
`SKILL.md` before applying it. All skills live in `~/.claude/skills/<name>/`.

## Priority when guidance overlaps

1. The user's explicit requirements and approved content.
2. Repo instructions (`AGENTS.md`: read `node_modules/next/dist/docs/` before
   writing Next.js code — this is Next 16, not the Next you remember).
3. The existing brand: Playfair Display headings + Manrope body (README's
   "Fraunces" is stale), terracotta / olive / gold / cream tokens in
   `src/app/globals.css`, real dish photography, Bulgarian copy.
4. Working product behaviour (menu JSON, cart, `/api/order` validation).
5. Other skills as supporting checks only.

Keep one design direction. Skills refine it; they do not compete to redesign
it. No wholesale redesign without an approved scope.

## Routing

| Task | Skill (invocation) | Notes |
|---|---|---|
| Product requirements, architecture and backend decisions | `/grill-me` → `grilling` | `grill-me` is user-only (`disable-model-invocation`); it just calls `grilling`. The model invokes `grilling` directly. Small batches of high-impact questions. |
| Design system, type, colour, a11y, responsive rules, admin usability | `ui-ux-pro-max` | Data lookups: `python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <style\|color\|typography\|ux\|…>` |
| Art direction, composition, hierarchy, avoiding templated layouts | `design-taste-frontend` | Scripts need Node 22+ and Chrome/Edge (`node <skill>/scripts/lint.mjs <files>`). Work files go to `.taste-skill/` (gitignore it if used). |
| Building polished components and pages | `frontend-design` | Implementation guidance; stays inside the established direction. |
| Targeted audit, refinement, consistency, final polish | `impeccable` with a sub-command: `/impeccable audit`, `critique`, `polish`, `layout`, `typeset`, `clarify`, `adapt`, `harden`, `optimize`, `document`, `init` | Run `~/.claude/skills/impeccable/scripts/impeccable context` once per session first. Global hooks run its detector after Edit/Write and on Stop. |
| Browser inspection, screenshots, interaction and regression checks | `playwright-cli` | Chrome isn't installed. Use bundled Chromium: `playwright-cli open --config="../.playwright/cli.config.json" http://localhost:3000` (config sits in the parent folder, outside the repo). Baselines: `../baseline-screenshots/`. |
| Finding a skill for a capability we lack (backend work) | `find-skills` | `npx skills find <query>`; check installs, source and stars before installing. Install with `npx skills add <owner/repo> -s <skill> -g -a claude-code --copy -y`, after a backup. |

Extra skills that the UI UX Pro Max installer added (`design`, `design-system`,
`brand`, `banner-design`, `slides`, `ui-styling`) are **not** part of this
routing. Use them only when explicitly asked. `ui-styling` assumes
shadcn/ui, which this project doesn't use.

## Typical flows

- **Visual change to an existing section:** `design-taste-frontend` (direction
  check) → `frontend-design` (build) → `/impeccable polish <target>` →
  `playwright-cli` before/after at 1440×900 and mobile.
- **New admin screen:** `grilling` (scope) → `ui-ux-pro-max` (Operate-mode UX,
  a11y) → `frontend-design` → `/impeccable audit` → `playwright-cli`.
- **Backend feature:** check `docs/backend-scope.md` → the backend skills below →
  `vitest` for the logic → `playwright-cli` for the end-to-end check.

## Backend skills

The confirmed scope is in [docs/backend-scope.md](backend-scope.md). Installed
globally on 2026-10-20 with the Skills CLI (`--copy`), each identical to its
inspected upstream commit.

| Task | Skill (invocation) | Source | Notes |
|---|---|---|---|
| Anything touching Supabase: Auth (owner login, `@supabase/ssr` in Next.js), RLS, Storage (dish photos), CLI, migrations, debugging | `supabase` | supabase/agent-skills @ c9be0e9 | Fetch `supabase.com/changelog.md` first; work through its security checklist (no `user_metadata` in authz, `SECURITY DEFINER` pitfalls, no secret keys in `NEXT_PUBLIC_*`). |
| Writing SQL: schema, constraints, indexes, RLS policies, functions, **atomic portion reservation** (locking, `SKIP LOCKED`, short transactions), importing the menu JSON | `supabase-postgres-best-practices` | supabase/agent-skills @ c9be0e9 | Load before any database change, however small. Rule files: `references/lock-*.md`, `security-rls-*.md`, `schema-*.md`. |
| Stripe Checkout (manual capture), webhooks, idempotency, refunds, keys, test setup | `stripe-best-practices` | stripe/ai @ 579b067 | Checkout Sessions; never pass `payment_method_types`; fulfil from webhooks, not the success page; restricted keys (`rk_`); use a separate **sandbox** for development. It doesn't cover manual capture in detail, so read `docs.stripe.com/payments/place-a-hold-on-a-payment-method.md`. |
| Order emails (owner and customer), domain setup in Cloudflare DNS, delivery webhooks | `resend` | resend/resend-skills @ b2ae7b1 | The SDK returns `{ data, error }` and doesn't throw. Use idempotency keys per order event. Domain records go in `references/domains.md`. |
| Unit tests: pricing, district fees, pickup discount, hours, reservation and refund logic | `vitest` | antfu/skills @ feb0f3a | Generated from Vitest 5.0.1 docs. Anthony Fu is on the Vitest core team. |

Deliberately not installed: `email-best-practices` and `react-email` (Resend's
domain guide already covers SPF/DKIM/DMARC, and plain HTML is enough for six
transactional emails), `stripe-docs` (Stripe docs are readable as `.md` URLs),
and Next.js/Vercel React skills (Next 16 bundles its own docs, which `AGENTS.md`
mandates; Vercel deployment is out of scope for now).

Tooling still needed when implementation starts: Supabase CLI (as a project
dev-dependency), Stripe CLI (for local webhook forwarding), and the `resend` and
`stripe` npm packages. Docker 29.8 is already installed for local Supabase.
