import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { verifyToken, type AuthRequest } from './auth';
import { sendPurchaseReceiptEmail, sendCoinPurchaseReceiptEmail } from "./email-service";
import { sendNotificationToUser, sendInventoryUpdate, logAndBroadcastActivity } from "./social";

const router = Router();

// Middleware to optionally extract user from token
function optionalAuth(req: Request, res: Response, next: () => void) {
    const token = (req as any).cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        const payload = verifyToken(token);
        if (payload) {
            (req as any).user = payload;
        }
    }
    next();
}

// Apply optional auth to all routes
router.use(optionalAuth);

// GET /api/store/products - List all store products (badges for sale)
router.get('/products', async (req, res) => {
    try {
        const allBadges = await storage.getBadges();
        // Filter badges that are for sale
        const products = allBadges.filter((badge: any) => badge.isForSale === true);
        // Sort by displayPriority (higher first)
        products.sort((a: any, b: any) => (b.displayPriority || 0) - (a.displayPriority || 0));

        res.json(products);
    } catch (error) {
        console.error('Error fetching store products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// GET /api/store/products/:id - Get single product
router.get('/products/:id', async (req, res) => {
    try {
        const product = await storage.getBadge(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// POST /api/store/purchase - Purchase a badge with StreamCoins
router.post('/purchase', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { badgeId, email } = req.body; // Added email extraction

        if (!badgeId) {
            return res.status(400).json({ error: 'Badge ID required' });
        }

        // Get badge details
        const badge = await storage.getBadge(badgeId);

        if (!badge) {
            return res.status(404).json({ error: 'Badge not found' });
        }

        if (!(badge as any).isForSale) {
            return res.status(400).json({ error: 'This badge is not for sale' });
        }

        // Check if user already owns this badge
        const userBadges = await storage.getUserBadges(userId);
        const existingBadge = userBadges.find(ub => ub.badge.id === badgeId);

        if (existingBadge) {
            return res.status(400).json({ error: 'You already own this badge' });
        }

        // Get User to check balance
        const user = await storage.getUserById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Prefer provided email, fallback to user profile email
        const recipientEmail = (email || user.email || "no-email@streamvault.live") as string;

        // Default to 0 if undefined/null
        const currentBalance = user.coins || 0;
        const price = badge.price || 0;

        // Check Stock for Limited Items
        if (badge.limited && (badge.stock !== null && badge.stock <= 0)) {
            return res.status(400).json({ error: 'This item is out of stock!' });
        }

        if (currentBalance < price) {
            return res.status(402).json({
                error: 'Insufficient coins',
                currentBalance: currentBalance,
                required: price
            });
        }

        // 1. ATOMIC DEDUCTION (Prevents Race Conditions)
        const success = await storage.deductUserCoins(userId, price);
        if (!success) {
            return res.status(402).json({ error: 'Insufficient coins or transaction failed' });
        }

        // 2. Decrement Stock (if limited)
        let updatedBadge = badge;
        if (badge.limited && badge.stock !== null) {
            const res = await storage.updateBadge(badge.id, { stock: badge.stock - 1 });
            if (res) updatedBadge = res;
        }

        // 3. Record Transaction
        const transaction = await storage.createCoinTransaction({
            userId,
            amount: -price,
            type: 'purchase',
            description: `Purchased "${badge.name}" badge`,
            metadata: JSON.stringify({ badgeId: badge.id })
        });

        // 4. Award Badge
        await storage.awardBadge(userId, badgeId);

        // 5. Handle Subscription (if applicable)
        if (badge.category === 'subscription') {
            const data = typeof badge.requirements === 'string' ? JSON.parse(badge.requirements || '{}') : badge.requirements;
            const durationDays = data.durationDays || 30; // Default to 30 days if not specified

            const now = new Date();
            let newExpiry = new Date();

            // If already active, extend from current expiry
            if (user.adFreeUntil && new Date(user.adFreeUntil) > now) {
                newExpiry = new Date(user.adFreeUntil);
            }

            // Add duration
            newExpiry.setDate(newExpiry.getDate() + durationDays);

            // Update User
            await storage.updateUser(userId, { adFreeUntil: newExpiry });
        }

        // 6. Send Receipt Email (Async)
        const updatedUser = await storage.getUserById(userId);
        const remainingBalance = updatedUser?.coins || 0;

        const baseUrl = process.env.VITE_APP_URL || "https://streamvault.live";
        const infoUrl = badge.imageUrl.startsWith("http") ? badge.imageUrl : `${baseUrl}${badge.imageUrl}`;
        sendPurchaseReceiptEmail(recipientEmail, user.username, badge.name, infoUrl, price, remainingBalance, transaction.id || "unknown").catch(console.error);

        // Log activity: Purchase (Community Feed)
        try {
            await logAndBroadcastActivity({
                userId,
                type: 'purchase',
                entityId: badge.id,
                entityType: 'badge',
                metadata: JSON.stringify({
                    badgeName: badge.name,
                    badgeImage: badge.imageUrl,
                    price: price
                })
            });
        } catch (e) {
            console.error("Failed to log purchase activity", e);
        }

        res.json({
            success: true,
            message: 'Purchase successful!',
            badge: updatedBadge,
            remainingCoins: remainingBalance
        });
    } catch (error) {
        console.error('Error processing purchase:', error);
        res.status(500).json({ error: 'Failed to process purchase' });
    }
});

// POST /api/wallet/buy - Buy coins packages (Mock Payment)
// POST /api/wallet/buy - Buy coins packages (Mock Payment)
router.post('/wallet/buy', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const user = await storage.getUserById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { packageId, amount, cost, recipientEmail } = req.body;
        console.error(`!!! SERVER BODY DEBUG !!!`, JSON.stringify(req.body, null, 2)); // CRITICAL LOG
        console.error(`[DEBUG] Extracted:`, { recipientEmail, userEmail: user.email });

        // Validate package amounts (security check)
        const validPackages: Record<string, number> = {
            'handful': 500,
            'sack': 1200,
            'chest': 2500,
            'vault': 6500
        };

        let coinAmount = 0;
        let finalCost = cost;

        if (packageId === 'custom') {
            // Custom Amount Logic
            // Validate amount is a positive integer
            const customAmount = parseInt(amount);
            if (isNaN(customAmount) || customAmount <= 0) {
                return res.status(400).json({ error: 'Invalid custom amount' });
            }
            coinAmount = customAmount;

            // Dynamic Pricing Logic (matches package rates)
            let rate = 0.00998; // Base rate (Handful: $4.99 / 500)
            if (coinAmount >= 6500) {
                rate = 49.99 / 6500; // Vault rate (~0.00769)
            } else if (coinAmount >= 2500) {
                rate = 19.99 / 2500; // Chest rate (~0.00799)
            } else if (coinAmount >= 1200) {
                rate = 9.99 / 1200; // Sack rate (~0.00832)
            }

            finalCost = `$${(coinAmount * rate).toFixed(2)}`;
        } else {
            coinAmount = validPackages[packageId];
            if (!coinAmount) {
                return res.status(400).json({ error: 'Invalid coin package' });
            }
        }

        // 1. Add Coins
        const updatedUser = await storage.updateUserCoins(userId, coinAmount);

        // 2. Record Transaction
        const transaction = await storage.createCoinTransaction({
            userId,
            amount: coinAmount,
            type: 'purchase',
            description: packageId === 'custom' ? `Custom Top-Up (${coinAmount} coins)` : `Bought ${packageId} of coins`,
            metadata: JSON.stringify({ packageId, cost: finalCost })
        });

        // 3. Send Receipt Email (if email provided or found in profile)
        const emailToSend = recipientEmail || user.email;

        if (emailToSend) {
            try {
                await sendCoinPurchaseReceiptEmail(
                    emailToSend,
                    user.username,
                    coinAmount,
                    finalCost,
                    updatedUser.coins,
                    updatedUser.coins,
                    transaction.id || "unknown"
                );
            } catch (error) {
                console.error("Failed to send coin receipt email:", error);
            }
        }

        // 4. Log Activity: Coin Purchase (Community Feed)
        try {
            await logAndBroadcastActivity({
                userId,
                type: 'coin_purchase',
                entityId: transaction.id,
                entityType: 'transaction',
                metadata: JSON.stringify({
                    amount: coinAmount,
                    cost: finalCost
                })
            });
        } catch (e) {
            console.error("Failed to log coin_purchase activity", e);
        }

        res.json({
            success: true,
            message: `Successfully purchased ${coinAmount} StreamCoins! Receipt sent to: ${emailToSend}`,
            newBalance: updatedUser.coins
        });

    } catch (error) {
        console.error('Error buying coins:', error);
        res.status(500).json({ error: 'Failed to buy coins' });
    }
});

// GET /api/wallet/transactions - Get user transaction history
router.get('/wallet/transactions', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const transactions = await storage.getUserCoinTransactions(userId);
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// POST /api/referral/code - Get or generate referral code
router.post('/referral/code', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const code = await storage.generateReferralCode(userId);
        res.json({ code });
    } catch (error) {
        console.error('Error getting referral code:', error);
        res.status(500).json({ error: 'Failed to get referral code' });
    }
});

// POST /api/store/gift - Send a badge as gift
router.post('/gift', async (req, res) => {
    try {
        const senderId = (req as any).user?.userId;
        if (!senderId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { badgeId, receiverUsername, message } = req.body;

        if (!badgeId || !receiverUsername) {
            return res.status(400).json({ error: 'Badge ID and receiver username required' });
        }

        // Get badge details
        const badge = await storage.getBadge(badgeId);

        if (!badge) {
            return res.status(404).json({ error: 'Badge not found' });
        }

        if ((badge as any).giftable === false) {
            return res.status(400).json({ error: 'This badge cannot be gifted' });
        }

        // Find receiver by username
        const receiver = await storage.getUserByUsername(receiverUsername);

        if (!receiver) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (receiver.id === senderId) {
            return res.status(400).json({ error: 'You cannot gift to yourself' });
        }

        // Check if receiver already has this badge
        const receiverBadges = await storage.getUserBadges(receiver.id);
        const existingBadge = receiverBadges.find(ub => ub.badge.id === badgeId);

        if (existingBadge) {
            return res.status(400).json({ error: 'This user already has this badge' });
        }

        // Check Stock for Limited Items
        if (badge.limited && (badge.stock !== null && badge.stock <= 0)) {
            return res.status(400).json({ error: 'This item is out of stock!' });
        }

        const price = badge.price || 0;
        const sender = await storage.getUserById(senderId);

        if (!sender) return res.status(404).json({ error: 'Sender not found' });

        if ((sender.coins || 0) < price) {
            return res.status(402).json({
                error: 'Insufficient coins',
                currentBalance: sender.coins || 0,
                required: price
            });
        }

        // 1. ATOMIC DEDUCTION
        const success = await storage.deductUserCoins(senderId, price);
        if (!success) {
            return res.status(402).json({ error: 'Insufficient coins or transaction failed' });
        }

        // 2. Decrement Stock (if limited)
        if (badge.limited && badge.stock !== null) {
            await storage.updateBadge(badge.id, { stock: badge.stock - 1 });
        }

        // 3. Record Transaction
        await storage.createCoinTransaction({
            userId: senderId,
            amount: -price,
            type: 'purchase', // Using purchase type for consistency in analytics
            description: `Gifted "${badge.name}" to ${receiverUsername}`,
            metadata: JSON.stringify({ badgeId: badge.id, giftTo: receiverUsername })
        });

        // 4. Give badge to receiver
        await storage.awardBadge(receiver.id, badgeId);

        // 5. Create notification for receiver (updated sender reference)
        const notification = await storage.createNotification({
            userId: receiver.id,
            type: 'system',
            title: '🎁 You received a gift!',
            message: `${sender?.username || 'Someone'} gifted you the "${badge.name}" badge!${message ? ` Message: "${message}"` : ''}`,
            read: false,
            data: { badgeId, senderId, giftMessage: message }
        });

        // Send real-time notification
        sendNotificationToUser(receiver.id, {
            type: 'system',
            title: '🎁 You received a gift!',
            message: `${sender?.username || 'Someone'} gifted you the "${badge.name}" badge!`,
            createdAt: new Date().toISOString()
        });
        sendInventoryUpdate(receiver.id);

        // Log activity: Gift Sent (Community Feed)
        try {
            await logAndBroadcastActivity({
                userId: senderId,
                type: 'item_gift',
                entityId: badge.id,
                entityType: 'badge',
                metadata: JSON.stringify({
                    badgeName: badge.name,
                    badgeImage: badge.imageUrl,
                    giftTo: receiverUsername,
                    targetUserId: receiver.id,
                    message: message
                })
            });
        } catch (e) {
            console.error("Failed to log gift activity", e);
        }

        res.json({
            success: true,
            message: `Badge gifted to ${receiverUsername}!`
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send gift' });
    }
});

// GET /api/store/users/search - Search users for gifting
router.get('/users/search', async (req, res) => {
    try {
        const query = req.query.query as string;
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const users = await storage.searchUsers(query);

        // Enhance users with their equipped badges
        const enhancedUsers = await Promise.all(users.map(async (u) => {
            const userBadges = await storage.getUserBadges(u.id);
            const equipped = userBadges.filter(ub => ub.equipped).map(ub => ({
                id: ub.badge.id,
                name: ub.badge.name,
                imageUrl: ub.badge.imageUrl,
                equipped: true,
                equippedAt: ub.equippedAt
            }));

            return {
                id: u.id,
                username: u.username,
                avatarUrl: u.avatarUrl,
                badges: equipped // Return array of equipped badges
            };
        }));

        res.json(enhancedUsers);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// POST /api/store/gift-bulk - Send a badge as gift to multiple users
router.post('/gift-bulk', async (req, res) => {
    try {
        const senderId = (req as any).user?.userId;
        if (!senderId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { badgeId, receiverUsernames, message } = req.body;

        if (!badgeId || !receiverUsernames || !Array.isArray(receiverUsernames) || receiverUsernames.length === 0) {
            return res.status(400).json({ error: 'Badge ID and receiver usernames array required' });
        }

        // Get badge details
        const badge = await storage.getBadge(badgeId);
        if (!badge) return res.status(404).json({ error: 'Badge not found' });
        if ((badge as any).giftable === false) return res.status(400).json({ error: 'This badge cannot be gifted' });

        const price = badge.price || 0;
        const totalCost = price * receiverUsernames.length;

        // Check stock if limited
        if (badge.limited && badge.stock !== null && badge.stock < receiverUsernames.length) {
            return res.status(400).json({ error: `Not enough stock! Only ${badge.stock} left.` });
        }

        // Check sender balance
        const sender = await storage.getUserById(senderId);
        if (!sender || (sender.coins || 0) < totalCost) {
            return res.status(402).json({
                error: 'Insufficient coins for bulk gift',
                required: totalCost,
                currentBalance: sender?.coins || 0
            });
        }

        // Deduct complete amount
        const success = await storage.deductUserCoins(senderId, totalCost);
        if (!success) {
            return res.status(402).json({ error: 'Transaction failed during deduction' });
        }

        // Decrease stock if limited
        if (badge.limited && badge.stock !== null) {
            await storage.updateBadge(badgeId, { stock: badge.stock - receiverUsernames.length });
        }

        // Record Transaction
        await storage.createCoinTransaction({
            userId: senderId,
            amount: -totalCost,
            type: 'purchase', // 'gift_sent' ideally, but schema might restrict
            description: `Gifted "${badge.name}" to ${receiverUsernames.length} users`,
            metadata: JSON.stringify({ badgeId, recipients: receiverUsernames })
        });

        const results = [];
        for (const username of receiverUsernames) {
            try {
                const receiver = await storage.getUserByUsername(username);
                if (!receiver) {
                    results.push({ username, status: 'failed', reason: 'User not found' });
                    continue;
                }
                if (receiver.id === senderId) {
                    results.push({ username, status: 'failed', reason: 'Self-gifting' });
                    continue;
                }

                // Check ownership
                const receiverBadges = await storage.getUserBadges(receiver.id);
                if (receiverBadges.some(ub => ub.badge.id === badgeId)) {
                    results.push({ username, status: 'failed', reason: 'Already owns item' });
                    // Note: We already deducted coins. In a real app we might refund or partial check first.
                    // For now, let's assume "sunk cost" or refund manually.
                    // Implementation choice: Refund for this specific failure?
                    // Let's keep it simple: We checked balance, deducted bulk. If one fails, we refund the single price.
                    await storage.updateUserCoins(senderId, price); // Refund
                    continue;
                }

                await storage.awardBadge(receiver.id, badgeId);

                // Notifications
                await storage.createNotification({
                    userId: receiver.id,
                    type: 'system',
                    title: '🎁 You received a gift!',
                    message: `${sender.username} gifted you the "${badge.name}" badge!${message ? ` Message: "${message}"` : ''}`,
                    read: false,
                    data: { badgeId, senderId, giftMessage: message }
                });

                sendNotificationToUser(receiver.id, {
                    type: 'system',
                    title: '🎁 You received a gift!',
                    message: `${sender.username} gifted you the "${badge.name}" badge!`,
                    createdAt: new Date().toISOString()
                });
                sendInventoryUpdate(receiver.id);

                // Log activity: Gift Sent (Community Feed)
                try {
                    await logAndBroadcastActivity({
                        userId: senderId,
                        type: 'item_gift',
                        entityId: badge.id,
                        entityType: 'badge',
                        metadata: JSON.stringify({
                            badgeName: badge.name,
                            badgeImage: badge.imageUrl,
                            giftTo: username,
                            targetUserId: receiver.id,
                            message: message
                        })
                    });
                } catch (e) {
                    console.error("[GIFT-BULK] Failed to log gift activity", e);
                }

                results.push({ username, status: 'success' });
            } catch (e) {
                console.error(`Failed to gift to ${username}`, e);
                results.push({ username, status: 'error' });
                await storage.updateUserCoins(senderId, price); // Refund
            }
        }

        res.json({
            success: true,
            totalCost,
            results
        });

    } catch (error) {
        console.error('Error sending bulk gift:', error);
        res.status(500).json({ error: 'Failed to send gifts' });
    }
});

// ADMIN: GET /api/store/admin/transactions - All Transactions
router.get('/admin/transactions', async (req, res) => {
    try {
        // In real app check admin role here
        const transactions = await storage.getAllCoinTransactions();
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching all transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ADMIN: GET /api/store/admin/stats - Store Analytics
router.get('/admin/stats', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        // In real app check admin role here

        const transactions = await storage.getAllCoinTransactions();
        const allBadges = await storage.getBadges();

        // 1. Total Revenue (coins spent by users on purchases)
        const totalRevenue = transactions
            .filter(t => t.description.includes('Purchased') || t.description.includes('Gifted'))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // 2. Total Items Sold
        const itemsSold = transactions
            .filter(t => t.description.includes('Purchased') || t.description.includes('Gifted'))
            .length;

        // 3. Top Selling Items
        const salesByItem: Record<string, number> = {};
        transactions.forEach(t => {
            if (!t.metadata) return;
            try {
                // Metadata might be a JSON string OR already an object depending on how it was saved/fetched
                const meta = typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata;

                if (meta && meta.badgeId) {
                    salesByItem[meta.badgeId] = (salesByItem[meta.badgeId] || 0) + 1;
                }
            } catch (e) {
                console.warn('Failed to parse metadata for transaction:', t.id);
            }
        });

        const topSellingItems = Object.entries(salesByItem)
            .map(([badgeId, count]) => {
                const badge = allBadges.find(b => b.id === badgeId);
                return {
                    id: badgeId,
                    name: badge?.name || 'Unknown Item',
                    count,
                    revenue: (badge?.price || 0) * count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 4. Active Items Count
        const activeItemsCount = allBadges.filter(b => b.isForSale).length;

        // 5. Recent Purchases
        const recentPurchases = transactions
            .filter(t => t.description.includes('Purchased') || t.description.includes('Gifted'))
            .slice(0, 10);

        res.json({
            totalRevenue,
            itemsSold,
            activeItemsCount, // Added active items count
            topSellingItems,
            recentPurchases
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/store/my-badges - Get current user's badges
router.get('/my-badges', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userBadges = await storage.getUserBadges(userId);
        res.json(userBadges);
    } catch (error) {
        console.error('Error fetching user badges:', error);
        res.status(500).json({ error: 'Failed to fetch badges' });
    }
});

// ADMIN: GET /api/store/admin/all-badges - Get all badges for admin
router.get('/admin/all-badges', async (req, res) => {
    try {
        // For now, just return all badges (admin check would need to be added to user schema)
        const allBadges = await storage.getBadges();
        res.json(allBadges);
    } catch (error) {
        console.error('Error fetching all badges:', error);
        res.status(500).json({ error: 'Failed to fetch badges' });
    }
});

// ADMIN: PUT /api/store/admin/badges/:id - Update badge (toggle store settings)
router.put('/admin/badges/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updated = await storage.updateBadge(id, updates);

        if (!updated) {
            return res.status(404).json({ error: 'Badge not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating badge:', error);
        res.status(500).json({ error: 'Failed to update badge' });
    }
});

// ADMIN: POST /api/store/admin/badges - Create new badge
router.post('/admin/badges', async (req, res) => {
    try {
        const badgeData = req.body;

        const newBadge = await storage.createBadge(badgeData);

        res.json(newBadge);
    } catch (error) {
        console.error('Error creating badge:', error);
        res.status(500).json({ error: 'Failed to create badge' });
    }
});

export default router;
