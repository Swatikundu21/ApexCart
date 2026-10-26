# ApexCart Enterprise E-Commerce Portal v2.4

Runnable local portal: Express + SQLite backend and a single-page storefront with customer checkout and merchant admin.

## Quick start

```bash
npm install
npm run seed
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

| Role     | Email                 | Password  |
|----------|-----------------------|-----------|
| Admin    | admin@apexcart.com    | admin123  |
| Customer | alex@example.com      | user123   |

## What is included

- Product catalog with search and category filters
- Cart, checkout, and order history with tracking codes
- JWT login / register
- Admin dashboard: inventory, safety-stock alerts, recent orders
- SQLite schema and seed data (`src/config/schema.sql`, `src/config/seed.js`)
- Project report in `docs/project-report.md`

## API

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| GET | `/api/products` | — |
| PUT | `/api/products/:id/stock` | Admin JWT |
| POST | `/api/orders` | JWT |
| GET | `/api/orders` | JWT |
| GET | `/api/admin/orders` | Admin JWT |

This local edition uses SQLite instead of the PostgreSQL/MongoDB/Kafka stack described in the report, so you can run the full shop without cloud services.
