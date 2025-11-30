# Stock Reservations Database - Implementation Complete

## ✅ What Was Built

### 1. SQL Migration (`002_stock_reservations.sql`)

**Table:** `public.stock_reservations`
- Multi-tenant aware (store_id references stores table)
- 15-minute expiry logic (expires_at column)
- Unique constraint prevents duplicate reservations
- Supports product variations

**Indexes:**
- `idx_stock_reservations_expires_at` - Fast expiry lookups
- `idx_stock_reservations_store_cart` - Fast cart lookups
- `idx_stock_reservations_status` - Status filtering

**RLS Policies:**
- Store owners can read their own reservations
- Service role can manage all (for API)

### 2. Helper Functions

#### `create_stock_reservation()`
- Creates or updates reservation for a cart item
- Auto-calculates 15-minute expiry
- Returns reservation UUID
- ON CONFLICT updates existing reservation

#### `fulfill_reservation()`
- Marks reservations as fulfilled when order created
- Links reservation to order_id
- Returns count of fulfilled reservations

#### `expire_old_reservations()`
- Auto-expires reservations past expiry time
- Returns count of expired reservations
- Should be called by cron job

### 3. Stock Guard API Update

**File:** `src/app/api/v1/operations/stock_guard/route.ts`

**Changes:**
- Replaced placeholder logic with real RPC calls
- Calls `create_stock_reservation` for each cart item
- Returns actual reservation IDs from database
- Proper error handling with customer-friendly messages

---

## 🔄 Reservation Lifecycle

```
1. Customer clicks "Place Order"
   ↓
2. Stock Guard API called
   ↓
3. create_stock_reservation() RPC
   - Inserts record with 15-min expiry
   - Returns reservation_id
   ↓
4a. Success: Order proceeds
4b. Failure: Checkout blocked
   ↓
5. Order created successfully
   ↓
6. fulfill_reservation() called
   - Updates status to 'fulfilled'
   - Links to order_id
```

---

## 📋 Next Steps

### Required Actions
1. **Run SQL Migration** in Supabase SQL Editor:
   ```bash
   # File: supabase/migrations/002_stock_reservations.sql
   ```

2. **Set up Cron Job** for auto-expiry:
   ```sql
   -- Run every 5 minutes
   SELECT cron.schedule(
     'expire-stock-reservations',
     '*/5 * * * *',
     $$SELECT expire_old_reservations()$$
   );
   ```

3. **Add Order Fulfillment Hook** to PHP Connector:
   ```php
   add_action('woocommerce_checkout_order_created', [
     'AlphaWoo_Stock_Guard',
     'fulfill_reservation'
   ], 10, 1);
   ```

### Testing Checklist
- [ ] Run SQL migration in Supabase
- [ ] Test stock reservation creation
- [ ] Test 15-minute expiry logic
- [ ] Test reservation fulfillment
- [ ] Test duplicate prevention (unique constraint)
- [ ] Test multi-tenant isolation (RLS)

---

## 🔒 Security Features

**Multi-Tenancy:**
- All queries filtered by store_id
- RLS policies enforce data isolation
- No cross-store data leakage

**HMAC Verification:**
- All API calls verified before DB access
- Prevents unauthorized reservations

**Graceful Degradation:**
- If DB fails, checkout blocked (safe)
- Customer sees friendly error message

---

## 📊 Database Schema

```sql
CREATE TABLE public.stock_reservations (
    reservation_id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id),
    cart_hash TEXT NOT NULL,
    product_id BIGINT NOT NULL,
    variation_id BIGINT DEFAULT 0,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    sku TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- 15 min from creation
    status TEXT DEFAULT 'reserved',
    order_id BIGINT,
    UNIQUE (store_id, cart_hash, product_id, variation_id)
);
```

---

## 🎯 Bible Compliance

**Section 6 (Stock Guard):**
- ✅ Real-time stock reservation
- ✅ 15-minute expiry logic
- ✅ Prevents Ghost Orders

**Section 9 (Agency First):**
- ✅ Multi-tenant aware (store_id)
- ✅ RLS policies for data isolation

**Section 12.1 (HMAC):**
- ✅ Signature verification maintained

---

## Status: READY FOR TESTING

The stock reservations system is now fully implemented and ready for testing once the SQL migration is run in Supabase.
