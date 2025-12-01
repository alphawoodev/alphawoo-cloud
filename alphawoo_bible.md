# ALPHAWOO PROJECT BIBLE
**Current Phase:** Phase 0: Revenue Leakage Detector (MVP Build)
**Last Updated:** 12-01-2025 (ARCHITECTURAL CANONICALS ADDED)
**Version:** 8.4 (THE COMPLETE CANONICALIZATION)

## 1. Brand Identity (CRITICAL)
* **Name:** **AlphaWoo** (CamelCase).
* **Why:** The capital "W" signals native alignment with the WooCommerce ecosystem. Never use "Alphawoo" or "Alpha Woo".
* **Positioning:** "Revenue Insurance & Automation," not just "Cart Recovery."
* **The Logo:** **"The Structural Alpha."**
    * *Visual:* A solid, geometric letter 'A' with a **flat base** (stability) and **soft rounded top** (approachability).
    * *Color:* Gradient from **Deep Indigo** (Trust) to **Emerald Teal** (Profit).

## 2. The North Star
**Product Definition:** AlphaWoo is a "Revenue Insurance Platform."
**Go-To-Market Strategy:** The "Trojan Horse."
* **Phase 0:** Free Shadow Mode $\rightarrow$ Dashboard Reveal $\rightarrow$ Upsell.

## 3. The Source of Truth (SSOT Hierarchy)
* **Strategic SSOT:** **This File (The Project Bible).** If a feature or tone contradicts this file, this file wins.
* **OPERATIONAL DIRECTIVE (NEW):** **Don't make assumptions and don't guess. If you're unsure, ask clarifying questions.**
* **Data SSOT:** **The Unified Customer Profile (`customers` table).**
* **Deployment SSOT:** **The `alphawoo-connector` Plugin.**

## 4. Technical Stack (The Hard Constraints)
* **Frontend:** Next.js 16.0.5 (App Router).
* **Authentication:** Supabase Auth (First-Party OTP Strategy).
* **Security:** **HMAC Signature Verification (Body-Based).**
* **Database:** Supabase (Postgres). **Organization -> Stores** Multi-tenancy.
* **Repositories:** `alphawoo-cloud` (Private), `alphawoo-connector` (Public).
* **Email:** Postmark (Transactional Stream). **MUST** have DKIM/DMARC verified.

## 5. Key Feature Logic
* **Shadow Mode:** Log Revenue to `reporting_metrics`, and **Suppress the Email**.
* **Pending Payment Rescue:** **Kill Switch Logic** on `woocommerce_order_status_processing/completed`.
* **Live Listener:** JS listens to `#billing_email` on blur or **on page load (auto-fill)**.

## 6. The AlphaWoo Suite Roadmap
**Phase 0: The Leakage Detector (CURRENT PRIORITY) — [BACKEND VERIFIED]**
* **Onboarding Bridge:** One-click provisioning from Plugin to Cloud.
* **Shadow Accounting:** Make.com logic to sum "missed" revenue.

## 7. Deployment & Monetization Strategy (The Hybrid Model)
**Strategy:** The "Trojan Horse." Free plugin install $\rightarrow$ Dashboard Reveal $\rightarrow$ Stripe Conversion.

---

## 8. Visual & Interaction DNA (The "Structural Alpha" Standard)
* **Goal:** The UI must feel "Engineered" and look like a bank vault, not a casino.
* **Typography:** `Geist Mono` or `JetBrains Mono` for all IDs and Financials.

## 9. Development Rules
* **No "Plugin Bloat":** Never add UI or Logic to the PHP plugin.
* **Agency First:** Database must always support Multi-tenant.

## 10. Operational Execution (Placeholder)
* This section is reserved for documenting specific sprint planning methodologies.

## 11. The AI Organization (Placeholder)
* This section is reserved for documentation regarding LLM prompt engineering and model versioning.

---

## 12. Architectural Lessons Learned (The Hard Rules)
#### **12.1 HMAC Canonicalization Standard (PHP ↔ Node.js)**
* **Payload Construction:** Only include core transactional data.
* **Encoding Flags:** `JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_FORCE_OBJECT`.

#### **12.2 Next.js Server Action Authentication**
* **The Rule:** Authentication logic uses **First-Party OTP** (client `verifyOtp`) rather than server-side code exchange due to PKCE/hash fragment conflicts.

## 13. Email Strategy (The Hybrid Template Model)
**Strategy:** We adopt a **Hybrid, Next.js-Dominated** approach for email templating.
* **Templates:** **React Email Components** (Tailwind + Zinc Palette).
* **Delivery:** **Postmark Transactional Stream** (for high deliverability).

---

## 14. 🚀 PHASE 0: LEAKAGE DETECTOR CHECKLIST (MVP)

### 1. 🌉 The Onboarding Bridge (Status: Code Complete / Needs Final UAT)
| Task | Status | Requirement |
| :--- | :--- | :--- |
| **Provisioning API** | $\text{\textbf{Deployed}}$ | Creates Org, Store (Shadow=True), and links user. |
| **Plugin "Connect" UI** | $\text{\textbf{Deployed}}$ | Admin screen captures user email and provisions the account. |
| **Auth Flow** | $\text{\textbf{Deployed}}$ | Magic Link sends styled email and logs user in via the **First-Party OTP** flow. |

### 2. 🕵️ Shadow Accounting (Status: Verified End-to-End)
| Task | Status | Requirement |
| :--- | :--- | :--- |
| **Shadow Metric API** | $\text{\textbf{Deployed}}$ | Atomically increments revenue. |
| **Make.com Shadow Flow** | $\text{\textbf{Configured}}$ | Logic to route `shadow_mode=true` carts to the Metric API. |

---

## 15. ARCHITECTURAL CANONICALS (AI ASSUMPTION BLOCKERS)

This section contains specific, non-negotiable facts about the current schema and environment that override general assumptions.

### 15.1 Database Schema (Source of Truth Names)
* **organizations table:** Must use the column name `owner_user_id` (not `owner_id`).
* **stores table:** Must use the column name `currency_code` (not `currency`).
* **stores table:** Must use the column name `url` for the site domain (not `woocommerce_domain`).
* **stores table:** The primary site identifier column must be nullable (temporarily) or set to the new value on insert.

### 15.2 Deployment & Authentication
* **Canonical URL:** The application's production base URL is determined by the Vercel ENV variable: `NEXT_PUBLIC_APP_URL`. The code MUST use this variable, not `window.location.origin` (unless fallback is required).
* **Callback Route Logic:** The `auth/callback` endpoint must be configured for the **First-Party OTP (One-Time Password) Flow** (using `verifyOtp` on the client), not the PKCE/Code exchange flow, to avoid browser/server hash conflicts.

### 15.3 File Paths & Namespaces
* **Admin Page Class:** The correct class to initialize the new UI is `\AlphaWoo\Connector\Admin\Admin_Page`.
* **Hooks Class:** The connector's event capture logic is contained in the global class: `AlphaWoo_Connector_Hooks`. The PHP code should not assume a namespace for this class unless explicitly defined within the file.