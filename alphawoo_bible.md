# ALPHAWOO PROJECT BIBLE

**Current Phase:** Phase 0: Revenue Leakage Detector (MVP Build)
**Last Updated:** 12-01-2025 (ONBOARDING & AUTH STABILIZATION)
**Version:** 8.5 (THE "ZERO-CLICK" PROTOCOL)

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
* **Phase 0:** Free Shadow Mode $\rightarrow$ **Zero-Click Onboarding** $\rightarrow$ Dashboard Reveal $\rightarrow$ Upsell.

## 3. The Source of Truth (SSOT Hierarchy)
* **Strategic SSOT:** **This File (The Project Bible).** If a feature or tone contradicts this file, this file wins.
* **OPERATIONAL DIRECTIVE:** **Don't make assumptions and don't guess. If you're unsure, ask clarifying questions.**
* **Data SSOT:** **The Unified Customer Profile (`customers` table).**
* **Deployment SSOT:** **The `alphawoo-connector` Plugin.**

## 4. Technical Stack (The Hard Constraints)
* **Frontend:** Next.js 16 (App Router). **NOTE: `params` are now async Promises.**
* **Authentication:** **Deferred Credential Setup (Hybrid).**
    * *Initial Entry:* Magic Link (JIT Provisioning).
    * *Ongoing Access:* **Standard Email/Password.**
* **Security:** **HMAC Signature Verification** (Body-Based) & **Row Level Security (RLS).**
* **Database:** Supabase (Postgres). **Organization -> Stores** Multi-tenancy.
* **Repositories:** `alphawoo-cloud` (Private), `alphawoo-connector` (Public).
* **Email:** Postmark (Transactional Stream). **MUST** have DKIM/DMARC verified.

## 5. Key Feature Logic
* **JIT Provisioning (NEW):** Plugin connection automatically triggers a Magic Link email to the user. No manual signup required.
* **Auto-Transfer Protocol:** If a user connects a store that already exists, proving possession via the plugin transfers ownership to the new email (Hostile Takeover Protection).
* **Shadow Mode:** Log Revenue to `reporting_metrics`, and **Suppress the Email**.
* **Pending Payment Rescue:** **Kill Switch Logic** on `woocommerce_order_status_processing/completed`.
* **Live Listener:** JS listens to `#billing_email` on blur or **on page load (auto-fill)**.

## 6. The AlphaWoo Suite Roadmap
**Phase 0: The Leakage Detector (CURRENT PRIORITY) — [BACKEND VERIFIED]**
* **Onboarding Bridge:** **Zero-Click Flow.** Connect Plugin $\rightarrow$ Check Email $\rightarrow$ Set Password $\rightarrow$ Dashboard.
* **Shadow Accounting:** Make.com logic to sum "missed" revenue.

## 7. Deployment & Monetization Strategy (The Hybrid Model)
**Strategy:** The "Trojan Horse." Free plugin install $\rightarrow$ **JIT Auth** $\rightarrow$ Dashboard Reveal $\rightarrow$ Stripe Conversion ($49/mo).

---

## 8. Visual & Interaction DNA (The "Structural Alpha" Standard)
* **Goal:** The UI must feel "Engineered" and look like a bank vault, not a casino.
* **Typography:** `Geist Mono` or `JetBrains Mono` for all IDs and Financials.

## 9. Development Rules
* **No "Plugin Bloat":** Never add UI or Logic to the PHP plugin.
* **Agency First:** Database must always support Multi-tenant.

## 10. Operational Execution (Placeholder)
* Reserved for sprint planning methodologies.

## 11. The AI Organization (Placeholder)
* Reserved for LLM prompt engineering.

---

## 12. Architectural Lessons Learned (The Hard Rules)
#### **12.1 HMAC Canonicalization Standard (PHP ↔ Node.js)**
* **Payload Construction:** Only include core transactional data.
* **Encoding Flags:** `JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_FORCE_OBJECT`.

#### **12.2 Next.js 16 Compatibility (NEW)**
* **Async Params:** In Next.js 16, page props (`params`) are Promises. You **MUST** `await params` before accessing properties (e.g., `storeId`).
* **Client Components:** Use hooks only after the server component has unwrapped the params.

#### **12.3 The "Zombie Store" Prevention (NEW)**
* **Disconnect Logic:** The plugin "Disconnect" action must send a **Kill Signal** to the Cloud API to delete the store record *before* wiping local settings.
* **Database Constraint:** The `stores` table **MUST** have a `UNIQUE` constraint on the `url` column (`stores_url_key`).

## 13. Email Strategy (The Hybrid Template Model)
* **Templates:** **React Email Components** (Tailwind + Zinc Palette).
* **Delivery:** **Postmark Transactional Stream**.

---

## 14. 🚀 PHASE 0: LEAKAGE DETECTOR CHECKLIST (MVP)

### 1. 🌉 The Onboarding Bridge (Status: STABLE)
| Task | Status | Requirement |
| :--- | :--- | :--- |
| **Provisioning API** | $\text{\textbf{Deployed}}$ | Creates Org/Store, handles duplicates, triggers JIT Magic Link. |
| **Plugin "Connect" UI** | $\text{\textbf{Deployed}}$ | Respects identity input, maps keys correctly (`site_url` -> `url`). |
| **Auth Flow** | $\text{\textbf{Deployed}}$ | Magic Link $\rightarrow$ Set Password $\rightarrow$ Dashboard. |

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
* **stores table constraint:** `stores_url_key` (UNIQUE on `url`).

### 15.2 Authentication & Provisioning Flow (Revised)
1.  **Plugin Connect:** User enters email in WP Admin.
2.  **API Provision:** Cloud creates Organization/Store + **Triggers Magic Link**.
3.  **Plugin Feedback:** UI shows "Success - Check Email" (Rocket Ship).
4.  **User Click:** Magic Link redirects to `/auth/update-password`.
5.  **Credentialing:** User sets password $\rightarrow$ Session upgraded $\rightarrow$ Redirect to Dashboard.

### 15.3 File Paths & Namespaces
* **Admin Page Class:** The correct class to initialize the new UI is `\AlphaWoo\Connector\Admin\Admin_Page`.
* **JavaScript Asset:** `assets/js/admin.js` handles the AJAX payload construction. **MUST** map `site_url` -> `url` and `store_name` -> `name` to match API expectations.
* **Hooks Class:** The connector's event capture logic is contained in the global class: `AlphaWoo_Connector_Hooks`.

---

## 16. Current Operational State (Phase 0 Status)
* **Auth:** Stable (Set Password / Forgot Password / JIT Magic Link).
* **Onboarding:** Stable (Plugin connects, respects identity input, prevents duplicates).
* **Dashboard:** Stable (Next.js 16 async params fixed).
* **Next Step:** Stripe Checkout Integration.