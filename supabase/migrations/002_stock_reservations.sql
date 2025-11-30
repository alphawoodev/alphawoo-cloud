-- Migration: Stock Reservations Table
-- Purpose: Real-time stock reservation to prevent Ghost Orders
-- Bible Reference: Section 6 (Stock Guard - Oversell Protection)

-- Table: public.stock_reservations
CREATE TABLE public.stock_reservations (
    -- Unique Identifier
    reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-Tenancy Keys (Agency-First Architecture)
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    
    -- Transactional Keys (for linking to the cart)
    cart_hash TEXT NOT NULL,
    
    -- Reservation Details
    product_id BIGINT NOT NULL,
    variation_id BIGINT DEFAULT 0,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    sku TEXT,
    
    -- State and Lifecycle (15-Minute Expiry Logic)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status Management
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'fulfilled', 'cancelled', 'expired')),
    
    -- Order linkage (set when order is created)
    order_id BIGINT,
    
    -- Prevent duplicate reservations for same cart + product
    UNIQUE (store_id, cart_hash, product_id, variation_id)
);

-- Indexes for Performance
CREATE INDEX idx_stock_reservations_expires_at ON public.stock_reservations (expires_at) 
WHERE status = 'reserved';

CREATE INDEX idx_stock_reservations_store_cart ON public.stock_reservations (store_id, cart_hash);

CREATE INDEX idx_stock_reservations_status ON public.stock_reservations (status);

-- Row Level Security (RLS)
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- Policy: Store owners can read their own reservations
CREATE POLICY "Store owners can read their own reservations"
ON public.stock_reservations FOR SELECT
USING (
    store_id IN (
        SELECT id FROM public.stores WHERE deleted_at IS NULL
    )
);

-- Policy: Service role can manage all reservations (for API)
CREATE POLICY "Service role can manage reservations"
ON public.stock_reservations FOR ALL
USING (true)
WITH CHECK (true);

-- Function: Auto-expire old reservations
CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update expired reservations
    UPDATE public.stock_reservations
    SET status = 'expired'
    WHERE status = 'reserved'
      AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$;

-- Function: Create stock reservation
CREATE OR REPLACE FUNCTION create_stock_reservation(
    _store_id UUID,
    _cart_hash TEXT,
    _product_id BIGINT,
    _variation_id BIGINT,
    _quantity INTEGER,
    _sku TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _reservation_id UUID;
    _expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate expiry (15 minutes from now)
    _expires_at := NOW() + INTERVAL '15 minutes';
    
    -- Insert reservation (ON CONFLICT update quantity)
    INSERT INTO public.stock_reservations (
        store_id,
        cart_hash,
        product_id,
        variation_id,
        quantity,
        sku,
        expires_at
    ) VALUES (
        _store_id,
        _cart_hash,
        _product_id,
        _variation_id,
        _quantity,
        _sku,
        _expires_at
    )
    ON CONFLICT (store_id, cart_hash, product_id, variation_id)
    DO UPDATE SET
        quantity = EXCLUDED.quantity,
        expires_at = EXCLUDED.expires_at,
        status = 'reserved',
        created_at = NOW()
    RETURNING reservation_id INTO _reservation_id;
    
    RETURN _reservation_id;
END;
$$;

-- Function: Fulfill reservation (when order is created)
CREATE OR REPLACE FUNCTION fulfill_reservation(
    _cart_hash TEXT,
    _store_id UUID,
    _order_id BIGINT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    fulfilled_count INTEGER;
BEGIN
    UPDATE public.stock_reservations
    SET 
        status = 'fulfilled',
        order_id = _order_id
    WHERE 
        cart_hash = _cart_hash
        AND store_id = _store_id
        AND status = 'reserved';
    
    GET DIAGNOSTICS fulfilled_count = ROW_COUNT;
    
    RETURN fulfilled_count;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE public.stock_reservations IS 'Real-time stock reservations to prevent Ghost Orders (Bible Section 6)';
COMMENT ON COLUMN public.stock_reservations.expires_at IS '15-minute expiry from creation time';
COMMENT ON COLUMN public.stock_reservations.cart_hash IS 'WooCommerce cart hash for session tracking';
COMMENT ON FUNCTION expire_old_reservations() IS 'Auto-expire reservations older than 15 minutes';
COMMENT ON FUNCTION create_stock_reservation IS 'Create or update stock reservation for a cart item';
COMMENT ON FUNCTION fulfill_reservation IS 'Mark reservations as fulfilled when order is created';
