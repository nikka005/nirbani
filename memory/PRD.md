# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy Management Software (Web PWA) for Indian dairy businesses with bilingual (English/Hindi) UI.

## Key Features
1. Daily Milk Collection (dual cow/buffalo, auto shift)
2. Farmer Management (CRUD, dual milk types)
3. Customer Milk Sale System with searchable dropdown
4. Inventory & Product Management
5. Fat & SNF Rate Management
6. **Billing** — Farmer & Customer bills (Monthly/15 Days/Custom), Print/Share, Nirbani branding
7. SMS Automation (MSG91 - inactive)
8. Daily Sales & Expense Tracking
9. Multi-Branch Management
10. Reports & Analytics
11. Bulk Milk Sale to Dairy Plant
12. Shop Sales with Udhar (Credit) System
13. Separate Admin Panel (`/backman/*`)
14. Direct Amount entry for all sales
15. Bulk Orders for Hotels, Caterers, Halwai

## Billing System
- `/billing` page with Farmer Bill / Customer Bill tabs
- 3 periods: Monthly, 15 Days, Custom date range
- Date-wise table with all product/milk details
- Summary: totals, payments, balance due
- Print / Share buttons
- NIRBANI DAIRY branding header

## Credentials
- Admin: nirbanidairy@gmal.com / Nirbani0056!
- Staff: newstaff@dairy.com / staff123

## Technical Debt
- backend/server.py monolith needs refactoring

## Upcoming
- P2: Customer Subscription System
- P2: DLT Registration Guide
- P3: Software Licensing System
