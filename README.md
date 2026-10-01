# Cycly Rent & MGR Multi-Business Management Platform

A unified enterprise management and rental platform built for multi-business operations in Mannar, Sri Lanka:
1. **MGR Bicycle POS**: Bicycle, e-bike, and motorcycle fleet rental & retail sales Point of Sale.
2. **MGR Transport**: Multi-modal passenger transport, boat chartering, scheduled trips, and fleet operator marketplace.
3. **PRH (Pesalai Rental Hub)**: Construction equipment, scaffolding, tools, and heavy machinery day-wise rental service.

---

## 🛠️ Mandatory Technology Stack & Development Standards

> [!IMPORTANT]
> **Strict Engineering Policy: Node.js / JavaScript / TypeScript Exclusively**
> - **Languages**: **TypeScript**, **JavaScript**, and **Node.js** are the **exclusive** languages across all layers of this application (Frontend, Local/Dev Server, Cloud Serverless, Edge Functions, Tooling, and Data Migration Scripts).
> - **Prohibition on Python**: **Python is strictly NOT used in this project and MUST NOT be introduced for present or future development**. All business logic, algorithms, background tasks, reporting pipelines, and API integrations must be built in Node.js / TypeScript.

### System Architecture Summary

| Component | Technology | Description |
|---|---|---|
| **Frontend Framework** | **React 19** + **TypeScript** | Responsive Single Page Application (SPA) with role-scoped modular views |
| **Build & Bundler** | **Vite** | Fast dev server, HMR, and optimized production bundling |
| **Styling & Icons** | **Tailwind CSS**, **Lucide Icons** | Multi-theme system (Light & Dark modes, 5 accent colors) |
| **Animation & UX** | **Motion (Framer Motion)**, **Canvas Confetti** | Smooth transitions, modal overlays, interactive feedback |
| **Local Server & Proxy**| **Node.js** + **Express** (`server.js`) | Local runtime environment, dev reverse proxy, and local utilities |
| **Serverless Backend** | **Node.js** (`api/email/send.js`) | Vercel Serverless Function with Nodemailer for transactional email delivery |
| **Edge Functions** | **Deno / TypeScript** (`supabase/functions/`) | Low-latency cloud functions for LankaQR payment generation & callback webhooks |
| **Database & Auth** | **Supabase** (PostgreSQL) | Managed PostgreSQL, Row Level Security, Supabase Auth, real-time sync |

---

## 📖 Module Documentation & Architecture Guides

Detailed specifications, schemas, workflows, and changelogs for each business unit:

- [Bicycle POS Development Guide](file:///Users/absiraiva/Documents/Antigravity/Cycly%20Rent/mgr/BICYCLE_POS_DEVELOPMENT.md): POS fleet inventory, tiered pricing, direct sales, financial statements, and WhatsApp templates.
- [MGR Transport Architecture Guide](file:///Users/absiraiva/Documents/Antigravity/Cycly%20Rent/mgr/MGR_TRANSPORT_DEVELOPMENT.md): Transport marketplace, scheduled trips, vehicle/boat bookings, and owner/driver rosters.
- [PRH Rental Hub Development Guide](file:///Users/absiraiva/Documents/Antigravity/Cycly%20Rent/mgr/PRH_DEVELOPMENT.md): Day-wise construction equipment rental calculation and inventory.
- [Side-Menu & Permissions Guide](file:///Users/absiraiva/Documents/Antigravity/Cycly%20Rent/mgr/SIDE_MENU_AND_PERMISSIONS_GUIDE.md): Role-Based Access Control (RBAC), multi-business access matrix, and persona routing.

---

## 🚀 Running the Project Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the local server and Vite client
npm run dev

# 3. Access in browser
http://localhost:9898
```
