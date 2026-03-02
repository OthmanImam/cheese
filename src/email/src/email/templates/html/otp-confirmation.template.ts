import { BaseTemplateOptions, wrapEmailBase, infoCard } from './base.template';

export interface OtpConfirmationVars {
  firstName: string;
  otp: string;
  expiryMinutes: number;
  ipAddress?: string;
  deviceInfo?: string;
  requestedAt: string;
}

export function otpConfirmationTemplate(
  vars: OtpConfirmationVars,
  base: BaseTemplateOptions,
): string {
  const digits = vars.otp.split('');

  const content = `
    <!-- Hero -->
    <tr>
      <td style="background-color:#080808;padding:52px 48px 48px;text-align:center;" class="em-hero-pad">
        <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:16px;">Verification Code</div>
        <h1 style="font-family:'Syne',Arial,sans-serif;font-size:32px;font-weight:900;line-height:1.15;color:#F5EED8;margin:0 0 14px;">
          Your one-time code, ${vars.firstName}.
        </h1>
        <p style="font-size:14px;font-weight:300;line-height:1.75;color:rgba(245,238,216,0.55);margin:0 auto;max-width:380px;">
          Use this code to verify your ${base.appName} account. It expires in <strong style="color:#C9A84C;">${vars.expiryMinutes} minutes</strong>.
        </p>
      </td>
    </tr>

    <!-- OTP display -->
    <tr>
      <td style="background-color:#080808;padding:0 48px 48px;" class="em-body-pad">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#0f0f0f;border:1px solid rgba(201,168,76,0.25);position:relative;">
          <tr>
            <td colspan="6" style="height:2px;background:linear-gradient(90deg,#C9A84C,#E8C96A);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:36px 28px;text-align:center;">
              <div style="margin-bottom:12px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    ${digits.map((d) => `
                    <td style="padding:0 6px;">
                      <div style="width:52px;height:68px;background:#080808;border:1px solid rgba(201,168,76,0.3);font-family:Arial,monospace;font-size:34px;font-weight:700;color:#C9A84C;text-align:center;line-height:68px;">${d}</div>
                    </td>`).join('')}
                  </tr>
                </table>
              </div>
              <div style="font-size:11.5px;color:rgba(245,238,216,0.3);letter-spacing:1.5px;text-transform:uppercase;margin-top:16px;">
                Expires in ${vars.expiryMinutes} minutes · Do not share this code
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background-color:#ffffff;padding:48px 48px 40px;" class="em-body-pad">

        <!-- Security notice -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:rgba(60,184,122,0.06);border:1px solid rgba(60,184,122,0.2);margin-bottom:28px;">
          <tr>
            <td style="padding:16px 22px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:20px;vertical-align:top;padding-top:2px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3CB87A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/></svg>
                  </td>
                  <td style="padding-left:12px;font-size:13.5px;line-height:1.7;color:#333333;font-weight:300;">
                    <strong style="color:#111111;font-weight:600;">${base.appName} will never ask for this code.</strong> If you didn't request a verification code, please ignore this email and your account will remain secure.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Request details -->
        ${vars.ipAddress || vars.deviceInfo ? infoCard('Request Details', `
          ${vars.requestedAt ? `<div style="margin-bottom:8px;"><strong>Time:</strong> ${vars.requestedAt}</div>` : ''}
          ${vars.ipAddress ? `<div style="margin-bottom:8px;"><strong>IP Address:</strong> ${vars.ipAddress}</div>` : ''}
          ${vars.deviceInfo ? `<div><strong>Device:</strong> ${vars.deviceInfo}</div>` : ''}
          <div style="margin-top:12px;font-size:12px;color:#888;">If this wasn't you, please contact <a href="mailto:${base.supportEmail}" style="color:#C9A84C;">${base.supportEmail}</a> immediately.</div>
        `) : ''}

      </td>
    </tr>

    <!-- Security footer -->
    <tr>
      <td style="background-color:#080808;padding:32px 48px;text-align:center;" class="em-body-pad">
        <div style="font-size:11px;line-height:1.7;color:rgba(245,238,216,0.3);letter-spacing:0.3px;">
          This code is valid for ${vars.expiryMinutes} minutes. After that, request a new code from the app.<br>
          If you didn't request this, contact us at <a href="mailto:${base.supportEmail}" style="color:rgba(201,168,76,0.5);text-decoration:none;">${base.supportEmail}</a>
        </div>
      </td>
    </tr>
  `;

  return wrapEmailBase(content, {
    ...base,
    previewText: `Your ${base.appName} verification code: ${vars.otp} (expires in ${vars.expiryMinutes} min)`,
  });
}
