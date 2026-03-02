import { BaseTemplateOptions, wrapEmailBase, ctaButton, infoCard } from './base.template';

export interface DepositConfirmationVars {
  firstName: string;
  amountUsd: string;
  amountNgn: string;
  exchangeRate: string;
  transactionId: string;
  depositedAt: string;
  fundingMethod: string;
  currentBalanceUsd: string;
  currentBalanceNgn: string;
  dashboardUrl: string;
}

export function depositConfirmationTemplate(
  vars: DepositConfirmationVars,
  base: BaseTemplateOptions,
): string {
  const content = `
    <!-- Hero -->
    <tr>
      <td style="background-color:#080808;padding:52px 48px 48px;text-align:center;" class="em-hero-pad">
        <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#3CB87A;margin-bottom:16px;">Deposit Successful</div>
        <h1 style="font-family:'Syne',Arial,sans-serif;font-size:36px;font-weight:900;line-height:1.1;color:#F5EED8;margin:0 0 18px;">
          ${vars.amountUsd} is in your wallet,<br>
          <em style="color:#C9A84C;font-style:italic;">${vars.firstName}.</em>
        </h1>
        <p style="font-size:15px;font-weight:300;line-height:1.75;color:rgba(245,238,216,0.65);margin:0 auto 32px;max-width:420px;">
          Your deposit has been confirmed and converted to USDC. It's earning yield already.
        </p>
        ${ctaButton('View My Wallet', vars.dashboardUrl)}
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
              <div style="font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(201,168,76,0.6);margin-bottom:6px;">Amount Deposited</div>
              <div style="font-family:Arial,sans-serif;font-size:40px;font-weight:700;color:#3CB87A;letter-spacing:1px;line-height:1;">+${vars.amountUsd}</div>
              <div style="font-size:12px;color:rgba(245,238,216,0.35);letter-spacing:0.5px;margin-top:5px;">≈ ${vars.amountNgn} at ${vars.exchangeRate}</div>
            </td>
            <td style="padding:28px 28px 24px;text-align:right;vertical-align:top;">
              <div style="font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(201,168,76,0.6);margin-bottom:6px;">New Balance</div>
              <div style="font-size:26px;font-weight:700;color:#C9A84C;line-height:1;">${vars.currentBalanceUsd}</div>
              <div style="font-size:12px;color:rgba(245,238,216,0.35);letter-spacing:0.5px;margin-top:5px;">≈ ${vars.currentBalanceNgn}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background-color:#ffffff;padding:48px 48px 40px;" class="em-body-pad">

        <!-- Transaction detail table -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:12px;font-weight:600;letter-spacing:0.5px;color:#999999;text-transform:uppercase;">Transaction ID</td>
                  <td style="font-size:13px;font-weight:500;color:#111111;text-align:right;font-family:monospace;">${vars.transactionId}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:12px;font-weight:600;letter-spacing:0.5px;color:#999999;text-transform:uppercase;">Date &amp; Time</td>
                  <td style="font-size:13px;font-weight:500;color:#111111;text-align:right;">${vars.depositedAt}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:12px;font-weight:600;letter-spacing:0.5px;color:#999999;text-transform:uppercase;">Funding Method</td>
                  <td style="font-size:13px;font-weight:500;color:#111111;text-align:right;">${vars.fundingMethod}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:12px;font-weight:600;letter-spacing:0.5px;color:#999999;text-transform:uppercase;">Exchange Rate</td>
                  <td style="font-size:13px;font-weight:500;color:#111111;text-align:right;">${vars.exchangeRate}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:12px;font-weight:600;letter-spacing:0.5px;color:#999999;text-transform:uppercase;">Status</td>
                  <td style="text-align:right;">
                    <span style="display:inline-block;background:rgba(60,184,122,0.1);border:1px solid rgba(60,184,122,0.25);color:#3CB87A;font-size:10.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 12px;">Confirmed</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${infoCard('Your USDC is earning yield', `Your deposit of <strong>${vars.amountUsd}</strong> has been converted to USDC and is now earning yield automatically. Yield is credited to your wallet every Monday. No action required.`)}

        <p style="font-size:12px;line-height:1.7;color:#aaaaaa;margin:0;letter-spacing:0.3px;">
          If you didn't make this deposit, contact us immediately at <a href="mailto:${base.supportEmail}" style="color:#C9A84C;">${base.supportEmail}</a>
        </p>

      </td>
    </tr>

    <!-- CTA band -->
    <tr>
      <td style="background-color:#080808;padding:44px 48px;text-align:center;" class="em-body-pad">
        <h2 style="font-family:'Syne',Arial,sans-serif;font-size:22px;font-weight:700;color:#F5EED8;line-height:1.25;margin:0 0 10px;">
          Watch your <em style="color:#C9A84C;font-style:italic;">money grow.</em>
        </h2>
        <p style="font-size:13px;font-weight:300;color:rgba(245,238,216,0.5);margin:0 0 28px;line-height:1.7;">Track your balance, yield, and activity — all in your wallet.</p>
        ${ctaButton('Go to My Wallet', vars.dashboardUrl)}
      </td>
    </tr>
  `;

  return wrapEmailBase(content, {
    ...base,
    previewText: `Deposit confirmed: ${vars.amountUsd} added to your ${base.appName} wallet.`,
  });
}
