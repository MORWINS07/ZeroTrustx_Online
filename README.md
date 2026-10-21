# 🛡 ZeroTrustX

**Zero Trust Enterprise Access Management System**
A full-stack MERN cybersecurity platform implementing Google's BeyondCorp-inspired Zero Trust model.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Zero Trust Flow Diagram](#zero-trust-flow-diagram)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [API Reference](#api-reference)
8. [Frontend Pages](#frontend-pages)
9. [Security Design](#security-design)
10. [Database Seeding](#database-seeding)
11. [End-to-End Testing](#end-to-end-testing)
12. [Default Credentials](#default-credentials)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Vite)                  │
│  Login → Device Enroll → MFA → Dashboard → ZT Evaluation │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS REST API
┌────────────────────▼─────────────────────────────────────┐
│              EXPRESS.JS API (Node.js)                     │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Auth   │  │  Device  │  │   MFA    │  │  Policy  │ │
│  │Controller│  │Controller│  │Controller│  │ Engine   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │          Zero Trust Access Decision Engine          │  │
│  │  ① Auth  ② MFA  ③ Device  ④ Session  ⑤ RBAC      │  │
│  │  ⑥ Permission  ⑦ Policy                            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │                Audit Logger (async)               │    │
│  └──────────────────────────────────────────────────┘    │
└────────────────────┬─────────────────────────────────────┘
                     │ Mongoose ODM
┌────────────────────▼─────────────────────────────────────┐
│                      MONGODB                              │
│  Users · Devices · Sessions · MfaConfig · Permissions    │
│  Roles · Resources · Policies · AccessRequests · Audits   │
└──────────────────────────────────────────────────────────┘
```

---

## Zero Trust Flow Diagram

```
  REGISTER ──► BOOTSTRAP DEVICE ──► LOGIN
                                      │
                                      ▼
                              MFA Challenge?
                             Yes ─────┤ No (trusted device on low-sens)
                              │       │
                              ▼       ▼
                          TOTP OK ──► ISSUE ACCESS TOKEN (15 min)
                                      │
                                      ▼
                         REQUEST ACCESS TO RESOURCE
                                      │
              ┌───────────────────────┤
              │                       │
              ▼                       ▼
   ① User ACTIVE?             ⑤ Has RBAC role?
   ② MFA enabled+verified?    ⑥ Has permission for action?
   ③ Device TRUSTED?          ⑦ All resource policies pass?
   ④ Session ACTIVE?
              │
              ▼
     All 7 checks PASS? ──YES──► ALLOW  → audit event
                         ──NO──► DENY   → audit event
```

---

## Technology Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | React 19, Vite 8, React Router 7, Axios       |
| Backend    | Node.js 22, Express 5, REST API               |
| Database   | MongoDB (local), Mongoose 9                   |
| Auth       | JWT (access + refresh tokens), bcryptjs 3     |
| MFA        | otplib (TOTP / RFC 6238, Google Authenticator)|
| Security   | Helmet, CORS, express-rate-limit, express-validator |
| Dev Tools  | concurrently, node --watch                    |

---

## Project Structure

```
ZeroTrustX-MERN/
├── package.json              ← Root: npm run dev / seed / e2e
├── client/                   ← React + Vite SPA
│   └── src/
│       ├── App.jsx           ← Routes (ProtectedRoute + AdminRoute)
│       ├── context/          ← AuthContext (JWT state management)
│       ├── services/         ← API service layer (Axios)
│       ├── components/       ← DashboardLayout, Sidebar
│       └── pages/            ← 11 UI pages + 2 admin pages
└── server/                   ← Node.js + Express API
    ├── server.js             ← Entry point, middleware, routes
    └── src/
        ├── config/           ← MongoDB connection
        ├── controllers/      ← Request handlers (14)
        ├── middleware/       ← Auth, validation, permissions, device
        ├── models/           ← Mongoose schemas (9 models)
        ├── routes/           ← Express routers (14 route files)
        ├── services/         ← Business logic (10 services)
        ├── utils/            ← JWT helpers, password utils
        └── scripts/
            ├── seedDatabase.js  ← Seed roles, permissions, resources, policies
            └── e2eTest.js       ← Automated lifecycle test suite
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- MongoDB running locally on port 27017

### 1. Clone & Install

```bash
git clone <repo-url>
cd ZeroTrustX-MERN

# Install all dependencies (root + server + client)
npm run install:all
```

### 2. Configure Environment

```bash
# Copy the example file
cp server/.env.example server/.env
# Edit server/.env and set your secrets (see Environment Variables section)
```

### 3. Seed the Database

```bash
npm run seed
```

This creates roles, permissions, sample resources, Zero Trust policies, and an admin account.

### 4. Start the Application

```bash
# Starts both API (port 5000) and UI (port 5173) simultaneously
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

Create `server/.env` from `server/.env.example`:

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | API server port (default: 5000) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Yes | Secret for signing access tokens (min 32 chars) |
| `JWT_MFA_SECRET` | Yes | Secret for signing MFA challenge tokens |
| `ACCESS_TOKEN_EXPIRES_IN` | Yes | Access token TTL (e.g. `15m`) |
| `SESSION_DURATION_MS` | Yes | Session max age in milliseconds (e.g. `604800000` = 7 days) |
| `CORS_ORIGIN` | Yes | Allowed frontend origin (e.g. `http://localhost:5173`) |
| `APP_NAME` | No | Application name in responses |

> ⚠️ **Never commit `.env` to version control.**
> Generate strong secrets with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

---

## API Reference

All endpoints are prefixed `/api/v1`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | Public | Create account, receive bootstrapToken |
| `POST` | `/auth/login` | Public + X-Device-Id | Login with credentials |
| `POST` | `/auth/mfa/verify` | MFA token | Complete MFA challenge |
| `POST` | `/auth/refresh` | Public | Rotate access token using refresh token |
| `POST` | `/auth/logout` | JWT | Revoke current session |

### MFA

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/mfa/setup` | JWT | Generate TOTP secret + QR code |
| `POST` | `/mfa/enable` | JWT | Verify and activate MFA |
| `POST` | `/mfa/verify` | JWT | Verify a TOTP code |
| `GET` | `/mfa/status` | JWT | Get MFA enabled/verified state |
| `POST` | `/mfa/disable` | JWT | Disable MFA |

### Devices

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/devices/bootstrap` | bootstrapToken | Enroll + auto-trust first device |
| `POST` | `/devices` | JWT | Register additional device |
| `GET` | `/devices/mine` | JWT | List own devices |
| `POST` | `/devices/:id/trust` | JWT + permission | Trust a device |
| `POST` | `/devices/:id/revoke` | JWT + permission | Revoke a device |
| `POST` | `/devices/:id/block` | JWT + permission | Block a device |

### Sessions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/sessions/mine` | JWT | List own sessions |
| `POST` | `/sessions/:id/revoke` | JWT | Revoke a session |
| `POST` | `/sessions/revoke-all` | JWT | Revoke all own sessions |

### Resources

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/resources` | JWT | List all resources |
| `POST` | `/resources` | JWT | Create resource |
| `PATCH` | `/resources/:id/toggle` | JWT | Activate / deactivate |
| `DELETE` | `/resources/:id` | JWT | Remove resource |

### Policies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/policies` | JWT | List all policies |
| `POST` | `/policies` | JWT | Create policy |
| `PATCH` | `/policies/:id/toggle` | JWT | Enable / disable policy |
| `DELETE` | `/policies/:id` | JWT | Remove policy |

### Access Decisions (Zero Trust Engine)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/access-requests` | JWT | Evaluate + record access decision |
| `GET` | `/access-requests` | JWT | History of access decisions |
| `POST` | `/access-requests/evaluate` | JWT | Alias for POST / |

### Audit Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/audit-events` | JWT | Paginated audit log (filterable) |

### Roles & Permissions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/roles` | JWT | List roles |
| `POST` | `/roles` | JWT | Create role |
| `GET` | `/permissions` | JWT | List permissions |
| `POST` | `/permissions` | JWT | Create permission |
| `POST` | `/user-roles` | JWT | Assign role to user |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admin/users` | JWT | Paginated user list |
| `PATCH` | `/admin/users/:id/activate` | JWT | Activate account |
| `PATCH` | `/admin/users/:id/suspend` | JWT | Suspend account |
| `PATCH` | `/admin/users/:id/unlock` | JWT | Unlock account |

---

## Frontend Pages

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/device-enroll` | Device Enrollment | Post-register |
| `/mfa-verify` | MFA Challenge | Post-login |
| `/dashboard` | Security Dashboard | Authenticated |
| `/profile` | User Profile | Authenticated |
| `/mfa-setup` | MFA Setup (QR Code) | Authenticated |
| `/devices` | Device Management | Authenticated |
| `/sessions` | Session Management | Authenticated |
| `/access-requests` | Zero Trust Evaluator | Authenticated |
| `/resources` | Protected Resources | Authenticated |
| `/policies` | Access Policies | Authenticated |
| `/audit-logs` | Security Audit Logs | Authenticated |
| `/admin/users` | User Admin Panel | **Admin only** |
| `/admin/roles` | Roles & Permissions | **Admin only** |

---

## Security Design

### Zero Trust Principles Applied

1. **Never trust, always verify** – Every access request is evaluated against 7 independent checks regardless of network location.
2. **Assume breach** – All security events are written to an immutable audit log.
3. **Least privilege** – Permissions are granted at resource+action granularity. Users have no implied permissions.
4. **Device posture verification** – Every login requires a known, trusted device identifier (`X-Device-Id` header).
5. **Continuous session monitoring** – Short-lived JWT (15m) + refresh rotation + per-request session validation.

### Security Hardening

| Control | Implementation |
|---------|---------------|
| Password hashing | bcrypt with 12 salt rounds |
| Account lockout | Auto-lock after 5 failed login attempts (30 min) |
| Rate limiting | 20 req/15 min on auth; 500 req/15 min globally |
| Request size limiting | 10KB body limit |
| Security headers | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Strict origin whitelist + credentials |
| Token separation | Access token (15m) ≠ Refresh token ≠ MFA token ≠ Bootstrap token |
| Audit trail | Every auth event, device change, access decision recorded |

---

## Database Seeding

The seed script creates a production-ready starting state:

```bash
npm run seed          # from ZeroTrustX-MERN/
# or
npm run seed          # from server/
```

**What gets seeded:**

- **22 system permissions** across resources: users, devices, sessions, audit, resources, policies, access, roles, mfa, finance, hr, source-code, logs, secrets
- **4 system roles**: Admin, Security Analyst, Developer, User
- **1 admin account**: `admin@zerotrustx.local` / `AdminPass@123`
- **8 protected resources** spanning LOW → CRITICAL sensitivity
- **5 Zero Trust policies**: Require MFA, Require Trusted Device, Require Active Session, High-Sensitivity Baseline, Admin-Only Critical Access

Policies are automatically attached to matching resources by sensitivity level.

---

## End-to-End Testing

Run the automated E2E lifecycle test against a live server:

```bash
# 1. Start the server
npm run dev          # or: npm start --prefix server

# 2. In another terminal
npm run e2e --prefix server
# or from root:
cd server && node src/scripts/e2eTest.js
```

**Test coverage (15 assertions):**

1. Server health check
2. User registration + bootstrap token
3. First device bootstrap + auto-trust
4. Login (no MFA)
5. Token refresh rotation
6. MFA setup (TOTP secret + QR)
7. MFA enable (TOTP verification)
8. Login with MFA challenge flow
9. Device list (own devices)
10. Session list (own sessions)
11. Resource list
12. Zero Trust access request evaluation (with per-check PASS/FAIL breakdown)
13. Audit event verification
14. Session revocation
15. Post-revocation endpoint protection (401 check)

---

## Default Credentials

> ⚠️ Change these immediately in any shared or production environment.

| Account | Email | Password |
|---------|-------|----------|
| Admin | `admin@zerotrustx.local` | `AdminPass@123` |

The admin user has **no trusted device** on first seed run. You must:
1. Login → this will fail until a device is bootstrapped
2. Register via the UI to create your first admin device (or use the `/device-enroll` flow)

> **Tip:** Use the `e2eTest.js` script's pattern to automate the bootstrap step for the admin account in a CI environment.

---

## License

MIT – built for educational and demonstration purposes.
