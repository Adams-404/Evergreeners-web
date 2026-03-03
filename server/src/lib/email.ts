import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'Evergreeners <noreply@yourdomain.com>';
const APP_URL = process.env.APP_URL || 'https://evergreeners.dev';

// ─── Welcome Email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
    const displayName = name?.split(' ')[0] || 'there';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Evergreeners</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;color:#e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#052e16,#14532d);padding:48px 40px;text-align:center;">
            <div style="font-size:40px;margin-bottom:12px;">🌿</div>
            <h1 style="margin:0;font-size:28px;font-weight:800;color:#4ade80;letter-spacing:-0.5px;">Evergreeners</h1>
            <p style="margin:8px 0 0;font-size:15px;color:#86efac;opacity:0.85;">Stay green. Stay consistent.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#f9fafb;">Welcome aboard, ${displayName}! 🎉</h2>
            <p style="margin:0 0 20px;font-size:15px;color:#9ca3af;line-height:1.7;">
              You've just joined a community of developers who show up every single day. 
              Your coding streak starts now — and we'll be here to cheer you on.
            </p>

            <!-- Feature list -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="padding:12px 16px;background:#1f2937;border-radius:10px;margin-bottom:8px;display:block;">
                  <span style="color:#4ade80;font-size:16px;">📊</span>
                  <span style="color:#d1d5db;font-size:14px;margin-left:8px;"> Track your GitHub streak daily</span>
                </td>
              </tr>
              <tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:12px 16px;background:#1f2937;border-radius:10px;">
                  <span style="color:#4ade80;font-size:16px;">🏆</span>
                  <span style="color:#d1d5db;font-size:14px;margin-left:8px;"> Compete on the global leaderboard</span>
                </td>
              </tr>
              <tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:12px 16px;background:#1f2937;border-radius:10px;">
                  <span style="color:#4ade80;font-size:16px;">⚡</span>
                  <span style="color:#d1d5db;font-size:14px;margin-left:8px;"> Complete quests &amp; level up</span>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${APP_URL}/settings" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#4ade80);color:#052e16;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                    Connect GitHub &amp; Start Streak →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:28px 0 0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">
              Connect your GitHub to unlock streak tracking and daily reminders.<br/>
              You can manage email preferences anytime in <a href="${APP_URL}/settings" style="color:#4ade80;">Settings</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #1f2937;text-align:center;">
            <p style="margin:0;font-size:12px;color:#4b5563;">
              Made with 💚 for developers &nbsp;·&nbsp; 
              <a href="${APP_URL}" style="color:#4ade80;text-decoration:none;">evergreeners.dev</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: '🌿 Welcome to Evergreeners — Let\'s build your streak!',
            html,
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
    username: string; // github username
}

export async function sendStreakReminderEmail({
    to, name, streak, todayCommits, username
}: StreakReminderOptions) {
    const displayName = name?.split(' ')[0] || username || 'Dev';
    const hasMadeCommit = todayCommits > 0;

    // Don't nag someone who already committed today
    if (hasMadeCommit) {
        console.log(`Skipping reminder for ${username} — already committed today (${todayCommits} commits).`);
        return;
    }

    const streakText = streak > 0
        ? `<span style="color:#4ade80;font-weight:700;">${streak}-day streak</span>`
        : 'your streak';

    const urgencyLine = streak >= 30
        ? `🔥 ${streak} days in a row. That's legendary. Don't break it now.`
        : streak >= 7
            ? `🌱 ${streak} days strong — you're building a real habit!`
            : `📅 ${streak > 0 ? `${streak} days going` : 'Starting'} — every commit counts.`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Don't break your streak!</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;color:#e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1c1917,#292524);padding:40px;text-align:center;border-bottom:1px solid #292524;">
            <div style="font-size:52px;margin-bottom:8px;">⚡</div>
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#fbbf24;">Streak Alert, ${displayName}!</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#a78bfa;">${urgencyLine}</p>
          </td>
        </tr>

        <!-- Streak stat -->
        <tr>
          <td style="padding:32px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Current streak box -->
                <td width="48%" style="background:#1f2937;border-radius:12px;padding:20px;text-align:center;border:1px solid ${streak > 0 ? '#16a34a40' : '#374151'};">
                  <div style="font-size:40px;font-weight:800;color:${streak > 0 ? '#4ade80' : '#6b7280'};">${streak}</div>
                  <div style="font-size:12px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Day Streak</div>
                </td>
                <td width="4%"></td>
                <!-- Today's commits -->
                <td width="48%" style="background:#1f2937;border-radius:12px;padding:20px;text-align:center;border:1px solid #374151;">
                  <div style="font-size:40px;font-weight:800;color:#f87171;">0</div>
                  <div style="font-size:12px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Commits Today</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Message -->
        <tr>
          <td style="padding:28px 40px;">
            <p style="margin:0 0 12px;font-size:15px;color:#d1d5db;line-height:1.7;">
              Hey <strong>${displayName}</strong>, the clock's ticking ⏰ — you haven't pushed anything to GitHub today.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.7;">
              Even a tiny commit keeps ${streakText} alive. It doesn't have to be big — just <em>show up</em>.
            </p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="https://github.com/${username}" style="display:inline-block;background:linear-gradient(135deg,#ca8a04,#fbbf24);color:#1c1917;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;">
                    Open GitHub &amp; Commit Now →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:20px 0 0;font-size:13px;color:#6b7280;text-align:center;">
              You can turn off these reminders in 
              <a href="${APP_URL}/settings" style="color:#4ade80;">Settings → Notifications</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #1f2937;text-align:center;">
            <p style="margin:0;font-size:12px;color:#4b5563;">
              Evergreeners &nbsp;·&nbsp; 
              <a href="${APP_URL}" style="color:#4ade80;text-decoration:none;">evergreeners.dev</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: `⚡ ${streak > 0 ? `Your ${streak}-day streak is at risk!` : 'Commit today — keep the green going!'}`,
            html,
        });
        console.log(`Streak reminder sent to ${to}:`, result.data?.id);
        return result;
    } catch (err) {
        console.error(`Failed to send streak reminder to ${to}:`, err);
        throw err;
    }
}
