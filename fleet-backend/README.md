# Fleet Courier — NestJS API

Production-oriented, multi-tenant REST API for Road Network Transporters / G4S fleet operations.

**Stack:** NestJS 11 · PostgreSQL (schema-per-tenant) · Prisma (public registry) · Redis/BullMQ · JWT

## Quick start

```bash
cd fleet-backend
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/docs`
- Health: `http://localhost:4000/api/v1/health`

## Architecture

```
Client (Next.js / mobile / ERP)
        │  Authorization: Bearer <jwt>
        │  x-tenant-slug: g4s-kenya  (optional if JWT has tenant)
        ▼
   NestJS API  (api/v1)
        │
        ├── public schema  → tenants, users (Prisma)
        └── tenant_* schema → all fleet data (pg + search_path)
                ├── schedules, vehicles, routes, rates
                ├── invoices, work_tickets, deliveries
                ├── drivers, workflow_notifications
                └── reports (aggregations)
```

### Scalability features

| Feature | Implementation |
|---------|----------------|
| Multi-tenancy | Isolated PostgreSQL schema per client |
| Pagination | `?page=1&limit=50` on list endpoints (optional) |
| camelCase JSON | Global response interceptor (matches Next.js types) |
| Async jobs | BullMQ for eTIMS submission |
| Workflow events | `workflow_notifications` + `WorkflowsService` |
| Schema migrations | `prisma/tenant-patches/*.sql` applied on provision & seed |
| API docs | OpenAPI / Swagger at `/docs` |

## Authentication

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenantSlug":"g4s-kenya","username":"admin","password":"admin123"}'
```

Use `Authorization: Bearer <token>` on all protected routes.

## API reference

### Core resources

| Resource | Base path | Methods | Roles |
|----------|-----------|---------|-------|
| Health | `/health` | GET | public |
| Auth | `/auth/login` | POST | public |
| Tenants | `/tenants` | GET, POST | public |
| Schedules | `/schedules` | CRUD | admin |
| Vehicles | `/vehicles` | CRUD | admin |
| Drivers | `/drivers` | CRUD | admin |
| Routes | `/routes` | CRUD | admin |
| Rate cards | `/rate-cards` | CRUD | admin |
| Invoices | `/invoices` | CRUD | admin, client |
| Work tickets | `/work-tickets` | CRUD + actions | admin, client |
| Deliveries | `/deliveries/local`, `/deliveries/safari` | CRUD | admin |
| Notifications | `/notifications` | GET, PATCH, POST | admin, client |
| Workflows | `/workflows/soa` | POST | admin, client |
| Reports | `/reports/*` | GET | admin, client |
| Clients portal | `/clients/*` | GET, POST | client |
| eTIMS | `/etims/invoices/:id/submit` | POST | admin |

### Pagination

List endpoints return a plain array by default. Enable pagination:

```
GET /api/v1/invoices?page=1&limit=20&search=KBL
GET /api/v1/work-tickets?page=1&limit=20&status=sent
```

Response shape when paginated:

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 71, "totalPages": 4 }
}
```

### Work tickets workflow

```
POST   /work-tickets              → create (draft)
PUT    /work-tickets/:id          → update
POST   /work-tickets/:id/share    → draft → sent (notifies G4S)
POST   /work-tickets/:id/approve  → sent → approved
DELETE /work-tickets/:id          → draft only
GET    /work-tickets/next-serial  → next serial number
```

### Invoices workflow

```
GET  /invoices/next-number  → next invoice number
PUT  /invoices/:id { "status": "sent" }  → triggers eTIMS queue + notifications
```

### Client portal shortcuts

```
GET  /clients/invoices/pending
POST /clients/invoices/:id/approve
POST /clients/invoices/:id/reject
GET  /clients/work-tickets
GET  /clients/work-tickets/pending
GET  /clients/notifications
```

## Default credentials

| Role | Username | Password | Tenant |
|------|----------|----------|--------|
| Admin | admin | admin123 | g4s-kenya |
| Client | client | client123 | g4s-kenya |

## New tenant

```bash
curl -X POST http://localhost:4000/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{"slug":"acme","name":"Acme Logistics"}'
```

Creates `tenant_acme` schema and runs all SQL templates + patches.

## Frontend integration (when ready)

Point Next.js `fetch` to `http://localhost:4000/api/v1` with JWT. Response fields are **camelCase** (e.g. `invoiceNo`, `serialNo`, `tripDate`, `driverName`).

Replace in-memory `/api/*` routes gradually — resource paths align:

| Frontend | Backend |
|----------|---------|
| `/api/invoices` | `/api/v1/invoices` |
| `/api/work-tickets` | `/api/v1/work-tickets` |
| `/api/notifications` | `/api/v1/notifications` |
| `/api/workflows/soa` | `/api/v1/workflows/soa` |
