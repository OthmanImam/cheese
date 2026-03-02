import { BaseTemplateOptions, wrapEmailBase, ctaButton, sectionLabel, checkItem } from './base.template';

export interface SuccessfulSignupVars {
  firstName: string;
  username: string;
  tierName: string;
  tierColor: string;
  nextSteps: Array<{ title: string; description: string; ctaLabel?: string; ctaUrl?: string }>;
  referralLink: string;
  dashboardUrl: string;
}

export function successfulSignupTemplate(
  vars: SuccessfulSignupVars,
  base: BaseTemplateOptions,
): string {
  const content = `
    <!-- Hero -->
    <tr>
      <td style="background-color:#080808;padding:52px 48px 48px;text-align:center;" class="em-hero-pad">
        <div style="display:inline-block;border:1px solid rgba(201,168,76,0.25);background:rgba(201,168,76,0.07);padding:6px 18px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:20px;">
          ${vars.tierName} Tier · Active
        </div>
        <h1 style="font-family:'Syne',Arial,sans-serif;font-size:36px;font-weight:900;line-height:1.15;color:#F5EED8;margin:0 0 18px;">
          Welcome to ${base.appName},<br>
          <em style="color:#C9A84C;font-style:italic;">${vars.firstName}.</em>
        </h1>
        <p style="font-size:15px;font-weight:300;line-height:1.75;color:rgba(245,238,216,0.65);margin:0 auto 32px;max-width:420px;">
          Your wallet is live. Your dollars are in. Now let ${base.appName} do the work.
        </p>
        ${ctaButton('Open My Wallet', vars.dashboardUrl)}
      </td>
    </tr>

    <!-- Username badge -->
    <tr>
      <td style="background-color:#080808;padding:0 48px 40px;" class="em-body-pad">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid rgba(201,168,76,0.2);text-align:center;">
          <tr>
            <td style="padding:18px 28px 14px;">
              <div style="font-family:Arial,sans-serif;font-size:26px;font-weight:700;letter-spacing:4px;color:#C9A84C;">@${vars.username}</div>
              <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(245,238,216,0.3);margin-top:5px;">Permanently claimed · Account active</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background-color:#ffffff;padding:48px 48px 0;" class="em-body-pad">

        ${sectionLabel('Get Started')}
        <h2 style="font-family:'Syne',Arial,sans-serif;font-size:22px;font-weight:700;color:#111111;line-height:1.25;margin:8px 0 12px;">
          Four things to do this week.
        </h2>
        <p style="font-size:14px;line-height:1.8;font-weight:300;color:#444444;margin:0 0 24px;">
          Your ${base.appName} account is fully active. Here's how to make the most of it from day one.
        </p>

        <!-- Next steps cards -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
          ${vars.nextSteps.map((step, i) => `
          <tr>
            <td style="padding:0 0 16px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#fafafa;border:1px solid #f0f0f0;">
                <tr>
                  <td style="width:4px;background:${i === 0 ? '#3CB87A' : '#C9A84C'};font-size:0;">&nbsp;</td>
                  <td style="padding:18px 22px;">
                    <div style="font-size:12px;font-weight:700;color:#111111;margin-bottom:5px;letter-spacing:0.3px;">${step.title}</div>
                    <div style="font-size:13px;line-height:1.6;font-weight:300;color:#666666;">${step.description}</div>
                    ${step.ctaLabel && step.ctaUrl ? `
                    <div style="margin-top:12px;">
                      <a href="${step.ctaUrl}" style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#C9A84C;text-decoration:none;">${step.ctaLabel} &rarr;</a>
                    </div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`).join('')}
        </table>

        <!-- Divider -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 32px;"><tr><td style="height:1px;background:#f0f0f0;font-size:0;line-height:0;">&nbsp;</td></tr></table>

        ${sectionLabel('Refer & Earn')}
        <h2 style="font-family:'Syne',Arial,sans-serif;font-size:22px;font-weight:700;color:#111111;line-height:1.25;margin:8px 0 12px;">
          Bring your people. Get rewarded.
        </h2>
        <p style="font-size:14px;line-height:1.8;font-weight:300;color:#444444;margin:0 0 20px;">
          Refer 3 friends who each fund ₦5M+ and you skip straight to Black tier — instantly. Your referral link is below.
        </p>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f8f8;border:1px solid #e8e8e8;margin-bottom:36px;">
          <tr>
            <td style="padding:14px 20px;font-size:12.5px;color:#888888;font-family:monospace;">${vars.referralLink}</td>
            <td style="padding:14px 20px;text-align:right;">
              <a href="${vars.referralLink}" style="font-size:11px;font-weight:700;letter-spacing:1px;color:#C9A84C;text-transform:uppercase;text-decoration:none;">Share &rarr;</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- CTA band -->
    <tr>
      <td style="background-color:#080808;padding:44px 48px;text-align:center;" class="em-body-pad">
        <h2 style="font-family:'Syne',Arial,sans-serif;font-size:24px;font-weight:700;color:#F5EED8;line-height:1.25;margin:0 0 12px;">
          Your money is already<br>
          <em style="color:#C9A84C;font-style:italic;">working harder.</em>
        </h2>
        <p style="font-size:13px;font-weight:300;color:rgba(245,238,216,0.5);margin:0 0 28px;line-height:1.7;">Yield is credited every Monday. Check your wallet to see this week's earnings.</p>
        ${ctaButton('Open My Wallet', vars.dashboardUrl)}
      </td>
    </tr>
  `;

  return wrapEmailBase(content, {
    ...base,
    previewText: `Welcome to ${base.appName}, ${vars.firstName}. Your wallet is live and earning.`,
  });
}
