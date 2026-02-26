# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy ERP system for Indian dairy businesses handling milk collection, fat/SNF calculation, farmer payments, customer billing, SMS alerts, inventory, and multi-branch management. Bilingual (Hindi/English) PWA.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, i18next, Recharts, PWA
- **Backend**: FastAPI, MongoDB (motor), openpyxl, emergentintegrations (OpenAI), python-jose
- **Deployment**: AWS EC2, Nginx, PM2

## Core Features (All Implemented)
1. Daily Milk Collection System (Bulk upload via Excel/CSV)
2. Farmer Account Management (Edit, SMS notification, printable bill)
3. Customer Milk Sale System (Product-based sale, edit)
4. **Shop Milk Sale** (Walk-in counter sale, no customer account needed)
5. Inventory & Product Management (Stock auto-update, low stock alert)
6. Fat & SNF Rate Management (Upload via PDF/Excel/CSV/Image OCR)
7. Billing & Printing System (Thermal printer, A4, PDF, WhatsApp share)
8. SMS Automation System (Template editor - MSG91 inactive)
9. Daily Sales & Expense Tracking (Profit calculation, Excel export)
10. Multi-Branch Management (Branch-wise data, central dashboard)
11. Advanced Reports & Analytics (Fat average, farmer ranking, profit report)
12. PWA Support (Installable on all devices)
13. Fixed Rate Farmer Support (Hide FAT/SNF fields)

## Dairy Plant Module (Sabar Dairy)
- **Multi-dairy plant management** (Sabar Dairy + future dairies)
- **Daily Dispatch Entry**: tanker number, KG, FAT/SNF/CLR, rate, structured deductions
- **Slip Matching**: Compare dispatch with official dairy slip
- **Dairy Ledger**: Full account per plant with balance tracking
- **Dairy Payments**: Bank/Cheque/UPI/Cash with references
- **Print/Bill**: Dispatch bill (A4 HTML) + Dairy statement print
- **Profit Dashboard**: 
  - Net Profit = (Dispatch + Retail Sales) - Farmer Purchase - Expenses
  - Retail sales card included
  - Milk loss tracking with >1% alert
  - FAT deviation alerts
  - Farmer FAT quality ranking
  - Print button

## Key API Endpoints
- Auth: POST /api/auth/register, /api/auth/login
- Farmers: CRUD /api/farmers, /api/farmers/{id}
- Customers: CRUD /api/customers, /api/customers/{id}
- Collections: GET/POST /api/collections
- **Sales**: GET/POST /api/sales, POST /api/sales/shop
- Dairy Plants: CRUD /api/dairy-plants, /api/dairy-plants/{id}/statement
- Dispatches: CRUD /api/dispatches, /api/dispatches/{id}/bill, /api/dispatches/{id}/slip-match
- Dairy Payments: GET/POST /api/dairy-payments
- Profit: GET /api/dairy/profit-report, /api/dairy/fat-analysis

## Updated Navigation
Dashboard > Collection > Farmers > Dairy Dispatch > Dairy Ledger > Profit > Payments > Expenses > Sales > Reports > Inventory > Branches > Bulk Upload > Rate Chart > Settings

## Backlog
- P2: Customer Subscription System
- P2: DLT Registration Guide for SMS
- P2: MSG91 SMS activation (needs API key)
- P3: Backend refactoring (server.py modularization)
- P3: Licensing system for multi-dairy sales

## Key DB Collections
users, farmers, milk_collections, customers, sales, payments, rate_charts, products, inventory, expenses, branches, dairy_plants, dispatches, dairy_payments
