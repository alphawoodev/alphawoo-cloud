# ALPHAWOO PROJECT BIBLE
**Current Phase:** V3 Rewrite (Execution)
**Last Updated:** 11-29-2025 (POST-SESSION CRASH FIXES)
**Version:** 7.1 (THE FINAL CANONICALIZATION)

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
**Marketing Stance:** **"Headless-Ready & API-First."**
* We target the high-performance sector (DTC Brands & Enterprise) where plugin latency is unacceptable.
* **Performance Promise:** Our API-first architecture handles 46k+ requests/hour with zero impact on site load, unlike legacy plugins that bloat the database.

## 3. The Source of Truth (SSOT Hierarchy)
* **Strategic SSOT:** **This File (The Project Bible).** If a feature or tone contradicts this file, this file wins.
* **Data SSOT:** **The Unified Customer Profile (`customers` table).** We do not build separate tables for different modules. A customer is a customer.
* **Deployment SSOT:** **The `alphawoo-connector` Plugin.** The plugin is the only gateway. Feature flags in the cloud (`stores.active_modules`) determine functionality, not the user's plugin list.

## 4. Technical Stack (The Hard Constraints)
* **Frontend:** Next.js 14+ (App Router) + Tailwind CSS.
* **UI Components:** Shadcn UI (Radix Primitives).
* **Interaction Layer:** `framer-motion` (Micro-interactions) + `sonner` (Premium Toasts).
* **Authentication:** Supabase Auth (Native integration).
    * **Note:** All Server Actions use the **Manual JWT Injection** method to prevent the fatal library crash. (See 12.2)
* **Billing:** Stripe (SaaS Subscriptions).
    * **Requirement:** Must support Agency Billing (One Org pays for multiple Stores).
    * **Self-Serve:** Use **Stripe Customer Portal** for invoices/upgrades.
* **Backend:** Next.js API Routes (Serverless) on Vercel.
* **Security:** **HMAC Signature Verification (Body-Based).** Plugin payloads must contain the signature in the JSON body (`aw_signature`), not HTTP headers, to bypass WAFs. (See 12.1)
* **Database:** Supabase (Postgres).
    * **Schema:** Organization -> Stores (Multi-Currency + Affiliate Tracking) -> Customers -> Carts. **Soft Delete** is used for the `stores` table. (See 12.3)
* **Integration Layer (NEW):** **Make.com (iPaaS).** We use Make.com for all delayed sequencing (e.g., 30-min sleep) and Postmark integration.
* **Queue:** Upstash (QStash/Redis) for "Sliding Window" delays.
* **Email:** Postmark (Transactional Stream). **MUST** have DKIM/DMARC verified.
* **Internal Analytics:** PostHog (Product usage & Session replay).
* **Plugin:** Minimal PHP "Connector" only. No local processing.
* **Infrastructure Domains:**
    * **Marketing:** `alphawoo.com` (Root). **NEVER** use `www`.
    * **SaaS Dashboard:** `app.alphawoo.com` (The secure console).
    * **Ingestion API:** `api.alphawoo.com` (Strictly for Plugin traffic).
    * **Development:** `*.alphawoo.dev` (Staging and Sandbox stores).

## 5. Key Feature Logic
* **Pending Payment Rescue:**
    * Trigger: `woocommerce_order_status_pending` OR `woocommerce_order_status_on-hold` AND `created_via='checkout'`.
    * Action: Wait 30 mins -> Send Email.
* **Live Listener (The "Cookie" Aware Script):**
    * JS listens to `#billing_phone` and `#billing_email` on blur.
    * **Compliance:** MUST check "TCPA Consent" box AND respect `wp_consent_api` (Marketing Cookies) before initializing.
* **Shadow Mode (The Confidence Builder):**
    * **Logic:** If `store.shadow_mode = true`, process all events and "fake" the rescue in the database, but **suppress the email**.
    * **UI:** Dashboard displays "Potential Revenue Rescued" to encourage activation.
