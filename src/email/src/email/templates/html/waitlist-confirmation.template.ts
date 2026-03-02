import { BaseTemplateOptions, wrapEmailBase, ctaButton, sectionLabel, checkItem, infoCard } from './base.template';

export interface WaitlistConfirmationVars {
  firstName: string;
  username: string;
  waitlistPosition: number;
  referralLink: string;
  reservationExpiryDays: number;
}

export function waitlistConfirmationTemplate(
  vars: WaitlistConfirmationVars,
  base: BaseTemplateOptions,
): string {
  const content = `
    <!-- Hero -->
    <tr>
      <td style="background-color:#080808;padding:52px 48px 48px;text-align:center;" class="em-hero-pad">
        <div style="font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:16px;">Waitlist Confirmed</div>
        <h1 style="font-family:'Syne',Arial,sans-serif;font-size:34px;font-weight:900;line-height:1.15;color:#F5EED8;margin:0 0 18px;">
          You're in, ${vars.firstName}.<br>
          <em style="color:#C9A84C;font-style:italic;">Your name is reserved.</em>
        </h1>
        <p style="font-size:15px;font-weight:300;line-height:1.75;color:rgba(245,238,216,0.65);margin:0 auto 32px;max-width:420px;">
          You're officially on the ${base.appName} waitlist. Your username is locked — no one else can claim it for ${vars.reservationExpiryDays} days after we launch.
        </p>
        ${ctaButton('View My Reservation', `${base.appUrl}/waitlist/status`)}
      </td>
    </tr>

    <!-- Username badge -->
    <tr>
      <td style="background-color:#080808;padding:0 48px 40px;" class="em-body-pad">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#080808;border:1px solid rgba(201,168,76,0.2);text-align:center;padding:20px;">
          <tr>
            <td style="padding:20px 28px 16px;">
              <div style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;letter-spacing:4px;color:#C9A84C;">@${vars.username}</div>
              <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(245,238,216,0.3);margin-top:6px;">Reserved · Locked for ${vars.reservationExpiryDays} days post-launch</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background-color:#ffffff;padding:48px 48px 0;" class="em-body-pad">

        ${sectionLabel('What Happens Next')}
        <h2 style="font-family:'Syne',Arial,sans-serif;font-size:22px;font-weight:700;color:#111111;line-height:1.25;margin:8px 0 12px;">
          You're spot #${vars.waitlistPosition.toLocaleString()} on the list.
        </h2>
        <p style="font-size:14px;line-height:1.8;font-weight:300;color:#444444;margin:0 0 24px;">
          We'll email you the moment ${base.appName} goes live. When that email arrives, log in within ${vars.reservationExpiryDays} days to permanently claim your username. After that window, it's yours forever.
        </p>

        ${infoCard('Username Reservation Policy', `<strong>@${vars.username}</strong> is exclusively reserved for you for ${vars.reservationExpiryDays} days after launch. If you do not activate your account within that period, the username will be released to the public waitlist.`)}

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
          ${checkItem('Your spot on the waitlist is confirmed')}
          ${checkItem(`Username <strong>@${vars.username}</strong> is locked — no one else can take it`)}
          ${checkItem('Gold benefits free for 90 days (early access perk)')}
          ${checkItem('+0.5% extra yield stacked on standard rate, auto-applied on launch')}
        </table>

        <!-- Divider -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 32px;"><tr><td style="height:1px;background:#f0f0f0;font-size:0;line-height:0;">&nbsp;</td></tr></table>

        ${sectionLabel('Move Faster')}
        <h2 style="font-family:'Syne',Arial,sans-serif;font-size:22px;font-weight:700;color:#111111;line-height:1.25;margin:8px 0 12px;">
          Refer 3 friends, skip straight to Black.
        </h2>
        <p style="font-size:14px;line-height:1.8;font-weight:300;color:#444444;margin:0 0 20px;">
          Refer 3 people who each fund ₦5M+ and you get upgraded to Black tier instantly — no waitlist, no waiting. Share your link below.
        </p>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f8f8;border:1px solid #e8e8e8;margin-bottom:36px;">
          <tr>
            <td style="padding:14px 20px;font-size:12.5px;color:#888888;font-family:monospace;">${vars.referralLink}</td>
            <td style="padding:14px 20px;text-align:right;">
              <a href="${vars.referralLink}" style="font-size:11px;font-weight:700;letter-spacing:1px;color:#C9A84C;text-transform:uppercase;text-decoration:none;">Copy &rarr;</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- CTA band -->
    <tr>
      <td style="background-color:#080808;padding:44px 48px;text-align:center;" class="em-body-pad">
        <h2 style="font-family:'Syne',Arial,sans-serif;font-size:24px;font-weight:700;color:#F5EED8;line-height:1.25;margin:0 0 12px;">While you wait — tell your people.</h2>
        <p style="font-size:13px;font-weight:300;color:rgba(245,238,216,0.5);margin:0 0 28px;line-height:1.7;">The list fills fast. Every person you bring in strengthens your position.</p>
        ${ctaButton('Share Your Referral Link', vars.referralLink)}
      </td>
    </tr>
  `;

  return wrapEmailBase(content, {
    ...base,
    previewText: `@${vars.username} is reserved. You're #${vars.waitlistPosition} on the ${base.appName} waitlist.`,
  });
}
