# RoaminRabbit ERP — Prototype

Internal admin panel prototype for RoaminRabbit. This tool is used to configure all platform content and business logic — including eSIM packages and pricing, promo codes, events, ticket types, slot limits, and approval flows.

> **Status:** Prototype — uses mock data, no live backend integration yet.

---

## What's in this repo

```
roaminrabbit-erp/
├── frontend/          # TypeScript + React (Vite) web app
│   ├── src/
│   │   ├── components/   # Shared UI components
│   │   ├── data/         # Mock data (replaces backend during prototyping)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── layouts/      # Page layout components
│   │   ├── pages/        # Top-level page views
│   │   └── types/        # TypeScript type definitions
│   └── ...
└── docs/              # Design specs, PRDs, and product documentation
```

---

## Modules

| Module       | Description                                              |
| ------------ | -------------------------------------------------------- |
| Dashboard    | High-level overview of key metrics                       |
| eSIMs        | Manage eSIM packages, pricing, and availability          |
| Events       | Create and manage events, ticket types, and approvals    |
| Promo Codes  | Create and track promotional discount codes              |
| Users        | View registered users and their activity                 |

---

## Getting started

### Prerequisites

- Node.js v18+
- npm v9+

### Run locally

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for production

```bash
cd frontend
npm run build
```

---

## Tech stack

| Layer     | Technology                        |
| --------- | --------------------------------- |
| Frontend  | TypeScript, React 18, Vite        |
| Styling   | Tailwind CSS                      |
| Routing   | React Router v6                   |
| Data      | Mock data (JSON/TS files in `src/data/`) |
| Backend   | TBD — to be confirmed with dev team |

---

## Docs

Product documentation, PRDs, and design specs live in the `/docs` folder.

---

## Notes

- Payment gateway integration for events is planned but not yet scoped.
- Ticket approval flows are per-ticket-type, not per-user.
- Backend stack is unconfirmed — flag any backend-dependent features with the dev team before implementation.
