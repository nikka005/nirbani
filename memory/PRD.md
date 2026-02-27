# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy Management Software (Web PWA) for Indian dairy businesses. Handles milk collection, fat/SNF calculation, farmer payments, customer billing, SMS alerts, inventory, bulk dairy plant sales, shop sales with udhar (credit) tracking — all automated with bilingual (English/Hindi) UI.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Recharts, PWA
- **Backend**: FastAPI (monolithic server.py), MongoDB (motor), ReportLab (PDFs)
- **AI**: OpenAI GPT-4o for Rate Chart OCR via emergentintegrations
- **Deployment**: User-managed AWS EC2 with Nginx & PM2

## Architecture
```
/app/
├── backend/
│   ├── server.py        # Monolithic FastAPI app
│   ├── sms_service.py   
│   └── bill_service.py  
└── frontend/src/
    ├── App.js           # Routes: user site + /backman admin panel
    ├── context/AuthContext.js  # Default language: English
    ├── pages/
    │   ├── LoginPage.jsx       # Login only (no register)
    │   ├── CollectionPage.jsx  # Auto shift detection
    │   ├── SalesPage.jsx       # Shop sales + Udhar + Customers
    │   ├── UsersPage.jsx       # Admin user management
    │   └── admin/
    │       ├── AdminLoginPage.jsx
    │       ├── AdminLayout.jsx
    │       └── AdminDashboardPage.jsx
    └── ...
```

## Key Features (Feb 27, 2026)
1. **Separate Admin Panel** at `/backman/*` with dark theme
2. **Default Language: English** (Hindi toggle available)
3. **Self-registration disabled** — admin creates users
4. **Auto Shift Detection** — Morning/Evening based on time
5. **Shop Sale Udhar (Credit) System**:
   - Walk-in customers saved with name + phone
   - Cash/Udhar toggle on shop sale dialog
   - Track pending amount per customer
   - Record payments against credit
   - Full ledger/history per customer
6. All existing modules: Collection, Farmers, Customers, Payments, Reports, etc.

## Key DB Collections
- `users`: {id, name, email, phone, password, role, is_active}
- `walkin_customers`: {id, name, phone, pending_amount, total_purchases, total_paid}
- `udhar_payments`: {id, walkin_customer_id, amount, notes, date}
- `sales`: {..., is_shop_sale, is_udhar, customer_id (walkin_customer_id for udhar)}
- `farmers`, `milk_collections`, `customers`, `dairy_plants`, `dispatches`, `dairy_payments`

## Key API Endpoints
- POST /api/admin/login (admin-only login)
- POST/GET /api/walkin-customers
- GET /api/walkin-customers/{id} (detail + ledger)
- POST /api/udhar-payments
- POST /api/sales/shop (updated with is_udhar + walkin_customer_id)
- POST /api/auth/register (admin-only)
- GET/PUT/DELETE /api/users

## Known Technical Debt
- backend/server.py is monolithic — needs refactoring

## Upcoming Tasks
- P2: Customer Subscription System (monthly auto-billing)
- P2: DLT Registration Guide (SMS compliance)
- P3: Software Licensing System
- Backend refactoring

## Credentials
- Admin: nirbanidairy@gmal.com / Nirbani0056!
- Staff: newstaff@dairy.com / staff123
