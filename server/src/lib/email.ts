import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'Evergreeners <noreply@yourdomain.com>';
const APP_URL = process.env.APP_URL || 'https://evergreeners.dev';

// ─── Shared shell ─────────────────────────────────────────────────────────────
// Light by default. Dark mode via @media (prefers-color-scheme: dark) for
// clients that support it (Apple Mail, Outlook app). Gmail handles its own
// dark mode inversion — keeping body background transparent lets it do that.
const emailShell = (body: string) => `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Evergreeners</title>
  <style>
    /* Reset */
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; }

    /* Dark mode overrides — supported by Apple Mail, Outlook app, Fastmail */
    @media (prefers-color-scheme: dark) {
      body, .email-bg { background-color: #0d0d0d !important; }
      .email-card    { background-color: #141414 !important; border-color: #1f1f1f !important; }
      .text-heading  { color: #f5f5f5 !important; }
      .text-body     { color: #8a8a8a !important; }
      .text-muted    { color: #525252 !important; }
      .divider       { background-color: #1f1f1f !important; }
      .stat-box      { background-color: #1a1a1a !important; border-color: #242424 !important; }
      .footer-text   { color: #404040 !important; }
      .footer-link   { color: #525252 !important; }
      .step-label    { color: #525252 !important; }
      .secondary-link { color: #525252 !important; }
      .cta-secondary { color: #525252 !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="email-bg" align="center" style="padding:48px 16px;background-color:#f4f4f5;">

        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- Wordmark -->
          <tr>
            <td style="padding-bottom:24px;">
              <span style="font-family:ui-monospace,'SF Mono','Fira Code','Cascadia Code',monospace;font-size:13px;font-weight:700;letter-spacing:0.12em;color:#10b981;text-transform:uppercase;">EVERGREENERS</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td class="email-card" style="background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:40px 40px 36px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;">
              <p class="footer-text" style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#71717a;line-height:1.7;">
                You're receiving this because you have an account on
                <a href="${APP_URL}" class="footer-link" style="color:#71717a;text-decoration:underline;">evergreeners.dev</a>.
                &nbsp;·&nbsp;
                <a href="${APP_URL}/settings" class="footer-link" style="color:#71717a;text-decoration:underline;">Manage notifications</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// Reusable divider row
const divider = `
  <tr>
    <td style="padding:24px 0;">
      <div class="divider" style="height:1px;background-color:#e4e4e7;font-size:0;line-height:0;">&nbsp;</div>
    </td>
  </tr>`;

// ─── Welcome Email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
    const displayName = name?.split(' ')[0] || 'there';

    const body = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

        <tr>
          <td style="padding-bottom:8px;">
            <h1 class="text-heading" style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Helvetica,Arial,sans-serif;font-size:26px;font-weight:700;color:#09090b;letter-spacing:-0.4px;line-height:1.3;">
              Welcome, ${displayName}.
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding-bottom:4px;">
            <p class="text-body" style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#52525b;line-height:1.75;">
              Your account is live. Evergreeners tracks your GitHub contributions and turns your daily commits into a streak you can't afford to break.
            </p>
          </td>
        </tr>

        ${divider}

        <!-- Steps -->
        <tr>
          <td>
            <p class="step-label" style="margin:0 0 20px;font-family:ui-monospace,'SF Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#a1a1aa;">
              Get started
            </p>

            <!-- Step 01 -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
              <tr>
                <td width="28" valign="top" style="padding-top:2px;">
                  <span style="font-family:ui-monospace,'SF Mono',monospace;font-size:11px;font-weight:700;color:#10b981;">01</span>
                </td>
                <td>
                  <span class="text-body" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#52525b;line-height:1.6;">
                    Connect your GitHub account in Settings to start tracking
                  </span>
                </td>
              </tr>
            </table>

            <!-- Step 02 -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
              <tr>
                <td width="28" valign="top" style="padding-top:2px;">
                  <span style="font-family:ui-monospace,'SF Mono',monospace;font-size:11px;font-weight:700;color:#10b981;">02</span>
                </td>
                <td>
                  <span class="text-body" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#52525b;line-height:1.6;">
                    Your streak and stats update automatically every hour
                  </span>
                </td>
              </tr>
            </table>

            <!-- Step 03 -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="28" valign="top" style="padding-top:2px;">
                  <span style="font-family:ui-monospace,'SF Mono',monospace;font-size:11px;font-weight:700;color:#10b981;">03</span>
                </td>
                <td>
                  <span class="text-body" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#52525b;line-height:1.6;">
                    Climb the leaderboard, set goals, and complete quests
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${divider}

        <!-- CTA -->
        <tr>
          <td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:#10b981;border-radius:7px;">
                  <a href="${APP_URL}/settings" style="display:inline-block;padding:11px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
                    Connect GitHub
                  </a>
                </td>
                <td style="padding-left:20px;">
                  <a href="${APP_URL}/dashboard" class="cta-secondary" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#71717a;text-decoration:none;">
                    Go to dashboard &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>`;

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: 'Welcome to Evergreeners',
            html: emailShell(body),
        });
        console.log(`Welcome email sent to ${to}:`, result.data?.id);
        return result;
    } catch (err) {
        console.error(`Failed to send welcome email to ${to}:`, err);
        throw err;
    }
}

