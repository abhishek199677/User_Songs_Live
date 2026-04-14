# Product Requirements Document (PRD) - Christian Songs Repository (Heavenly Harmony)

## 1. Project Overview
A secure, interactive, and high-performance repository for Christian song presentations and videos. The application features a "Premium Bouncy UI" with rich animations and transitions, designed for both desktop and mobile use.

## 2. Tech Stack (The Definitive Source of Truth)
| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js (App Router), React 19 |
| **Styling** | Vanilla CSS (with Safe Area Insets and Glassmorphism) |
| **Database** | Supabase (PostgreSQL) |
| **File Storage** | Supabase Storage (Bucket: `presentations`) |
| **Auth** | Supabase Auth (OTP via Email/Mobile) |
| **Animations** | Framer Motion (Spring-based physics) |
| **Drag & Drop** | `@dnd-kit` (Sortable Context) |
| **Icons** | Lucide React |
| **Deployment** | Render.com |

## 3. Detailed Feature Requirements
### 3.1 Authentication & Identity
- **Login Splash**: A high-impact glowing overlay with a rotating conic-gradient border.
- **OTP System**: 4-digit verification code system for new and returning users.
- **Identity Log**: Tracking user identifiers and last active timestamps.

### 3.2 Song Repository (User Facing)
- **Voice AI Search**: Real-time speech-to-text integration (Te-IN, En-IN, En-US) for hands-free searching.
- **Dynamic Grid**: Auto-scaling cards (min 320px) with glassmorphism effects and hover-lift transitions.
- **File Preview**: Integration with Microsoft Office Online Viewer for `.ppt` and `.pptx` files.

### 3.3 Video Library
- **YouTube Integration**: Embeddable video cards with responsive 16:9 aspect ratios and staggered entrance animations.

### 3.4 Admin Dashboard (The "Command Center")
- **Pending Approvals**: Queue for user-submitted files.
- **Visual Reordering**: Drag-and-drop song ordering using spring-physics (`stiffness: 200, damping: 10, bounce: 0.6`).
- **Recycle Bin**: Soft-delete management with "Nuclear Delete" (permanent) options.
- **Video Management**: Direct YouTube link publishing system.

## 4. Technical Specifications
### 4.1 Database Schema (Table: `songs`)
- `id`: Text/UUID (Primary Key)
- `title`: Text
- `file_name`: Text
- `file_type`: Text (pdf, ppt, pptx)
- `file_url`: Text (External Supabase Storage URL)
- `status`: Text ('approved', 'pending', 'deleted')
- `uploaded_at`: Timestamptz
- `order`: Integer (Sorting priority)

### 4.2 Animation Constants
- **Bouncy Spring**: `{ type: 'spring', stiffness: 200, damping: 10, bounce: 0.6 }`
- **Background Motion**: `animation: bouncy-bg 12s infinite alternate cubic-bezier(0.68, -0.55, 0.265, 1.55)`
- **List Entrance**: Staggered delay `index * 0.05`.

### 4.3 Mobile Optimizations
- **Safe Area Insets**: Explicit `env(safe-area-inset-...)` handling in CSS to avoid UI clipping on iPhones.
- **Tap Feedback**: `whileTap={{ scale: 0.95 }}` on all interactive elements.

## 5. Security & Infrastructure
- **Server Actions**: All database mutations (Update Order, Approve, Edit) must use Next.js `use server` actions for security.
- **CI/CD**: GitHub Actions verification on every push.
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (Required for Server Actions)
