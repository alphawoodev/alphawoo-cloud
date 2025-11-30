# ALPHAWOO PROJECT BIBLE
**Current Phase:** Phase 0: Revenue Leakage Detector (MVP Build)
**Last Updated:** 11-30-2025 (STRATEGIC RESET: SHADOW MVP)
**Version:** 8.0 (THE PHASE 0 CANONICALIZATION)

## 1. Brand Identity (CRITICAL)
* **Name:** **AlphaWoo** (CamelCase).
* **Why:** The capital "W" signals native alignment with the WooCommerce ecosystem. Never use "Alphawoo" or "Alpha Woo".
* **Positioning:** "Revenue Insurance & Automation," not just "Cart Recovery."
* **Voice:** Professional, technical, authoritative (Store Owner to Store Owner). Avoid marketing fluff; focus on ROI and Architecture.
* **The Logo:** **"The Structural Alpha."**
    * *Visual:* A solid, geometric letter 'A' with a **flat base** (stability) and **soft rounded top** (approachability).
    * *Color:* Gradient from **Deep Indigo** (Trust) to **Emerald Teal** (Profit).

## 2. The North Star
**Product Definition:** AlphaWoo is a "Revenue Insurance Platform" for WooCommerce that rescues lost sales via Hybrid Cloud technology.
**Core Value:** We solve "Shipping Shock," "Ghost Orders," and "Margin Erosion" via a lightweight connector + heavy-duty cloud.
**Go-To-Market Strategy (The Trojan Horse):**
1.  **Free Install:** User installs plugin as a "Revenue Leakage Detector" (Shadow Mode).
2.  **The Reveal:** After 7 days, Dashboard displays "Potential Revenue Rescued" (Money left on the table).
3.  **The Upsell:** User activates paid "Revenue Rescue" to recover that money.

## 3. The Source of Truth (SSOT Hierarchy)
* **Strategic SSOT:** **This File (The Project Bible).** If a feature or tone contradicts this file, this file wins.
* **Data SSOT:** **The Unified Customer Profile (`customers` table).** We do not build separate tables for different modules. A customer is a customer.
* **Deployment SSOT:** **The `alphawoo-connector` Plugin.** The plugin is the only gateway. Feature flags in the cloud (`stores.active_modules`) determine functionality, not the user's plugin list.

## 4. Technical Stack (The Hard Constraints)
* **Frontend:** Next.js 14+ (App Router) + Tailwind CSS.
* **UI Components:** Shadcn UI (Radix Primitives).
* **Authentication:** Supabase Auth (Native integration).
    * **Note:** All Server Actions use the **Manual JWT Injection** method to prevent the fatal library crash. (See 12.2)
* **Billing:** Stripe (SaaS Subscriptions).
    * **Requirement:** Must support **Agency Billing** (One Org pays for multiple Stores).
    * **Self-Serve:** Use **Stripe Customer Portal** for invoices/upgrades.
* **Backend:** Next.js API Routes (Serverless) on Vercel.
* **Security:** **HMAC Signature Verification (Body-Based).** Plugin payloads must contain the signature in the JSON body (`aw_signature`). (See 12.1)
* **Database:** Supabase (Postgres).
    * **Schema:** Organization -> Stores (Multi-Currency + Affiliate Tracking) -> Customers -> Carts. **Soft Delete** is used for the `stores` table. (See 12.3)
* **Integration Layer:** **Make.com (iPaaS).** We use Make.com for all delayed sequencing (e.g., 30-min sleep) and Postmark integration.
* **Repositories (NEW):**
    * **`alphawoo-cloud`:** (Private) Next.js/Vercel. Contains business logic, secrets, and API.
    * **`alphawoo-connector`:** (Public) PHP/WordPress Plugin. "Dumb Pipe" only.
* **Email:** Postmark (Transactional Stream). **MUST** have DKIM/DMARC verified.
* **Infrastructure Domains:**
    * **Marketing:** `alphawoo.com` (Root). **NEVER** use `www`.
    * **SaaS Dashboard:** `app.alphawoo.com` (The secure console).
    * **Ingestion API:** `api.alphawoo.com` (Strictly for Plugin traffic).

## 5. Key Feature Logic
* **Shadow Mode (The MVP Core):**
    * **Logic:** If `store.shadow_mode = true`:
        1. Capture Event.
        2. Wait 30 mins (Make.com).
        3. **Log the Revenue** to `reporting_metrics` (via `/v1/metrics/log_shadow`).
        4. **Suppress the Email** (Stop flow).
    * **Goal:** Populate the "Pain Dashboard" to drive conversion.
* **Pending Payment Rescue:**
    * Trigger: `woocommerce_order_status_pending` OR `woocommerce_order_status_on-hold` AND `created_via='checkout'`.
    * Action: Wait 30 mins -> Send Email.
* **Live Listener (The "Cookie" Aware Script):**
    * JS listens to `#billing_phone` and `#billing_email` on blur.
    * **Compliance:** MUST check "TCPA Consent" box AND respect `wp_consent_api` via the `/wp-admin/admin-ajax.php` gating endpoint before initializing JS.
* **Agent-Native (WP 6.9 Abilities API):**
    * **Strict Version Gating:** All Agent logic must be wrapped in `version_compare($wp_version, '6.9', '>=')`.
    * **Abilities:** `read_revenue_pulse`, `analyze_ghost_orders`, `trigger_profit_guard`.
    * **NEW:** `analyze_carrier_options` (consults Cloud for DDP rates).

