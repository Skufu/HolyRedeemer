# Framer Motion Animation Plan - HolyRedeemer Frontend

This document outlines the strategy for integrating Framer Motion into the HolyRedeemer Library Management System to enhance user experience, provide visual feedback, and establish a premium feel.

## 1. Goals
- **Enhance UX**: Use motion to guide user attention and provide clear feedback for actions.
- **Visual Continuity**: Create smooth transitions between states and pages to reduce cognitive load.
- **Premium Feel**: Elevate the interface from a standard CRUD app to a polished, modern application.
- **Performance**: Ensure animations are hardware-accelerated and do not impact the responsiveness of the LMS.

## 2. Principles
- **Purposeful**: Every animation must serve a function (e.g., showing a modal opening, a list updating).
- **Subtle & Fast**: Durations should generally stay between 150ms and 300ms. Easing should feel natural (e.g., `easeOut` or `backOut`).
- **Consistent**: Use shared variants for common interactions (fades, scales, slides).
- **Accessible**: Respect `prefers-reduced-motion` settings by disabling or simplifying animations.

## 3. Inventory of Interactive Surfaces

| Category | Components | Key Interactions |
|----------|------------|------------------|
| **Navigation** | Sidebar, Tabs, Breadcrumbs | Expand/Collapse, Active state switching |
| **Overlays** | Dialogs, Drawers, Popovers, Tooltips | Entry/Exit, Backdrop transitions |
| **Data** | Tables, Lists, Cards, Charts | Loading states, Staggered entry, Layout changes |
| **Feedback** | Toasts, Alerts, Progress bars | Notification entry, Status changes |
| **Specific** | QR Scanner Modal, Book Covers | Scanner pulse, Hover effects |

## 4. Proposed Motions by Page/Module

### Shared Components
- **Sidebar (`components/ui/sidebar.tsx`)**:
    - **Motion**: Spring-based width transition for expansion/collapse.
    - **Interaction**: Staggered fade-in for navigation links when the sidebar first mounts.
- **NotificationPopover (`components/notifications/NotificationPopover.tsx`)**:
    - **Motion**: Scale-in from the top-right anchor point with a slight overshoot (`backOut`).
    - **Interaction**: Individual notifications slide out to the right when dismissed.
- **QRScannerModal (`components/circulation/QRScannerModal.tsx`)**:
    - **Motion**: Slide-up from the bottom of the viewport.
    - **Interaction**: A pulsing "scanning" border around the camera view that turns green on success.
- **Dialogs & Drawers (`components/ui/dialog.tsx`, `components/ui/drawer.tsx`)**:
    - **Motion**: Backdrop fade (0 to 0.5 opacity). Content scale-in (0.95 to 1) and fade-in.

### Librarian Module
- **Circulation (`pages/librarian/Circulation.tsx`)**:
    - **Tabs**: Use `layoutId` for the active tab underline to create a "sliding" effect between Checkout/Return/Renew.
    - **Transaction Lists**: Use `AnimatePresence` for list items so they slide up and fade out when a transaction is completed.
- **DailyOperations (`pages/librarian/DailyOperations.tsx`)**:
    - **Action Cards**: Subtle hover lift (`y: -4`) and shadow enhancement.
- **StudentLookup (`pages/librarian/StudentLookup.tsx`)**:
    - **Search Results**: Staggered entry for student cards to make the search feel faster.
- **Dashboard (`pages/librarian/Dashboard.tsx`)**:
    - **Stat Cards**: Numerical count-up animations for "Books Out", "Overdue", etc.

### Student Module
- **Catalog (`pages/student/Catalog.tsx`)**:
    - **Book Grid**: Staggered fade-in for book covers as they load into view.
    - **Book Details**: Shared element transition (if possible) or a smooth scale-up when clicking a book to view details.
- **Dashboard (`pages/student/Dashboard.tsx`)**:
    - **Carousel**: Smooth slide transitions for featured books or announcements.
- **Notifications (`pages/student/Notifications.tsx`)**:
    - **List**: Slide-to-dismiss gesture for mobile users.

### Admin Module
- **BooksManagement (`pages/admin/BooksManagement.tsx`)**:
    - **Table**: Highlight animation (brief background color change) for newly added or updated rows.
- **QRManagement (`pages/admin/QRManagement.tsx`)**:
    - **Grid**: "Pop-in" animation for generated QR codes.
- **Reports & AuditLogs (`pages/admin/Reports.tsx`, `pages/admin/AuditLogs.tsx`)**:
    - **Charts**: Animate bars and lines from zero to their value on mount.

## 5. Priority Phases

1.  **Phase 1: Global Overlays & Feedback**: Dialogs, Toasts, Sidebar, and QR Scanner. These provide the most immediate "feel" improvement.
2.  **Phase 2: Navigation & Lists**: Tabs transitions and staggered list entries in Circulation and Catalog.
3.  **Phase 3: Micro-interactions & Data Viz**: Button press effects, hover states, and chart animations.

## 6. Risks & QA
- **Performance**: Heavy use of `layout` props can cause layout thrashing. Test on mobile devices.
- **Z-Index**: Ensure animated elements don't clip through sticky headers or other overlays.
- **Orphaned Animations**: Ensure `AnimatePresence` is correctly placed to handle exit animations for conditionally rendered components.
- **Accessibility**: Verify that `useReducedMotion` hook is used to provide a static fallback for users who prefer it.
