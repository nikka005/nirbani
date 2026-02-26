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
4. Inventory & Product Management (Stock auto-update, low stock alert)
5. Fat & SNF Rate Management (Upload via PDF/Excel/CSV/Image OCR)
6. Billing & Printing System (Thermal printer, A4, PDF, WhatsApp share)
7. SMS Automation System (Template editor - MSG91 inactive, needs API key)
8. Daily Sales & Expense Tracking (Profit calculation, Excel export)
9. Multi-Branch Management (Branch-wise data, central dashboard)
10. Advanced Reports & Analytics (Fat average, farmer ranking, profit report)
11. PWA Support (Installable on all devices)
12. Fixed Rate Farmer Support (Hide FAT/SNF fields for fixed rate farmers)

## NEW: Bulk Milk Sale to Dairy Plant Module (Feb 2026)

### Dairy Dispatch
- Multi-dairy plant management (Sabar Dairy + future dairies)
- Daily dispatch entry: date, tanker number, quantity (KG), FAT%, SNF%, CLR, rate/KG
- Structured deductions: transport, quality penalty, commission, testing charges, other
- Auto-fill from collection data (weighted FAT/SNF average, KG conversion)
- Net receivable calculation
- Auto milk loss tracking (Collection KG vs Dispatch KG with >1% alert)

### Slip Matching
- Enter official dairy slip: FAT, SNF, amount, deductions
- Auto-compare with your dispatch: FAT difference, amount difference
- Identifies dairy-favor vs your-favor amounts
- Balance auto-adjusted on slip match

### Dairy Ledger
- Full account per dairy plant: supplied, billed, paid, balance
- Dispatch history table
- Payment history table
- Payment recording (Bank/Cheque/UPI/Cash) with reference numbers

### Profit Dashboard
- Real net profit: Dispatch Income - Farmer Purchase - Expenses
- Buying rate vs Selling rate comparison with margin/unit
- Milk loss tracking with percentage alerts
- FAT deviation tracking (Collection FAT vs Dispatch FAT) with alerts
- Farmer FAT quality ranking (Good 4%+, Average 3-4%, Low <3%)
- Expense breakdown by category

## Key API Endpoints
- Auth: POST /api/auth/register, POST /api/auth/login
- Farmers: GET/POST /api/farmers, GET/PUT/DELETE /api/farmers/{id}
- Customers: GET/POST /api/customers, GET/PUT /api/customers/{id}
- Collections: GET/POST /api/collections
- **Dairy Plants**: GET/POST /api/dairy-plants, GET/PUT /api/dairy-plants/{id}
- **Dispatches**: GET/POST /api/dispatches, GET/DELETE /api/dispatches/{id}
- **Slip Match**: PUT /api/dispatches/{id}/slip-match
- **Dairy Payments**: GET/POST /api/dairy-payments
- **Dairy Ledger**: GET /api/dairy-plants/{id}/ledger
- **Profit**: GET /api/dairy/profit-report, GET /api/dairy/fat-analysis

## Updated Navigation
Dashboard > Collection > Farmers > Dairy Dispatch > Dairy Ledger > Profit > Payments > Expenses > Sales > Reports > Inventory > Branches > Bulk Upload > Rate Chart > Settings

## Backlog
- **P2**: Customer Subscription System (monthly auto-billing)
- **P2**: DLT Registration Guide for SMS compliance
- **P2**: MSG91 SMS activation (needs API key)
- **P3**: Refactor monolithic backend/server.py into router modules
- **P3**: Licensing system for selling to other dairies

## Key DB Collections
users, farmers, milk_collections, customers, sales, payments, rate_charts, products, inventory, expenses, branches, **dairy_plants**, **dispatches**, **dairy_payments**
