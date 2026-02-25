# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Mobile + Desktop Dairy ERP Solution for Indian dairy businesses handling milk collection, fat/SNF calculation, farmer payments, customer billing, SMS alerts, inventory, and multi-branch management.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, i18next, Recharts, Axios
- **Backend**: FastAPI, MongoDB (motor), JWT (python-jose), bcrypt
- **AI/OCR**: OpenAI GPT-4o via Emergent LLM key (emergentintegrations)
- **PWA**: Service worker + manifest.json for mobile install

## User Personas
- Dairy owner/admin managing one or more branches
- Operators entering daily milk collection data
- Farmers receiving bills and payment notifications

## Core Requirements (All Implemented)

### 1. User Authentication ✅
- JWT-based registration and login
- Role-based access (admin, operator)

### 2. Bilingual UI (Hindi/English) ✅
- Language toggle in sidebar
- All pages support both languages via i18next

### 3. Dashboard ✅
- Today's stats (milk, farmers, payments, avg fat)
- Morning/Evening shift breakdown
- Weekly trend chart
- Quick action buttons

### 4. Daily Milk Collection ✅
- Morning/Evening shift entry
- Auto Fat/SNF/Rate calculation
- Duplicate entry prevention
- Farmer balance auto-update

### 5. Farmer Account Management ✅
- Full CRUD with ledger view
- Balance tracking (due, paid, pending)
- Bank details, Aadhar, village info

### 6. Customer Sales System ✅
- Customer CRUD
- Product-based sales
- Daily sales summary

### 7. Inventory & Product Management ✅
- Product creation with stock
- Stock auto-update on sale
- Low stock alerts

### 8. Fat & SNF Rate Management ✅
- Rate chart CRUD (multiple charts, default chart)
- Auto SNF calculation from Fat
- **AI OCR Upload** - Extract rates from photos using GPT-4o

### 9. Billing & Printing ✅
- **Thermal printer format** (58mm/80mm, monospace, dashed borders)
- **A4 professional invoice** (branded, with summary grid)
- HTML bill generation
- WhatsApp bill sharing via wa.me link

### 10. SMS Automation ✅ (MOCKED - needs MSG91 API key)
- Template editor in Settings
- Collection and payment SMS templates
- MSG91 integration ready (needs API key)

### 11. Daily Sales & Expense Tracking ✅
- Expense CRUD with categories
- Expense summary with totals
- Profit calculation in monthly report

### 12. Multi-Branch Management ✅
- Branch CRUD (name, address, manager, phone)

### 13. Advanced Reports & Analytics ✅
- Daily report (collections by date)
- Farmer report (individual summary)
- Fat Average report (farmer-wise)
- Farmer Ranking (by quantity/amount/fat)
- Monthly Summary (milk, sales, expenses, net profit)
- **CSV/Excel Export** for all data types

### 14. Bulk Upload ✅
- CSV paste upload (collections + farmers)
- Excel/CSV file upload (.xlsx, .csv)
- Template download
- Error reporting with details

### 15. Payment System ✅
- Cash, UPI, Bank transfer modes
- Payment types (payment, advance, deduction)
- Farmer balance auto-update

### 16. Settings ✅
- Dairy info (name, phone, address)
- SMS template editor

### 17. PWA (Mobile App) ✅
- manifest.json with dairy branding
- Service worker for offline caching
- Installable on Android, iOS, macOS, Windows

## API Endpoints (All under /api prefix)
- Auth: /api/auth/register, /api/auth/login, /api/auth/me
- Farmers: /api/farmers (CRUD)
- Collections: /api/collections (CRUD + bulk)
- Payments: /api/payments (CRUD)
- Customers: /api/customers (CRUD)
- Sales: /api/sales (CRUD)
- Products: /api/products (CRUD)
- Expenses: /api/expenses (CRUD + summary)
- Branches: /api/branches (CRUD)
- Rate Charts: /api/rate-charts (CRUD + OCR upload)
- Reports: /api/reports/daily, fat-average, farmer-ranking, monthly-summary, farmer/{id}
- Export: /api/export/collections, farmers, payments, sales, expenses
- Bills: /api/bills/farmer/{id}, thermal/{id}, a4/{id}
- Settings: /api/settings/dairy, sms-templates
- Bulk: /api/bulk/collections, farmers, upload-file, template/{type}
- Share: /api/share/farmer-bill/{id}
- Dashboard: /api/dashboard/stats, weekly-stats

## Testing Status
- Backend: 100% (76/76 tests passed)
- Frontend: 100% UI verified
- Test reports: /app/test_reports/iteration_1.json, iteration_2.json, iteration_3.json

## Mocked Services
- MSG91 SMS: Mocked (needs API key to activate)

## Credentials
- Admin: admin@nirbani.com / admin123
