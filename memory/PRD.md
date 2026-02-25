# Nirbani Dairy Management System - PRD

## Original Problem Statement
Complete Dairy Management Software for Indian dairy businesses handling:
- Daily milk collection (Morning/Evening)
- Fat/SNF calculation and rate management
- Farmer account management and payments
- Billing and reports
- SMS automation
- Multi-branch management

## User Personas
1. **Dairy Owner/Admin** - Manages overall operations, views reports
2. **Collection Staff** - Records daily milk collections at centers
3. **Accountant** - Manages farmer payments and ledgers
4. **Branch Manager** - Oversees branch-level operations

## Core Requirements (Static)
- JWT-based authentication
- Bilingual Hindi/English UI
- Mobile-first responsive design
- Fat/SNF-based rate calculation
- Real-time farmer ledger tracking
- Morning/Evening shift collection

## What's Been Implemented (Phase 1 - MVP)

### Backend (FastAPI + MongoDB)
- [x] User authentication (register/login) with JWT
- [x] Farmer CRUD operations with ledger tracking
- [x] Milk collection system with automatic rate calculation
- [x] Rate chart management (manual entry)
- [x] Payment recording and tracking
- [x] Dashboard statistics API
- [x] Daily and farmer reports

### Frontend (React + Tailwind + Shadcn)
- [x] Login/Register with bilingual UI
- [x] Dashboard with stats and weekly charts
- [x] Milk collection page with Morning/Evening toggle
- [x] Farmers list and detail pages
- [x] Payment management
- [x] Rate chart management
- [x] Reports (Daily and Farmer)
- [x] Responsive mobile-first design

### Design Implementation
- [x] Emerald green (#047857) + Lime (#84cc16) color palette
- [x] Manrope + Mukta fonts for Hindi support
- [x] Large touch targets (44px minimum)
- [x] Card-based mobile layout

## Prioritized Backlog

### P0 (Critical - Next Phase)
- [ ] MSG91 SMS integration for collection/payment notifications
- [ ] PDF bill generation and WhatsApp share
- [ ] Offline mode with sync

### P1 (Important)
- [ ] Customer sales module
- [ ] Inventory management
- [ ] Multi-branch support
- [ ] Bulk upload via Excel/CSV

### P2 (Nice to Have)
- [ ] AI OCR for rate chart scanning
- [ ] Mobile apps (Android/iOS)
- [ ] Advanced analytics
- [ ] Expense tracking

## Next Tasks
1. Integrate MSG91 SMS for collection confirmations
2. Add PDF bill generation
3. Implement offline caching with service workers
4. Add customer sales module
5. Multi-branch setup

## Technical Architecture
- **Backend**: FastAPI 0.110.1, Motor (MongoDB async)
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Database**: MongoDB
- **Auth**: JWT with bcrypt password hashing
- **Charts**: Recharts

## Date Log
- **2026-02-25**: Initial MVP implementation completed
  - Full authentication flow
  - Farmer management with ledger
  - Milk collection with rate calculation
  - Payment tracking
  - Dashboard and reports
  - Bilingual Hindi/English UI
