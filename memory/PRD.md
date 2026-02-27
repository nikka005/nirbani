# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy Management Software (Web PWA) for Indian dairy businesses. Handles milk collection, fat/SNF calculation, farmer payments, customer billing, SMS alerts, inventory, bulk dairy plant sales, and shop sales — all automated with bilingual (English/Hindi) UI.

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
    ├── App.js           # Routes: user site + admin panel
    ├── context/AuthContext.js  # Default language: English
    ├── components/layout/MainLayout.jsx  # User site nav
    ├── pages/           # User site pages
    │   ├── LoginPage.jsx       # Login only (no register)
    │   ├── CollectionPage.jsx  # Auto shift detection
    │   ├── FarmersPage.jsx     # Dual milk type support
    │   ├── UsersPage.jsx       # User management (admin panel)
    │   └── admin/
    │       ├── AdminLoginPage.jsx    # /backman/login
    │       ├── AdminLayout.jsx       # Dark theme layout
    │       └── AdminDashboardPage.jsx # Stats overview
    └── ...
```

## Admin Panel (/backman/*)
- **Login**: `/backman/login` — Admin-only login (checks role=admin)
- **Dashboard**: `/backman` — System stats overview
- **User Management**: `/backman/users` — Create, deactivate, reset password, delete users
- **Credentials**: nirbanidairy@gmal.com / Nirbani0056! (seeded on startup)
- **Theme**: Dark (zinc-950) with amber accents
- **Session**: Uses `admin_token` in localStorage (separate from user `auth_token`)

## User Site (/)
- Login only (no self-registration)
- Default language: English (toggle available)
- No admin features visible
- Message: "Contact admin for login credentials"

## Key API Endpoints
- POST /api/admin/login (admin-only login, rejects non-admin)
- POST /api/auth/login (user login)
- POST /api/auth/register (admin-only, creates users)
- GET /api/users (admin-only)
- PUT /api/users/{id} (admin-only)
- PUT /api/users/{id}/reset-password (admin-only)
- DELETE /api/users/{id} (admin-only)

## Key DB Schema
- `users`: {id, name, email, phone, password, role (admin/staff), is_active, created_at}
- `farmers`: {..., milk_types, cow_rate, buffalo_rate}
- `milk_collections`: {..., milk_type}
- `dairy_plants`, `dispatches`, `dairy_payments`, `sales`

## Known Technical Debt
- backend/server.py is monolithic — needs refactoring into /routers, /models, /services

## Upcoming Tasks
- P2: Customer Subscription System (monthly auto-billing)
- P2: DLT Registration Guide (SMS compliance for India)
- P3: Software Licensing System
- Backend refactoring

## Integrations
- MSG91 SMS: Code exists, inactive (needs user API key)
- ReportLab: Active for PDF generation
- OpenAI GPT-4o: Active for Rate Chart OCR

## Test Credentials
- Admin: nirbanidairy@gmal.com / Nirbani0056!
- Staff: newstaff@dairy.com / staff123
