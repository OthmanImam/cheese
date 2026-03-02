import { BaseTemplateOptions, wrapEmailBase, ctaButton, sectionLabel, checkItem } from './base.template';

export interface LaunchAnnouncementVars {
  firstName: string;
  username: string;
  claimDeadline: string;
  daysToExpiry: number;
  earlyAccessPerks: string[];
  appDownloadUrl: string;
}

export function launchAnnouncementTemplate(
  vars: LaunchAnnouncementVars,
  base: BaseTemplateOptions,
): string {
  const isUrgent = vars.daysToExpiry <= 14;

  const content = `
    <!-- Urgency strip -->
    ${isUrgent ? `
    <tr>
      <td style="background-color:#C9A84C;padding:14px 48px;text-align:center;" class="em-body-pad">
        <p style="font-size:11.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#080808;margin:0;">
          ⚠ &nbsp; ${vars.daysToExpiry} days left to claim @${vars.username} &nbsp; ⚠
        </p>
      </td>
    </tr>` : ''}

    <!-- Hero -->
    <tr>
      <td style="background-color:#080808;padding:52px 48px 48px;text-align:center;" class="em-hero-pad">
        <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:16px;">We Are Live</div>
        <h1 style="font-family:'Syne',Arial,sans-serif;font-size:38px;font-weight:900;line-height:1.1;color:#F5EED8;margin:0 0 18px;">
          ${base.appName} is <em style="color:#C9A84C;font-style:italic;">live.</em><br>Your dollars are waiting.
        </h1>
        <p style="font-size:15px;font-weight:300;line-height:1.75;color:rgba(245,238,216,0.65);margin:0 auto 32px;max-width:420px;">
          It's here. ${base.appName} is officially open. Your username is reserved — you have <strong style="color:#C9A84C;">${vars.daysToExpiry} days</strong> to claim it before it's released.
        </p>
        ${ctaButton('Activate My Account Now', `${vars.appDownloadUrl}`)}
      </td>
    </tr>

    <!-- Username badge -->
    <tr>
      <td style="background-color:#080808;padding:0 48px 40px;" class="em-body-pad">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid rgba(201,168,76,0.2);text-align:center;">
          <tr>
            <td style="padding:20px 28px 16px;">
              <div style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;letter-spacing:4px;color:#C9A84C;">@${vars.username}</div>
              <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(245,238,216,0.3);margin-top:6px;">
                Claim before ${vars.claimDeadline} · ${vars.daysToExpiry} days remaining
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background-color:#ffffff;padding:48px 48px 0;" class="em-body-pad">

        <!-- Expiry warning card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:rgba(224,92,92,0.05);border:1px solid rgba(224,92,92,0.2);margin-bottom:28px;">
          <tr>
            <td style="padding:16px 22px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:20px;vertical-align:top;padding-top:2px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E05C5C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></svg>
                  </td>
                  <td style="padding-left:12px;font-size:13.5px;line-height:1.7;color:#333333;font-weight:300;">
                    <strong style="color:#111111;font-weight:600;">Your username reservation expires in ${vars.daysToExpiry} days.</strong> Activate your account before <strong>${vars.claimDeadline}</strong> to permanently claim <strong>@${vars.username}</strong>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${sectionLabel('Your Early Access Perks')}
        <h2 style="font-family:'Syne',Arial,sans-serif;font-size:22px;font-weight:700;color:#111111;line-height:1.25;margin:8px 0 12px;">
          You're getting Gold treatment from day one.
        </h2>
        <p style="font-size:14px;line-height:1.8;font-weight:300;color:#444444;margin:0 0 24px;">
          As a waitlist member, you've unlocked perks that standard sign-ups don't get. These activate the moment you fund your wallet.
        </p>

        <!-- Stat row -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
          <tr>
            <td class="em-stat-cell" style="text-align:center;padding:22px 16px;background:#fafafa;border:1px solid #eeeeee;border-right:none;width:33%;">
              <div style="font-family:'Syne',Arial,sans-serif;font-size:28px;font-weight:700;color:#C9A84C;line-height:1;margin-bottom:6px;">90</div>
              <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#999999;">Days Gold Free</div>
            </td>
            <td class="em-stat-cell" style="text-align:center;padding:22px 16px;background:#fafafa;border:1px solid #eeeeee;border-right:none;width:33%;">
              <div style="font-family:'Syne',Arial,sans-serif;font-size:28px;font-weight:700;color:#C9A84C;line-height:1;margin-bottom:6px;">+0.5%</div>
              <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#999999;">Extra Yield</div>
            </td>
            <td class="em-stat-cell" style="text-align:center;padding:22px 16px;background:#fafafa;border:1px solid #eeeeee;width:33%;">
              <div style="font-family:'Syne',Arial,sans-serif;font-size:28px;font-weight:700;color:#C9A84C;line-height:1;margin-bottom:6px;">3%</div>
              <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#999999;">Cashback</div>
            </td>
          </tr>
        </table>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
          ${vars.earlyAccessPerks.map((perk) => checkItem(perk)).join('')}
        </table>

      </td>
    </tr>

    <!-- CTA band -->
    <tr>
      <td style="background-color:#080808;padding:44px 48px;text-align:center;" class="em-body-pad">
        <h2 style="font-family:'Syne',Arial,sans-serif;font-size:24px;font-weight:700;color:#F5EED8;line-height:1.25;margin:0 0 12px;">
          Your spot is ready.<br><em style="color:#C9A84C;font-style:italic;">Don't let it expire.</em>
        </h2>
        <p style="font-size:13px;font-weight:300;color:rgba(245,238,216,0.5);margin:0 0 28px;line-height:1.7;">${vars.daysToExpiry} days. Clock is running. Activate now and your username is yours — permanently.</p>
        ${ctaButton('Activate My Account →', vars.appDownloadUrl)}
      </td>
    </tr>
  `;

  return wrapEmailBase(content, {
    ...base,
    previewText: `${base.appName} is live. Claim @${vars.username} before ${vars.claimDeadline}.`,
  });
}
