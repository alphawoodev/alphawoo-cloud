# ALPHAWOO PROJECT BIBLE

**Current Phase:** Phase 2: The Recovery Engine (Email Automation)
**Last Updated:** 12-02-2025 (THE "V3 HYBRID" REWRITE)
**Version:** 9.0 (THE "GOLD STANDARD" PROTOCOL)

## 1. Brand Identity (CRITICAL)
* **Name:** **AlphaWoo** (CamelCase).
* **Product Name:** **AlphaWoo Recovery** (The switch).
* **Positioning:** "Automated Revenue Recovery," NOT "Insurance."
* **UI Terminology:**
    * **Active Mode:** The system is live, billing is active, emails are sending. (Green Shield).
    * **Passive Mode:** The system is observing leakage but not acting. (Amber Alert).
    * **$Recovery:** Rendered in `Geist Mono`. Treated as a financial variable.
* **The Action:** "Initialize $Recovery."

## 2. The North Star
**Product Definition:** AlphaWoo is a "Server-Side Recovery Protocol."
**Value Prop:** "For $49/mo, upgrade your store's infrastructure. Turn the switch from Passive to Active."

## 3. The Source of Truth (SSOT Hierarchy)
* **Strategic SSOT:** **This File.**
* **Data SSOT:** Supabase `organizations` and `carts` tables.
* **Logic SSOT:** **Database RPC Functions.** (We do not trust the Client SDK for complex logic).
* **Deployment SSOT:** Vercel (Cloud) & `alphawoo-connector` v8.5+ (WordPress).

## 4. Technical Stack (The Hard Constraints)
* **Frontend:** Next.js 16 (App Router).
* **Database:** Supabase (Postgres). **Organization (Agency) -> Stores** Multi-tenancy.
* **Auth Strategy:** **Identity-First via RPC.**
    * *No Supabase Magic Links.*
    * *First-Party OTP:* Server generates token $\rightarrow$ Postmark sends email $\rightarrow$ Client verifies.
* **Ingestion:** **Hybrid V3 (JS Trigger + PHP Payload).**
* **Billing:** Stripe (Clover Release). Webhook-driven activation.

## 5. Key Feature Logic (The V3 Standard)

### 5.1 The "Identity-First" Provisioning (New Standard)
* **Problem:** Supabase `listUsers` API is pagination-limited and fuzzy.
* **Solution:** We use a custom RPC `get_user_id_by_email` to ask the DB directly.
* **Flow:**
    1.  **Resolve Identity:** Check RPC. If New $\rightarrow$ Create User. If Existing $\rightarrow$ Use ID.
    2.  **Resolve Store:** Check URL.
    3.  **Reconcile:** If Store exists but Owner differs $\rightarrow$ **Transfer Ownership** (Handover Protocol).
    4.  **Invite:** If User is NEW $\rightarrow$ Send First-Party OTP via Postmark. (Existing users get silent reconnect).

### 5.2 The "Hybrid" Cart Capture
* **Problem:** JS-only capture misses custom metadata (Product Add-ons).
* **Solution:**
    * **The Spy (JS):** `capture.v3.js` listens for email input/blur.
    * **The Signal (AJAX):** Pings WordPress Admin AJAX.
    * **The Payload (PHP):** WordPress reads the raw `WC()->cart` session (full metadata), formats it, and fires it to Cloud API.
    * **Result:** 100% data fidelity.

### 5.3 The "15-Minute" Guard
* **Logic:** We do not send emails instantly.
* **RPC:** `ingest_cart_v3` handles the logic in the database.
* **Rule:** If a cart for this email exists and was active < 15 mins ago, UPDATE it. Do not INSERT.
* **Pre-requisite:** Unique Index on `(organization_id, email)` where status is abandoned.

## 6. The AlphaWoo Suite Roadmap
* **Phase 0:** Leakage Detector (DONE).
* **Phase 1:** Monetization / Stripe Integration (DONE).
* **Phase 2:** The Recovery Engine (Email Sending) **(CURRENT)**.

