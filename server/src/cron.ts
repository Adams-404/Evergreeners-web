import cron from 'node-cron';
import { db } from './db/index.js';
import { users, accounts } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getGithubContributions } from './lib/github.js';
import { updateUserGoals } from './lib/goals.js';
import { sendStreakReminderEmail } from './lib/email.js';

export function setupCronJobs() {
    console.log("Setting up cron jobs...");

    // ── Hourly GitHub sync ─────────────────────────────────────────────────────
    // Runs at the top of every hour
    cron.schedule('0 * * * *', async () => {
        console.log("Running hourly GitHub sync for all users...");
        try {
            const usersWithAccounts = await db.select({
                user: users,
                account: accounts
            })
                .from(users)
                .innerJoin(accounts, eq(users.id, accounts.userId))
                .where(eq(users.isGithubConnected, true));

            console.log(`Found ${usersWithAccounts.length} users to sync.`);

            for (const { user, account } of usersWithAccounts) {
                if (!account.accessToken) continue;

                try {
                    const {
                        totalCommits, currentStreak, todayCommits, yesterdayCommits,
                        weeklyCommits, activeDays, totalProjects, contributionCalendar
                    } = await getGithubContributions(user.username || "", account.accessToken);

                    await db.update(users)
                        .set({
                            streak: currentStreak,
                            totalCommits,
                            todayCommits,
                            yesterdayCommits,
                            weeklyCommits,
                            activeDays,
                            totalProjects,
                            contributionData: contributionCalendar,
                            updatedAt: new Date()
                        })
                        .where(eq(users.id, user.id));

                    await updateUserGoals(user.id, {
                        currentStreak,
                        weeklyCommits,
                        activeDays,
                        totalProjects,
                        contributionCalendar
                    });

                } catch (err) {
                    console.error(`Failed to sync user ${user.username}:`, err);
                }
            }
            console.log("Hourly sync complete.");
        } catch (error) {
            console.error("Hourly cron job error:", error);
        }
    });

    // ── Daily streak reminder ──────────────────────────────────────────────────
    // Fires at 8 PM server time every day.
    // Sends an email to users who:
    //   1. Have GitHub connected
    //   2. Have emailNotifications enabled (default: true after GitHub connect)
    //   3. Have NOT yet committed today
    cron.schedule('0 20 * * *', async () => {
        console.log("Running daily streak reminder emails...");
        try {
            // Fetch all GitHub-connected users who have notifications enabled
            const usersToNotify = await db.select({
                user: users,
                account: accounts
            })
                .from(users)
                .innerJoin(accounts, and(
                    eq(users.id, accounts.userId),
                    eq(accounts.providerId, 'github')
                ))
                .where(and(
                    eq(users.isGithubConnected, true),
                    eq(users.emailNotifications, true)
                ));

            console.log(`Found ${usersToNotify.length} users eligible for streak reminder.`);

            let sent = 0;
            let skipped = 0;

            for (const { user, account } of usersToNotify) {
                // Must have an email and a GitHub access token
                if (!user.email || !account.accessToken) {
                    skipped++;
                    continue;
                }

                try {
                    // sendStreakReminderEmail internally skips if todayCommits > 0
                    await sendStreakReminderEmail({
                        to: user.email,
                        name: user.name || user.username || 'Dev',
                        streak: user.streak || 0,
                        todayCommits: user.todayCommits || 0,
                        username: user.username || '',
                    });

                    // If todayCommits > 0, the function returns early without sending
                    if ((user.todayCommits || 0) === 0) {
                        sent++;
                    } else {
                        skipped++;
                    }
                } catch (err) {
                    console.error(`Failed to send reminder to ${user.email}:`, err);
                    skipped++;
                }
            }

            console.log(`Streak reminders done. Sent: ${sent}, Skipped/already committed: ${skipped}`);
        } catch (error) {
            console.error("Streak reminder cron error:", error);
        }
    });
}