// ─── Streak Reminder Email ────────────────────────────────────────────────────

interface StreakReminderOptions {
    to: string;
    name: string;
    streak: number;
    todayCommits: number;
    username: string;
}

export async function sendStreakReminderEmail({
    to, name, streak, todayCommits, username
}: StreakReminderOptions) {
    // Don't nag someone who already committed today
    if (todayCommits > 0) {
        console.log(`Skipping reminder for ${username} — already committed today (${todayCommits} commits).`);
        return;
    }

    const displayName = name?.split(' ')[0] || username || 'there';
    const streakLabel = streak === 1 ? '1-day streak' : `${streak}-day streak`;

    const subjectLine = streak > 0
        ? `Your ${streakLabel} is at risk`
        : 'No commits today — keep the habit going';

    const contextLine = streak >= 30
        ? `${streak} days without a break. That's not something you want to reset.`
        : streak >= 7
            ? `${streak} days in. You're building real momentum — don't stop now.`
            : streak > 0
                ? `${streak} days going. Every commit adds up.`
                : `No streak yet. Push something today and start one.`;

    const body = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

        <tr>
          <td style="padding-bottom:8px;">
            <h1 class="text-heading" style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Helvetica,Arial,sans-serif;font-size:26px;font-weight:700;color:#09090b;letter-spacing:-0.4px;line-height:1.3;">
              No commits yet today, ${displayName}.
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding-bottom:4px;">
            <p class="text-body" style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#52525b;line-height:1.75;">
              ${contextLine}
            </p>
          </td>
        </tr>

        ${divider}

        <!-- Stats -->
        <tr>
          <td>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48%" class="stat-box" style="padding:18px 20px;background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
                  <p class="step-label" style="margin:0 0 6px;font-family:ui-monospace,'SF Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#a1a1aa;">
                    Current streak
                  </p>
                  <p style="margin:0;font-family:ui-monospace,'SF Mono','Fira Code',monospace;font-size:30px;font-weight:700;line-height:1;color:${streak > 0 ? '#10b981' : '#a1a1aa'};">
                    ${streak}<span style="font-size:13px;font-weight:400;color:#a1a1aa;margin-left:4px;">days</span>
                  </p>
                </td>

                <td width="4%"></td>

                <td width="48%" class="stat-box" style="padding:18px 20px;background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
                  <p class="step-label" style="margin:0 0 6px;font-family:ui-monospace,'SF Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#a1a1aa;">
                    Commits today
                  </p>
                  <p style="margin:0;font-family:ui-monospace,'SF Mono','Fira Code',monospace;font-size:30px;font-weight:700;line-height:1;color:#ef4444;">
                    0<span style="font-size:13px;font-weight:400;color:#a1a1aa;margin-left:4px;">commits</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${divider}

        <tr>
          <td style="padding-bottom:24px;">
            <p class="text-muted" style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#71717a;line-height:1.75;">
              Push something small — a fix, a note, a doc update. The day resets at midnight.
            </p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:#09090b;border-radius:7px;">
                  <a href="https://github.com/${username}" style="display:inline-block;padding:11px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
                    Open GitHub
                  </a>
                </td>
                <td style="padding-left:20px;">
                  <a href="${APP_URL}/dashboard" class="cta-secondary" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#71717a;text-decoration:none;">
                    View dashboard &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>`;

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: subjectLine,
            html: emailShell(body),
        });
        console.log(`Streak reminder sent to ${to}:`, result.data?.id);
        return result;
    } catch (err) {
        console.error(`Failed to send streak reminder to ${to}:`, err);
        throw err;
    }
}