## 7. Deployment & Monetization Strategy
* **Pricing:** Flat Rate **$49/mo**.
* **Stripe Product:** "AlphaWoo Recovery".
* **Billing Logic:**
    * User pays $\rightarrow$ Webhook hits `/api/billing/webhook` $\rightarrow$ DB updates to `subscription_status = 'active'`.
    * Code Logic: `IF org.status === 'active' THEN send_email ELSE log_shadow_metric`.

---

## 8. Visual & Interaction DNA
* **Typography:** `Geist Mono` for all financial data and IDs.
* **Status Indicators:**
    * **Green:** ACTIVE_MODE (Shield Check).
    * **Amber:** PASSIVE_MODE (Alert Triangle).

## 9. Development Rules
* **No "Plugin Bloat":** The plugin is a dumb pipe. Logic lives in Vercel.
* **No "Zombie Scripts":** We strictly manage script enqueuing. `gating.js` and `live-listener.js` are banned.
* **Identity Precision:** Never guess a user exists. Use the RPC.

---

## 12. Architectural Lessons Learned (The Hard Rules)
#### 12.1 The Auth "Gold Standard" (First-Party OTP)
* **Never** use `supabase.auth.signInWithOtp` (It uses default templates and redirects).
* **Always** use `admin.generateLink` $\rightarrow$ Extract Token $\rightarrow$ Send via Postmark.
* **Destination:** All auth flows point to `/auth/update-password?token=...`.

#### 12.2 Stripe "Self-Healing"
* If the DB has a Customer ID, verify it exists in Stripe.
* If Stripe says "Deleted," the code must auto-generate a new Customer ID and update the DB on the fly.

#### 12.3 Schema Drift Prevention
* **Tables:** `organizations`, `carts`.
* **Critical Columns:** `organization_id` (NOT `store_id`), `cart_items` (JSONB).
* **Constraints:** `organization_id` is NOT NULL.

---

## 13. Email Strategy (The Unified Pipeline)
* **Provider:** Postmark.
* **Flows:**
    1.  **Provisioning:** "Welcome / Secure Account" (First-Party Link).
    2.  **Recovery:** "Reset Password" (First-Party Link).
    3.  **Cart Abandonment:** "Did you forget this?" (Link to Checkout).
* **Verification:** All links land on `/auth/update-password` to verify token + set session.

---

## 15. ARCHITECTURAL CANONICALS (AI ASSUMPTION BLOCKERS)

### 15.1 Database Schema (Source of Truth Names)
* **RPC Function:** `get_user_id_by_email(email_input)` (Returns UUID).
* **RPC Function:** `ingest_cart_v3(...)` (Handles the 15-minute upsert logic).
* **Table Constraint:** `idx_carts_org_email_unique` (Unique index on Org+Email where status=abandoned).

### 15.2 Authentication Flow (V3)
1.  **WordPress Connect:** Plugin sends Email + URL.
2.  **API Route:** Checks Identity (RPC) $\rightarrow$ Checks Store $\rightarrow$ Reconciles Ownership.
3.  **If New User:** Generates Token $\rightarrow$ Postmark Email $\rightarrow$ User clicks $\rightarrow$ `/auth/update-password`.
4.  **If Existing:** Silent Success (Returns ID instantly).

### 15.3 File Paths & Namespaces
* **Cart Monitor Class:** `\AlphaWoo\Connector\Cart_Monitor` (`includes/class-aw-cart-monitor.php`).
* **JS Asset:** `assets/js/capture.v3.js`.
* **Cloud Ingestion:** `/api/track/cart` (Service Role Access).

---

## 16. Current Operational State
* **Auth:** **STABLE** (Identity-First, First-Party OTP, No Loops).
* **Billing:** **STABLE** (Stripe Checkout + Webhook + Active Mode Switch).
* **Capture:** **STABLE** (Hybrid V3 - Metadata Supported).
* **Next Step:** Wiring the Cron Job (`/api/cron/recover`) to the `carts` table to trigger the actual emails.