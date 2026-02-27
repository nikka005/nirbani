# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy ERP system for Indian dairy businesses. Bilingual (Hindi/English) PWA.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Recharts, PWA
- **Backend**: FastAPI, MongoDB (motor), openpyxl, emergentintegrations (OpenAI)
- **Deployment**: AWS EC2, Nginx, PM2

## All Implemented Features
1. Daily Milk Collection (Bulk Excel/CSV upload)
2. Farmer CRUD with Edit (milk type, fixed rates, bank details)
3. **Both Cow + Buffalo support per farmer** with separate rates (cow_rate, buffalo_rate)
4. Customer CRUD with Edit
5. Shop Milk Sale (walk-in counter sale)
6. Inventory & Product Management
7. Fat & SNF Rate Management (OCR upload)
8. Billing (Thermal, A4, PDF, WhatsApp)
9. Multi-Branch Management
10. PWA Support
11. Fixed Rate support (hides FAT/SNF when applicable)

## Dairy Plant Module
- Multi-dairy plant management (Sabar Dairy)
- Dispatch entries with structured deductions
- Slip Matching (your calc vs dairy slip)
- Dairy Ledger with balance tracking
- Dairy Payments (Bank/Cheque/UPI/Cash)
- Dispatch bill print (A4 HTML)
- Dairy statement print
- Profit Dashboard with retail sales, milk loss, FAT deviation, farmer ranking, print

## Key API Endpoints
- Farmers: CRUD + cow_rate/buffalo_rate
- Sales: POST /api/sales/shop (walk-in)
- Dispatch: CRUD + /api/dispatches/{id}/bill + slip-match
- Dairy: /api/dairy-plants/{id}/statement, /api/dairy/profit-report, /api/dairy/fat-analysis

## Navigation
Dashboard > Collection > Farmers > Dairy Dispatch > Dairy Ledger > Profit > Payments > Expenses > Sales > Reports > Inventory > Branches > Rate Chart > Settings

## Backlog
- P2: Customer Subscription System
- P2: SMS activation (MSG91)
- P3: Backend refactoring
- P3: Licensing system
