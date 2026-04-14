# Heavenly Harmony: Christian Songs Repository 🎵

Heavenly Harmony is a premium, high-performance web ecosystem designed for managing Christian song presentations and videos with "Visual Excellence." 

This documentation serves as the **Global Source of Truth**. Following the specifications in this README and the [PRD.md](./PRD.md) will result in the exact reconstruction of the application.

## 🏛 Architecture & Stack

### Frontend & Logic
- **Next.js 15+ (App Router)**: Utilizing Server Components and Server Actions.
- **React 19**: Leveraging `useOptimistic` for instantaneous UI updates and `useTransition` for smooth state handling.

### Aesthetic Design System
- **Premium Glassmorphism**: High blur backgrounds (`backdrop-filter: blur(20px)`) with subtle border glows.
- **Spring-Based Motion**: Every transition uses a custom spring physics model (Stiffness: 200, Damping: 10).
- **Safe Zone Responsive**: Native-like mobile experience with safe area inset padding and touch-optimized hit targets.

### Backend Infrastructure
- **Database**: Supabase PostgreSQL for persistent data.
- **Storage**: Supabase Storage Buckets for massive PPT/PDF file handling.
- **Server Actions**: Secure, server-side data mutations bypassing client-side exposure.

## 📂 Master Directory Structure
```text
/
├── .github/workflows/main.yml    # Industry standard CI/CD
├── app/
│   ├── api/                      # Legacy/Utility API routes
│   ├── actions.js                # Core Server Actions (Source of Truth for mutations)
│   ├── globals.css               # Design system & Animation keyframes
│   ├── layout.js                 # Global viewport & font config
│   └── page.js                   # Main application entry (DND Context & Optimistic UI)
├── public/                       # High-res assets & Backgrounds
└── PRD.md                        # Technical Blueprint
```

## 🛠 Reconstruction Guide

### 1. Environment Configuration
Create a `.env.local` with:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Dependency Matrix
| Package | Version | Purpose |
| :--- | :--- | :--- |
| `framer-motion` | ^12.x | Physics-based animations |
| `@dnd-kit/core` | ^6.x | Drag and drop framework |
| `@supabase/supabase-js`| ^2.x | Cloud data and storage |
| `lucide-react` | ^1.x | Premium iconography |

### 3. Core Logic Patterns
- **Optimistic State**: The Admin dashboard must update the local state immediately before the Server Action completes to ensure zero-latency feedback.
- **DND Logic**: Dragging a song updates its `order` integer in PostgreSQL, which then triggers a `revalidatePath('/')` to sync all connected clients.

## ⚖️ License & Source of Truth
This repository is the definitive source of truth. Any changes to functionality **must** be documented in the PRD before implementation to maintain architectural integrity.
