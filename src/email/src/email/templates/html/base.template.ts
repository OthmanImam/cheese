export interface BaseTemplateOptions {
  appName: string;
  appUrl: string;
  supportEmail: string;
  logoUrl?: string;
  previewText?: string;
  year?: number;
}

export function wrapEmailBase(
  content: string,
  options: BaseTemplateOptions,
): string {
  const year = options.year ?? new Date().getFullYear();
  const preview = options.previewText ?? '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${options.appName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@300;400;500;600;700&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    @media only screen and (max-width: 600px) {
      .em-wrap { width: 100% !important; }
      .em-body-pad { padding: 32px 24px !important; }
      .em-hero-pad { padding: 44px 24px !important; }
      .em-hide-mobile { display: none !important; }
      .em-stat-cell { display: block !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid #f0f0f0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Syne',Arial,sans-serif;">

  <!-- Preview text (hidden) -->
  <div style="display:none;font-size:1px;color:#f4f4f4;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preview}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Email card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="em-wrap" style="background:#ffffff;max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background-color:#080808;padding:28px 48px 24px;border-bottom:3px solid #C9A84C;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <a href="${options.appUrl}" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;">
                      ${options.logoUrl
                        ? `<img src="${options.logoUrl}" alt="${options.appName}" width="24" height="24" style="display:block;" />`
                        : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M2 20h20L12 3 2 20z"/><circle cx="9.5" cy="15" r="1.25"/><circle cx="14.5" cy="13.5" r="1"/><circle cx="12" cy="18" r="0.875"/></svg>`
                      }
                      <span style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:4px;color:#C9A84C;text-transform:uppercase;">${options.appName.toUpperCase()}</span>
                      <span style="width:5px;height:5px;background:#F5EED8;border-radius:50%;display:inline-block;margin-bottom:2px;"></span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── CONTENT ── -->
          ${content}

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background-color:#080808;border-top:1px solid rgba(201,168,76,0.12);padding:32px 48px;" class="em-body-pad">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:16px;">
                    <a href="${options.appUrl}/unsubscribe" style="font-size:11px;color:rgba(245,238,216,0.35);text-decoration:none;margin-right:16px;letter-spacing:0.5px;">Unsubscribe</a>
                    <a href="${options.appUrl}/privacy" style="font-size:11px;color:rgba(245,238,216,0.35);text-decoration:none;margin-right:16px;letter-spacing:0.5px;">Privacy Policy</a>
                    <a href="${options.appUrl}/terms" style="font-size:11px;color:rgba(245,238,216,0.35);text-decoration:none;margin-right:16px;letter-spacing:0.5px;">Terms</a>
                    <a href="mailto:${options.supportEmail}" style="font-size:11px;color:rgba(245,238,216,0.35);text-decoration:none;letter-spacing:0.5px;">Support</a>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:10.5px;line-height:1.7;color:rgba(245,238,216,0.2);letter-spacing:0.2px;">
                    ${options.appName} is not a licensed bank. USDC is a fully-reserved stablecoin redeemable 1:1 for US dollars. Yield rates are variable and not guaranteed. This email was sent to you because you have an account with ${options.appName}.<br><br>
                    © ${year} ${options.appName} · Lagos, Nigeria
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/** Reusable gold CTA button */
export function ctaButton(label: string, href: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background-color:#C9A84C;">
        <a href="${href}" style="display:inline-block;background-color:#C9A84C;color:#080808;font-family:'Syne',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:15px 40px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Reusable section label with gold line */
export function sectionLabel(text: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr>
      <td style="width:28px;height:1px;background-color:#C9A84C;padding-right:12px;vertical-align:middle;">
        <div style="width:28px;height:1px;background-color:#C9A84C;font-size:0;line-height:0;">&nbsp;</div>
      </td>
      <td style="font-size:9.5px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;vertical-align:middle;padding-left:4px;">${text}</td>
    </tr>
  </table>`;
}

/** Check list item */
export function checkItem(text: string): string {
  return `<tr>
    <td style="padding:6px 0;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:20px;vertical-align:top;padding-top:2px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
          </td>
          <td style="padding-left:12px;font-size:14px;line-height:1.65;color:#444444;font-weight:300;">${text}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/** Dark info card with left gold border */
export function infoCard(title: string, body: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
    <tr>
      <td style="background-color:#F8F5EC;border-left:3px solid #C9A84C;padding:18px 22px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:8px;">${title}</div>
        <div style="font-size:13px;line-height:1.75;color:#555555;font-weight:300;">${body}</div>
      </td>
    </tr>
  </table>`;
}

/** Dark card with gold top border */
export function darkCard(label: string, value: string, sub: string, rightLabel?: string, rightValue?: string, rightSub?: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#080808;position:relative;margin-bottom:28px;">
    <tr>
      <td colspan="2" style="height:2px;background:linear-gradient(90deg,#C9A84C,#E8C96A);font-size:0;line-height:0;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding:24px 28px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.6);margin-bottom:4px;">${label}</div>
        <div style="font-family:Arial,sans-serif;font-size:30px;font-weight:700;color:#C9A84C;letter-spacing:1px;line-height:1;">${value}</div>
        <div style="font-size:11px;color:rgba(245,238,216,0.35);letter-spacing:0.5px;margin-top:4px;">${sub}</div>
      </td>
      ${rightLabel && rightValue ? `<td style="padding:24px 28px;text-align:right;vertical-align:top;">
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.6);margin-bottom:4px;">${rightLabel}</div>
        <div style="font-size:20px;font-weight:700;color:#3CB87A;line-height:1;">${rightValue}</div>
        <div style="font-size:11px;color:rgba(245,238,216,0.35);letter-spacing:0.5px;margin-top:4px;">${rightSub ?? ''}</div>
      </td>` : '<td></td>'}
    </tr>
  </table>`;
}
