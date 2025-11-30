import { NextResponse } from 'next/server'

type RenderEmailRequest = {
    cart_id: string
    customer_email: string
    total_amount: string
    currency: string
    decision: {
        offer_type: string
        discount_percentage: number
        coupon_code: string | null
        message: string
    }
    deep_data?: Record<string, any>
}

/**
 * Generates the HTML email for Pending Payment Rescue
 * Bible Reference: Section 13 (Email Strategy - React Email)
 * 
 * NOTE: This is a placeholder implementation using template literals.
 * TODO: Replace with React Email components for production.
 */
export async function POST(request: Request) {
    try {
        const payload: RenderEmailRequest = await request.json()

        // Validate required fields
        if (!payload.customer_email || !payload.total_amount || !payload.decision) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Generate the HTML email using the "Structural Alpha" aesthetic
        const html = generateRescueEmailHTML(payload)

        return NextResponse.json({
            success: true,
            html,
            cart_id: payload.cart_id
        })

    } catch (error) {
        console.error('Email Render API Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * Generates the rescue email HTML
 * Uses the Zinc Standard color palette (Bible Section 8)
 */
function generateRescueEmailHTML(data: RenderEmailRequest): string {
    const { total_amount, currency, decision } = data

    // Zinc Standard colors
    const colors = {
        background: '#fafafa', // zinc-50
        text: '#18181b', // zinc-900
        border: '#e4e4e7', // zinc-200
        primary: '#4f46e5', // indigo-600
        success: '#059669', // emerald-600
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Order</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: ${colors.background};
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: white;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.success} 100%);
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: white;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px;
      color: ${colors.text};
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .offer-box {
      background-color: ${colors.background};
      border: 2px solid ${colors.primary};
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .offer-code {
      font-family: 'Courier New', monospace;
      font-size: 24px;
      font-weight: bold;
      color: ${colors.primary};
      letter-spacing: 2px;
    }
    .cta-button {
      display: inline-block;
      background-color: ${colors.primary};
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .footer {
      padding: 24px 32px;
      background-color: ${colors.background};
      text-align: center;
      font-size: 14px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Complete Your Order</h1>
    </div>
    <div class="content">
      <p class="message">
        We noticed you started an order for <strong>${currency} ${total_amount}</strong> but didn't complete the payment.
      </p>
      <p class="message">
        ${decision.message}
      </p>
      ${decision.coupon_code ? `
      <div class="offer-box">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">Your Exclusive Code:</p>
        <div class="offer-code">${decision.coupon_code}</div>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #71717a;">Save ${decision.discount_percentage}% on your order</p>
      </div>
      ` : ''}
      <div style="text-align: center;">
        <a href="#" class="cta-button">Complete Your Order</a>
      </div>
    </div>
    <div class="footer">
      <p>AlphaWoo Revenue Insurance Platform</p>
      <p style="font-size: 12px; margin-top: 8px;">This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