## 6. The AlphaWoo Suite Roadmap (The 8 Pillars)
**Phase 0: The Leakage Detector (CURRENT PRIORITY)**
* **Onboarding Bridge:** One-click provisioning from Plugin to Cloud (Creates Org/Store).
* **Shadow Accounting:** Make.com logic to sum "missed" revenue without sending emails.
* **Pain Dashboard:** The "Free Tier" UI showing missed revenue and "Activate" CTA.

**Phase 1: Revenue Rescue (Paid Tier) — [ARCHITECTURALLY COMPLETE]**
* **Cart Saver:** Recovers abandoned carts & "Ghost Orders".
* **Profit Guard:** Intelligent Offer Decisioning (API Defined).
* **Site Pulse:** RUM monitoring.

**Phase 2: Operational Efficiency — [ARCHITECTURALLY COMPLETE]**
* **Logistics Guard (Global):** DDP/DDU Calculator + AI Carrier Selection (Schema `geo_rules` & API defined).
* **Stock Guard:** Real-time oversell protection (Hook `woocommerce_before_checkout_process` & Schema `stock_reservations` defined).

**Phase 3: Retention & Resolution — [ARCHITECTURALLY COMPLETE]**
* **Resolution Agent:** AI Post-Purchase Defense (Schema `customer_clv_metrics` & API defined).
* **Best Customer Spotlight:** CLV Segmentation.
* **Weekly Store Report:** The "CEO Digest" summarizing Rescued Revenue.

## 7. Deployment & Monetization Strategy (The Hybrid Model)
**Strategy:** The "Trojan Horse."
* **Step 1:** Free plugin install -> Shadow Mode (7 Days).
* **Step 2:** Dashboard Reveal ("You lost $4k last week").
* **Step 3:** Stripe Conversion via Agency Billing (`organizations` table) to unlock features.

## 8. Visual & Interaction DNA (The "Structural Alpha" Standard)
* **Goal:** The UI must feel "Engineered" and look like a bank vault, not a casino.
* **The "Zinc" Palette:** `zinc-50` to `white` (Light), `zinc-950` (Dark). **NO pure black.**
* **The Brand Gradient:** Indigo-600 (Trust) -> Emerald-600 (Profit).
* **Typography:** `Geist Mono` or `JetBrains Mono` for all IDs and Financials.

## 9. Development Rules
* **No "Plugin Bloat":** Never add UI or Logic to the PHP plugin. It is a dumb pipe.
* **Agency First:** Database must always support Multi-tenant (Organization > Stores).
* **Code Quality:** All UI components must support Dark Mode by default.

## 12. Architectural Lessons Learned (The Hard Rules)
#### **12.1 HMAC Canonicalization Standard (PHP ↔ Node.js)**
* **Payload Construction:** Only include core transactional data. Omit dynamic timestamps and nested objects.
* **Data Type Canonicalization:** Explicitly cast to strings (`strval()`).
* **Encoding Flags:** `JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_FORCE_OBJECT`.

#### **12.2 Next.js Server Action Authentication**
* **The Rule:** Authentication logic in all Server Actions must use **Manual JWT Token Injection** to prevent Vercel crashes.

#### **12.3 Data Consistency & Deletion Strategy**
* **Soft Delete:** The `stores` table uses **Soft Delete** (`deleted_at`).
* **No Manual Cleanup:** Use the **WP-CLI Cleanup Command** (`wp alphawoo clean all`) for local hygiene.

## 13. Email Strategy (The Hybrid Template Model)
**Strategy:** We adopt a **Hybrid, Next.js-Dominated** approach for email templating.
* **Templates:** React Email Components (Tailwind + Zinc Palette).
* **Rendering:** Next.js generates HTML string (`/v1/emails/render_rescue_email`).
* **Delivery:** Postmark Transactional Stream.

---

## 14. 🚀 PHASE 0: LEAKAGE DETECTOR CHECKLIST (MVP)

This is the immediate roadmap to a functional "Shadow Mode" MVP. Launch is blocked until these are complete.

### 1. 🌉 The Onboarding Bridge (Plugin <-> Cloud)
| Task | Status | Requirement |
| :--- | :--- | :--- |
| **Provisioning API** | ☐ Undone | `POST /api/v1/onboarding/provision`: Creates Org, Store (Shadow=True), and returns API Keys to plugin. |
| **Plugin "Connect" UI** | ☐ Undone | Admin screen in WP to trigger provisioning and save the returned API keys. |
| **Magic Link Auth** | ☐ Undone | "Go to Dashboard" button in plugin logs user into Next.js app without password friction. |

### 2. 🕵️ Shadow Accounting (The Logic)
| Task | Status | Requirement |
| :--- | :--- | :--- |
| **Shadow Metric API** | ☐ Undone | `POST /api/v1/metrics/log_shadow`: Increments `shadow_revenue_total_cents` for the store. |
| **Make.com Shadow Flow** | ☐ Undone | Logic update: If `shadow_mode=true` -> Call Metric API -> Stop. |

### 3. 📊 The Pain Dashboard (The UI)
| Task | Status | Requirement |
| :--- | :--- | :--- |
| **Free Tier View** | ☐ Undone | Dashboard view that hides graphs and shows big "Potential Revenue" counter. |
| **Ghost Order List** | ☐ Undone | Anonymized/Blurred list of carts captured. |
| **Activate CTA** | ☐ Undone | Button linking to Stripe Checkout to unlock features. |

### 4. 🎨 Critical Assets
| Task | Status | Requirement |
| :--- | :--- | :--- |
| **Marketing Landing** | ☐ Undone | Simple page (`alphawoo.com`) explaining "Free Revenue Audit". |
| **Logo Assets** | ☐ Undone | SVG Logo for Dashboard/Plugin/Emails. |
| **Email Templates** | ☐ Undone | **Revenue Rescue React Component** built (needed for Upgrade Preview). |