* **Hybrid Data:**
    * Plugin captures "Deep Data" (Custom Fields) that the REST API cannot see.
* **Agent-Native (WP 6.9 Abilities API):**
    * **Strict Version Gating:** All Agent logic must be wrapped in `version_compare($wp_version, '6.9', '>=')`.
    * **Philosophy:** The Plugin acts as a proxy, exposing Cloud Intelligence to local AI Agents.
    * **Registered Ability 1:** `read_revenue_pulse` (Returns today's rescued revenue & site uptime stats).
    * **Registered Ability 2:** `analyze_ghost_orders` (Returns analysis of pending payment patterns).
    * **Registered Ability 3:** `trigger_profit_guard` (Allows Agent to remotely toggle strict coupon blocking).

## 6. The AlphaWoo Suite Roadmap (The 8 Pillars)
**Architectural Rule:** All solutions utilize the single "AlphaWoo Connect" plugin and Unified Customer Profile.

**Phase 1: Revenue Rescue (Core)**
* **Cart Saver:** Recovers abandoned carts & "Ghost Orders" (Pending Payments) via multi-channel sequences.
* **Profit Guard (Pricing Engine):**
    * *Core Logic:* **Intelligent Offer Decisioning.**
    * *Mechanism:* Uses predictive CLV modeling to determine the *minimum viable discount* needed to convert. Blocks loss-leader coupons and targets high-value carts with VIP offers.
* **Site Pulse:** RUM monitoring for checkout speeds & downtime alerts.

**Phase 2: Operational Efficiency (The "Shipping Shock" Fix)**
* **Logistics Guard (Global):**
    * *Problem:* High shipping costs & surprise duties cause 60%+ of abandonments.
    * *Solution:* **DDP/DDU Calculator + AI Carrier Selection.** Automatically calculates duties/taxes at checkout and selects the optimal carrier to prevent "Shipping Shock".
* **Stock Guard (Oversell Protection):**
    * *Focus:* Strictly prevents "Ghost Orders" caused by inventory lag across channels.
    * *Mechanism:* Real-time reservation of stock during the checkout session.

**Phase 3: Retention & Resolution**
* **Resolution Agent (AI):**
    * *Focus:* LLM-driven agent specifically for **Post-Purchase Defense** (WISMO, Returns, Address Changes).
    * *Goal:* Prevent chargebacks and reduce support ticket volume.
* **Best Customer Spotlight:** Auto-segmentation of VIPs and "At Risk" customers using the CLV model.
* **Weekly Store Report:** The "CEO Digest" summarizing Rescued Revenue + Operational Efficiency gains.

## 7. Deployment & Monetization Strategy (The Hybrid Model)
**Strategy:** We combine scalable SaaS revenue with high-ticket "Setup" revenue to fund development.

* **1. The SaaS Subscription (Recurring):**
    * **Model:** Outcome-Based Pricing.
    * **Base:** Platform Access (Site Pulse + Data Retention).
    * **Metered:** Charged per "Rescued Cart" or "Successful AI Resolution."
* **2. The "Concierge" Service (High-Ticket One-Time):**
    * **Offering:** "Revenue Ops Implementation" ($2,500+).
    * **Deliverable:** We configure the AlphaWoo suite + Custom Make.com workflows for the client (e.g., syncing data to their ERP/CRM).
    * **Why:** This funds cash flow and locks in enterprise clients.
* **3. The Agency Enablement:**
    * We provide the "Blueprints" for the above service to our Agency Partners, allowing them to sell the setup fee to *their* clients.
* **4. The Distribution Moat:**
    * **Goal:** Secure official **WooCommerce Marketplace Partnership**.
    * **Why:** The "Woo Seal of Approval" is the ultimate trust signal for high-value merchants.

## 8. Visual & Interaction DNA (The "Structural Alpha" Standard)
* **Goal:** The UI must feel "Engineered" and look like a bank vault, not a casino.
* **The "Zinc" Palette:**
    * **Backgrounds:** `zinc-50` to `white` (Light), `zinc-950` (Dark). **NO pure black (#000000).**
    * **Borders:** `border-zinc-200` (Light), `border-zinc-800` (Dark).
* **The Brand Gradient (Indigo -> Emerald):**
    * **Primary Action/Trust:** `indigo-600` (#4F46E5).
    * **Revenue/Profit:** `emerald-600` (#059669) or `teal-600`. **NO NEON.**
    * **Destructive/Risk:** `rose-600`.
* **The Logo (Structural Alpha):**
    * A solid, geometric 'A' with **flat feet** (Stability) and **rounded top** (Friendliness).
    * Uses the Indigo -> Emerald gradient.
* **Responsive Mastery:**
    * **Thumb-Friendly:** All interactive targets must be at least 44px height.
    * **No Horizontal Scroll:** Complex tables must adapt to "Card View" on mobile.
* **Data Density:**
    * Use `Geist Mono` or `JetBrains Mono` for all IDs, IPs, and Financials.
* **Zero Layout Shift:**
    * Always use `<Skeleton />` loaders.

## 9. Development Rules
* **No "Plugin Bloat":** Never add UI or Logic to the PHP plugin. It is a dumb pipe.
* **Agency First:** Database must always support Multi-tenant (One Org = Many Stores).
* **Code Quality:** All UI components must support Dark Mode by default.
* **Backwards Compatibility:** Agent-Native features must degrade gracefully.

## 10. Operational Execution (The 3-Day Sprint)
* **Day 1: The Foundation & The Funeral** (Complete)
* **Day 2: The Connector (Plugin)** (Complete)
* **Day 3: The First Flow** (Complete)

## 11. The AI Organization (Team Structure & Tooling)
* **Context Bridge:** This file (`AlphaWoo Project Bible.md`) is the API connecting all Gems. It must be uploaded to every session.

## 12. Architectural Lessons Learned (The Hard Rules)
This section outlines constraints derived from production conflicts between Node.js, PHP, and external environments.

#### **12.1 HMAC Canonicalization Standard (PHP ↔ Node.js)**
To ensure the HMAC signature always matches, we enforce the following **absolute standards** for payload signing:
* **Payload Construction:** Only include core transactional data (e.g., `order_id`, `order_total`, `currency`) in the signed payload. Omit all dynamic fields like timestamps (`aw_timestamp_utc`) and complex, nested objects (`deep_data`) from the signing payload, as these cause byte discrepancies.
* **Data Type Canonicalization:** All unique identifiers and numeric values used in the signature must be explicitly cast to strings (`strval()`) on the PHP side to prevent float/integer discrepancies.
* **Encoding Flags (PHP Side):** The PHP connector must use native `json_encode()` with mandatory flags to mirror Node.js's output precisely:
    * `ksort($array_to_sign)`: Must be applied to the top-level array before encoding.
    * **Flags:** `JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_FORCE_OBJECT` (This is required to force consistent object rendering).

#### **12.2 Next.js Server Action Authentication (The Anti-Crash Rule)**
The standard `createServerClient` and `supabase.auth.getUser()` calls must be treated as **crash-prone** within Vercel Server Actions due to cookie handling conflicts.
* **The Rule:** Authentication logic in all Server Actions must be handled by the **manual JWT Token Injection** method (using a custom client) which extracts the JWT from the cookie and injects it into the client's `Authorization` header. This isolates the database access from the session management crash.

#### **12.3 Data Consistency & Deletion Strategy**
* **Soft Delete:** The primary deletion strategy for the **`stores`** table must be **Soft Delete** (using a `deleted_at` timestamp). This preserves the **Unified Customer Profile** and historical revenue metrics, allowing for store re-activation without data loss.
* **No Manual Cleanup:** We will not rely on the user to manually clean up database fields after a cloud operation. The **WP-CLI Cleanup Command** is the required developer solution for local database hygiene.