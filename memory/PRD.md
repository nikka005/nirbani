# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy Management Software (Web PWA) for Indian dairy businesses. Handles milk collection, fat/SNF calculation, farmer payments, customer billing, SMS alerts, inventory, bulk dairy plant sales, and shop sales — all automated with bilingual (English/Hindi) UI.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, i18next, Recharts, PWA
- **Backend**: FastAPI (monolithic server.py), MongoDB (motor), ReportLab (PDFs)
- **AI**: OpenAI GPT-4o for Rate Chart OCR via emergentintegrations
- **Deployment**: User-managed AWS EC2 with Nginx & PM2

## Core Modules Implemented
1. Daily Milk Collection System (with dual cow/buffalo support)
2. Farmer Account Management (CRUD, edit, dual milk types)
3. Customer Milk Sale System
4. Inventory & Product Management
5. Fat & SNF Rate Management
6. Billing & Printing System (ReportLab PDFs)
7. SMS Automation System (MSG91 - inactive, needs API key)
8. Daily Sales & Expense Tracking
9. Multi-Branch Management
10. Advanced Reports & Analytics
11. Bulk Milk Sale to Dairy Plant (dispatch, ledger, profit dashboard)
12. Shop Sales Dashboard (walk-in customers)

## Completed Work
- Full CRUD for Farmers, Customers with Edit dialogs
- Bulk Milk Sale module (DairyDispatchPage, DairyLedgerPage, ProfitDashboardPage)
- Shop Sales dashboard (SalesPage rewrite)
- Dual milk types (cow/buffalo) for farmers with separate fixed rates
- Printing for dispatches, ledgers, profit reports
- Mobile responsiveness improvements
- **Bug Fix (Feb 27, 2026)**: Fixed "both" milk type badge display on FarmersPage, CollectionPage (farmer search dropdown + selected farmer display)

## Key DB Schema
- `farmers`: {..., milk_types: list[str], cow_rate: float, buffalo_rate: float}
- `milk_collections`: {..., milk_type: str}
- `dairy_plants`: {name, address, ...}
- `dispatches`: {dairy_plant_id, date, quantity_kg, avg_fat, ...}
- `dairy_payments`: {dairy_plant_id, date, amount, ...}
- `sales`: Used for both customer and shop sales

## Known Technical Debt
- **backend/server.py is critically monolithic** — needs breaking into /routers, /models, /services

## Upcoming Tasks (Prioritized)
- P2: Customer Subscription System (monthly auto-billing)
- P2: DLT Registration Guide (SMS compliance for India)
- P3: Software Licensing System

## Integrations
- MSG91 SMS: Code exists, inactive (needs user API key)
- ReportLab: Active for PDF generation
- OpenAI GPT-4o: Active for Rate Chart OCR
