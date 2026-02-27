# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy ERP system for Indian dairy businesses. Bilingual (Hindi/English) PWA.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Recharts, PWA
- Backend: FastAPI, MongoDB (motor), openpyxl, emergentintegrations (OpenAI)
- Deployment: AWS EC2, Nginx, PM2

## Implemented Features
1. Daily Milk Collection (Bulk Excel/CSV, shift-based)
2. Farmer CRUD with Edit, milk_type support (cow/buffalo/both with separate rates)
3. Customer CRUD with Edit
4. **Shop Sales Dashboard** - Quick sale buttons for 8 products (milk, paneer, dahi, ghee, lassi, buttermilk, cream, other), product breakdown, shop vs customer sales tabs
5. Inventory & Product Management
6. Fat & SNF Rate Management (OCR upload)
7. Billing (Thermal, A4, PDF, WhatsApp)
8. Multi-Branch Management
9. PWA Support
10. Fixed Rate per milk type (cow_rate, buffalo_rate)

## Dairy Plant Module
- Multi-dairy plant management (Sabar Dairy)
- Dispatch entries with structured deductions (transport, quality, commission, testing)
- Slip Matching (your calc vs dairy slip)
- Dairy Ledger with balance tracking
- Dispatch bill print + Dairy statement print
- Profit Dashboard: Net Profit = (Dispatch + Retail) - Farmer - Expenses
- Milk loss tracking, FAT deviation alerts, farmer ranking

## Mobile Responsiveness
- All pages verified responsive at 390x844 (iPhone viewport)
- Sales, Profit, Dispatch, Ledger, Collection, Farmers, Dashboard - all responsive

## Navigation
Dashboard > Collection > Farmers > Dairy Dispatch > Dairy Ledger > Profit > Payments > Expenses > Sales > Reports > Inventory > Branches > Rate Chart > Settings

## Backlog
- P2: Customer Subscription System
- P2: SMS (MSG91)
- P3: Backend refactoring
- P3: Licensing system
