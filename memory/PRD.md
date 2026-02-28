# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy Management Software (Web PWA) for Indian dairy businesses with bilingual (English/Hindi) UI.

## Key Features (Implemented)
1. Daily Milk Collection (dual cow/buffalo, auto shift)
2. Farmer Management (CRUD, edit/delete, A-Z sorted, duplicate prevention)
3. Customer Management (CRUD, edit/delete, A-Z sorted, duplicate prevention)
4. Customer Milk Sale System with searchable dropdown, edit/delete per entry
5. Collection entries with edit/delete per entry
6. Inventory & Product Management
7. Fat & SNF Rate Management
8. Billing — Farmer & Customer bills (Monthly/15 Days/Custom), Print/Share Image
9. Live Data Entry on Billing Page — Add/edit/delete entries while generating bills
10. Holiday marking on customer bills
11. Digital stamp + logged-in user signature on bills
12. Dairy info (name/phone/address) from Settings on bills
13. Multi-day repeat for customer sale entries
14. SMS Automation (MSG91 - INACTIVE)
15. Daily Sales & Expense Tracking
16. Multi-Branch Management
17. Reports & Analytics
18. Bulk Milk Sale to Dairy Plant
19. Shop Sales with Udhar (Credit) System
20. Separate Admin Panel (/backman/*)
21. Direct Amount entry for all sales
22. Bulk Orders for Hotels, Caterers

## Credentials
- Admin: nirbanidairy@gmal.com / Nirbani0056!
- Staff: newstaff@dairy.com / staff123

## Upcoming Tasks
- P1: Refactor backend/server.py monolith into modular routers/models
- P2: Customer Subscription System (monthly auto-billing)
- P2: DLT Registration Guide
- P3: Software Licensing System

## Architecture
- Frontend: React, Tailwind CSS, Shadcn/UI, i18next, Recharts, PWA
- Backend: FastAPI (monolithic server.py), MongoDB (motor), ReportLab (PDF)
- Auth: JWT-based, role-based (admin/staff)
