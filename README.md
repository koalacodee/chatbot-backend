# SmartHelp — Backend

An internal operations platform for organizations with a departmental hierarchy: task assignment and multi-level approval, employee and fleet management, and a customer-facing support desk backed by a retrieval-augmented chatbot.

Built with NestJS 11 on Fastify. ~88k lines across 32 feature modules, all following the same four-layer architecture.

```
Guests ──► Support tickets ──┐
        └► RAG chatbot ──────┤
                             ├──► NestJS API ──► PostgreSQL
Staff ───► Tasks & approvals ┤                  Redis (queues, cache, OTP)
        ├► Org directory ────┤                  Qdrant (vector search)
        ├► Fleet & licenses ─┤                  FileHub (object storage)
        └► File sharing ─────┘
```

---

## Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Engineering highlights](#engineering-highlights)
- [Module map](#module-map)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Project status](#project-status)

---

## What it does

**For staff** — Supervisors create tasks targeted at a department, a sub-department, or an individual. Tasks move through a review and approval chain whose rules depend on which level they were assigned at. Work can be delegated down the hierarchy, submitted for review, forwarded, rejected, or restarted. Reminders fire on a schedule until the task is closed.

**For the organization** — Departments and sub-departments, supervisor and employee directories with per-role permission sets, employee transfer requests requiring admin approval, promotions, and a fleet register covering vehicles, licenses and violations.

**For customers** — Guests open support tickets without an account (verified by email OTP) and track them by code. A streaming chatbot answers questions from an internal knowledge base before a ticket is ever created.

**Throughout** — File uploads with resumable transfer and signed URLs, shareable attachment groups with their own membership and access tokens, web push and WebSocket notifications, and an activity log feeding a dashboard.

---

## Architecture

Every module follows the same four layers. The dependency rule points inward: `interface` and `infrastructure` both depend on `domain`, and `domain` depends on nothing.

```
src/<module>/
├── domain/                 # No framework imports
│   ├── entities/           # Business objects and their invariants
│   ├── value-objects/      # Email, Password, UUID, Role, Vector
│   ├── events/             # Domain events
│   ├── repositories/       # Abstract classes — used as DI tokens
│   └── services/           # Abstract ports to the outside world
├── application/
│   ├── use-cases/          # One class, one operation, one `execute()`
│   └── listeners/          # Event handlers for side effects
├── infrastructure/
│   ├── repositories/       # Drizzle / Prisma implementations
│   ├── services/           # Concrete adapters (LLM, storage, email)
│   └── queues/             # BullMQ processors
└── interface/
    ├── http/               # Controllers + class-validator DTOs
    └── websocket/          # Socket.IO gateways
```

Ports are declared as **abstract classes** rather than interfaces, so they survive to runtime and work directly as Nest injection tokens:

```ts
// domain/repositories/task.repository.ts
export abstract class TaskRepository {
  abstract findById(id: string): Promise<Task | null>;
  abstract save(task: Task): Promise<Task>;
}

// tasks.module.ts
providers: [{ provide: TaskRepository, useClass: DrizzleTaskRepository }]
```

A use case depends on `TaskRepository` and never learns which database is behind it. This is what made it possible to migrate the task module from Prisma to Drizzle without touching a single use case.

### Cross-cutting conventions

| Concern | Approach |
|---|---|
| Response shape | [JSend](https://github.com/omniti-labs/jsend) envelope via one global interceptor + exception filter |
| Validation | Global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` — unknown fields are rejected, not ignored |
| Authorization | Composite decorators that apply an auth guard and a permission guard together (`@SupervisorPermissions(...)`) |
| Async work | BullMQ over Redis — emails, embeddings, reminders, message persistence |
| Decoupling | `@nestjs/event-emitter` — use cases emit domain events, listeners handle side effects |
| Pagination | Cursor-based, with encoders in `src/common/drizzle/helpers/` |

---

## Engineering highlights

### Three-level task approval

Approval rights are derived from *how the task was assigned*, not from a static role check. The task entity computes its own approval level from which target field is populated, and the use case dispatches to the matching validator.

| Level | Condition | Who can approve |
|---|---|---|
| Department | `targetDepartmentId` is set | Admins only |
| Sub-department | `targetSubDepartmentId` is set | Admins; supervisors of the parent department |
| Individual | `assigneeId` is set | Admins; the employee's direct supervisor or a supervisor of their department |

The sub-department and individual cases require walking the department tree — a supervisor managing a parent department implicitly manages everything beneath it. That traversal lives in a dedicated `DepartmentHierarchyService` so the rule is stated once.

Layered on top: delegation (a supervisor hands a task to a sub-department, which produces its own submission and approval cycle), forwarding of delegation submissions up the chain, and a restart path that resets a rejected task without losing its history.

Detailed writeup: [`src/task/docs/three-level-approval-system.md`](src/task/docs/three-level-approval-system.md)

### Agentic RAG, not retrieve-then-generate

The chatbot doesn't prepend retrieved context to the prompt. It exposes a single `search` tool to the model and lets it decide when internal knowledge is needed:

```
POST /chat  ─►  SSE stream
                 │
                 ├─ model decides: does this need internal knowledge?
                 │      └─ yes ─► search(query) ─► Qdrant kNN ─► chunk text
                 │                                    └─► fed back, generation resumes
                 └─ tokens streamed to the client as they arrive
```

Knowledge chunks are embedded with Qwen (2048 dimensions) through a BullMQ worker, stored as points in Qdrant with the row kept in Postgres, and re-embedded automatically when the source FAQ changes — a domain event on the question module triggers the listener. Conversations persist for guests across sessions via an anonymous ID cookie.

The system prompt forces a tool call on the first turn for anything possibly organization-specific, which is what keeps the model from confidently inventing internal policy.

### File pipeline

Uploads never pass through this service. The API mints a scoped upload token, the client transfers directly to the FileHub service over TUS (resumable), and a webhook confirms completion — at which point an event fires and the attachment row is written.

```
client ──► POST /filehub/token ──► API ──► FileHub  (token + expiry)
client ══════ TUS upload ═══════════════► FileHub
                                          FileHub ──► POST /filehub/webhook/uploaded ──► API
                                                                                          └─► FilehubUploadedEvent
                                                                                              └─► attachment persisted
client ◄── signed GET URL ◄── API ◄────── FileHub
```

Attachment groups build on this: a shareable collection with its own member list, per-member department scoping, an independent JWT strategy for member access, OTP re-authentication, and live membership updates over Socket.IO.

### Two auth stacks, deliberately separate

Staff and guests have different lifecycles, so they get different Passport strategies, secrets, cookie names and refresh flows. Each strategy explicitly rejects the other's tokens by role claim, so a guest token can never authenticate a staff route even if the secrets were somehow shared.

---

## Module map

| Module | Purpose | Notable |
|---|---|---|
| `v2/tasks` | Tasks, delegation, submissions, presets | Current task implementation; Drizzle |
| `task` | Previous task implementation | Being retired — see [Project status](#project-status) |
| `support-tickets` | Guest tickets, assignment, answering, export | Redis-backed OTP verification, CSV export |
| `filehub` | Uploads, signed URLs, attachment groups | External storage service, TUS, webhooks |
| `department` | Departments and sub-departments | Hierarchy and visibility rules |
| `employee` / `supervisor` / `driver` | Staff directory | Invitation flows via email |
| `questions` | FAQs with ratings and view tracking | Emits events that re-embed the knowledge base |
| `knowledge-chunks` | Vector knowledge base | Qwen embeddings, Qdrant points |
| `chat` | RAG chatbot | SSE streaming, tool calling |
| `rbac` | Permission decorators and guards | Composite auth + permission decorators |
| `auth` | Staff and guest authentication | Separate JWT stacks |
| `notification` | Web push and in-app notifications | Recipient resolution by role and department |
| `dashboard` / `activity-log` | Analytics and audit trail | Aggregated activity feed |
| `vehicle` / `vehicle-license` / `violation` | Fleet register | Scheduled license expiry sweep |
| `common` | Database clients, JSend, Qdrant, push | Global modules |

---

## Getting started

### Prerequisites

- Node.js 20+ and pnpm
- PostgreSQL 14+
- Redis 6+
- Qdrant (only needed for the chatbot and knowledge base)

### Setup

```bash
pnpm install
cp .env.example .env          # then fill in — see Configuration below
pnpm exec prisma generate
```

Apply the schema. Drizzle owns the runtime migrations:

```bash
export DRIZZLE_MIGRATIONS_FOLDER=./src/common/drizzle
pnpm exec drizzle-kit migrate
```

> **Note:** migrations run automatically at boot, but only when `DRIZZLE_MIGRATIONS_FOLDER` is set. It is set inside the Docker image; for local development you need to export it yourself or run the command above.

### Run

```bash
pnpm start:dev        # watch mode
pnpm start:prod       # from dist/
```

The API listens on `PORT` (8080) under the `API_PREFIX` (`api/v1`). Interactive docs at `/api/docs`.

### Docker

```bash
docker build -t smarthelp-backend .
docker run --env-file .env -p 8080:8080 smarthelp-backend
```

---

## Configuration

`.env.example` is the starting point, but it has drifted from the code. The table below is authoritative — everything marked **required** is read with `getOrThrow` or fails on first use.

### Core

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `PORT` | | Defaults to `3000`; `8080` in Docker |
| `API_PREFIX` | ✅ | e.g. `api/v1` |
| `NODE_ENV` | | `production` disables pretty logging |
| `CORS_ORIGINS` | ✅ | Comma-separated |
| `CORS_METHODS` | ✅ | Comma-separated |
| `DRIZZLE_MIGRATIONS_FOLDER` | | Path to migrations; boot migration is skipped if unset |

### Authentication

| Variable | Required | Notes |
|---|---|---|
| `USER_ACCESS_TOKEN_SECRET` | ✅ | Staff access tokens (30 min) |
| `USER_REFRESH_TOKEN_SECRET` | ✅ | Staff refresh tokens (7 days) |
| `GUEST_ACCESS_TOKEN_SECRET` | ✅ | Guest access tokens |
| `GUEST_REFRESH_TOKEN_SECRET` | ✅ | Guest refresh tokens |
| `ATTACHMENT_GROUP_MEMBER_ACCESS_TOKEN_SECRET` | ✅ | Attachment group member access |
| `COOKIE_SECRET` | | Falls back to a hardcoded default — **set this** |
| `COOKIE_SECURE` / `COOKIES_SECURE` | | Both names are read in different places |
| `COOKIES_SAMESITE` | | Defaults to `strict` |

### Infrastructure

| Variable | Required | Notes |
|---|---|---|
| `REDIS_HOST`, `REDIS_PORT` | ✅ | Queues, cache, OTP storage |
| `REDIS_PASSWORD`, `REDIS_USER`, `REDIS_IP_FAMILY` | | `REDIS_IP_FAMILY` defaults to `4` |
| `QDRANT_URL` | | Defaults to `http://localhost:6333` |
| `QDRANT_API_KEY` | | |

### External services

| Variable | Required | Notes |
|---|---|---|
| `FILEHUB_BASE_URL`, `FILEHUB_API_KEY` | ✅ | Required for all file operations |
| `RESEND_API_KEY`, `RESEND_FROM` | ✅ | Transactional email |
| `MOONSHOT_API_URL`, `MOONSHOT_API_KEY`, `MOONSHOT_KIMI_MODEL` | ✅ | Chatbot |
| `MOONSHOT_KIMI_TEMPERATURE`, `MOONSHOT_KIMI_N`, `MOONSHOT_KIMI_TOOL_CHOICE` | | Default `0.5`, `1`, `auto` |
| `DASHSCOPE_API_KEY`, `QWEN_EMBEDDING_API_URL`, `QWEN_EMBEDDING_MODEL_ID` | ✅ | Embeddings |
| `QWEN_MT_TYPE` | | Translation model tier |
| `OSS_*` (5 vars), `OSS_TIMEOUT` | | Only when `FILE_MANAGEMENT_SERVICE=oss` |
| `DASHBOARD_URL` | ✅ | Base URL used in invitation emails |
| `SHARE_LINK_EXPIRY`, `SHARE_LINK_KEY_LENGTH` | | Attachment share links |

Variables still listed in `.env.example` but no longer read by any code: `ACCESS_JWT_SECRET`, `REFRESH_JWT_SECRET`, `THROTTLER_TTL`, `THROTTLER_LIMIT`, `VAPID_*`, `MORGAN_FORMAT`, `BASE_URL`, `COOKIE_DOMAIN`, `GUEST_TTL`, `CHATBOT_*`, `CLASSIFYING_THRESHOLD`.

---

## Project status

This is an actively developed application, not a finished product, and it carries the debt that comes with building a wide feature set quickly. Documenting it here rather than leaving it to be discovered:

**Two ORMs.** The project started on Prisma and is migrating to Drizzle for its better composition of dynamic queries and its lighter runtime. Drizzle owns the boot-time migrations and all newer modules; 42 files still use Prisma. Both hold their own model of the same schema with nothing enforcing agreement, which is the main risk. The migration is per-module and ongoing.

**Two task modules.** `src/v2/tasks` is a rewrite of `src/task` on Drizzle with a reworked delegation model. Both are currently mounted so existing clients keep working. `src/task` is scheduled for removal once traffic to the v1 routes reaches zero.

**Test coverage.** Currently none, and Jest is misconfigured to look in `src/` where no spec files live. This is the top priority — starting with the RBAC guards, the token lifecycle, and the approval state machine, which are the three places where a silent bug does the most damage.

**Operational hardening.** The service is missing several things it needs before it can be run comfortably in production: environment validation at boot, health and readiness endpoints, graceful shutdown, rate limiting on the auth and chat endpoints, retry policies on the BullMQ queues, and timeouts on outbound calls to FileHub and the LLM.

**Type strictness.** `strictNullChecks` and `noImplicitAny` are off, and seven Prisma repositories carry `@ts-nocheck`. The plan is a stricter secondary tsconfig covering the newer modules, widened as older ones are cleaned up — most of those `@ts-nocheck` files disappear with the Prisma migration anyway.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm start:dev` | Watch mode |
| `pnpm start:prod` | Run the compiled build |
| `pnpm build` | Compile to `dist/` |
| `pnpm lint` | ESLint with `--fix` |
| `pnpm format` | Prettier |
| `pnpm exec drizzle-kit generate` | Generate a migration from schema changes |
| `pnpm exec drizzle-kit migrate` | Apply pending migrations |

## Stack

NestJS 11 · Fastify 5 · TypeScript 5.9 · PostgreSQL · Drizzle ORM · Prisma · Redis · BullMQ · Qdrant · Socket.IO · Passport JWT · class-validator · React Email + Resend · OpenAI SDK · Docker
