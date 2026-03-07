// src/email/templates/base.ts

export const BRAND = {
  gold:       '#C9A84C',
  goldLight:  '#E2C06A',
  goldDark:   '#A8822C',
  black:      '#0A0A0A',
  darkBg:     '#111111',
  cardBg:     '#1A1A1A',
  surface:    '#222222',
  border:     '#2E2E2E',
  textPrimary:'#F5F5F5',
  textMuted:  '#999999',
  textLight:  '#CCCCCC',
  white:      '#FFFFFF',
  successGreen: '#22C55E',
  errorRed:   '#EF4444',
}

export function baseLayout(params: {
  preheader:  string
  body:       string
  year?:      number
}): string {
  const year = params.year ?? new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Cheese Wallet</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: ${BRAND.black}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: ${BRAND.gold}; text-decoration: none; }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body style="background-color:${BRAND.black};margin:0;padding:0;width:100%;">
  <!-- preheader -->
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;font-size:1px;line-height:1px;">
    ${params.preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:${BRAND.black};min-height:100vh;">
    <tr><td align="center" style="padding:32px 16px 48px;">

      <!-- Container -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
        style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding-bottom:32px;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="background:linear-gradient(135deg,${BRAND.goldDark},${BRAND.gold},${BRAND.goldLight});border-radius:16px;padding:12px 20px;display:inline-block;">
                  <span style="font-size:22px;font-weight:700;color:${BRAND.black};letter-spacing:-0.5px;font-family:'Inter',sans-serif;">
                    🧀 Cheese Wallet
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card body -->
        <tr>
          <td style="background-color:${BRAND.cardBg};border-radius:20px;border:1px solid ${BRAND.border};overflow:hidden;">
            ${params.body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:32px;text-align:center;">
            <p style="font-size:12px;color:${BRAND.textMuted};font-family:'Inter',sans-serif;line-height:1.8;">
              Cheese Wallet · The Golden Standard in Digital Finance<br/>
              <a href="https://cheesewallet.app" style="color:${BRAND.gold};text-decoration:none;">cheesewallet.app</a>
              &nbsp;·&nbsp;
              <a href="https://cheesewallet.app/privacy" style="color:${BRAND.textMuted};text-decoration:none;">Privacy</a>
              &nbsp;·&nbsp;
              <a href="https://cheesewallet.app/terms" style="color:${BRAND.textMuted};text-decoration:none;">Terms</a>
            </p>
            <p style="margin-top:12px;font-size:11px;color:${BRAND.border};font-family:'Inter',sans-serif;">
              © ${year} Cheese Wallet. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Reusable components ───────────────────────────────────

export function goldDivider(): string {
  return `<tr><td style="padding:0 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,${BRAND.gold}55,transparent);"></div>
  </td></tr>`
}

export function primaryButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr>
      <td style="border-radius:12px;background:linear-gradient(135deg,${BRAND.goldDark},${BRAND.gold});box-shadow:0 4px 24px ${BRAND.gold}40;">
        <a href="${href}" class="btn" target="_blank"
          style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:600;
                 color:${BRAND.black};text-decoration:none;letter-spacing:-0.2px;
                 font-family:'Inter',sans-serif;border-radius:12px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`
}

export function otpBox(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr>
      <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.gold}55;
                 border-radius:16px;padding:24px 48px;text-align:center;">
        <span style="font-size:48px;font-weight:700;letter-spacing:16px;
                     color:${BRAND.gold};font-family:'Inter',sans-serif;
                     background:linear-gradient(135deg,${BRAND.goldDark},${BRAND.goldLight});
                     -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
          ${code}
        </span>
      </td>
    </tr>
  </table>`
}

export function amountDisplay(usdc: string, ngn?: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr>
      <td style="background:linear-gradient(135deg,${BRAND.surface},${BRAND.cardBg});
                 border:1px solid ${BRAND.gold}33;border-radius:16px;padding:24px 48px;text-align:center;">
        <p style="font-size:40px;font-weight:700;color:${BRAND.gold};
                  font-family:'Inter',sans-serif;letter-spacing:-1px;margin:0;">
          $${usdc} <span style="font-size:20px;color:${BRAND.textMuted};">USDC</span>
        </p>
        ${ngn ? `<p style="font-size:14px;color:${BRAND.textMuted};margin-top:6px;font-family:'Inter',sans-serif;">≈ ₦${ngn}</p>` : ''}
      </td>
    </tr>
  </table>`
}

export function detailRow(label: string, value: string, highlight = false): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-size:13px;color:${BRAND.textMuted};font-family:'Inter',sans-serif;">${label}</td>
          <td align="right" style="font-size:14px;font-weight:${highlight ? '600' : '400'};
                                   color:${highlight ? BRAND.gold : BRAND.textLight};
                                   font-family:'Inter',sans-serif;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`
}

export function infoBox(text: string, type: 'info' | 'warning' | 'success' = 'info'): string {
  const colors = {
    info:    { bg: `${BRAND.gold}15`,   border: `${BRAND.gold}40`,   icon: '💡' },
    warning: { bg: '#F59E0B15',         border: '#F59E0B40',         icon: '⚠️' },
    success: { bg: `${BRAND.successGreen}15`, border: `${BRAND.successGreen}40`, icon: '✅' },
  }
  const c = colors[type]
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:14px 16px;">
        <p style="font-size:13px;color:${BRAND.textLight};font-family:'Inter',sans-serif;line-height:1.6;margin:0;">
          ${c.icon}&nbsp;&nbsp;${text}
        </p>
      </td>
    </tr>
  </table>`
}
