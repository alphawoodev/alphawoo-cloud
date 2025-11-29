# ALPHAWOO PROJECT BIBLE
**Current Phase:** V3 Rewrite (Execution)
**Last Updated:** 11-28-2025
**Version:** 6.0 (THE AUTOMATION IMPERATIVE)

## 1. Brand Identity (CRITICAL)
* **Name:** **AlphaWoo** (CamelCase).
* **Why:** The capital "W" signals native alignment with the WooCommerce ecosystem. Never use "Alphawoo" or "Alpha Woo".
* **Positioning:** "Revenue Insurance & Automation," not just "Cart Recovery."
* **Voice:** Professional, technical, authoritative (Store Owner to Store Owner). Avoid marketing fluff; focus on ROI and Architecture.
* **The Logo:** **"The Structural Alpha."**
    * *Visual:* A solid, geometric letter 'A' with a **flat base** (stability) and **soft rounded top** (approachability).
    * *Meaning:* It represents "Infrastructure" and "Foundation."
    * *Color:* Gradient from **Deep Indigo** (Trust) to **Emerald Teal** (Profit).

## 2. The North Star
**Product Definition:** AlphaWoo is a "Revenue Insurance Platform" for WooCommerce that rescues lost sales via Hybrid Cloud technology.
**Core Value:** We solve "Shipping Shock," "Ghost Orders," and "Margin Erosion" via a lightweight connector + heavy-duty cloud.
**Marketing Stance:** **"Headless-Ready & API-First."**
* We target the high-performance sector (DTC Brands & Enterprise) where plugin latency is unacceptable.
* **Performance Promise:** Our API-first architecture handles 46k+ requests/hour with zero impact on site load, unlike legacy plugins that bloat the database.

## 3. The Source of Truth (SSOT Hierarchy)
To prevent "feature creep" and "spaghetti code," we adhere to three strict sources of truth:
* **Strategic SSOT:** **This File (The Project Bible).** If a feature or tone contradicts this file, this file wins.
* **Data SSOT:** **The Unified Customer Profile (`customers` table).** We do not build separate tables for different modules. A customer is a customer.
* **Deployment SSOT:** **The `alphawoo-connector` Plugin.** The plugin is the only gateway. Feature flags in the cloud (`stores.active_modules`) determine functionality, not the user's plugin list.

## 4. Technical Stack (The Hard Constraints)
* **Frontend:** Next.js 14+ (App Router) + Tailwind CSS.
* **UI Components:** Shadcn UI (Radix Primitives).
* **Interaction Layer:** `framer-motion` (Micro-interactions) + `sonner` (Premium Toasts).
* **Authentication:** Supabase Auth (Native integration).
* **Billing:** Stripe (SaaS Subscriptions).
    * **Requirement:** Must support Agency Billing (One Org pays for multiple Stores).
    * **Self-Serve:** Use **Stripe Customer Portal** for invoices/upgrades.
* **Backend:** Next.js API Routes (Serverless) on Vercel.
* **Security:** **HMAC Signature Verification.** All plugin payloads must be signed (`hash_hmac`) using the Store API Key.
* **Database:** Supabase (Postgres).
    * **Schema:** Organization -> Stores (Multi-Currency + Affiliate Tracking) -> Customers -> Carts.
* **Integration Layer (NEW):** **Make.com (iPaaS).** We provide official Make.com blueprints for Agencies to extend our logic.
* **Queue:** Upstash (QStash/Redis) for "Sliding Window" delays.
* **Email:** Postmark (Transactional Stream). **MUST** have DKIM/DMARC verified.
* **Internal Analytics:** PostHog (Product usage & Session replay).
* **Plugin:** Minimal PHP "Connector" only. No local processing.
* **Infrastructure Domains:**
    * **Marketing:** `alphawoo.com` (Root). **NEVER** use `www`.
    * **SaaS Dashboard:** `app.alphawoo.com` (The secure console).
    * **Ingestion API:** `api.alphawoo.com` (Strictly for Plugin traffic).
    * **Development:** `*.alphawoo.dev` (Staging and Sandbox stores).
* **Email Infrastructure (The 3 Lanes):**
    * **Corporate:** `alphawoo.com` (Google Workspace - ACTIVE). Handles Humans.
    * **System:** `system.alphawoo.com` (Postmark). Handles SaaS Alerts/Auth.
    * **Revenue:** `[Merchant-Domain]` via Sender Signatures. Handles End-Customer Recovery.
* **Email Strategy (Role-Based Separation):**
    * **`support@alphawoo.com` (Human):** Hosted on Google Workspace. For tickets/inquiries.
    * **`alerts@alphawoo.com` (System):** Hosted on Postmark (Shadow Sender). For Auth, Downtime, and Risk notifications.
    * **`billing@alphawoo.com` (Finance):** Hosted on Postmark (Shadow Sender). For Stripe receipts.
* **Deliverability:**
    * **DMARC:** Must be strictly enforced (`p=quarantine` minimum) on all System domains.
    * **Separation:** Marketing emails must NEVER be sent from the `system.` subdomain.

## 5. Key Feature Logic
* **Pending Payment Rescue:**
    * Trigger: `woocommerce_order_status_pending` AND `created_via='checkout'`.
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
**Goal:** The UI must feel "Engineered" and look like a bank vault, not a casino.
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
**Goal:** Establish data flow and kill the legacy application.

* **Day 1: The Foundation & The Funeral**
    * **V2 Sunset:** Disable new signups for the legacy app immediately.
    * **SaaS Repo:** Initialize Next.js 14 + Shadcn + Tailwind. Implement "Zinc/Indigo" defaults.
    * **Database:** Run V3 Schema migration (including `affiliate_id` and `shadow_mode`).
* **Day 2: The Connector (Plugin)**
    * **Boilerplate:** Create `alphawoo-connector`.
    * **Security:** Implement HMAC Signature signing on all outbound requests.
    * **Auth:** Implement the "Reverse Handshake."
* **Day 3: The First Flow**
    * **Cloud Listener:** Create Next.js API route to receive and **Verify HMAC**.
    * **Integration:** Connect Make.com Webhook trigger (Proof of Concept).
    * **Delivery:** Send the first text-only "Rescue Email."

## 11. The AI Organization (Team Structure & Tooling)
**Context Bridge:** This file (`AlphaWoo Project Bible.md`) is the API connecting all Gems. It must be uploaded to every session.

### The Gem Squad