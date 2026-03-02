import { BaseTemplateOptions, wrapEmailBase, ctaButton, infoCard } from './base.template';

export interface WithdrawalConfirmationVars {
  firstName: string;
  amountUsd: string;
  amountNgn: string;
  destinationBank: string;
  destinationAccount: string;
  destinationName: string;
  transactionId: string;
  initiatedAt: string;
  estimatedArrival: string;
  remainingBalanceUsd: string;
  remainingBalanceNgn: string;
  dashboardUrl: string;
}

export function withdrawalConfirmationTemplate(
  vars: WithdrawalConfirmationVars,
  base: BaseTemplateOptions,
): string {
  const maskedAccount = `****${vars.destinationAccount.slice(-4)}`;

  const content = `
    <!-- Hero -->
    <tr>
      <td style="background-color:#080808;padding:52px 48px 48px;text-align:center;" class="em-hero-pad">
        <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:16px;">Withdrawal Processed</div>
        <h1 style="font-family:'Syne',Arial,sans-serif;font-size:34px;font-weight:900;line-height:1.15;color:#F5EED8;margin:0 0 18px;">
          Your withdrawal is<br>
          <em style="color:#C9A84C;font-style:italic;">on its way, ${vars.firstName}.</em>
        </h1>
        <p style="font-size:15px;font-weight:300;line-height:1.75;color:rgba(245,238,216,0.65);margin:0 auto 32px;max-width:420px;">
          ${vars.amountUsd} (${vars.amountNgn}) has been sent to your account at ${vars.destinationBank}. Expected arrival: <strong style="color:#C9A84C;">${vars.estimatedArrival}</strong>.
        </p>
        ${ctaButton('Track in Wallet', vars.dashboardUrl)}
      </td>
    </tr>

    <!-- Amount card -->
    <tr>
      <td style="background-color:#080808;padding:0 48px 40px;" class="em-body-pad">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#0f0f0f;position:relative;">
          <tr>
            <td colspan="2" style="height:2px;background:linear-gradient(90deg,#C9A84C,#E8C96A);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 24px;">
              <div style="font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(201,168,76,0.6);margin-bottom:6px;">Amount Withdrawn</div>
              <div style="font-family:Arial,sans-serif;font-size:40px;font-weight:700;color:#F5EED8;letter-spacing:1px;line-height:1;">${vars.amountUsd}</div>
              <div style="font-size:12px;color:rgba(245,238,216,0.35);letter-spacing:0.5px;margin-top:5px;">${vars.amountNgn}</div>
            </td>
            <td style="padding:28px 28px 24px;text-align:right;vertical-align:top;">
              <div style="font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(201,168,76,0.6);margin-bottom:6px;">Remaining Balance</div>
              <div style="font-size:26px;font-weight:700;color:#C9A84C;line-height:1;">${vars.remainingBalanceUsd}</div>
              <div style="font-size:12px;color:rgba(245,238,216,0.35);letter-spacing:0.5px;margin-top:5px;">${vars.remainingBalanceNgn}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background-color:#ffffff;padding:48px 48px 40px;" class="em-body-pad">

        <!-- Destination -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fafafa;border:1px solid #eeeeee;margin-bottom:28px;">
          <tr>
            <td style="padding:20px 24px;">
              <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:14px;">Destination Account</div>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:6px 0;font-size:12px;font-weight:600;color:#999999;text-transform:uppercase;letter-spacing:0.5px;width:40%;">Account Name</td>
                  <td style="padding:6px 0;font-size:13.5px;font-weight:500;color:#111111;text-align:right;">${vars.destinationName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;font-weight:600;color:#999999;text-transform:uppercase;letter-spacing:0.5px;">Bank</td>
                  <td style="padding:6px 0;font-size:13.5px;font-weight:500;color:#111111;text-align:right;">${vars.destinationBank}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;font-weight:600;color:#999999;text-transform:uppercase;letter-spacing:0.5px;">Account Number</td>
                  <td style="padding:6px 0;font-size:13.5px;font-weight:500;color:#111111;text-align:right;font-family:monospace;">${maskedAccount}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Transaction details -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:12px;font-weight:600;color:#999999;text-transform:uppercase;letter-spacing:0.5px;">Transaction ID</td>
                  <td style="font-size:12.5px;font-weight:500;color:#111111;text-align:right;font-family:monospace;">${vars.transactionId}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:12px;font-weight:600;color:#999999;text-transform:uppercase;letter-spacing:0.5px;">Initiated</td>
                  <td style="font-size:13px;font-weight:500;color:#111111;text-align:right;">${vars.initiatedAt}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:12px;font-weight:600;color:#999999;text-transform:uppercase;letter-spacing:0.5px;">Estimated Arrival</td>
                  <td style="font-size:13px;font-weight:500;color:#111111;text-align:right;">${vars.estimatedArrival}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:12px;font-weight:600;color:#999999;text-transform:uppercase;letter-spacing:0.5px;">Status</td>
                  <td style="text-align:right;">
                    <span style="display:inline-block;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);color:#C9A84C;font-size:10.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 12px;">Processing</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${infoCard('Processing Time', `Bank transfers typically arrive within <strong>1–2 business hours</strong> during banking hours (Mon–Fri, 8am–5pm WAT). Transfers initiated after 5pm or on weekends will be processed the next business day. If funds haven't arrived by <strong>${vars.estimatedArrival}</strong>, contact <a href="mailto:${base.supportEmail}" style="color:#C9A84C;">${base.supportEmail}</a>.`)}

        <!-- Security warning -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:rgba(224,92,92,0.05);border:1px solid rgba(224,92,92,0.18);margin-bottom:0;">
          <tr>
            <td style="padding:16px 22px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:20px;vertical-align:top;padding-top:2px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E05C5C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></svg>
                  </td>
                  <td style="padding-left:10px;font-size:12.5px;line-height:1.65;color:#555555;font-weight:300;">
                    <strong style="color:#111111;">Didn't initiate this withdrawal?</strong> Contact us immediately at <a href="mailto:${base.supportEmail}" style="color:#C9A84C;">${base.supportEmail}</a> or call our 24/7 security line.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- CTA band -->
    <tr>
      <td style="background-color:#080808;padding:44px 48px;text-align:center;" class="em-body-pad">
        <h2 style="font-family:'Syne',Arial,sans-serif;font-size:22px;font-weight:700;color:#F5EED8;line-height:1.25;margin:0 0 10px;">
          Your remaining <em style="color:#C9A84C;font-style:italic;">${vars.remainingBalanceUsd}</em> keeps earning.
        </h2>
        <p style="font-size:13px;font-weight:300;color:rgba(245,238,216,0.5);margin:0 0 28px;line-height:1.7;">The rest of your USDC continues to yield weekly. Nothing to do.</p>
        ${ctaButton('View My Balance', vars.dashboardUrl)}
      </td>
    </tr>
  `;

  return wrapEmailBase(content, {
    ...base,
    previewText: `Withdrawal confirmed: ${vars.amountUsd} sent to ${vars.destinationBank} ${maskedAccount}`,
  });
}
