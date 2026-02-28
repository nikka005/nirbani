# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy Management Software (Web PWA) for Indian dairy businesses with bilingual (English/Hindi) UI.

## Key Features (Implemented)
1. Daily Milk Collection (dual cow/buffalo, auto shift)
2. Farmer Management (CRUD, dual milk types)
3. Customer Milk Sale System with searchable dropdown
4. Inventory & Product Management
5. Fat & SNF Rate Management
6. Billing — Farmer & Customer bills (Monthly/15 Days/Custom), Print/Share, Nirbani branding
7. **Live Data Entry on Billing Page** — Add missing milk/sale entries directly while generating bills (historical dates supported)
8. **Delete entries from bill** — Trash icon on each entry row with confirmation and auto-refresh
9. **Multi-day repeat for customer sales** — Add same sale entry for multiple consecutive days at once
10. SMS Automation (MSG91 - INACTIVE, requires API key)
11. Daily Sales & Expense Tracking
12. Multi-Branch Management
13. Reports & Analytics
14. Bulk Milk Sale to Dairy Plant
15. Shop Sales with Udhar (Credit) System
16. Separate Admin Panel (`/backman/*`)
17. Direct Amount entry for all sales
18. Bulk Orders for Hotels, Caterers, Halwai

## Billing System
- `/billing` page with Farmer Bill / Customer Bill tabs
- 3 periods: Monthly, 15 Days, Custom date range
- Date-wise table with all product/milk details
- Summary: totals, payments, balance due
- Print / Share buttons
- NIRBANI DAIRY branding header
- **Live Entry**: Add Collection (farmer) or Sale (customer) entries with historical date support
- **Delete Entry**: Trash icon on each row, confirms before deleting, auto-refreshes bill
- **Repeat Days**: Customer sale dialog has "Repeat for how many days?" field (1-31 days)
- **Cache-busting**: Bill always fetches fresh data from server

## Credentials
- Admin: nirbanidairy@gmal.com / Nirbani0056!
- Staff: newstaff@dairy.com / staff123

## Technical Debt (P1)
- backend/server.py monolith needs refactoring into routers, models, services
- SalesPage.jsx is very large, should be broken into smaller components

## Upcoming Tasks
- P1: Refactor backend/server.py into modular FastAPI project structure
- P2: Customer Subscription System (monthly auto-billing)
- P2: DLT Registration Guide (for SMS compliance in India)
- P3: Software Licensing System

## Architecture
- Frontend: React, Tailwind CSS, Shadcn/UI, i18next, Recharts, PWA
- Backend: FastAPI (monolithic server.py), MongoDB (motor), ReportLab (PDF)
- Auth: JWT-based, role-based (admin/staff)
- Admin panel: /backman/* routes
