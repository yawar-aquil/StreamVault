import { storage } from "./storage";
import { sendNotificationToUser } from "./social";
import {
  sendSubscriptionRenewalEmail,
  sendSubscriptionExpiringEmail,
  sendSubscriptionRenewedEmail,
  sendSubscriptionFailedEmail,
} from "./email-service";
import { log } from "./vite";

const SUBSCRIPTION_PRICES: Record<string, { price: number; durationDays: number }> = {
  monthly: { price: 500, durationDays: 30 },
  yearly: { price: 5000, durationDays: 365 },
};

// Track which users have already been notified (24h warning) to avoid duplicate notifications
const notifiedUsers = new Set<string>();

/**
 * Processes all subscriptions:
 * 1. 24h before expiry: send notification + email
 *    - Auto-renew ON: "Your subscription will renew tomorrow"
 *    - Auto-renew OFF: "Your subscription expires tomorrow, consider upgrading"
 * 2. On expiry with auto-renew ON: deduct coins, extend subscription
 *    - If insufficient coins: disable auto-renew, notify user
 */
async function processSubscriptions() {
  try {
    const users = await storage.getAllUsers();
    const now = new Date();

    for (const user of users) {
      if (!user.adFreeUntil) continue;

      const expiry = new Date(user.adFreeUntil);
      const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
      const subType = (user as any).subscriptionType || 'monthly';
      const subConfig = SUBSCRIPTION_PRICES[subType] || SUBSCRIPTION_PRICES.monthly;
      const notifyKey = `${user.id}-${expiry.toISOString().split('T')[0]}`;

      // 24h warning (between 23-25 hours to account for hourly check interval)
      if (hoursUntilExpiry > 0 && hoursUntilExpiry <= 25 && hoursUntilExpiry > 1) {
        if (!notifiedUsers.has(notifyKey)) {
          notifiedUsers.add(notifyKey);

          if (user.subscriptionAutoRenew) {
            // Auto-renew ON: notify about upcoming renewal
            log(`[Subscription] Sending renewal reminder to ${user.username} (${subType})`);

            // In-app notification
            await storage.createNotification({
              userId: user.id,
              type: 'system',
              title: '🔄 Subscription Renewing Tomorrow',
              message: `Your ${subType === 'yearly' ? 'Ad-Free Yearly' : 'Ad-Free Monthly'} subscription will auto-renew tomorrow for ${subConfig.price} coins.`,
              read: false,
              data: { type: 'subscription_renewal' },
            });
            sendNotificationToUser(user.id, {
              type: 'system',
              title: '🔄 Subscription Renewing Tomorrow',
              message: `Your subscription will auto-renew tomorrow for ${subConfig.price} coins.`,
            });

            // Email
            if (user.email) {
              sendSubscriptionRenewalEmail(
                user.email as string,
                user.username,
                subType,
                subConfig.price,
                Math.ceil(hoursUntilExpiry / 24)
              ).catch(console.error);
            }
          } else {
            // Auto-renew OFF: warn about expiration
            log(`[Subscription] Sending expiry warning to ${user.username} (${subType})`);

            // In-app notification
            await storage.createNotification({
              userId: user.id,
              type: 'system',
              title: '⏰ Subscription Expiring Tomorrow',
              message: `Your ${subType === 'yearly' ? 'Ad-Free Yearly' : 'Ad-Free Monthly'} subscription expires tomorrow. Consider renewing to keep your ad-free experience!`,
              read: false,
              data: { type: 'subscription_expiring' },
            });
            sendNotificationToUser(user.id, {
              type: 'system',
              title: '⏰ Subscription Expiring Tomorrow',
              message: 'Your subscription expires tomorrow. Consider renewing!',
            });

            // Email
            if (user.email) {
              sendSubscriptionExpiringEmail(
                user.email as string,
                user.username,
                subType,
                Math.ceil(hoursUntilExpiry / 24)
              ).catch(console.error);
            }
          }
        }
      }

      // Subscription has expired — process auto-renewal
      if (hoursUntilExpiry <= 0 && user.subscriptionAutoRenew) {
        const renewKey = `renew-${user.id}-${expiry.toISOString().split('T')[0]}`;
        if (notifiedUsers.has(renewKey)) continue; // Already processed this expiry
        notifiedUsers.add(renewKey);

        const currentCoins = user.coins || 0;

        if (currentCoins >= subConfig.price) {
          // Sufficient coins — renew!
          log(`[Subscription] Auto-renewing ${user.username}'s ${subType} subscription`);

          // Deduct coins
          const success = await storage.deductUserCoins(user.id, subConfig.price);
          if (!success) {
            log(`[Subscription] Failed to deduct coins for ${user.username}`);
            continue;
          }

          // Extend subscription
          const newExpiry = new Date(expiry);
          newExpiry.setDate(newExpiry.getDate() + subConfig.durationDays);
          await storage.updateUser(user.id, { adFreeUntil: newExpiry });

          // Record transaction
          await storage.createCoinTransaction({
            userId: user.id,
            amount: -subConfig.price,
            type: 'purchase',
            description: `Auto-renewed ${subType === 'yearly' ? 'Ad-Free Yearly' : 'Ad-Free Monthly'} subscription`,
            metadata: JSON.stringify({ type: 'subscription_renewal', subType }),
          });

          // Get updated balance
          const updatedUser = await storage.getUserById(user.id);
          const remainingCoins = updatedUser?.coins || 0;

          // In-app notification
          await storage.createNotification({
            userId: user.id,
            type: 'system',
            title: '✅ Subscription Renewed!',
            message: `Your ${subType === 'yearly' ? 'Ad-Free Yearly' : 'Ad-Free Monthly'} has been renewed. ${subConfig.price} coins were deducted. New expiry: ${newExpiry.toLocaleDateString()}.`,
            read: false,
            data: { type: 'subscription_renewed' },
          });
          sendNotificationToUser(user.id, {
            type: 'system',
            title: '✅ Subscription Renewed!',
            message: `Your subscription has been renewed for ${subConfig.price} coins.`,
          });

          // Email
          if (user.email) {
            sendSubscriptionRenewedEmail(
              user.email as string,
              user.username,
              subType,
              subConfig.price,
              remainingCoins,
              newExpiry
            ).catch(console.error);
          }
        } else {
          // Insufficient coins — disable auto-renew
          log(`[Subscription] Insufficient coins for ${user.username} (${currentCoins}/${subConfig.price}). Disabling auto-renew.`);

          await storage.updateSubscriptionAutoRenew(user.id, false);

          // In-app notification
          await storage.createNotification({
            userId: user.id,
            type: 'system',
            title: '❌ Renewal Failed — Insufficient Coins',
            message: `We couldn't renew your subscription. You need ${subConfig.price} coins but only have ${currentCoins}. Auto-renewal has been turned off.`,
            read: false,
            data: { type: 'subscription_renewal_failed' },
          });
          sendNotificationToUser(user.id, {
            type: 'system',
            title: '❌ Renewal Failed',
            message: `Insufficient coins (${currentCoins}/${subConfig.price}). Auto-renewal disabled.`,
          });

          // Email
          if (user.email) {
            sendSubscriptionFailedEmail(
              user.email as string,
              user.username,
              subType,
              subConfig.price,
              currentCoins
            ).catch(console.error);
          }
        }
      }
    }

    // Clean up old notification keys (older than 48 hours)
    // This prevents the set from growing indefinitely
    if (notifiedUsers.size > 1000) {
      notifiedUsers.clear();
    }
  } catch (error) {
    console.error("[Subscription Scheduler] Error processing subscriptions:", error);
  }
}

export function startSubscriptionScheduler() {
  log("Initializing subscription scheduler...");

  // Run 2 minutes after startup
  setTimeout(() => {
    processSubscriptions().catch(err => console.error("Initial subscription check failed:", err));
  }, 2 * 60 * 1000);

  // Run every hour
  setInterval(() => {
    processSubscriptions().catch(err => console.error("Scheduled subscription check failed:", err));
  }, 60 * 60 * 1000);
}
