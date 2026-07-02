# SmartERP Server

<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=24&pause=1000&color=EC4899&center=true&vCenter=true&width=900&lines=Enterprise-Grade+Backend;Secure+Business+Logic;Prisma+PostgreSQL+Power;API+for+Modern+ERP" alt="SmartERP Server Hero" />
</div>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql&logoColor=white" />
  <img alt="JWT" src="https://img.shields.io/badge/Auth-JWT-EB5424?logo=jsonwebtokens&logoColor=white" />
</p>

> The server side of SmartERP is a robust API foundation for managing companies, ledgers, inventory, vouchers, and reporting flows with clean architecture and business-oriented services.

## What the backend powers

- Secure authentication and protected routes
- Company-scoped business data access
- Ledger and party management
- Voucher lifecycle handling for accounting-style transactions
- Inventory movement tracking and stock updates
- Export-oriented services for reports, invoices, and documents

## Architecture highlights

- Express application structured with clear controllers, services, routes, and middleware
- Prisma schema designed around real ERP concepts such as companies, ledgers, stock, vouchers, and inventory logs
- Validation and error handling layered for reliability
- Modular services that keep business logic organized and scalable

## Core modules

- Auth module
- Company management
- Customer and supplier flows
- Inventory and stock services
- Ledger and voucher services
- Reporting and export services

## Data model

The backend uses a relational model centered on:

- User
- Company
- Ledger
- Unit
- StockItem
- Voucher
- VoucherItem
- InventoryLog

## Tech stack

| Area | Stack |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| Validation | Zod |
| Exports | ExcelJS + PDFKit |
| Testing | Vitest + Supertest |

## Run locally

```bash
cd server
npm install
npm run dev
```

The API runs by default on http://localhost:10000.

## Project structure

```text
server/
├── src/
│   ├── app.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── services/
├── prisma/
│   └── schema.prisma
└── package.json
```

## Why this backend is strong

This backend is built to feel like a serious engine behind a business application: modular, data-aware, secure, and ready for real-world growth.
