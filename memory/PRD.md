# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy ERP system for Indian dairy businesses handling milk collection, fat/SNF calculation, farmer payments, customer billing, SMS alerts, inventory, and multi-branch management. Bilingual (Hindi/English) PWA.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, i18next, Recharts, PWA
- **Backend**: FastAPI, MongoDB (motor), openpyxl, emergentintegrations (OpenAI), python-jose
- **Deployment**: AWS EC2, Nginx, PM2

## Core Features (All Implemented)
1. Daily Milk Collection System (Bulk upload via Excel/CSV)
2. Farmer Account Management (SMS notification, printable bill)
3. Customer Milk Sale System (Product-based sale)
4. Inventory & Product Management (Stock auto-update, low stock alert)
5. Fat & SNF Rate Management (Upload via PDF/Excel/CSV/Image OCR)
6. Billing & Printing System (Thermal printer, A4, PDF, WhatsApp share)
7. SMS Automation System (Template editor - MSG91 inactive, needs API key)
8. Daily Sales & Expense Tracking (Profit calculation, Excel export)
9. Multi-Branch Management (Branch-wise data, central dashboard)
10. Advanced Reports & Analytics (Fat average, farmer ranking, profit report)
11. PWA Support (Installable on all devices)

## What's Been Implemented
- Full farmer CRUD with edit functionality (milk type, fixed rate, bank details)
- Full customer CRUD with edit functionality (name, phone, address, type, GST)
- Milk collection with fat/SNF rate calculation
- Payment management for farmers and customers
- Rate chart management with OCR upload
- Thermal & A4 billing for farmers and customers
- WhatsApp bill sharing
- Multi-branch management
- Bulk upload via Excel/CSV
- Mobile-responsive layout with bottom navigation
- Bilingual UI (Hindi/English)
- Dashboard with summary cards and charts

## Recent Changes (Feb 25, 2026)
- Added Edit button + dialog to FarmerDetailPage (all fields editable)
- Added Edit button + dialog to CustomerDetailPage (name, phone, address, type, GST)
- Added PUT /api/customers/{customer_id} backend endpoint
- All tests passing (100% backend, 100% frontend)

## Key API Endpoints
- Auth: POST /api/auth/register, POST /api/auth/login
- Farmers: GET/POST /api/farmers, GET/PUT/DELETE /api/farmers/{id}
- Customers: GET/POST /api/customers, GET/PUT /api/customers/{id}
- Collections: GET/POST /api/collections
- Sales: GET/POST /api/sales
- Payments: POST /api/payments
- Bills: GET /api/bills/farmer/{id}, /api/bills/thermal/{id}, /api/bills/a4/{id}
- Customer Bills: GET /api/bills/customer/thermal/{id}, /api/bills/customer/a4/{id}
- Rate Charts: CRUD /api/rate-charts, POST /api/rate-chart/ocr-upload
- Dashboard: GET /api/dashboard/stats

## Backlog
- **P2**: Customer Subscription System (monthly auto-billing)
- **P2**: DLT Registration Guide for SMS compliance
- **P2**: MSG91 SMS activation (needs API key)
- **P3**: Refactor monolithic backend/server.py into router modules

## Key DB Collections
- users, farmers, milk_collections, customers, sales, payments, rate_charts, products, inventory, expenses, branches
