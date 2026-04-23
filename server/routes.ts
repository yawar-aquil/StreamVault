import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import http from "http";
import https from "https";
import { storage } from "./storage";
import { z } from "zod";
import { watchlistSchema, viewingProgressSchema, insertBlogPostSchema, insertUserSchema, loginSchema, updateProfileSchema } from "@shared/schema";
import type { InsertEpisode, BlogPost, Show, Movie, Anime } from "@shared/schema";
import { readFileSync, existsSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { setupSitemaps } from "./sitemap";
import { searchShow, getShowDetails } from "./utils/tmdb";
import { sendContentRequestEmail, sendIssueReportEmail, sendPasswordResetEmail, sendCoinPurchaseReceiptEmail, sendEmailVerificationEmail, sendContentRequestCompletedEmail, sendIssueReportResolvedEmail, sendFeedbackEmail, sendFeedbackResolvedEmail } from "./email-service";
import { createRazorpayOrder, verifyRazorpaySignature } from "./payment";
import { convertCurrency } from "./currency";
import { getCachedSubtitle, searchSubtitles, downloadSubtitle, getFirstSubtitle, convertSrtToVtt, deleteSubtitleFile } from "./subtitle-service";
import { checkAndAwardAchievements, ACHIEVEMENTS } from "./achievements";
import { getActiveRooms, checkRoomExists } from "./watch-together";
import { sendNotificationToUser, sendInventoryUpdate, logAndBroadcastActivity, emitDMReceived } from "./social";
import webpush from "web-push";
import { hashPassword, verifyPassword, generateToken, verifyToken, setAuthCookie, clearAuthCookie, type AuthRequest } from "./auth";
import multer from "multer";
import storeRoutes from "./store";
import { getLinkPreview } from "./link-preview";
import { translateText, translateBatch } from "./translate";
import { getStreamMode, setStreamMode, isValidStreamMode, type StreamMode } from "./stream-mode";

// Helper to convert ReadableStream to async iterable for Node.js
async function* streamToAsyncIterable(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin credentials (in production, use environment variables and hashed passwords)
// Admin credentials (in production, use environment variables and hashed passwords)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "streamvault2024";

// Simple session storage for admin auth
const adminSessions = new Set<string>();

// Simple session ID from header or generate one
function getSessionId(req: any): string {
  return req.headers["x-session-id"] || "default-session";
}

// Admin authentication middleware
function requireAdmin(req: any, res: any, next: any) {
  const authToken = req.headers["x-admin-token"];

  if (!authToken || !adminSessions.has(authToken)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

// API Key authentication middleware for external access
async function requireApiKey(req: any, res: any, next: any) {
  // Skip API key check for same-origin (frontend) requests
  // Check for API key in header
  const origin = req.headers.origin || req.headers.referer;
  const host = req.headers.host;

  if (origin && host) {
    try {
      const originUrl = new URL(origin).host;
      if (originUrl === host || originUrl.includes('localhost') || originUrl.includes('127.0.0.1')) {
        return next(); // Frontend request, skip API key check
      }
    } catch (e) {
      // Invalid origin URL, proceed to check API key
    }
  }

  // Check for API key in header
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Include X-API-Key header with your API key'
    });
  }

  // Validate API key
  const keyData = await storage.getApiKeyByKey(apiKey);
  if (!keyData) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Check rate limits and update usage
  const usageResult = await storage.updateApiKeyUsage(keyData.id);
  if (!usageResult.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: usageResult.reason
    });
  }

  // Attach API key info to request for logging
  req.apiKey = keyData;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const SUBSCRIBERS_FILE = path.join(__dirname, "..", "data", "subscribers.json");

  // External Availability API for Extension
  app.get("/api/external/availability", async (req, res) => {
    try {
      // 1. Auth Check (API Key OR Bearer Token)
      let isAuthenticated = false;
      const apiKey = req.headers['x-api-key'];
      const authHeader = req.headers.authorization;

      if (apiKey) {
        if (typeof apiKey === 'string') {
          const keyData = await storage.getApiKeyByKey(apiKey);
          if (keyData) {
            await storage.updateApiKeyUsage(keyData.id);
            isAuthenticated = true;
          }
        }
      } else if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        try {
          const payload = verifyToken(token);
          if (payload) isAuthenticated = true;
        } catch { }
      }

      if (!isAuthenticated) {
        return res.status(401).json({ error: "Unauthorized: API Key or Login required" });
      }

      // 2. Search Logic
      const title = req.query.title as string;
      const year = req.query.year as string;
      // const type = req.query.type as string; // 'movie' | 'show' | 'anime'

      if (!title) {
        return res.status(400).json({ error: "Title required" });
      }

      const cleanTitle = title.toLowerCase().trim();

      // Helper to normalize string for comparison
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const target = normalize(cleanTitle);

      let match: any = null;
      let url = "";

      // Check Movies
      if (!match) {
        const movies = await storage.getAllMovies();
        match = movies.find(m => normalize(m.title) === target || normalize(m.title).includes(target) && target.length > 5);
        if (match) url = `/movie/${match.slug}`;
      }

      // Check Shows
      if (!match) {
        const shows = await storage.getAllShows();
        match = shows.find(s => normalize(s.title) === target || normalize(s.title).includes(target) && target.length > 5);
        if (match) url = `/show/${match.slug}`;
      }

      // Check Anime
      if (!match) {
        const anime = await storage.getAllAnime();
        match = anime.find(a => normalize(a.title) === target || normalize(a.title).includes(target) && target.length > 5);
        if (match) url = `/anime/${match.slug}`;
      }

      if (match) {
        res.json({ available: true, title: match.title, url, id: match.id, type: match.active ? 'active' : 'inactive' });
      } else {
        res.json({ available: false });
      }

    } catch (error) {
      console.error("External availability check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Setup dynamic sitemaps
  setupSitemaps(app, storage);

  // Global Middleware: Track Last Active
  app.use(async (req, res, next) => {
    const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const payload = verifyToken(token);
        if (payload && payload.userId) {
          // Update last active in background
          storage.setLastActive(payload.userId).catch(err => console.error("Error updating last active:", err));
        }
      } catch (e) {
        // Ignore token errors in this global middleware, let specific routes handle auth enforcement
      }
    }
    next();
  });

  // Configure multer for avatar uploads
  const avatarStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });
  const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
      }
    },
  });

  // Configure multer for DM attachments (images, videos, audio, files)
  const dmAttachmentStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'dm-attachments');
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });
  const upload = multer({
    storage: dmAttachmentStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for all media
    fileFilter: (_req, file, cb) => {
      // Allow images, videos, audio, and common document types
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg',
        'application/pdf', 'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed.'));
      }
    },
  });

  // Equip Badge Endpoint (Toggle Logic + Max 3)
  app.post("/api/badges/equip", async (req: AuthRequest, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { badgeId, equipped } = req.body;
      if (!badgeId) return res.status(400).json({ error: "Badge ID required" });

      // Verify ownership
      const userBadges = await storage.getUserBadges(payload.userId);
      const userBadge = userBadges.find(ub => ub.badgeId === badgeId);

      if (!userBadge) {
        return res.status(400).json({ error: "You do not own this badge" });
      }

      // Enforce Max 1 Skin Limit
      if (equipped && (userBadge.badge.category === 'skin' || userBadge.badge.name.includes('Skin'))) {
        const currentlyEquippedSkins = userBadges.filter(ub =>
          ub.equipped && (ub.badge.category === 'skin' || ub.badge.name.includes('Skin'))
        );

        if (!userBadge.equipped && currentlyEquippedSkins.length >= 1) {
          return res.status(400).json({ error: "You can only equip 1 skin at a time." });
        }
      }

      // Check current equipped count (Exclude Skins, Themes, Features)
      const currentlyEquipped = userBadges.filter(ub =>
        ub.equipped &&
        ub.badge.category !== 'skin' &&
        !ub.badge.name.includes('Skin') &&
        ub.badge.category !== 'theme' &&
        ub.badge.category !== 'feature'
      );

      // Allow if less than 3, OR if we are re-equipping something (target is true) and it wasn't equipped before
      if (equipped && !userBadge.equipped && currentlyEquipped.length >= 3) {
        if (userBadge.badge.category !== 'skin' && !userBadge.badge.name.includes('Skin') && userBadge.badge.category !== 'theme' && userBadge.badge.category !== 'feature') {
          return res.status(400).json({ error: "You can only equip up to 3 badges at a time." });
        }
      }

      await storage.updateUserBadgeEquippedStatus(payload.userId, badgeId, equipped);
      res.json({ success: true, equipped, badgeName: userBadge.badge.name });
    } catch (error) {
      console.error("Equip badge error:", error);
      res.status(500).json({ error: "Failed to equip badge" });
    }
  });

  // Toggle Activity Visibility
  app.patch("/api/user/activity-visibility", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { visible } = req.body;
      if (typeof visible !== 'boolean') {
        return res.status(400).json({ error: "visible must be a boolean" });
      }

      await storage.updateUser(payload.userId, { activityVisible: visible });
      res.json({ success: true, activityVisible: visible });
    } catch (error) {
      console.error("Update activity visibility error:", error);
      res.status(500).json({ error: "Failed to update activity visibility" });
    }
  });

  // Get user settings
  app.get("/api/user/settings", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const user = await storage.getUserById(payload.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Parse settings JSON or return empty object
      let settings = {};
      if (user.settings) {
        try {
          settings = JSON.parse(user.settings);
        } catch (e) {
          console.error("Failed to parse user settings:", e);
        }
      }

      // Include activityVisible in the settings response
      res.json({
        ...settings,
        friendActivityVisible: user.activityVisible ?? true
      });
    } catch (error) {
      console.error("Get user settings error:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  // Save user settings
  app.put("/api/user/settings", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const settings = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: "Invalid settings object" });
      }

      // Extract friendActivityVisible to save separately
      const { friendActivityVisible, ...otherSettings } = settings;

      // Update user with settings JSON and activityVisible boolean
      await storage.updateUser(payload.userId, {
        settings: JSON.stringify(otherSettings),
        activityVisible: friendActivityVisible ?? true
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Save user settings error:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Delete user account completely
  app.delete("/api/user/account", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { password, confirmText } = req.body;

      // Require password confirmation
      if (!password) {
        return res.status(400).json({ error: "Password is required to delete account" });
      }

      // Require typing "DELETE" to confirm
      if (confirmText !== "DELETE") {
        return res.status(400).json({ error: "Please type 'DELETE' to confirm account deletion" });
      }

      // Verify password
      const user = await storage.getUserById(payload.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      // Delete the user and all their data
      await storage.deleteUserCompletely(payload.userId);

      // Clear the auth cookie
      res.clearCookie("authToken");

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Avatar Upload Route
  app.post("/api/user/avatar", avatarUpload.single('avatar'), async (req: AuthRequest, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // GIF Restriction Check
      if (req.file.mimetype === 'image/gif') {
        const userBadges = await storage.getUserBadges(payload.userId);
        const hasPack = userBadges.some(ub => ub.badge.name === 'Animated Avatar Pack');

        if (!hasPack) {
          // Delete unauthorized GIF
          if (existsSync(req.file.path)) {
            unlinkSync(req.file.path);
          }
          return res.status(403).json({ error: "Animated avatars require the Premium Animated Avatar Pack" });
        }
      }

      // Update User Profile with local path (or URL if served statically)
      // Assuming we serve 'uploads' as static, URL would be /uploads/avatars/filename
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      await storage.updateUser(payload.userId, { avatarUrl });

      // Check "Identity Crisis" achievement
      await checkAndAwardAchievements(payload.userId);

      res.json({ success: true, avatarUrl });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // Get Suggested Friends (Real Data)
  app.get("/api/friends/suggested", async (req, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const suggested = await storage.getSuggestedFriends(payload.userId);
      res.json(suggested);
    } catch (error) {
      console.error("Get suggested friends error:", error);
      res.status(500).json({ error: "Failed to get suggested friends" });
    }
  });

  // Get Online Users (Real Data)
  app.get("/api/users/online", async (req, res) => {
    try {
      // Import here to avoid circular dependency issues if possible, or assume it's available
      const { getOnlineUsers } = await import("./social");
      const onlineUserIds = getOnlineUsers();

      // Fetch details for these users
      // We can use a Promise.all to fetch details, or add a bulk fetch method. 
      // For now, let's just fetch individual or top 10 to avoid slam.
      // Actually, standard approach: fetch all user profiles? Might be heavy if 1000 users.
      // Let's just return the IDs and maybe top 10 full profiles for the widget.

      const limitedIds = onlineUserIds.slice(0, 10);
      const onlineProfiles = [];

      for (const id of limitedIds) {
        try {
          const u = await storage.getUserById(id);
          if (u) onlineProfiles.push(u);
        } catch (e) { /* ignore */ }
      }

      res.json({
        count: onlineUserIds.length,
        users: onlineProfiles,
        totalOnline: onlineUserIds.length
      });
    } catch (error) {
      console.error("Get online users error:", error);
      res.status(500).json({ error: "Failed to get online users" });
    }
  });

  // Get Public User Profile by Username (DEPRECATED - See line 1388)
  app.get("/api/users/profile-deprecated/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check authentication for friend status and social links privacy
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      let requesterId: string | undefined;
      let isFriend = false;
      let friendRequestStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' = 'none';
      let friendRequestId: string | undefined;

      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          requesterId = payload.userId;

          if (requesterId && requesterId !== user.id) {
            // Check direct friendship
            const friends = await storage.getFriends(requesterId);
            isFriend = friends.some(f => f.friendId === user.id);

            // Check friend request status if not already friends
            if (!isFriend) {
              // Check if I sent a request
              const sentRequest = await storage.getFriendRequest(requesterId, user.id);
              if (sentRequest && sentRequest.status === 'pending') {
                friendRequestStatus = 'pending_sent';
                friendRequestId = sentRequest.id;
              } else {
                // Check if they sent me a request
                const receivedRequest = await storage.getFriendRequest(user.id, requesterId);
                if (receivedRequest && receivedRequest.status === 'pending') {
                  friendRequestStatus = 'pending_received';
                  friendRequestId = receivedRequest.id;
                }
              }
            } else {
              friendRequestStatus = 'accepted';
            }
          } else if (requesterId === user.id) {
            isFriend = true; // User is friend with themselves for UI purposes (show private info)
            friendRequestStatus = 'accepted';
          }
        }
      }

      // Hide social links if not a friend and not self
      const socialLinks = (isFriend || (requesterId === user.id)) ? user.socialLinks : {};

      // Fetch badges
      const userBadges = await storage.getUserBadges(user.id);
      const badges = userBadges.filter(ub => ub.equipped).map(ub => ub.badge);

      // Expand Favorites (fetch details)
      let expandedFavorites = { shows: [], movies: [], anime: [] };
      try {
        const favoritesIds = user.favorites ? JSON.parse(user.favorites as string) : { shows: [], movies: [], anime: [] };

        if (favoritesIds.shows && favoritesIds.shows.length > 0) {
          const allShows = await storage.getAllShows(); // detailed fetch would be better but this works for MVP
          expandedFavorites.shows = allShows.filter(s => favoritesIds.shows.includes(s.id)).map(s => ({
            id: s.id, title: s.title, posterUrl: s.posterUrl, slug: s.slug
          }));
        }
        if (favoritesIds.movies && favoritesIds.movies.length > 0) {
          const allMovies = await storage.getAllMovies();
          expandedFavorites.movies = allMovies.filter(m => favoritesIds.movies.includes(m.id)).map(m => ({
            id: m.id, title: m.title, posterUrl: m.posterUrl, slug: m.slug
          }));
        }
        if (favoritesIds.anime && favoritesIds.anime.length > 0) {
          const allAnime = await (storage as any).getAllAnime?.() || [];
          expandedFavorites.anime = allAnime.filter((a: any) => favoritesIds.anime.includes(a.id)).map((a: any) => ({
            id: a.id, title: a.title, posterUrl: a.posterUrl, slug: a.slug
          }));
        }
      } catch (e) {
        console.error("Error expanding favorites:", e);
      }

      // Return public data only
      const publicProfile = {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        level: user.level || 1,
        xp: user.xp || 0,
        socialLinks: socialLinks, // Filtered
        favorites: expandedFavorites, // Expanded
        badges: user.badges ? JSON.parse(user.badges as string) : [],
        equippedBadges: badges,
        createdAt: user.createdAt,
        isFriend,
        friendRequestStatus,
        friendRequestId // New field
      };

      res.json(publicProfile);
    } catch (error) {
      console.error("Get public profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  // Get Activity Feed
  app.get("/api/feed", async (req, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      let userId: string | undefined;

      if (token) {
        const payload = verifyToken(token);
        if (payload) userId = payload.userId;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const filter = (req.query.filter as 'all' | 'friends' | 'mentions') || 'all';

      // If filtering by friends/mentions, we need a user ID
      if ((filter === 'friends' || filter === 'mentions') && !userId) {
        return res.status(401).json({ error: "Authentication required for filtered feed" });
      }

      const activities = await storage.getActivities(limit, filter, userId);
      res.json(activities);
    } catch (error) {
      console.error("Get feed error:", error);
      res.status(500).json({ error: "Failed to get feed" });
    }
  });

  // ============================================
  // ADMIN REVIEWS ROUTES
  // ============================================

  // Get all reviews for moderation
  app.get("/api/admin/reviews", requireAdmin, async (req, res) => {
    try {
      const reviews = await storage.getAllReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Get all reviews error:", error);
      res.status(500).json({ error: "Failed to get reviews" });
    }
  });

  // Delete a review (Admin)
  app.delete("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteReview(id); // No userId needed for admin
      res.json({ success: true, message: "Review deleted" });
    } catch (error) {
      console.error("Delete review error:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // ============================================
  // STORE ROUTES
  // ============================================
  // Products can be browsed without auth, but purchase/gift requires auth (checked in routes)
  app.use('/api/store', storeRoutes);

  // ============================================
  // WALLET ROUTES
  // ============================================

  // Get wallet transactions
  app.get("/api/wallet/transactions", async (req: AuthRequest, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const transactions = await storage.getUserCoinTransactions(payload.userId);
      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Failed to get transactions" });
    }
  });

  // ============================================
  // PAYMENT ROUTES (RAZORPAY)
  // ============================================

  // 1. Create Order
  app.post("/api/payment/create-order", async (req: AuthRequest, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { packageId, amount } = req.body;
      let coinAmount = 0;

      // Base Prices in USD
      const validPackages: Record<string, number> = {
        'handful': 500,
        'sack': 1200,
        'chest': 2500,
        'vault': 6500
      };
      const packagePricesUSD: Record<string, number> = {
        'handful': 4.99,
        'sack': 9.99,
        'chest': 19.99,
        'vault': 49.99
      };

      let basePriceUSD = 0;

      if (packageId === 'custom') {
        const customAmount = parseInt(amount);
        if (isNaN(customAmount) || customAmount <= 0) {
          return res.status(400).json({ error: 'Invalid custom amount' });
        }
        coinAmount = customAmount;

        // Dynamic Pricing Logic (USD Base)
        let rate = 0.00998;
        if (coinAmount >= 6500) rate = 49.99 / 6500;
        else if (coinAmount >= 2500) rate = 19.99 / 2500;
        else if (coinAmount >= 1200) rate = 9.99 / 1200;

        basePriceUSD = parseFloat((coinAmount * rate).toFixed(2));
      } else {
        coinAmount = validPackages[packageId];
        if (!coinAmount) return res.status(400).json({ error: 'Invalid coin package' });
        basePriceUSD = packagePricesUSD[packageId];
      }

      // 1. Convert USD -> Target Currency (Real-Time)
      // Default to INR if no currency provided (safety fallback), but client should send it.
      const targetCurrency = req.body.currency || "INR";
      const finalAmount = await convertCurrency(basePriceUSD, 'USD', targetCurrency);

      // Update logic to use this finalAmount for Razorpay
      const priceInRupees = finalAmount; // naming variable specifically for clarity, though it's any currency now


      // Create Razorpay Order
      // Razorpay receipt limit is 40 chars. 
      const shortUser = payload.userId.substring(0, 6);
      const shortTime = Date.now().toString().slice(-10);
      const receiptId = `rcpt_${shortTime}_${shortUser}`;

      // Use the generic helper
      const order = await createRazorpayOrder(priceInRupees, targetCurrency, receiptId);

      res.json({
        success: true,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount, // in smallest unit
        currency: order.currency,
        packageDetails: { packageId, amount: coinAmount, cost: `$${basePriceUSD}` } // Return USD cost for display confirmation
      });

    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  // 2. Verify Payment & Fulfill Order
  app.post("/api/payment/verify", async (req: AuthRequest, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const user = await storage.getUserById(payload.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        packageId,
        amount,
        cost,
        recipientEmail
      } = req.body;

      // Verify Signature
      const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid payment signature" });
      }

      // --- Payment Verified: Fulfill Order ---

      // 1. Update Balance
      const updatedUser = await storage.updateUserCoins(payload.userId, amount);

      // 2. Record Transaction
      const transaction = await storage.createCoinTransaction({
        userId: payload.userId,
        amount: amount,
        type: 'deposit',
        description: packageId === 'custom' ? `Custom Top-Up (${amount} coins)` : `Bought ${packageId} of coins`,
        metadata: JSON.stringify({
          packageId,
          cost,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id
        })
      });

      // 3. Send Receipt Email
      const emailToSend = recipientEmail || user.email;
      if (emailToSend) {
        try {
          await sendCoinPurchaseReceiptEmail(
            emailToSend,
            user.username,
            amount,
            cost,
            updatedUser.coins,
            transaction.id
          );
        } catch (error) {
          console.error("Failed to send coin receipt email:", error);
        }
      }

      // 4. Log Activity: Coin Purchase (Community Feed)
      try {
        await logAndBroadcastActivity({
          userId: payload.userId,
          type: 'coin_purchase',
          entityId: transaction.id,
          entityType: 'transaction',
          metadata: JSON.stringify({
            amount: amount,
            cost: cost
          })
        });
      } catch (e) {
        console.error("Failed to log coin_purchase activity", e);
      }

      res.json({
        success: true,
        message: `Payment successful! Purchased ${amount} coins.`,
        newBalance: updatedUser.coins
      });

    } catch (error) {
      console.error("Verify payment error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // ============================================
  // CLOUDFLARE TURNSTILE VERIFICATION
  // ============================================

  app.post("/api/turnstile/verify", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, error: "Token is required" });
      }

      // Cloudflare's official test secret - always passes, use for localhost dev
      const TEST_SECRET = "1x0000000000000000000000000000000AA";
      const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname === '0.0.0.0';
      const secret = isLocalhost ? TEST_SECRET : (process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || TEST_SECRET);

      const formData = new URLSearchParams();
      formData.append("secret", secret);
      formData.append("response", token);
      formData.append("remoteip", req.ip || "");

      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        }
      );

      const data = await response.json() as { success: boolean; "error-codes"?: string[] };
      return res.json({ success: data.success, errorCodes: data["error-codes"] });
    } catch (error) {
      console.error("Turnstile verify error:", error);
      return res.status(500).json({ success: false, error: "Verification failed" });
    }
  });

  // ============================================
  // HCAPTCHA VERIFICATION (download gateway)
  // ============================================

  app.post("/api/hcaptcha/verify", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, error: "Token is required" });
      }

      // hCaptcha official test secret - always passes, use for localhost dev
      const TEST_SECRET = "0x0000000000000000000000000000000000000000";
      const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname === '0.0.0.0';
      const secret = isLocalhost
        ? TEST_SECRET
        : (process.env.HCAPTCHA_SECRET_KEY || TEST_SECRET);

      const formData = new URLSearchParams();
      formData.append("secret", secret);
      formData.append("response", token);
      if (req.ip) formData.append("remoteip", req.ip);

      const response = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const data = await response.json() as {
        success: boolean;
        "error-codes"?: string[];
        score?: number;
      };
      return res.json({
        success: data.success,
        errorCodes: data["error-codes"],
        score: data.score,
      });
    } catch (error) {
      console.error("hCaptcha verify error:", error);
      return res.status(500).json({ success: false, error: "Verification failed" });
    }
  });

  // ============================================
  // AUTHENTICATION ROUTES
  // ============================================

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const { email, username, password } = result.data;

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        username,
        passwordHash,
        avatarUrl: null,
        bio: null,
        emailVerified: false,
        socialLinks: null,
        favorites: null,
        xp: 0,
        level: 1,
        badges: "[]"
      });

      // Handle Referral Code
      const { referralCode } = req.body;
      if (referralCode) {
        try {
          await storage.applyReferralCode(user.id, referralCode);
        } catch (error) {
          console.error("Referral application failed:", error);
          // Don't fail the registration, just log it
        }
      }

      // Generate token and set cookie (Log them in, but UI will force verification)
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });
      setAuthCookie(res, token);

      // Send Verification Email
      try {
        const verificationToken = await storage.createEmailVerificationToken(user.email);
        await sendEmailVerificationEmail(user.email, verificationToken);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      // Auto-subscribe to newsletter logic... (keep existing)
      try {
        let data = { subscribers: [] as any[] };
        if (existsSync(SUBSCRIBERS_FILE)) {
          data = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf-8"));
        }

        const isSubscribed = data.subscribers.some((s: any) => s.email === email);
        if (!isSubscribed) {
          data.subscribers.push({
            email,
            subscribedAt: new Date().toISOString(),
            source: "signup"
          });
          writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2));
          console.log(`📧 Auto-subscribed new user to newsletter: ${email}`);
        }
      } catch (subError) {
        console.error("Failed to auto-subscribe user:", subError);
        // Don't fail registration if subscription fails
      }

      // Check for 'New Comer' achievement
      await checkAndAwardAchievements(user.id);

      // Log activity: New user joined (Community Feed)
      try {
        await logAndBroadcastActivity({
          userId: user.id,
          type: 'user_signup',
          entityId: user.id,
          entityType: 'user',
          metadata: JSON.stringify({
            username: user.username
          })
        });
      } catch (e) {
        console.error("Failed to log signup activity", e);
      }

      // Re-fetch user to get updated stats (XP/Coins from referral)
      const freshUser = await storage.getUserById(user.id);

      res.status(201).json({
        user: {
          id: freshUser!.id,
          email: freshUser!.email,
          username: freshUser!.username,
          avatarUrl: freshUser!.avatarUrl,
          bio: freshUser!.bio,
          referredBy: freshUser!.referredBy,
          referralCount: freshUser!.referralCount,
          coins: freshUser!.coins,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  // Verify Email Address
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

      const success = await storage.verifyEmailVerificationToken(email, code);
      if (!success) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }

      res.json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Resend Verification Code
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      const token = await storage.createEmailVerificationToken(email);
      await sendEmailVerificationEmail(email, token);

      res.json({ success: true, message: "Verification code sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const { email, password } = result.data;

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate token and set cookie
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });
      setAuthCookie(res, token);

      // Fetch full badge details
      const userBadges = await storage.getUserBadges(user.id);
      const protocol = req.protocol === 'https' ? 'https' : 'http';
      const host = req.get('host')?.replace('0.0.0.0', 'localhost') || 'localhost:5000';
      const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

      const toAbsoluteUrl = (url: string) => {
        if (!url) return url;
        if (url.startsWith('http')) return url;
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      };

      const enrichedBadges = userBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        imageUrl: toAbsoluteUrl(ub.badge.imageUrl),
        equipped: ub.equipped,
        category: ub.badge.category,
        equippedAt: ub.equippedAt
      }));

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          referredBy: user.referredBy,
          referralCount: user.referralCount,
          coins: user.coins,
          badges: enrichedBadges,
          adFreeUntil: user.adFreeUntil || null,
          subscriptionType: user.subscriptionType || null,
          isSubscribed: user.adFreeUntil && new Date(user.adFreeUntil) > new Date()
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (_req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  // Forgot Password - Request Token
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "No account found with this email" });
      }

      const token = await storage.createPasswordResetToken(email);
      const sent = await sendPasswordResetEmail(email, token);

      if (sent) {
        res.json({ success: true, message: "Reset code sent to your email" });
      } else {
        res.status(500).json({ error: "Failed to send email" });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "An error occurred" });
    }
  });

  // Verify and Reset Password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const isValid = await storage.verifyPasswordResetToken(email, code);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const passwordHash = await hashPassword(newPassword);
      await storage.updateUser(user.id, { passwordHash });
      await storage.deletePasswordResetToken(email);

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req: AuthRequest, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const user = await storage.getUserById(payload.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Parse JSON fields
      let socialLinks = null;
      let favorites = null;

      try {
        socialLinks = user.socialLinks ? JSON.parse(user.socialLinks as string) : null;
      } catch (e) {
        socialLinks = null;
      }

      try {
        favorites = user.favorites ? JSON.parse(user.favorites as string) : null;
      } catch (e) {
        favorites = null;
      }


      // Get equipped badge (Keeping for backward compatibility if needed, but 'badges' array is better)
      const equippedBadge = await storage.getEquippedBadge(user.id);

      // Fetch full badge details
      const userBadges = await storage.getUserBadges(user.id);
      const protocol = req.protocol === 'https' ? 'https' : 'http';
      const host = req.get('host')?.replace('0.0.0.0', 'localhost') || 'localhost:5000';
      const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

      // Helper to ensure absolute URL
      const toAbsoluteUrl = (url: string) => {
        if (!url) return url;
        if (url.startsWith('http')) return url;
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      };

      const enrichedBadges = userBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        imageUrl: toAbsoluteUrl(ub.badge.imageUrl),
        equipped: ub.equipped,
        category: ub.badge.category,
        description: ub.badge.description,
        icon: ub.badge.icon,
        equippedAt: ub.equippedAt
      }));

      console.log("BADGE DEBUG:", JSON.stringify(enrichedBadges, null, 2));

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          referredBy: user.referredBy,
          referralCount: user.referralCount,
          socialLinks,
          favorites,
          xp: user.xp,
          level: user.level,
          badges: enrichedBadges, // Return enriched badges structure
          equippedBadge: equippedBadge,
          coins: user.coins,
          adFreeUntil: user.adFreeUntil || null,
          subscriptionType: user.subscriptionType || null,
          subscriptionAutoRenew: user.subscriptionAutoRenew || false,
          isSubscribed: user.adFreeUntil && new Date(user.adFreeUntil) > new Date()
        },
      });

    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Update profile
  app.put("/api/auth/profile", async (req: AuthRequest, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const updates: any = {};
      if (result.data.username) {
        // Check if username is taken by another user
        const existing = await storage.getUserByUsername(result.data.username);
        if (existing && existing.id !== payload.userId) {
          return res.status(400).json({ error: "Username already taken" });
        }
        updates.username = result.data.username;
      }
      if (result.data.bio !== undefined) {
        updates.bio = result.data.bio;
      }
      if (result.data.socialLinks !== undefined) {
        updates.socialLinks = JSON.stringify(result.data.socialLinks);
      }
      if (result.data.favorites !== undefined) {
        updates.favorites = JSON.stringify(result.data.favorites);
      }

      const user = await storage.updateUser(payload.userId, updates);

      // Parse JSON fields for response
      let socialLinks = null;
      let favorites = null;
      try {
        socialLinks = user.socialLinks ? JSON.parse(user.socialLinks as string) : null;
      } catch (e) { }
      try {
        favorites = user.favorites ? JSON.parse(user.favorites as string) : null;
      } catch (e) { }

      // Check achievements (Bio-hazed, etc.)
      await checkAndAwardAchievements(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          referredBy: user.referredBy,
          referralCount: user.referralCount,
          socialLinks,
          favorites,
          coins: user.coins,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Upload avatar
  app.post("/api/auth/avatar", avatarUpload.single('avatar'), async (req: AuthRequest, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      // Security Check: Restrict GIFs to Premium Users
      if (req.file.mimetype === 'image/gif') {
        const userBadges = await storage.getUserBadges(payload.userId);
        const hasPremium = userBadges.some(ub => ub.badge.name === "Animated Avatar Pack");

        if (!hasPremium) {
          // Delete the uploaded file to prevent clutter
          try {
            unlinkSync(req.file.path);
          } catch (e) {
            console.error("Failed to delete rejected GIF:", e);
          }
          return res.status(403).json({ error: "Animated avatars require the 'Animated Avatar Pack' badge." });
        }
      }

      const user = await storage.updateUser(payload.userId, { avatarUrl });

      // Check achievements (Identity Crisis)
      await checkAndAwardAchievements(payload.userId);

      res.json({
        avatarUrl: user.avatarUrl,
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // ============================================
  // FRIENDS SYSTEM ROUTES
  // ============================================

  // Search users by username
  app.get("/api/users/search", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ error: "Search query must be at least 2 characters" });
      }

      const users = await storage.searchUsers(query);

      // Filter out current user and return only public info
      // Also fetch equipped badges dynamically
      const filtered = await Promise.all(users.map(async (u) => {
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
          badges: equipped,
        };
      }));

      res.json(filtered);
    } catch (error) {
      console.error("User search error:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Get specific user's public profile (for Watch Together / deep linking)
  app.get("/api/users/:id/public-profile", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      if (!verifyToken(token)) return res.status(401).json({ error: "Invalid token" });

      const userId = req.params.id;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Fetch badges
      const userBadges = await storage.getUserBadges(user.id);
      const allBadges = userBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        imageUrl: ub.badge.imageUrl,
        equipped: ub.equipped,
        category: ub.badge.category,
        description: ub.badge.description,
        icon: ub.badge.icon,
        equippedAt: ub.equippedAt
      }));

      // Parse JSON fields
      let socialLinks = null;
      let favorites = null;
      try { socialLinks = user.socialLinks ? JSON.parse(user.socialLinks as string) : null; } catch (e) { }
      try {
        const rawFavorites = user.favorites ? JSON.parse(user.favorites as string) : null;
        if (rawFavorites) {
          favorites = { shows: [], movies: [], anime: [] };

          if (rawFavorites.shows && Array.isArray(rawFavorites.shows)) {
            for (const id of rawFavorites.shows) {
              const show = await storage.getShowById(id);
              if (show) favorites.shows.push({ id: show.id, title: show.title, posterUrl: show.posterUrl, slug: show.slug });
            }
          }

          if (rawFavorites.movies && Array.isArray(rawFavorites.movies)) {
            for (const id of rawFavorites.movies) {
              const movie = await storage.getMovieById(id);
              if (movie) favorites.movies.push({ id: movie.id, title: movie.title, posterUrl: movie.posterUrl, slug: movie.slug });
            }
          }

          if (rawFavorites.anime && Array.isArray(rawFavorites.anime)) {
            for (const id of rawFavorites.anime) {
              const anime = await storage.getAnimeById(id);
              if (anime) favorites.anime.push({ id: anime.id, title: anime.title, posterUrl: anime.posterUrl, slug: anime.slug });
            }
          }
        }
      } catch (e) {
        console.error("Error parsing favorites:", e);
      }

      const publicProfile = {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        level: user.level,
        xp: user.xp,
        socialLinks,
        favorites,
        badges: allBadges,
        createdAt: user.createdAt
      };

      res.json(publicProfile);
    } catch (error) {
      console.error("Get public profile error:", error);
      res.status(500).json({ error: "Failed to get user profile" });
    }
  });

  // Get specific user's public profile by username (for friendly heavy URLs)
  app.get("/api/users/profile/:username", async (req, res) => {
    try {
      const username = req.params.username;

      const token = req.cookies.authToken;
      // Optional: Allow public viewing if desired, but consistent with above
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (!verifyToken(token)) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Fetch badges
      const userBadges = await storage.getUserBadges(user.id);
      const allBadges = userBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        imageUrl: ub.badge.imageUrl,
        equipped: ub.equipped,
        category: ub.badge.category,
        description: ub.badge.description,
        icon: ub.badge.icon,
        equippedAt: ub.equippedAt
      }));

      // Parse JSON fields
      let socialLinks = null;
      let favorites = null;
      try { socialLinks = user.socialLinks ? JSON.parse(user.socialLinks as string) : null; } catch (e) { }
      try {
        const rawFavorites = user.favorites ? JSON.parse(user.favorites as string) : null;
        if (rawFavorites) {
          favorites = { shows: [], movies: [], anime: [] };

          if (rawFavorites.shows && Array.isArray(rawFavorites.shows)) {
            for (const id of rawFavorites.shows) {
              const show = await storage.getShowById(id);
              if (show) favorites.shows.push({ id: show.id, title: show.title, posterUrl: show.posterUrl, slug: show.slug });
            }
          }

          if (rawFavorites.movies && Array.isArray(rawFavorites.movies)) {
            for (const id of rawFavorites.movies) {
              const movie = await storage.getMovieById(id);
              if (movie) favorites.movies.push({ id: movie.id, title: movie.title, posterUrl: movie.posterUrl, slug: movie.slug });
            }
          }

          if (rawFavorites.anime && Array.isArray(rawFavorites.anime)) {
            for (const id of rawFavorites.anime) {
              const anime = await storage.getAnimeById(id);
              if (anime) favorites.anime.push({ id: anime.id, title: anime.title, posterUrl: anime.posterUrl, slug: anime.slug });
            }
          }
        }
      } catch (e) {
        console.error("Error parsing favorites:", e);
      }

      const publicProfile = {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        level: user.level,
        xp: user.xp,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        socialLinks,
        favorites,
        badges: allBadges,
        createdAt: user.createdAt,
        // Friend status needs to be checked relative to current user
        isFriend: false, // Will be computed or fetched if needed?
        // Wait, the frontend might compute 'isFriend' separately or fetch friend status?
        // Let's check public-profile.tsx again.
        // It uses `data.isFriend`. So I need to return it here!
        friendRequestStatus: 'none',
        friendRequestId: undefined
      };

      const payload = verifyToken(token);
      if (payload) {
        publicProfile.isFriend = await storage.areFriends(payload.userId, user.id);

        // Check for friend request status
        const sentRequest = (await storage.getSentFriendRequests(payload.userId)).find(r => r.toUserId === user.id && r.status === 'pending');
        const receivedRequest = (await storage.getFriendRequests(payload.userId)).find(r => r.fromUserId === user.id && r.status === 'pending');

        if (sentRequest) {
          publicProfile.friendRequestStatus = 'pending_sent';
          publicProfile.friendRequestId = sentRequest.id;
        } else if (receivedRequest) {
          publicProfile.friendRequestStatus = 'pending_received';
          publicProfile.friendRequestId = receivedRequest.id;
        } else if (publicProfile.isFriend) {
          publicProfile.friendRequestStatus = 'accepted';
        }
      }

      res.json(publicProfile);
    } catch (error) {
      console.error("Get public profile error:", error);
      res.status(500).json({ error: "Failed to get user profile" });
    }
  });

  // Send friend request
  app.post("/api/friends/request", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { toUserId } = req.body;
      if (!toUserId) {
        return res.status(400).json({ error: "User ID required" });
      }

      // Check if already friends
      const alreadyFriends = await storage.areFriends(payload.userId, toUserId);
      if (alreadyFriends) {
        return res.status(400).json({ error: "Already friends" });
      }

      // Check if request already exists
      const existingRequests = await storage.getSentFriendRequests(payload.userId);
      const alreadyRequested = existingRequests.find(r => r.toUserId === toUserId && r.status === 'pending');
      if (alreadyRequested) {
        return res.status(400).json({ error: "Friend request already sent" });
      }

      // Check if they already sent us a request
      const theirRequests = await storage.getFriendRequests(payload.userId);
      const theyRequested = theirRequests.find(r => r.fromUserId === toUserId);
      if (theyRequested) {
        return res.status(400).json({ error: "They already sent you a request. Check your pending requests." });
      }

      const request = await storage.createFriendRequest(payload.userId, toUserId);

      // Create notification for recipient
      const currentUser = await storage.getUserById(payload.userId);
      await storage.createNotification({
        userId: toUserId,
        type: 'friend_request',
        title: 'Friend Request',
        message: `${currentUser?.username || 'Someone'} sent you a friend request`,
        data: { requestId: request.id, fromUserId: payload.userId },
        read: false,
      });

      res.status(201).json(request);
    } catch (error) {
      console.error("Send friend request error:", error);
      res.status(500).json({ error: "Failed to send friend request" });
    }
  });

  // Get pending friend requests (received)
  app.get("/api/friends/requests", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const requests = await storage.getFriendRequests(payload.userId);

      // Enrich with user info
      const enrichedRequests = await Promise.all(requests.map(async (r) => {
        const fromUser = await storage.getUserById(r.fromUserId);

        let badges: any[] = [];
        if (fromUser) {
          const userBadges = await storage.getUserBadges(fromUser.id);
          badges = userBadges.filter(ub => ub.equipped).map(ub => ({
            id: ub.badge.id,
            name: ub.badge.name,
            imageUrl: ub.badge.imageUrl,
            equipped: true,
            description: ub.badge.description,
            icon: ub.badge.icon,
            equippedAt: ub.equippedAt
          }));
        }

        return {
          ...r,
          fromUser: fromUser ? {
            id: fromUser.id,
            username: fromUser.username,
            avatarUrl: fromUser.avatarUrl,
            badges,
          } : null,
        };
      }));

      res.json(enrichedRequests);
    } catch (error) {
      console.error("Get friend requests error:", error);
      res.status(500).json({ error: "Failed to get friend requests" });
    }
  });

  // Accept friend request
  app.post("/api/friends/accept/:requestId", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { requestId } = req.params;
      const request = await storage.getFriendRequestById(requestId);

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request.toUserId !== payload.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ error: "Request already processed" });
      }

      // Update request status
      await storage.updateFriendRequest(requestId, {
        status: 'accepted',
        respondedAt: new Date().toISOString(),
      });

      // Create friendship
      await storage.addFriend(request.fromUserId, request.toUserId);

      // Log activity: Friend Connect (Community Feed)
      try {
        const fromUser = await storage.getUserById(request.fromUserId);
        if (fromUser) {
          await logAndBroadcastActivity({
            userId: payload.userId, // Person who accepted
            type: 'friend_connect',
            entityId: requestId,
            entityType: 'friend',
            metadata: JSON.stringify({
              friendId: request.fromUserId,
              friendUsername: fromUser.username,
              friendAvatar: fromUser.avatarUrl
            })
          });
        }
      } catch (e) {
        console.error("Failed to log friend_connect activity", e);
      }

      // Notify the requester
      // Notify the requester
      const currentUser = await storage.getUserById(payload.userId);
      await storage.createNotification({
        userId: request.fromUserId,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${currentUser?.username || 'Someone'} accepted your friend request`,
        data: { friendId: payload.userId },
        read: false,
      });

      // Check achievements for both users
      await checkAndAwardAchievements(payload.userId); // The acceptor
      await checkAndAwardAchievements(request.fromUserId); // The requester

      res.json({ success: true, fromUserId: request.fromUserId });
    } catch (error) {
      console.error("Accept friend request error:", error);
      res.status(500).json({ error: "Failed to accept friend request" });
    }
  });

  // Decline friend request
  app.post("/api/friends/decline/:requestId", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { requestId } = req.params;
      const request = await storage.getFriendRequestById(requestId);

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request.toUserId !== payload.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.updateFriendRequest(requestId, {
        status: 'declined',
        respondedAt: new Date().toISOString(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Decline friend request error:", error);
      res.status(500).json({ error: "Failed to decline friend request" });
    }
  });

  // Cancel sent friend request
  app.delete("/api/friends/request/:requestId", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { requestId } = req.params;
      const request = await storage.getFriendRequestById(requestId);

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request.fromUserId !== payload.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ error: "Cannot cancel processed request" });
      }

      await storage.deleteFriendRequest(requestId); // Ensure this method exists or implement logic to remove

      res.json({ success: true });
    } catch (error) {
      console.error("Cancel friend request error:", error);
      res.status(500).json({ error: "Failed to cancel friend request" });
    }
  });

  // Get friends list
  app.get("/api/friends", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const friends = await storage.getFriends(payload.userId);

      // Enrich with user info
      const enrichedFriends = await Promise.all(friends.map(async (f) => {
        const friendId = f.userId === payload.userId ? f.friendId : f.userId;
        const friendUser = await storage.getUserById(friendId);

        // Fetch equipped badges
        let badges: any[] = [];
        if (friendUser) {
          const userBadges = await storage.getUserBadges(friendUser.id);
          badges = userBadges.filter(ub => ub.equipped).map(ub => ({
            id: ub.badge.id,
            name: ub.badge.name,
            imageUrl: ub.badge.imageUrl,
            equipped: true,
            description: ub.badge.description,
            icon: ub.badge.icon,
            equippedAt: ub.equippedAt
          }));
        }

        return {
          id: f.id,
          friendId,
          username: friendUser?.username || 'Unknown',
          avatarUrl: friendUser?.avatarUrl || null,
          badges,
          lastActive: friendUser?.lastActive,
          createdAt: f.createdAt,
        };
      }));

      res.json(enrichedFriends);
    } catch (error) {
      console.error("Get friends error:", error);
      res.status(500).json({ error: "Failed to get friends" });
    }
  });

  // Remove friend
  app.delete("/api/friends/:friendId", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { friendId } = req.params;
      await storage.removeFriend(payload.userId, friendId);

      res.json({ success: true });
    } catch (error) {
      console.error("Remove friend error:", error);
      res.status(500).json({ error: "Failed to remove friend" });
    }
  });

  // ============================================
  // USER PROFILE ROUTES
  // ============================================

  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      // Secure endpoint: only authenticated users can view profiles (basic privacy)
      const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { userId } = req.params;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Parse JSON fields
      let socialLinks = null;
      let favorites = null;

      try {
        socialLinks = user.socialLinks ? JSON.parse(user.socialLinks as string) : null;
      } catch (e) {
        socialLinks = null;
      }

      try {
        favorites = user.favorites ? JSON.parse(user.favorites as string) : null;
      } catch (e) {
        favorites = null;
      }

      // Enrich favorites with content data
      let enrichedFavorites = null;
      if (favorites) {
        enrichedFavorites = {
          shows: [] as Array<{ id: string; title: string; posterUrl: string | null; slug: string }>,
          movies: [] as Array<{ id: string; title: string; posterUrl: string | null; slug: string }>,
          anime: [] as Array<{ id: string; title: string; posterUrl: string | null; slug: string }>,
        };

        // Get show details
        if (favorites.shows?.length) {
          for (const showId of favorites.shows.slice(0, 5)) {
            const show = await storage.getShowById(showId);
            if (show) {
              enrichedFavorites.shows.push({
                id: show.id,
                title: show.title,
                posterUrl: show.posterUrl,
                slug: show.slug,
              });
            }
          }
        }

        if (favorites.movies?.length) {
          for (const movieId of favorites.movies.slice(0, 5)) {
            const movie = await storage.getMovieById(movieId);
            if (movie) {
              enrichedFavorites.movies.push({
                id: movie.id,
                title: movie.title,
                posterUrl: movie.posterUrl,
                slug: movie.slug,
              });
            }
          }
        }

        if (favorites.anime?.length) {
          for (const animeId of favorites.anime.slice(0, 5)) {
            const anime = await storage.getAnimeById(animeId);
            if (anime) {
              enrichedFavorites.anime.push({
                id: anime.id,
                title: anime.title,
                posterUrl: anime.posterUrl,
                slug: anime.slug,
              });
            }
          }
        }
      }

      // Fetch fresh badges (prevents stale data issues)
      const userBadges = await storage.getUserBadges(user.id);
      const freshBadges = userBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        imageUrl: ub.badge.imageUrl,
        equipped: ub.equipped,
        category: ub.badge.category,
        description: ub.badge.description,
        icon: ub.badge.icon,
        equippedAt: ub.equippedAt
      }));

      // Return public profile data
      res.json({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio || null,
        xp: user.xp,
        level: user.level,
        badges: freshBadges,
        socialLinks,
        favorites: enrichedFavorites,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({ error: "Failed to get user profile" });
    }
  });

  // Check if room exists (for extension)
  app.get("/api/watch-together/check/:code", (req, res) => {
    const { code } = req.params;
    if (!code || code.length !== 6) {
      return res.json({ exists: false });
    }
    const exists = checkRoomExists(code);
    res.json({ exists });
  });

  // ============================================
  // GAMIFICATION ROUTES
  // ============================================

  // Award XP
  app.post("/api/user/xp", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { amount } = req.body;
      if (!amount || typeof amount !== 'number') {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Limit XP gain per request to prevent abuse
      const safeAmount = Math.min(amount, 100);
      const result = await storage.updateUserXP(payload.userId, safeAmount);

      // Log to XP History
      await storage.addXpHistory(payload.userId, safeAmount, 'watch_content');

      // Update user's watch streak
      const streakResult = await storage.updateUserStreak(payload.userId);

      // Award bonus XP for streak milestones
      let streakBonusXP = 0;
      if (streakResult.milestone) {
        const milestoneBonus: Record<number, number> = { 7: 100, 30: 250, 100: 500, 365: 1000 };
        streakBonusXP = milestoneBonus[streakResult.milestone] || 0;
        if (streakBonusXP > 0) {
          await storage.updateUserXP(payload.userId, streakBonusXP);
          await storage.addXpHistory(payload.userId, streakBonusXP, 'streak_bonus');

          await storage.createNotification({
            userId: payload.userId,
            type: 'achievement',
            title: `🔥 ${streakResult.milestone}-Day Streak!`,
            message: `You earned ${streakBonusXP} bonus XP for your ${streakResult.milestone}-day watch streak!`,
            data: { streakDays: streakResult.milestone, bonusXP: streakBonusXP },
            read: false,
          });
        }
      }

      // Create XP earned notification
      await storage.createNotification({
        userId: payload.userId,
        type: 'xp_earned',
        title: 'XP Earned! 🌟',
        message: `You earned ${safeAmount} XP`,
        data: { amount: safeAmount, newXp: result.user.xp, newLevel: result.user.level, levelUp: result.levelUp },
        read: false,
      });

      // Check for achievements
      const newBadges = await checkAndAwardAchievements(payload.userId);

      res.json({ ...result, newBadges, streak: streakResult, streakBonusXP });
    } catch (error) {
      console.error("Update XP error:", error);
      res.status(500).json({ error: "Failed to update XP" });
    }
  });


  // Get Leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const { ACHIEVEMENTS } = await import("./achievements");
      const systemBadgeIds = new Set(ACHIEVEMENTS.map(a => a.id));

      const getFilteredBadges = (badgesJson: string | null) => {
        if (!badgesJson) return [];
        try {
          const badges = JSON.parse(badgesJson);
          return badges; // Return all badges, let frontend filter by equipped
        } catch (e) {
          return [];
        }
      };

      const limit = parseInt(req.query.limit as string) || 10;
      const period = req.query.period as 'daily' | 'weekly' | 'monthly';

      if (period) {
        // Return time-based leaderboard
        const leaderboard = await storage.getLeaderboardByPeriod(period, limit);
        // Note: Time-based leaderboard format doesn't natively include full badge list in current storage implementation
        // If needed, we'd have to fetch user details. unique to this implementation, we will skip badges for period views
        // or fetch them if critical. For now, matching existing structure but keeping clean.

        // Actually, let's fetch the full user to get badges if we want to show them on period tabs too
        // But storage.getLeaderboardByPeriod returns a simplified object. 
        // Let's stick to the requested behaviour for the main leaderboard first which uses getLeaderboard()

        const publicLeaderboard = leaderboard.map(u => ({
          id: u.userId,
          username: u.username,
          avatarUrl: u.avatarUrl,
          xp: u.xpGained,
          level: u.level,
          badges: [], // Keeping empty for period views as per previous logic, or could be fetched
          currentStreak: 0
        }));

        return res.json(publicLeaderboard);
      } else {
        // Return all-time leaderboard
        const leaderboard = await storage.getLeaderboard(limit);

        // Map to public user interface
        const publicLeaderboard = leaderboard.map(u => ({
          id: u.id,
          username: u.username,
          avatarUrl: u.avatarUrl,
          xp: u.xp,
          level: u.level,
          badges: getFilteredBadges(u.badges as string), // Use filtered list
          currentStreak: u.currentStreak || 0
        }));

        return res.json(publicLeaderboard);
      }
    } catch (error) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // Get All Achievements (with custom images from DB)
  app.get("/api/achievements", async (req, res) => {
    // Disable caching to ensure fresh data after admin updates
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
      // Import ACHIEVEMENTS dynamically to avoid circular dependencies
      const { ACHIEVEMENTS, checkAndAwardAchievements } = await import("./achievements");

      // Auto-heal: Check achievements if user is logged in
      const token = req.cookies.authToken;
      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          await checkAndAwardAchievements(payload.userId);
        }
      }

      // CRITICAL: Fetch badge overrides from DB for custom images
      const allBadges = await storage.getBadges();

      const definitions = ACHIEVEMENTS.map(a => {
        const dbBadge = allBadges.find(b => b.id === a.id);
        return {
          id: a.id,
          name: dbBadge?.name || a.name,
          description: dbBadge?.description || a.description,
          icon: a.icon,
          imageUrl: dbBadge?.imageUrl || null, // Include custom image from DB!
          category: a.category
        };
      });

      res.json(definitions);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  // Debug Achievements
  app.get("/api/debug/achievements", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const userId = payload.userId;
      const friends = await storage.getFriends(userId);
      const user = await storage.getUserById(userId);

      // Import check logic manually to test it
      const { ACHIEVEMENTS, checkAndAwardAchievements } = await import("./achievements");
      const social1 = ACHIEVEMENTS.find(a => a.id === "social-1");

      let conditionResult = false;
      if (social1 && user) {
        conditionResult = await social1.condition(user);
      }

      // AUTO-FIX: Force check all achievements
      const unlockedNow = await checkAndAwardAchievements(userId);

      res.json({
        userId,
        friendsCount: friends.length,
        friends: friends,
        userBadges: user?.badges,
        social1Check: conditionResult,
        autoFix: {
          triggered: true,
          newlyUnlocked: unlockedNow
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // STREAK TRACKING ROUTES
  // ============================================

  // Get user's streak info
  app.get("/api/user/streak", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const streak = await storage.getUserStreak(payload.userId);
      res.json(streak);
    } catch (error) {
      console.error("Get streak error:", error);
      res.status(500).json({ error: "Failed to get streak" });
    }
  });

  // Claim streak milestone reward
  app.post("/api/user/claim-streak-reward", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { milestone } = req.body;
      const validMilestones: Record<number, { xp: number; coins: number }> = {
        7: { xp: 100, coins: 50 },
        30: { xp: 250, coins: 150 },
        100: { xp: 500, coins: 300 },
        365: { xp: 1000, coins: 500 },
      };

      if (!validMilestones[milestone]) {
        return res.status(400).json({ error: "Invalid milestone" });
      }

      const user = await storage.getUserById(payload.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if streak has reached this milestone (current or longest)
      const currentStreak = user.currentStreak || 0;
      const longestStreak = user.longestStreak || 0;
      if (currentStreak < milestone && longestStreak < milestone) {
        return res.status(400).json({ error: "You haven't reached this milestone yet" });
      }

      // Check if already claimed
      const claimed: number[] = (user as any).claimedStreakMilestones || [];
      if (claimed.includes(milestone)) {
        return res.status(400).json({ error: "You already claimed this milestone reward" });
      }

      // Award XP
      const { xp, coins } = validMilestones[milestone];
      await storage.updateUserXP(payload.userId, xp);
      await storage.addXpHistory(payload.userId, xp, 'streak_milestone');

      // Award Coins
      await storage.updateUserCoins(payload.userId, coins);
      await storage.createCoinTransaction({
        userId: payload.userId,
        amount: coins,
        type: 'reward',
        description: `Streak milestone reward: ${milestone}-day streak`,
        metadata: JSON.stringify({ milestone }),
      });

      // Mark as claimed
      claimed.push(milestone);
      await storage.claimStreakMilestone(payload.userId, claimed);

      // Create notification
      await storage.createNotification({
        userId: payload.userId,
        type: 'system',
        title: `🎉 ${milestone}-Day Streak Reward Claimed!`,
        message: `You received ${xp} XP and ${coins} StreamCoins for your ${milestone}-day streak!`,
        data: { milestone, xp, coins },
        read: false,
      });

      res.json({ success: true, milestone, xpAwarded: xp, coinsAwarded: coins });
    } catch (error) {
      console.error("Claim streak reward error:", error);
      res.status(500).json({ error: "Failed to claim reward" });
    }
  });

  // ============================================
  // REVIEWS ROUTES
  // ============================================

  // Get reviews for content
  app.get("/api/reviews/:contentType/:contentId", async (req, res) => {
    try {
      const { contentType, contentId } = req.params;
      const reviews = await storage.getReviews(contentType, contentId);
      const rating = await storage.getAverageRating(contentType, contentId);
      res.json({ reviews, averageRating: rating.average, totalReviews: rating.count });
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({ error: "Failed to get reviews" });
    }
  });

  // Create/update review
  app.post("/api/reviews", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { contentType, contentId, rating, reviewText, spoilerWarning } = req.body;

      if (!contentType || !contentId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Invalid review data" });
      }

      const review = await storage.createReview({
        userId: payload.userId,
        contentType,
        contentId,
        rating,
        reviewText: reviewText || null,
        spoilerWarning: spoilerWarning || false,
      });

      // Log activity: Review Post (Community Feed)
      try {
        let title = "";
        let posterUrl = "";
        let link = "";

        if (contentType === 'movie') {
          const movie = await storage.getMovieById(contentId);
          if (movie) {
            title = movie.title;
            posterUrl = movie.posterUrl;
            link = `/movie/${movie.slug || movie.id}`;
          }
        } else if (contentType === 'show') {
          const show = await storage.getShowById(contentId);
          if (show) {
            title = show.title;
            posterUrl = show.posterUrl;
            link = `/show/${show.slug || show.id}`;
          }
        } else if (contentType === 'anime') {
          const anime = await storage.getAnimeById(contentId);
          if (anime) {
            title = anime.title;
            posterUrl = anime.posterUrl;
            link = `/anime/${anime.slug || anime.id}`;
          }
        }

        await logAndBroadcastActivity({
          userId: payload.userId,
          type: 'review_post',
          entityId: review.id,
          entityType: 'review',
          metadata: JSON.stringify({
            contentId: contentId,
            contentType: contentType,
            rating: rating,
            title: title || "Unknown Content",
            posterUrl: posterUrl,
            link: link
          })
        });
      } catch (e) {
        console.error("Failed to log review_post activity", e);
      }

      res.status(201).json(review);
    } catch (error) {
      console.error("Create review error:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  // Delete review
  app.delete("/api/reviews/:id", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      await storage.deleteReview(req.params.id, payload.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete review error:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // Mark review as helpful
  app.post("/api/reviews/:id/helpful", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      await storage.markReviewHelpful(req.params.id, payload.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark helpful error:", error);
      res.status(500).json({ error: "Failed to mark as helpful" });
    }
  });

  // ============================================
  // CHALLENGES ROUTES
  // ============================================

  // Get active challenges
  app.get("/api/challenges", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const type = req.query.type as 'daily' | 'weekly' | undefined;
      const challenges = await storage.getChallenges(type);
      const userChallenges = await storage.getUserChallenges(payload.userId);

      // Map challenges with user progress
      const result = challenges.map(c => {
        const userChallenge = userChallenges.find(uc => uc.challengeId === c.id);
        return {
          ...c,
          progress: userChallenge?.progress || 0,
          completed: userChallenge?.completed || false,
          claimed: userChallenge?.claimed || false,
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Get challenges error:", error);
      res.status(500).json({ error: "Failed to get challenges" });
    }
  });

  // Claim challenge reward
  app.post("/api/challenges/:id/claim", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const result = await storage.claimChallengeReward(payload.userId, req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("Claim challenge error:", error);
      res.status(400).json({ error: error.message || "Failed to claim reward" });
    }
  });

  // Admin: Create challenge
  app.post("/api/admin/challenges", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      // TODO: Add admin check here
      const { title, description, type, targetType, targetValue, targetGenre, xpReward, badgeReward, startDate, endDate } = req.body;

      const challenge = await storage.createChallenge({
        title,
        description,
        type,
        targetType,
        targetValue,
        targetGenre: targetGenre || null,
        xpReward,
        badgeReward: badgeReward || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        active: true,
      });

      res.status(201).json(challenge);
    } catch (error) {
      console.error("Create challenge error:", error);
      res.status(500).json({ error: "Failed to create challenge" });
    }
  });

  // ============================================
  // REFERRAL ROUTES
  // ============================================

  // Get/generate referral code
  app.get("/api/user/referral-code", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const code = await storage.generateReferralCode(payload.userId);
      res.json({ code });
    } catch (error) {
      console.error("Get referral code error:", error);
      res.status(500).json({ error: "Failed to get referral code" });
    }
  });

  // Apply referral code
  app.post("/api/referral/apply", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Referral code required" });

      await storage.applyReferralCode(payload.userId, code);
      res.json({ success: true, message: "Referral code applied! You earned 50 XP!" });
    } catch (error: any) {
      console.error("Apply referral error:", error);
      res.status(400).json({ error: error.message || "Failed to apply referral code" });
    }
  });

  // Get referral leaderboard
  // Get referral leaderboard
  app.get("/api/referral-leaderboard", requireApiKey, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getReferralLeaderboard(limit);

      // Restrict external API users to 1 item per request
      if ((req as any).apiKey) {
        return res.json(leaderboard.slice(0, 1));
      }

      res.json(leaderboard);
    } catch (error) {
      console.error("Get referral leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // ============================================
  // POLLS ROUTES
  // ============================================

  // Get active polls
  // Get active polls
  app.get("/api/polls", requireApiKey, async (req, res) => {
    try {
      const polls = await storage.getPolls(true);
      
      // Check if user is authenticated to get their votes
      let userId: string | null = null;
      const token = req.cookies.authToken;
      if (token) {
        const payload = verifyToken(token);
        if (payload) userId = payload.userId;
      }
      
      const parsed = await Promise.all(polls.map(async p => {
        const results = await storage.getPollResults(p.id);
        const totalVotes = results.reduce((sum, r) => sum + r.count, 0);
        
        let userVote: number | null = null;
        if (userId) {
          const vote = await storage.getUserVote(p.id, userId);
          if (vote) userVote = vote.optionIndex;
        }
        
        return { 
          ...p, 
          options: typeof p.options === 'string' ? JSON.parse(p.options) : p.options,
          results,
          totalVotes,
          userVote
        };
      }));

      // Restrict external API users to 1 item per request
      if ((req as any).apiKey) {
        return res.json(parsed.slice(0, 1));
      }

      res.json(parsed);
    } catch (error) {
      console.error("Get polls error:", error);
      res.status(500).json({ error: "Failed to get polls" });
    }
  });

  // Admin: Get all polls with detailed results and voters
  app.get("/api/admin/polls", requireAdmin, async (req, res) => {
    try {
      const polls = await storage.getPolls(false); // Get all polls
      
      const detailedPolls = await Promise.all(polls.map(async p => {
        const results = await storage.getPollResults(p.id);
        const totalVotes = results.reduce((sum, r) => sum + r.count, 0);
        const voterDetails = await storage.getPollVotesDetails(p.id);
        
        return { 
          ...p, 
          options: typeof p.options === 'string' ? JSON.parse(p.options) : p.options,
          results,
          totalVotes,
          voters: voterDetails
        };
      }));

      res.json(detailedPolls);
    } catch (error) {
      console.error("Get admin polls error:", error);
      res.status(500).json({ error: "Failed to get admin polls" });
    }
  });

  // Get poll with results
  app.get("/api/polls/:id", async (req, res) => {
    try {
      const poll = await storage.getPollById(req.params.id);
      if (!poll) return res.status(404).json({ error: "Poll not found" });

      const results = await storage.getPollResults(poll.id);

      // Check if user has voted
      let userVote: number | null = null;
      const token = req.cookies.authToken;
      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          const vote = await storage.getUserVote(poll.id, payload.userId);
          if (vote) userVote = vote.optionIndex;
        }
      }

      res.json({ ...poll, options: JSON.parse(poll.options), results, userVote });
    } catch (error) {
      console.error("Get poll error:", error);
      res.status(500).json({ error: "Failed to get poll" });
    }
  });

  // Vote on poll
  app.post("/api/polls/:id/vote", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { optionIndex } = req.body;
      if (typeof optionIndex !== 'number') {
        return res.status(400).json({ error: "Invalid option" });
      }

      await storage.votePoll(req.params.id, payload.userId, optionIndex);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Vote poll error:", error);
      res.status(400).json({ error: error.message || "Failed to vote" });
    }
  });

  // Admin: Create poll
  app.post("/api/admin/polls", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      // TODO: Add admin check here
      const { question, options, endDate, featured } = req.body;

      if (!question || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: "Invalid poll data" });
      }

      const poll = await storage.createPoll({
        question,
        options: JSON.stringify(options),
        createdBy: payload.userId,
        endDate: endDate ? new Date(endDate) : null,
        active: true,
        featured: featured || false,
      });

      res.status(201).json(poll);
    } catch (error) {
      console.error("Create poll error:", error);
      res.status(500).json({ error: "Failed to create poll" });
    }
  });

  // ============================================
  // BADGES ROUTES
  // ============================================

  // Get all badges
  // Get all badges
  app.get("/api/badges", requireApiKey, async (req, res) => {
    try {
      const badges = await storage.getBadges();

      // Restrict external API users to 1 item per request
      if ((req as any).apiKey) {
        return res.json(badges.slice(0, 1));
      }

      res.json(badges);
    } catch (error) {
      console.error("Get badges error:", error);
      res.status(500).json({ error: "Failed to get badges" });
    }
  });

  // Get user badges
  app.get("/api/users/:userId/badges", async (req, res) => {
    try {
      const userId = req.params.userId;
      const userBadges = await storage.getUserBadges(userId);
      res.json(userBadges);
    } catch (error) {
      console.error("Get user badges error:", error);
      res.status(500).json({ error: "Failed to get user badges" });
    }
  });

  // Equip Badge Route
  app.post("/api/user/equip-badge", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { badgeId, equipped } = req.body;
      const userId = payload.userId;

      // 1. Verify user owns the badge
      const userBadges = await storage.getUserBadges(userId);
      const userBadge = userBadges.find(ub => ub.badgeId === badgeId);

      if (!userBadge) {
        return res.status(403).json({ error: "You don't own this badge" });
      }

      // 2. If equipping, check limit (Max 3)
      if (equipped) {
        // Enforce Max 1 Skin Limit
        if (userBadge.badge.category === 'skin' || userBadge.badge.name.includes('Skin')) {
          const currentlyEquippedSkins = userBadges.filter(ub =>
            ub.equipped && (ub.badge.category === 'skin' || ub.badge.name.includes('Skin'))
          );

          if (!userBadge.equipped && currentlyEquippedSkins.length >= 1) {
            return res.status(400).json({ error: "You can only equip 1 skin at a time." });
          }
        }
        const currentlyEquipped = userBadges.filter(ub =>
          ub.equipped &&
          ub.badge.category !== 'skin' &&
          !ub.badge.name.includes('Skin') &&
          ub.badge.category !== 'theme' &&
          ub.badge.category !== 'feature'
        );

        // Allow if less than 3, OR if we are re-equipping something (though usually frontend sends true only if off)
        // If already equipped, this is a no-op or re-equip, so counting length includes itself if it was already true. 
        // Better to check if it wasn't equipped before.
        if (!userBadge.equipped && currentlyEquipped.length >= 3) {
          // Only enforce limit for non-skin/theme items
          if (userBadge.badge.category !== 'skin' && !userBadge.badge.name.includes('Skin') && userBadge.badge.category !== 'theme' && userBadge.badge.category !== 'feature') {
            return res.status(400).json({ error: "You can only equip up to 3 badges at a time." });
          }
        }
      }

      // 3. Update status
      await storage.updateUserBadgeEquippedStatus(userId, badgeId, equipped);

      // Update cache/user object if necessary? 
      // For now, next profile fetch will get updated badges.

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to toggle badge equip:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Create badge
  app.post("/api/admin/badges", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const badge = await storage.createBadge(req.body);
      res.status(201).json(badge);
    } catch (error) {
      console.error("Create badge error:", error);
      res.status(500).json({ error: "Failed to create badge" });
    }
  });

  // Admin: Update badge
  app.put("/api/admin/badges/:id", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const updated = await storage.updateBadge(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Badge not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update badge error:", error);
      res.status(500).json({ error: "Failed to update badge" });
    }
  });

  // ============================================
  // SCHEDULING ROUTES (Reminders)
  // ============================================

  // Create Reminder
  app.post("/api/reminders", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { contentId, contentType, title, remindAt } = req.body;

      if (!contentId || !contentType || !title || !remindAt) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const reminder = await storage.createReminder({
        userId: payload.userId,
        contentId,
        contentType,
        title,
        remindAt: new Date(remindAt),
      });

      res.status(201).json(reminder);
    } catch (error) {
      console.error("Create reminder error:", error);
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  // Get Reminders
  app.get("/api/reminders", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const reminders = await storage.getReminders(payload.userId);
      res.json(reminders);
    } catch (error) {
      console.error("Get reminders error:", error);
      res.status(500).json({ error: "Failed to get reminders" });
    }
  });

  // Delete Reminder
  app.delete("/api/reminders/:id", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      await storage.deleteReminder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete reminder error:", error);
      res.status(500).json({ error: "Failed to delete reminder" });
    }
  });

  // Get Calendar Events (Mocked + Reminders)
  app.get("/api/calendar", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      // Get user reminders
      const userReminders = await storage.getReminders(payload.userId);

      const events = userReminders.map(r => ({
        id: r.id,
        title: `Reminder: ${r.title}`,
        start: r.remindAt,
        type: "reminder",
        contentId: r.contentId,
        contentType: r.contentType
      }));

      res.json(events);

    } catch (error) {
      console.error("Get calendar error:", error);
      res.status(500).json({ error: "Failed to get calendar" });
    }
  });

  // ============================================
  // CONTENT BY ID ROUTES (for favorites)
  // ============================================

  // Get show by ID (use /api/content/shows to avoid conflict with /api/shows/:slug)
  app.get("/api/content/shows/:id", requireApiKey, async (req, res) => {
    try {
      const { id } = req.params;
      const show = await storage.getShowById(id);
      if (!show) {
        return res.status(404).json({ error: "Show not found" });
      }
      res.json(show);
    } catch (error) {
      console.error("Get show by ID error:", error);
      res.status(500).json({ error: "Failed to get show" });
    }
  });

  // Get movie by ID
  app.get("/api/content/movies/:id", requireApiKey, async (req, res) => {
    try {
      const { id } = req.params;
      const movie = await storage.getMovieById(id);
      if (!movie) {
        return res.status(404).json({ error: "Movie not found" });
      }
      res.json(movie);
    } catch (error) {
      console.error("Get movie by ID error:", error);
      res.status(500).json({ error: "Failed to get movie" });
    }
  });

  // Get anime by ID
  app.get("/api/content/anime/:id", requireApiKey, async (req, res) => {
    try {
      const { id } = req.params;
      const anime = await storage.getAnimeById(id);
      if (!anime) {
        return res.status(404).json({ error: "Anime not found" });
      }
      res.json(anime);
    } catch (error) {
      console.error("Get anime by ID error:", error);
      res.status(500).json({ error: "Failed to get anime" });
    }
  });

  // ============================================
  // API KEY ROUTES
  // ============================================

  // External Availability API (for extension/integrations)
  app.get("/api/external/availability", requireApiKey, async (req, res) => {
    try {
      const { title, year, type } = req.query;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const cleanTitle = (title as string).toLowerCase().trim();
      const targetYear = year ? parseInt(year as string) : null;

      let match = null;
      let url = "";

      // Search logic...
      if (!type || type === 'movie') {
        const movies = await storage.getAllMovies();
        match = movies.find(m =>
          m.title.toLowerCase().includes(cleanTitle) &&
          (!targetYear || Math.abs(m.year - targetYear) <= 1)
        );
        if (match) url = `https://streamvault.live/movie/${match.slug}`;
      }

      if (!match && (!type || type === 'show')) {
        const shows = await storage.getAllShows();
        match = shows.find(s =>
          s.title.toLowerCase().includes(cleanTitle) &&
          (!targetYear || Math.abs(s.year - targetYear) <= 1)
        );
        if (match) url = `https://streamvault.live/show/${match.slug}`;
      }

      if (!match && (!type || type === 'anime')) {
        const animeList = await storage.getAllAnime();
        match = animeList.find(a =>
          a.title.toLowerCase().includes(cleanTitle) &&
          (!targetYear || Math.abs(a.year - targetYear) <= 1)
        );
        if (match) url = `https://streamvault.live/anime/${match.slug}`;
      }

      if (match) {
        res.json({
          available: true,
          title: (match as any).title,
          year: (match as any).year,
          type: (match as any).totalSeasons ? 'show' : 'movie',
          url: url,
          poster: (match as any).posterUrl
        });
      } else {
        res.json({ available: false });
      }

    } catch (error) {
      console.error("[External API] Error checking availability:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's API keys
  app.get("/api/keys", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const keys = await storage.getApiKeysByUserId(payload.userId);
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      // Don't return the full key for security, just the first/last chars
      // Also normalize stale counters for accurate display
      const maskedKeys = keys.map(k => {
        const lastDayReset = new Date(k.lastDayReset);
        const lastMinuteReset = new Date(k.lastMinuteReset);

        return {
          ...k,
          key: k.key.slice(0, 7) + '...' + k.key.slice(-4),
          // Reset daily count if it's a new day
          requestsToday: lastDayReset < todayStart ? 0 : k.requestsToday,
          // Reset minute count if over a minute has passed
          requestsThisMinute: lastMinuteReset < oneMinuteAgo ? 0 : k.requestsThisMinute,
        };
      });
      res.json(maskedKeys);
    } catch (error) {
      console.error("Get API keys error:", error);
      res.status(500).json({ error: "Failed to get API keys" });
    }
  });

  // Create new API key
  app.post("/api/keys", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length < 1) {
        return res.status(400).json({ error: "API key name is required" });
      }

      // Limit to 5 keys per user
      const existingKeys = await storage.getApiKeysByUserId(payload.userId);
      if (existingKeys.length >= 5) {
        return res.status(400).json({ error: "Maximum 5 API keys per user" });
      }

      const apiKey = await storage.createApiKey(payload.userId, name.trim());
      // Return full key only on creation
      res.status(201).json(apiKey);
    } catch (error) {
      console.error("Create API key error:", error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  // Delete API key
  app.delete("/api/keys/:id", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { id } = req.params;
      await storage.deleteApiKey(id, payload.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete API key error:", error);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // Upgrade API key tier
  app.post("/api/keys/:id/upgrade", async (req, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { id } = req.params;
      const { tier } = req.body;

      if (!tier || (tier !== 'pro' && tier !== 'enterprise')) {
        return res.status(400).json({ error: "Invalid tier. Must be 'pro' or 'enterprise'" });
      }

      const updatedKey = await storage.upgradeApiKey(payload.userId, id, tier);
      res.json(updatedKey);
    } catch (error: any) {
      console.error("Upgrade API key error:", error);
      res.status(400).json({ error: error.message || "Failed to upgrade API key" });
    }
  });

  // ============================================
  // NOTIFICATIONS ROUTES
  // ============================================

  // Get notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const notifications = await storage.getNotifications(payload.userId);
      const unreadCount = await storage.getUnreadNotificationCount(payload.userId);

      res.json({ notifications, unreadCount });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      await storage.markAllNotificationsRead(payload.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      await storage.deleteNotification(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // ============================================
  // DIRECT MESSAGES ROUTES
  // ============================================


  // Get Person Details (Cast Profile)
  app.get("/api/person/:name", requireApiKey, async (req, res) => {
    try {
      const { name } = req.params;
      const TMDB_API_KEY = process.env.TMDB_API_KEY;

      if (!TMDB_API_KEY) {
        return res.status(500).json({ error: "TMDB API key not configured" });
      }

      // 1. Search for person to get ID
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`
      );
      const searchData = await searchRes.json();

      if (!searchData.results || searchData.results.length === 0) {
        return res.status(404).json({ error: "Person not found" });
      }

      const personId = searchData.results[0].id;

      // 2. Fetch person details with credits and external IDs
      const detailsRes = await fetch(
        `https://api.themoviedb.org/3/person/${personId}?api_key=${TMDB_API_KEY}&append_to_response=combined_credits,external_ids`
      );
      const personData = await detailsRes.json();

      // 3. Format response
      const credits = personData.combined_credits?.cast || [];

      // Sort credits by popularity (most famous roles first)
      credits.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

      // Filter out items with no poster/backdrop to keep UI clean
      const validCredits = credits.filter((c: any) => c.poster_path || c.backdrop_path);

      const response = {
        id: personData.id,
        name: personData.name,
        biography: personData.biography,
        birthday: personData.birthday,
        deathday: personData.deathday,
        placeOfBirth: personData.place_of_birth,
        profileUrl: personData.profile_path
          ? `https://image.tmdb.org/t/p/original${personData.profile_path}`
          : null,
        knownForDepartment: personData.known_for_department,
        socials: {
          instagram: personData.external_ids?.instagram_id,
          twitter: personData.external_ids?.twitter_id,
          facebook: personData.external_ids?.facebook_id,
          imdb: personData.external_ids?.imdb_id,
        },
        credits: validCredits.map((c: any) => ({
          id: c.id,
          title: c.title || c.name,
          mediaType: c.media_type, // 'movie' or 'tv'
          date: c.release_date || c.first_air_date,
          posterUrl: c.poster_path
            ? `https://image.tmdb.org/t/p/w500${c.poster_path}`
            : null,
          character: c.character,
          voteAverage: c.vote_average,
          overview: c.overview,
          backdropUrl: c.backdrop_path
            ? `https://image.tmdb.org/t/p/w780${c.backdrop_path}`
            : null,
        })).slice(0, 50) // Limit to top 50 roles
      };

      res.json(response);

    } catch (error) {
      console.error("Person details error:", error);
      res.status(500).json({ error: "Failed to fetch person details" });
    }
  });

  // Get Trending Content (Synced with TMDB)
  app.get("/api/trending", requireApiKey, async (req, res) => {
    try {
      const TMDB_API_KEY = process.env.TMDB_API_KEY;
      let trendingItems: (Show | Movie | Anime)[] = [];

      // 1. If TMDB Key exists, fetch real trending data
      if (TMDB_API_KEY) {
        try {
          const tmdbResponse = await fetch(
            `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}`
          );
          const tmdbData = await tmdbResponse.json();

          if (tmdbData.results) {
            const trendingTitles = new Set(tmdbData.results.map((item: any) =>
              (item.title || item.name || "").toLowerCase()
            ));

            // Combine and randomize if needed (or just trending)
            // For now, let's just use the TMDB titles to filter our local content "roughly"
            // or just return all content sorted by 'trending' if we had that flag.
            // Simplified: If we found matches in local DB for trending titles, return those.

            const allShows = await storage.getAllShows();
            const allMovies = await storage.getAllMovies();
            const allAnime = await storage.getAllAnime();
            const allContent = [...allShows, ...allMovies, ...allAnime];

            const matchedContent = allContent.filter(item =>
              trendingTitles.has(item.title.toLowerCase())
            );

            trendingItems = matchedContent;
          }
        } catch (e) {
          console.error("Failed to fetch TMDB trending:", e);
        }
      }

      // Fallback: Return random selection if no TMDB or empty
      if (trendingItems.length === 0) {
        const allShows = await storage.getAllShows();
        const allMovies = await storage.getAllMovies();
        const existingIds = new Set(trendingItems.map(i => i.id));
        localTrending.forEach(item => {
          if (!existingIds.has(item.id)) {
            trendingItems.push(item);
          }
        });
      }

      // Restrict external API users to 1 item
      if ((req as any).apiKey) {
        return res.json(trendingItems.slice(0, 1));
      }
      res.json(trendingItems.slice(0, 20));
    } catch (error) {
      console.error("Get trending error:", error);
      res.status(500).json({ error: "Failed to get trending content" });
    }
  });

  // Get Recommendations
  // Get unread message counts per friend
  app.get("/api/messages/unread-counts", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const conversations = await storage.getConversations(payload.userId);
      const unreadCounts: Record<string, number> = {};
      for (const conv of conversations) {
        if (conv.unreadCount > 0) {
          unreadCounts[conv.friendId] = conv.unreadCount;
        }
      }

      res.json(unreadCounts);
    } catch (error) {
      console.error("Get unread counts error:", error);
      res.status(500).json({ error: "Failed to get unread counts" });
    }
  });

  // Get conversations
  app.get("/api/messages/conversations", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const conversations = await storage.getConversations(payload.userId);

      // Enrich with friend info
      const enrichedConversations = await Promise.all(conversations.map(async (c) => {
        const friend = await storage.getUserById(c.friendId);
        return {
          ...c,
          friend: friend ? {
            id: friend.id,
            username: friend.username,
            avatarUrl: friend.avatarUrl,
            equippedBadge: friend.equippedBadge,
            lastActive: friend.lastActive,
          } : null,
        };
      }));

      res.json(enrichedConversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Get messages with a friend
  app.get("/api/messages/:friendId", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { friendId } = req.params;

      // Check if they are friends
      const areFriends = await storage.areFriends(payload.userId, friendId);
      if (!areFriends) {
        return res.status(403).json({ error: "You can only message friends" });
      }

      const messages = await storage.getMessages(payload.userId, friendId);

      // Mark messages as read
      await storage.markMessagesRead(payload.userId, friendId);

      // Also mark DM notifications from this friend as read
      await storage.markDmNotificationsRead(payload.userId, friendId);

      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Get User Profile (Public)
  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Parse JSON fields
      let socialLinks = null;
      let favorites = null;
      try {
        socialLinks = user.socialLinks ? JSON.parse(user.socialLinks as string) : null;
      } catch (e) { }
      try {
        favorites = user.favorites ? JSON.parse(user.favorites as string) : null;
      } catch (e) { }

      res.json({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        socialLinks,
        favorites,
        xp: user.xp,
        level: user.level,
        badges: user.badges // Return badges so frontend can display them
      });
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({ error: "Failed to get user profile" });
    }
  });

  // Get unread message counts per friend
  app.get("/api/messages/unread-counts", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const counts = await storage.getUnreadCounts(payload.userId);
      res.json(counts);
    } catch (error) {
      console.error("Get unread counts error:", error);
      res.status(500).json({ error: "Failed to get unread counts" });
    }
  });

  // Send message (with optional GIF attachment)
  app.post("/api/messages/:friendId", async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { friendId } = req.params;
      const { message, attachmentType, attachmentUrl, replyToId } = req.body;

      // Allow empty message if there's an attachment
      if ((!message || !message.trim()) && !attachmentUrl) {
        return res.status(400).json({ error: "Message or attachment required" });
      }

      // Check if they are friends
      const areFriends = await storage.areFriends(payload.userId, friendId);
      if (!areFriends) {
        return res.status(403).json({ error: "You can only message friends" });
      }

      const dm = await storage.sendMessage(
        payload.userId,
        friendId,
        message?.trim() || '',
        attachmentType,
        attachmentUrl,
        undefined, // attachmentFilename
        undefined, // attachmentSize
        undefined, // attachmentMimeType
        undefined, // audioDuration
        replyToId
      );

      // Create notification for recipient
      const currentUser = await storage.getUserById(payload.userId);
      const notificationMessage = attachmentType === 'gif'
        ? `${currentUser?.username || 'Someone'} sent a GIF`
        : `${currentUser?.username || 'Someone'}: ${message?.substring(0, 50) || ''}${message?.length > 50 ? '...' : ''}`;

      await storage.createNotification({
        userId: friendId,
        type: 'dm',
        title: 'New Message',
        message: notificationMessage,
        data: { fromUserId: payload.userId },
        read: false,
      });

      // Emit socket event for real-time updates
      emitDMReceived(friendId, {
        ...dm,
        fromUserId: payload.userId,
      });

      res.status(201).json(dm);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Send voice message
  app.post("/api/messages/:friendId/voice", upload.single('audio'), async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { friendId } = req.params;
      const duration = parseInt(req.body.duration) || 0;
      const replyToId = req.body.replyToId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Check if they are friends
      const areFriends = await storage.areFriends(payload.userId, friendId);
      if (!areFriends) {
        return res.status(403).json({ error: "You can only message friends" });
      }

      const audioUrl = `/uploads/dm-attachments/${file.filename}`;
      const dm = await storage.sendMessage(
        payload.userId,
        friendId,
        '',
        'audio',
        audioUrl,
        file.originalname,
        file.size,
        file.mimetype,
        duration,
        replyToId
      );

      // Create notification
      const currentUser = await storage.getUserById(payload.userId);
      await storage.createNotification({
        userId: friendId,
        type: 'dm',
        title: 'Voice Message',
        message: `${currentUser?.username || 'Someone'} sent a voice message`,
        data: { fromUserId: payload.userId },
        read: false,
      });

      // Emit socket event for real-time updates
      emitDMReceived(friendId, {
        ...dm,
        fromUserId: payload.userId,
      });

      res.status(201).json(dm);
    } catch (error) {
      console.error("Send voice message error:", error);
      res.status(500).json({ error: "Failed to send voice message" });
    }
  });

  // Send file attachment
  app.post("/api/messages/:friendId/attachment", upload.single('file'), async (req, res) => {
    try {
      const token = req.cookies.authToken;
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { friendId } = req.params;
      const replyToId = req.body.replyToId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Check if they are friends
      const areFriends = await storage.areFriends(payload.userId, friendId);
      if (!areFriends) {
        return res.status(403).json({ error: "You can only message friends" });
      }

      // Determine attachment type from mime type
      let attachmentType: 'image' | 'video' | 'audio' | 'file' = 'file';
      if (file.mimetype.startsWith('image/')) attachmentType = 'image';
      else if (file.mimetype.startsWith('video/')) attachmentType = 'video';
      else if (file.mimetype.startsWith('audio/')) attachmentType = 'audio';

      const fileUrl = `/uploads/dm-attachments/${file.filename}`;
      const dm = await storage.sendMessage(
        payload.userId,
        friendId,
        '',
        attachmentType,
        fileUrl,
        file.originalname,
        file.size,
        file.mimetype,
        undefined, // audioDuration
        replyToId
      );

      // Create notification
      const currentUser = await storage.getUserById(payload.userId);
      await storage.createNotification({
        userId: friendId,
        type: 'dm',
        title: 'New Attachment',
        message: `${currentUser?.username || 'Someone'} sent a ${attachmentType}`,
        data: { fromUserId: payload.userId },
        read: false,
      });

      // Emit socket event for real-time updates
      emitDMReceived(friendId, {
        ...dm,
        fromUserId: payload.userId,
      });


      res.status(201).json(dm);
    } catch (error) {
      console.error("Send attachment error:", error);
      res.status(500).json({ error: "Failed to send attachment" });
    }
  });

  // Add/Toggle Reaction
  app.post("/api/messages/:messageId/reactions", async (req, res) => {
    try {
      const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji) return res.status(400).json({ error: "Emoji is required" });

      const dm = await storage.addReaction(messageId, payload.userId, emoji);

      // Notify relevant parties via socket
      // Ideally we emit 'dm:reaction' here too if not already handled by storage or social logic
      // Since social.ts handles the socket event 'dm:reaction', this API is mostly for non-socket clients or persistence.
      // But we should emit the update to active sockets so they see the reaction immediately.

      const recipientId = dm.fromUserId === payload.userId ? dm.toUserId : dm.fromUserId;
      emitDMReceived(recipientId, dm); // This emits 'dm:received' which might update the whole message
      // Also to self
      emitDMReceived(payload.userId, dm);

      res.json(dm);
    } catch (error) {
      console.error("Reaction error:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  // Link Preview
  app.post("/api/preview-link", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });

      const preview = await getLinkPreview(url);
      res.json(preview);
    } catch (error) {
      console.error("Link preview error:", error);
      res.status(500).json({ error: "Failed to fetch link preview" });
    }
  });

  // Domain-masked download STREAMING proxy.
  // Usage: /api/dl?u=<base64-encoded-url>&name=<optional-filename>
  // Fetches the upstream file (archive.org / google drive) and pipes the bytes
  // through our server to the client. The browser only ever sees streamvault.*
  // as the host — the real URL never appears in the address bar or network tab.
  // Supports HTTP Range requests so resume / seek / download managers work.
  // Aborts the upstream fetch if the client disconnects to save bandwidth.
  app.get("/api/dl", async (req: Request, res: Response) => {
    const encodedUrl = req.query.u as string;
    const filename = (req.query.name as string) || "";

    if (!encodedUrl) {
      return res.status(400).send("Missing url parameter");
    }

    // Decode base64url URL
    let targetUrl: string;
    try {
      const normalized = encodedUrl.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
      targetUrl = Buffer.from(padded, "base64").toString("utf-8");
    } catch {
      return res.status(400).send("Invalid url encoding");
    }

    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return res.status(400).send("Invalid url");
    }

    // Whitelist allowed hosts to prevent SSRF / open-proxy abuse
    const allowedHosts = [
      "archive.org",
      "www.archive.org",
      "ia800000.us.archive.org",
      "drive.google.com",
      "docs.google.com",
      "googleusercontent.com",
      "googleapis.com",
    ];
    const hostAllowed = allowedHosts.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith("." + h)
    );
    if (!hostAllowed) {
      console.warn(`🚫 /api/dl blocked untrusted host: ${parsed.hostname}`);
      return res.status(403).send("Host not allowed");
    }

    // Abort upstream fetch if the client disconnects (saves bandwidth)
    const abortController = new AbortController();
    const onClientAbort = () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    };
    req.on("close", onClientAbort);

    try {
      // Build upstream request headers — forward Range for partial-content support
      const upstreamHeaders: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Linux; Node.js StreamVault Proxy) AppleWebKit/537.36",
        Accept: "*/*",
      };
      if (req.headers.range) {
        upstreamHeaders["Range"] = String(req.headers.range);
      }
      if (req.headers["if-range"]) {
        upstreamHeaders["If-Range"] = String(req.headers["if-range"]);
      }

      const upstream = await fetch(targetUrl, {
        method: "GET",
        headers: upstreamHeaders,
        redirect: "follow",
        signal: abortController.signal,
      });

      // 200 OK or 206 Partial Content are both success cases
      if (!upstream.ok && upstream.status !== 206) {
        console.warn(
          `/api/dl upstream returned ${upstream.status} for ${parsed.hostname}`
        );
        return res
          .status(502)
          .send(`Upstream download failed (${upstream.status})`);
      }

      // Mirror upstream status (200 or 206)
      res.status(upstream.status);

      // Forward relevant headers from upstream to client
      const headersToForward = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "last-modified",
        "etag",
        "cache-control",
      ];
      for (const h of headersToForward) {
        const v = upstream.headers.get(h);
        if (v) res.setHeader(h, v);
      }

      // Always set attachment Content-Disposition with our filename (overrides upstream)
      const safeName = filename
        ? filename.replace(/[^\w.\-() ]/g, "_").slice(0, 180)
        : "download";
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeName}"`
      );
      // Explicitly advertise range support (some upstreams don't set this but support it)
      if (!res.getHeader("accept-ranges")) {
        res.setHeader("accept-ranges", "bytes");
      }

      // Stream upstream body -> client
      if (!upstream.body) {
        return res.end();
      }

      const { Readable } = await import("node:stream");
      const nodeStream = Readable.fromWeb(upstream.body as any);

      nodeStream.on("error", (err: any) => {
        if (err?.name === "AbortError") return; // client disconnect — expected
        console.error("/api/dl stream error:", err?.message || err);
        if (!res.headersSent) res.status(500);
        try {
          res.end();
        } catch { }
      });

      nodeStream.pipe(res);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // Client disconnected — nothing to do
        return;
      }
      console.error("/api/dl proxy error:", err?.message || err);
      if (!res.headersSent) {
        res.status(500).send("Download proxy failed");
      }
    } finally {
      req.off("close", onClientAbort);
    }
  });

  // Inline video streaming proxy. Masks archive.org URLs and — critically —
  // because streamvault.live is already behind Cloudflare, the `Cache-Control:
  // public, max-age=86400` header below lets CF cache video chunks at its
  // Mumbai edge. First viewer pays VPS egress; all subsequent viewers of the
  // same chunk are served from Cloudflare's network for free.
  app.get("/api/stream", async (req: Request, res: Response) => {
    // --- Gating: admin-controlled mode + auth check ---
    const mode = getStreamMode();
    if (mode === "direct") {
      // Proxy disabled entirely via admin panel
      return res.status(410).send("Stream proxy is disabled");
    }
    // Require logged-in user so this can't be abused as an open proxy
    const token =
      (req as any).cookies?.authToken ||
      (req.headers.authorization || "").replace("Bearer ", "");
    const authed = token ? verifyToken(token) : null;
    if (!authed) {
      return res.status(401).send("Login required to use streaming proxy");
    }

    const encodedUrl = req.query.u as string;

    if (!encodedUrl) {
      return res.status(400).send("Missing url parameter");
    }

    // Decode base64url URL
    let targetUrl: string;
    try {
      const normalized = encodedUrl.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
      targetUrl = Buffer.from(padded, "base64").toString("utf-8");
    } catch {
      return res.status(400).send("Invalid url encoding");
    }

    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return res.status(400).send("Invalid url");
    }

    // Same whitelist as /api/dl — prevents SSRF / open-proxy abuse
    const allowedHosts = [
      "archive.org",
      "www.archive.org",
      "ia800000.us.archive.org",
      "drive.google.com",
      "docs.google.com",
      "googleusercontent.com",
      "googleapis.com",
    ];
    const hostAllowed = allowedHosts.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith("." + h)
    );
    if (!hostAllowed) {
      console.warn(`🚫 /api/stream blocked untrusted host: ${parsed.hostname}`);
      return res.status(403).send("Host not allowed");
    }

    // Abort upstream fetch if client disconnects (saves bandwidth when user seeks)
    const abortController = new AbortController();
    const onClientAbort = () => {
      if (!res.writableEnded) abortController.abort();
    };
    req.on("close", onClientAbort);

    try {
      const upstreamHeaders: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Linux; Node.js StreamVault Stream) AppleWebKit/537.36",
        Accept: "*/*",
      };
      if (req.headers.range) {
        upstreamHeaders["Range"] = String(req.headers.range);
      }
      if (req.headers["if-range"]) {
        upstreamHeaders["If-Range"] = String(req.headers["if-range"]);
      }

      const upstream = await fetch(targetUrl, {
        method: "GET",
        headers: upstreamHeaders,
        redirect: "follow",
        signal: abortController.signal,
      });

      if (!upstream.ok && upstream.status !== 206) {
        console.warn(
          `/api/stream upstream ${upstream.status} for ${parsed.hostname}`
        );
        return res
          .status(502)
          .send(`Upstream stream failed (${upstream.status})`);
      }

      res.status(upstream.status);

      // Forward headers critical for video playback + seeking
      const headersToForward = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "last-modified",
        "etag",
      ];
      for (const h of headersToForward) {
        const v = upstream.headers.get(h);
        if (v) res.setHeader(h, v);
      }

      // Force inline (do NOT trigger download) + allow seek
      res.setHeader("Content-Disposition", "inline");
      if (!res.getHeader("accept-ranges")) {
        res.setHeader("accept-ranges", "bytes");
      }
      // Caching depends on current mode (admin-switchable):
      //  - "vps-cached": allow Cloudflare + browsers to cache aggressively
      //  - "vps":        tell CF NOT to cache; every byte comes through VPS
      if (mode === "vps-cached") {
        res.setHeader(
          "cache-control",
          "public, max-age=86400, s-maxage=86400, immutable"
        );
      } else {
        res.setHeader("cache-control", "private, no-store");
      }

      if (!upstream.body) {
        return res.end();
      }

      const { Readable } = await import("node:stream");
      const nodeStream = Readable.fromWeb(upstream.body as any);

      nodeStream.on("error", (err: any) => {
        if (err?.name === "AbortError") return;
        console.error("/api/stream stream error:", err?.message || err);
        if (!res.headersSent) res.status(500);
        try {
          res.end();
        } catch { }
      });

      nodeStream.pipe(res);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("/api/stream proxy error:", err?.message || err);
      if (!res.headersSent) {
        res.status(500).send("Stream proxy failed");
      }
    } finally {
      req.off("close", onClientAbort);
    }
  });

  // Public probe endpoint for cache diagnostics. Matches the `/api/stream*`
  // Page Rule pattern so Cloudflare treats it identically. Returns a tiny
  // fixed body + Cache-Control matching the current mode. Admin diagnostic
  // hits this (no auth needed) to confirm CF is caching /api/stream-shaped
  // URLs end-to-end.
  app.get("/api/stream-probe", (_req, res) => {
    const mode = getStreamMode();
    res.setHeader("content-type", "application/octet-stream");
    res.setHeader("x-probe-mode", mode);
    // Allow the admin diagnostic page (loaded on one domain) to read CF
    // response headers when testing another domain.
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader(
      "access-control-expose-headers",
      "cf-cache-status, cf-ray, cache-control, server, cf-mitigated, x-probe-mode"
    );
    if (mode === "vps-cached") {
      res.setHeader(
        "cache-control",
        "public, max-age=86400, s-maxage=86400, immutable"
      );
    } else {
      res.setHeader("cache-control", "private, no-store");
    }
    // 256 bytes of zeros — CF needs a body to cache
    res.end(Buffer.alloc(256));
  });

  // Public endpoint: client reads current mode so it knows whether to request
  // /api/stream at all (anonymous users always get direct regardless).
  app.get("/api/config/stream-mode", (_req, res) => {
    res.setHeader("cache-control", "no-store");
    res.json({ mode: getStreamMode() });
  });

  // Admin: read current stream mode
  app.get("/api/admin/stream-mode", requireAdmin, (_req, res) => {
    res.json({ mode: getStreamMode() });
  });

  // Admin: diagnose whether /api/stream is being cached by Cloudflare.
  // Makes two range requests to the public URL and returns the CF headers.
  app.get("/api/admin/stream-mode/diagnose", requireAdmin, async (req, res) => {
    const testDomain = (req.query.domain as string) || "streamvault.live";
    if (!/^[a-z0-9.-]+$/i.test(testDomain)) {
      return res.status(400).json({ error: "Invalid domain" });
    }

    // Unique nonce per diagnostic run so each run tests a fresh cache key.
    // Both requests in this run share the same nonce = same cache key.
    const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const target = `https://${testDomain}/api/stream-probe?n=${nonce}`;

    const hitOnce = async () => {
      const r = await fetch(target, {
        method: "GET",
        redirect: "manual",
        headers: {
          // Browser-like UA + Accept to bypass Cloudflare Bot Fight Mode
          // challenges on the self-request.
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
        },
      });
      // Read & discard body to let CF complete the response
      try {
        await r.arrayBuffer();
      } catch { /* ignore */ }
      const pick = (h: string) => r.headers.get(h) || null;
      return {
        status: r.status,
        cfCacheStatus: pick("cf-cache-status"),
        cfRay: pick("cf-ray"),
        cacheControl: pick("cache-control"),
        server: pick("server"),
        contentLength: pick("content-length"),
        cfMitigated: pick("cf-mitigated"),
      };
    };

    try {
      const first = await hitOnce();
      // Second request 500ms later — CF needs a moment to populate
      await new Promise((r) => setTimeout(r, 500));
      const second = await hitOnce();

      // Interpret results
      const cfInPath = !!first.cfRay || !!second.cfRay;
      const cacheHeaderOk = (first.cacheControl || "").includes("max-age=");
      const cached =
        second.cfCacheStatus === "HIT" ||
        second.cfCacheStatus === "REVALIDATED";
      const mode = getStreamMode();

      const cfChallenged =
        first.cfMitigated === "challenge" ||
        second.cfMitigated === "challenge" ||
        (first.status === 403 && first.cfRay);

      let verdict: string;
      if (mode !== "vps-cached") {
        verdict = `Currently in "${mode}" mode — switch to "VPS + CF" to test caching.`;
      } else if (cfChallenged) {
        verdict =
          "Cloudflare blocked this test request with a bot challenge. Temporarily disable 'Bot Fight Mode' under Security → Bots in CF dashboard, or add a WAF skip rule for /api/stream*. CF is definitely in the path (cf-ray present).";
      } else if (!cfInPath) {
        verdict =
          "Cloudflare does NOT appear to be in front of this domain. Check that the DNS record is proxied (orange cloud).";
      } else if (!cacheHeaderOk) {
        verdict =
          "Server is not sending Cache-Control with max-age. This shouldn't happen in vps-cached mode — re-check server logs.";
      } else if (second.cfCacheStatus === "DYNAMIC") {
        verdict =
          "CF received the cache header but is NOT caching. Page Rule likely missing or URL pattern doesn't match.";
      } else if (cached) {
        verdict = `✅ Caching works. Second request was ${second.cfCacheStatus}.`;
      } else {
        verdict = `CF is caching-eligible but second request was ${second.cfCacheStatus}. Try again in a moment — CF needs time to replicate to edge.`;
      }

      res.json({
        mode,
        domain: testDomain,
        cfInPath,
        cacheHeaderOk,
        cached,
        verdict,
        first,
        second,
      });
    } catch (err: any) {
      res.status(500).json({
        error: "Diagnostic request failed",
        details: err?.message || String(err),
      });
    }
  });

  // Admin: switch stream mode instantly (no redeploy)
  app.post("/api/admin/stream-mode", requireAdmin, (req, res) => {
    const { mode } = req.body || {};
    if (!isValidStreamMode(mode)) {
      return res
        .status(400)
        .json({ error: "mode must be 'direct', 'vps', or 'vps-cached'" });
    }
    const newMode = setStreamMode(mode as StreamMode);
    console.log(`[admin] stream mode changed to: ${newMode}`);
    res.json({ mode: newMode });
  });

  // Translate text (for Watch Together chat translation)
  app.post("/api/translate", async (req, res) => {
    try {
      const { texts, targetLang } = req.body;

      if (!targetLang) return res.status(400).json({ error: "targetLang is required" });

      // Single text
      if (typeof texts === 'string') {
        const translated = await translateText(texts, targetLang);
        return res.json({ translated });
      }

      // Batch texts (array)
      if (Array.isArray(texts) && texts.length > 0) {
        // Limit batch size to prevent abuse
        const batch = texts.slice(0, 50);
        const translated = await translateBatch(batch, targetLang);
        return res.json({ translated });
      }

      return res.status(400).json({ error: "texts must be a string or array" });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ error: "Translation failed" });
    }
  });

  // Get all shows (requires API key for external access)
  // Get all shows (requires API key for external access)
  app.get("/api/shows", requireApiKey, async (req, res) => {
    try {
      const shows = await storage.getAllShows();
      // Restrict external API users to 1 item per request
      if ((req as any).apiKey) {
        return res.json(shows.slice(0, 1));
      }
      res.json(shows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shows" });
    }
  });

  // Admin Search users
  app.get("/api/admin/users/search", requireAdmin, async (req, res) => {
    try {
      const query = req.query.query as string || req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query required" });
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
          ...u,
          badges: equipped // Return array of equipped badges
        };
      }));

      res.json(enhancedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users/all", requireAdmin, async (req, res) => {
    try {
      const usersList = await storage.getAllUsers();
      res.json(usersList);
    } catch (error) {
      console.error("Failed to fetch all users:", error);
      res.status(500).json({ error: "Failed to fetch all users" });
    }
  });

  // Admin: Gift coins to multiple users
  app.post("/api/admin/users/gift", requireAdmin, async (req, res) => {
    try {
      const { userIds, amount, message, tag } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "userIds array is required" });
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "A valid positive amount is required" });
      }
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "A valid message is required" });
      }

      for (const userId of userIds) {
        // 1. Add coins to the user
        await storage.updateUserCoins(userId, amount);

        // 2. Create coin transaction record
        await storage.createCoinTransaction({
          userId,
          amount,
          type: "gift",
          description: tag || "Admin Gift",
        });

        // 3. Send notification with link to wallet
        await storage.createNotification({
          userId,
          type: 'admin_gift',
          title: 'You received a gift!',
          message: message,
          data: { link: '/wallet', amount, isGift: true },
          read: false,
        });
      }

      res.json({ success: true, count: userIds.length });
    } catch (error) {
      console.error("Failed to gift coins:", error);
      res.status(500).json({ error: "Failed to process gifts" });
    }
  });

  // Search shows
  app.get("/api/shows/search", requireApiKey, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query required" });
      }

      const shows = await storage.searchShows(query);
      if ((req as any).apiKey) {
        return res.json(shows.slice(0, 1));
      }
      res.json(shows);
    } catch (error) {
      res.status(500).json({ error: "Failed to search shows" });
    }
  });

  // Get show by slug
  app.get("/api/shows/:slug", requireApiKey, async (req, res) => {
    try {
      const { slug } = req.params;
      const show = await storage.getShowBySlug(slug);

      if (!show) {
        return res.status(404).json({ error: "Show not found" });
      }

      res.json(show);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch show" });
    }
  });

  // Get all episodes (for admin)
  app.get("/api/all-episodes", requireAdmin, async (_req, res) => {
    try {
      const episodes = await storage.getAllEpisodes();
      res.json(episodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all episodes" });
    }
  });

  // Get episodes by show ID
  app.get("/api/episodes/:showId", requireApiKey, async (req, res) => {
    try {
      const { showId } = req.params;
      const episodes = await storage.getEpisodesByShowId(showId);
      if ((req as any).apiKey) {
        return res.json(episodes.slice(0, 1));
      }
      res.json(episodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch episodes" });
    }
  });

  // Movie routes
  // Get all movies (requires API key for external access)
  // Get all movies (requires API key for external access)
  app.get("/api/movies", requireApiKey, async (req, res) => {
    try {
      const movies = await storage.getAllMovies();
      // Restrict external API users to 1 item per request
      if ((req as any).apiKey) {
        return res.json(movies.slice(0, 1));
      }
      res.json(movies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch movies" });
    }
  });

  // Search movies
  app.get("/api/movies/search", requireApiKey, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter required" });
      }
      const movies = await storage.searchMovies(query);
      if ((req as any).apiKey) {
        return res.json(movies.slice(0, 1));
      }
      res.json(movies);
    } catch (error) {
      res.status(500).json({ error: "Failed to search movies" });
    }
  });

  // Get movie by slug
  app.get("/api/movies/:slug", requireApiKey, async (req, res) => {
    try {
      const movie = await storage.getMovieBySlug(req.params.slug);
      if (!movie) {
        return res.status(404).json({ error: "Movie not found" });
      }
      res.json(movie);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch movie" });
    }
  });

  // Anime routes
  // Get all anime (requires API key for external access)
  // Get all anime (requires API key for external access)
  app.get("/api/anime", requireApiKey, async (req, res) => {
    try {
      const anime = await storage.getAllAnime();
      // Restrict external API users to 1 item per request
      if ((req as any).apiKey) {
        return res.json(anime.slice(0, 1));
      }
      res.json(anime);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch anime" });
    }
  });

  // Search anime
  app.get("/api/anime/search", requireApiKey, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter required" });
      }
      const anime = await storage.searchAnime(query);
      if ((req as any).apiKey) {
        return res.json(anime.slice(0, 1));
      }
      res.json(anime);
    } catch (error) {
      res.status(500).json({ error: "Failed to search anime" });
    }
  });

  // Get anime by slug
  app.get("/api/anime/:slug", requireApiKey, async (req, res) => {
    try {
      const anime = await storage.getAnimeBySlug(req.params.slug);
      if (!anime) {
        return res.status(404).json({ error: "Anime not found" });
      }
      res.json(anime);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch anime" });
    }
  });

  // Get all anime episodes (for admin)
  app.get("/api/all-anime-episodes", requireAdmin, async (_req, res) => {
    try {
      const episodes = await storage.getAllAnimeEpisodes();
      res.json(episodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all anime episodes" });
    }
  });

  // Get anime episodes by anime ID
  app.get("/api/anime-episodes/:animeId", requireApiKey, async (req, res) => {
    try {
      const { animeId } = req.params;
      const episodes = await storage.getAnimeEpisodesByAnimeId(animeId);
      if ((req as any).apiKey) {
        return res.json(episodes.slice(0, 1));
      }
      res.json(episodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch anime episodes" });
    }
  });

  // Get all categories
  app.get("/api/categories", requireApiKey, async (_req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Watch Together Rooms API
  app.get("/api/watch-rooms", (req, res) => {
    try {
      const rooms = getActiveRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch watch rooms" });
    }
  });

  // Watchlist endpoints
  app.get("/api/watchlist", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const watchlist = await storage.getWatchlist(sessionId);
      res.json(watchlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const item = watchlistSchema.parse(req.body);
      const entry = await storage.addToWatchlist(sessionId, item);
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid watchlist item", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/watchlist/:showId", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const { showId } = req.params;
      await storage.removeFromWatchlist(sessionId, showId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  app.delete("/api/watchlist/movie/:movieId", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const { movieId } = req.params;
      await storage.removeFromWatchlist(sessionId, movieId, true);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  // Viewing progress endpoints with Auth Support
  const getProgressKey = (req: Request): string => {
    // Check for auth token first
    const token = (req as any).cookies?.authToken;
    if (token) {
      // We need to import verifyToken or use a shared helper. 
      // Assuming verifyToken is imported from ./auth or similar scope
      // Since verifyToken is used in this file (e.g. comment creation), we can use it.
      try {
        const payload = verifyToken(token);
        if (payload && payload.userId) {
          return `user:${payload.userId}`;
        }
      } catch (e) {
        // invalid token, fall back to session
      }
    }
    return getSessionId(req);
  };

  app.get("/api/progress", async (req, res) => {
    try {
      const key = getProgressKey(req);
      const progress = await storage.getViewingProgress(key);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch viewing progress" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    try {
      const key = getProgressKey(req);
      const progress = viewingProgressSchema.parse(req.body);

      // If user is authenticated, we might want to merge guest progress? 
      // For now, simpler is better: just save to current key.
      const entry = await storage.updateViewingProgress(key, progress);

      // Check achievements if user is logged in
      if (key.startsWith("user:")) {
        const userId = key.split(":")[1];
        await checkAndAwardAchievements(userId);

        // Log "watch_start" activity if near the beginning (e.g. < 20 seconds) 
        // AND this is likely a new session (we don't have a perfect check for "new session" without more state, 
        // but this heuristic covers the "I just started watching" case).
        if (progress.progress > 0 && progress.progress < 20) {
          try {
            let entityId = "";
            let entityType = "";
            let title = "";
            let subTitle = "";
            let slug = "";
            let posterUrl = "";
            let backdropUrl = "";

            if (progress.movieId) {
              const movie = await storage.getMovieById(progress.movieId);
              if (movie) {
                entityId = movie.id;
                entityType = "movie";
                title = movie.title;
                slug = movie.slug;
                posterUrl = movie.posterUrl;
                backdropUrl = movie.backdropUrl;
              }
            } else if (progress.showId && progress.episodeId) {
              const show = await storage.getShowById(progress.showId);
              // We could fetch episode too if needed, but show title is most important
              entityId = progress.showId;
              entityType = "show";
              title = show?.title || "Unknown Show";
              slug = show?.slug || "";
              posterUrl = show?.posterUrl || "";
              backdropUrl = show?.backdropUrl || "";
              if (progress.season && progress.episodeNumber) {
                subTitle = `S${progress.season} E${progress.episodeNumber}`;
              }
            } else if (progress.animeId) {
              const anime = await storage.getAnimeById(progress.animeId);
              if (anime) {
                entityId = anime.id;
                entityType = "anime";
                title = anime.title;
                slug = anime.slug;
                posterUrl = anime.posterUrl;
                backdropUrl = anime.backdropUrl;
                if (progress.season && progress.episodeNumber) {
                  subTitle = `S${progress.season} E${progress.episodeNumber}`;
                }
              }
            }

            if (entityId && title) {
              // Check if we recently logged this to avoid spamming
              // We can query recent activities to be sure.
              const activities = await storage.getActivities(20); // Check last 20 activities
              const recentLog = activities.find(a => {
                if (a.userId !== userId) return false;
                if (a.type !== 'watch_start') return false;

                // For movies, simple check on entityId (movieId)
                if (entityType === 'movie' && a.entityId === entityId) {
                  return (new Date().getTime() - a.createdAt.getTime() < 30 * 60 * 1000); // 30 mins debounce for movies
                }

                // For shows/anime, check if it's the SAME episode
                if ((entityType === 'show' || entityType === 'anime') && a.entityId === entityId) { // entityId here is showId/animeId
                  try {
                    const meta = JSON.parse(a.metadata || '{}');
                    // If same show AND same episode subTitle -> Debounce (prevent spam)
                    if (meta.episode === subTitle) {
                      return (new Date().getTime() - a.createdAt.getTime() < 20 * 60 * 1000); // 20 mins debounce for same episode
                    }
                    // If different episode (subTitle differs), allow it! (Continuous watching)
                  } catch (e) {
                    return true; // If parse fails, safer to debounce
                  }
                }
                return false;
              });

              if (!recentLog) {
                await logAndBroadcastActivity({
                  userId,
                  type: 'watch_start',
                  entityId,
                  entityType,
                  metadata: JSON.stringify({
                    title: title,
                    episode: subTitle, // S1 E1
                    posterUrl: posterUrl,
                    backdropUrl: backdropUrl,
                    link: entityType === 'movie' ? `/movie/${slug || entityId}` :
                      entityType === 'anime' ? `/anime/${slug || entityId}` :
                        `/show/${slug || entityId}`,
                    // Add generic link fallback
                  })
                });
              }
            }
          } catch (e) {
            console.error("Failed to log watch activity", e);
          }
        }
      }

      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid progress data", details: error.errors });
      }
      console.error("Progress update error:", error);
      res.status(500).json({ error: "Failed to update viewing progress" });
    }
  });

  // ========== RECOMMENDATIONS SYSTEM ==========
  app.get("/api/recommendations", async (req, res) => {
    try {
      const key = getProgressKey(req);
      // Only provide personalized recommendations for logged-in users? 
      // Actually, we can do it for guests too if they have history!

      const history = await storage.getViewingProgress(key);

      // 1. Analyze user preferences
      const genreCounts: Record<string, number> = {};
      const watchedIds = new Set<string>();

      history.forEach(p => {
        if (p.showId) watchedIds.add(p.showId);
        if (p.movieId) watchedIds.add(p.movieId);
        if (p.animeId) watchedIds.add(p.animeId);
      });

      // Fetch all content to analyze genres of watched items and find new ones
      const [allShows, allMovies, allAnime] = await Promise.all([
        storage.getAllShows(),
        storage.getAllMovies(),
        storage.getAllAnime()
      ]);

      // Count genres from watched content
      // Helper to process genres
      const processGenres = (itemStart: any, itemId: string) => {
        // Find the item in full lists
        const item = allShows.find(s => s.id === itemId) ||
          allMovies.find(m => m.id === itemId) ||
          allAnime.find(a => a.id === itemId);

        if (item && item.genres) {
          const genres = item.genres.split(',').map(g => g.trim());
          genres.forEach(g => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        }
      };

      history.forEach(p => {
        processGenres(p, p.showId || p.movieId || p.animeId || '');
      });

      // Get top 3 genres
      const topGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([g]) => g);

      // 2. Score unwatched content
      const scoreItem = (item: Show | Movie | Anime) => {
        if (watchedIds.has(item.id)) return 0; // Already watched

        let score = 0;
        const itemGenres = item.genres.split(',').map((g: string) => g.trim());

        // Genre match bonus
        itemGenres.forEach(g => {
          if (topGenres.includes(g)) score += 2;
          else if (genreCounts[g]) score += 0.5; // Minor bonus for other liked genres
        });

        // Rating bonus (prioritize highly rated content)
        if (item.imdbRating && parseFloat(item.imdbRating) > 7.5) score += 1;
        if (item.trending) score += 1;

        return score;
      };

      // 3. Aggregate and sort
      const recommendations = [
        ...allShows.map(s => ({ ...s, type: 'show', score: scoreItem(s) })),
        ...allMovies.map(m => ({ ...m, type: 'movie', score: scoreItem(m) })),
        ...allAnime.map(a => ({ ...a, type: 'anime', score: scoreItem(a) }))
      ]
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 15); // Return top 15

      res.json(recommendations);
    } catch (error) {
      console.error("Recommendation error:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // ========== ADMIN ROUTES ==========

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password, turnstileToken } = req.body;

      // Verify Turnstile token
      const TEST_SECRET = "1x0000000000000000000000000000000AA";
      const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || TEST_SECRET;
      if (turnstileToken) {
        const formData = new URLSearchParams();
        formData.append("secret", secret);
        formData.append("response", turnstileToken);
        formData.append("remoteip", req.ip || "");
        const tsRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
        const tsData = await tsRes.json() as { success: boolean };
        if (!tsData.success) {
          return res.status(400).json({ success: false, error: "Security verification failed" });
        }
      }

      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Generate a simple token (in production, use JWT or similar)
        const token = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        adminSessions.add(token);

        res.json({
          success: true,
          token,
          message: "Login successful"
        });
      } else {
        res.status(401).json({
          success: false,
          error: "Invalid credentials"
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", async (req, res) => {
    const authToken = req.headers["x-admin-token"] as string;
    if (authToken) {
      adminSessions.delete(authToken);
    }
    res.json({ success: true, message: "Logged out" });
  });

  // Verify admin session
  app.get("/api/admin/verify", async (req, res) => {
    const authToken = req.headers["x-admin-token"] as string;
    const isValid = authToken && adminSessions.has(authToken);
    res.json({ valid: isValid });
  });

  // Add new show
  app.post("/api/admin/shows", requireAdmin, async (req, res) => {
    try {
      const show = await storage.createShow(req.body);
      res.json(show);
    } catch (error) {
      res.status(500).json({ error: "Failed to create show" });
    }
  });

  // Update show
  app.put("/api/admin/shows/:showId", requireAdmin, async (req, res) => {
    try {
      const { showId } = req.params;
      console.log("Updating show:", showId, "with data:", req.body);
      const show = await storage.updateShow(showId, req.body);
      console.log("Updated show:", show);
      res.json(show);
    } catch (error: any) {
      console.error("Update show error:", error);
      res.status(500).json({ error: "Failed to update show", details: error.message });
    }
  });

  // Delete show
  app.delete("/api/admin/shows/:showId", requireAdmin, async (req, res) => {
    try {
      const { showId } = req.params;
      await storage.deleteShow(showId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete show" });
    }
  });

  // Delete all shows
  app.delete("/api/admin/shows", requireAdmin, async (req, res) => {
    try {
      const shows = await storage.getAllShows();
      let deleted = 0;

      for (const show of shows) {
        await storage.deleteShow(show.id);
        deleted++;
      }

      console.log(`🗑️ Deleted ${deleted} shows and their episodes`);
      res.json({ success: true, deleted });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete all shows" });
    }
  });

  // Admin movie routes
  // Add new movie
  app.post("/api/admin/movies", requireAdmin, async (req, res) => {
    try {
      const movie = await storage.createMovie(req.body);
      res.json(movie);
    } catch (error) {
      res.status(500).json({ error: "Failed to create movie" });
    }
  });

  // Update movie
  app.put("/api/admin/movies/:movieId", requireAdmin, async (req, res) => {
    try {
      const { movieId } = req.params;
      const movie = await storage.updateMovie(movieId, req.body);
      res.json(movie);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update movie", details: error.message });
    }
  });

  // Delete movie
  app.delete("/api/admin/movies/:movieId", requireAdmin, async (req, res) => {
    try {
      const { movieId } = req.params;
      await storage.deleteMovie(movieId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete movie" });
    }
  });


  // Admin anime routes
  // Add new anime
  app.post("/api/admin/anime", requireAdmin, async (req, res) => {
    try {
      const anime = await storage.createAnime(req.body);
      res.json(anime);
    } catch (error) {
      res.status(500).json({ error: "Failed to create anime" });
    }
  });

  // ============================================
  // BADGE MANAGEMENT ROUTES
  // ============================================

  // Get all badges
  app.get("/api/badges", async (req, res) => {
    try {
      const badges = await storage.getBadges();
      res.json(badges);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch badges" });
    }
  });

  // Create badge (Admin)
  app.post("/api/admin/badges", requireAdmin, async (req, res) => {
    try {
      const badge = await storage.createBadge(req.body);
      res.json(badge);
    } catch (error) {
      res.status(500).json({ error: "Failed to create badge" });
    }
  });

  // Delete badge (Admin)
  app.delete("/api/admin/badges/:badgeId", requireAdmin, async (req, res) => {
    try {
      const { badgeId } = req.params;
      await storage.deleteBadge(badgeId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete badge" });
    }
  });

  // Award badge to users (Admin)
  app.post("/api/admin/badges/award", requireAdmin, async (req, res) => {
    try {
      const { userIds, badgeId } = req.body;
      if (!userIds || !Array.isArray(userIds) || !badgeId) {
        return res.status(400).json({ error: "Invalid parameters" });
      }

      // Check if badge exists
      const badge = await storage.getBadge(badgeId);
      if (!badge) {
        return res.status(404).json({ error: "Badge not found" });
      }

      let awardedCount = 0;
      for (const userId of userIds) {
        // Check if user already has badge
        const user = await storage.getUserById(userId);
        if (user) {
          const currentBadges = user.badges ? JSON.parse(user.badges as string) : [];
          if (!currentBadges.find((b: any) => b.id === badgeId)) {
            // Use correct storage method
            await storage.awardBadge(userId, badgeId);

            // Notify user
            await storage.createNotification({
              userId,
              type: 'achievement',
              title: 'New Badge Awarded! 🏆',
              message: `You've been awarded the "${badge.name}" badge!`,
              data: {
                badgeId: badge.id,
                name: badge.name,
                imageUrl: badge.imageUrl
              },
              read: false
            });

            awardedCount++;
          }

        }
      }

      res.json({ success: true, awardedCount });
    } catch (error: any) {
      console.error("Award badge error:", error);
      res.status(500).json({ error: "Failed to award badges" });
    }
  });

  // Revoke badge from user (Admin)
  app.post("/api/admin/badges/revoke", requireAdmin, async (req, res) => {
    try {
      const { userId, badgeId } = req.body;
      if (!userId || !badgeId) {
        return res.status(400).json({ error: "UserId and BadgeId required" });
      }

      await storage.revokeBadge(userId, badgeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Revoke badge error:", error);
      res.status(500).json({ error: "Failed to revoke badge" });
    }
  });

  // Update anime
  app.put("/api/admin/anime/:animeId", requireAdmin, async (req, res) => {
    try {
      const { animeId } = req.params;
      const anime = await storage.updateAnime(animeId, req.body);
      res.json(anime);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update anime", details: error.message });
    }
  });

  // Delete anime (and its episodes)
  app.delete("/api/admin/anime/:animeId", requireAdmin, async (req, res) => {
    try {
      const { animeId } = req.params;
      // Delete all anime episodes first
      const episodes = await storage.getAnimeEpisodesByAnimeId(animeId);
      for (const ep of episodes) {
        await storage.deleteAnimeEpisode(ep.id);
      }
      // Then delete the anime
      await storage.deleteAnime(animeId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete anime" });
    }
  });

  // Add anime episode
  app.post("/api/admin/anime-episodes", requireAdmin, async (req, res) => {
    try {
      const episode = await storage.createAnimeEpisode(req.body);
      res.json(episode);
    } catch (error) {
      res.status(500).json({ error: "Failed to create anime episode" });
    }
  });

  // Update anime episode
  app.put("/api/admin/anime-episodes/:episodeId", requireAdmin, async (req, res) => {
    try {
      const { episodeId } = req.params;
      const episode = await storage.updateAnimeEpisode(episodeId, req.body);
      res.json(episode);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update anime episode", details: error.message });
    }
  });

  // Delete anime episode
  app.delete("/api/admin/anime-episodes/:episodeId", requireAdmin, async (req, res) => {
    try {
      const { episodeId } = req.params;
      await storage.deleteAnimeEpisode(episodeId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete anime episode" });
    }
  });

  // Add new episode
  app.post("/api/admin/episodes", requireAdmin, async (req, res) => {
    try {
      const episode = await storage.createEpisode(req.body);
      res.json(episode);
    } catch (error) {
      res.status(500).json({ error: "Failed to create episode" });
    }
  });

  // Bulk add episodes to a show by slug
  app.post("/api/admin/episodes/bulk", requireAdmin, async (req, res) => {
    try {
      const { slug, episodes } = req.body;

      if (!slug || !episodes || !Array.isArray(episodes)) {
        return res.status(400).json({ error: "Slug and episodes array are required" });
      }

      // Find show by slug
      const show = await storage.getShowBySlug(slug);
      if (!show) {
        return res.status(404).json({ error: `Show with slug "${slug}" not found` });
      }

      console.log(`🚀 Adding episodes to: ${show.title}`);

      // Get existing episodes to avoid duplicates
      const existingEpisodes = await storage.getEpisodesByShowId(show.id);
      const existingKeys = new Set(
        existingEpisodes.map(ep => `${ep.season}-${ep.episodeNumber}`)
      );

      let added = 0;
      let skipped = 0;

      for (const ep of episodes) {
        const key = `${ep.season}-${ep.episodeNumber}`;

        if (existingKeys.has(key)) {
          console.log(`   ⏭️  Skipping S${ep.season}E${ep.episodeNumber} (already exists)`);
          skipped++;
          continue;
        }

        // Generate thumbnail from Google Drive if not provided
        let thumbnailUrl = ep.thumbnailUrl;
        if (!thumbnailUrl && ep.googleDriveUrl) {
          const driveIdMatch = ep.googleDriveUrl.match(/\/d\/([^\/]+)/);
          if (driveIdMatch) {
            const fileId = driveIdMatch[1];
            thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1280`;
          }
        }
        if (!thumbnailUrl) {
          thumbnailUrl = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=1280&h=720&fit=crop`;
        }

        const newEpisode: InsertEpisode = {
          showId: show.id,
          season: ep.season,
          episodeNumber: ep.episodeNumber,
          title: ep.title || `Episode ${ep.episodeNumber}`,
          description: ep.description || `Episode ${ep.episodeNumber} of ${show.title}`,
          thumbnailUrl,
          duration: ep.duration || 45,
          googleDriveUrl: ep.googleDriveUrl,
          airDate: ep.airDate || new Date().toISOString().split("T")[0],
        };

        try {
          await storage.createEpisode(newEpisode);
          console.log(`   ✅ Added S${ep.season}E${ep.episodeNumber}`);
          added++;
        } catch (error) {
          console.error(`   ❌ Failed to add S${ep.season}E${ep.episodeNumber}:`, error);
          skipped++;
        }
      }

      console.log(`\n✨ Completed! Added: ${added}, Skipped: ${skipped}`);

      res.json({
        success: true,
        show: show.title,
        added,
        skipped,
        total: added + skipped
      });
    } catch (error: any) {
      console.error("❌ Bulk add failed:", error);
      res.status(500).json({
        error: "Failed to add episodes",
        details: error.message
      });
    }
  });

  // Update episode
  app.put("/api/admin/episodes/:episodeId", requireAdmin, async (req, res) => {
    try {
      const { episodeId } = req.params;
      const episode = await storage.updateEpisode(episodeId, req.body);
      res.json(episode);
    } catch (error) {
      res.status(500).json({ error: "Failed to update episode" });
    }
  });

  // Delete episode
  app.delete("/api/admin/episodes/:episodeId", requireAdmin, async (req, res) => {
    try {
      const { episodeId } = req.params;
      await storage.deleteEpisode(episodeId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete episode" });
    }
  });

  // Delete all episodes for a show's season
  app.delete("/api/admin/shows/:showId/seasons/:seasonNumber", requireAdmin, async (req, res) => {
    try {
      const { showId, seasonNumber } = req.params;
      const season = parseInt(seasonNumber);

      // Get all episodes for this show
      const allEpisodes = await storage.getEpisodesByShowId(showId);

      // Filter episodes for this season
      const seasonEpisodes = allEpisodes.filter(ep => ep.season === season);

      // Delete each episode
      let deleted = 0;
      for (const episode of seasonEpisodes) {
        await storage.deleteEpisode(episode.id);
        deleted++;
      }

      console.log(`🗑️ Deleted ${deleted} episodes from season ${season}`);

      res.json({
        success: true,
        deleted,
        season
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete season episodes" });
    }
  });

  // Import shows and episodes from JSON file
  app.post("/api/admin/import-shows-episodes", requireAdmin, async (req, res) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: "File path is required" });
      }

      console.log(`🚀 Starting show and episode import from: ${filePath}`);

      // Check if file exists
      if (!existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return res.status(404).json({
          error: "File not found",
          details: `The file "${filePath}" does not exist. Please check the path and try again.`
        });
      }

      // Read and parse JSON
      let rawData: string;
      let importData: any;
      try {
        rawData = readFileSync(filePath, "utf-8");
        importData = JSON.parse(rawData);
      } catch (error: any) {
        return res.status(400).json({
          error: "Invalid JSON file",
          details: error.message
        });
      }

      // Handle new format (single show with episodes array)
      if (importData.showSlug && importData.episodes) {
        console.log(`📊 Found episodes for show: ${importData.showSlug}`);

        // Find the show by slug
        const existingShow = await storage.getShowBySlug(importData.showSlug);

        if (!existingShow) {
          return res.status(404).json({
            error: "Show not found",
            details: `No show found with slug "${importData.showSlug}". Please create the show first.`
          });
        }

        let episodesImported = 0;
        let episodesSkipped = 0;

        // Get existing episodes
        const existingEpisodes = await storage.getEpisodesByShowId(existingShow.id);
        const existingEpisodeKeys = new Set(
          existingEpisodes.map(ep => `${ep.season}-${ep.episodeNumber}`)
        );

        // Import each episode
        for (const episode of importData.episodes) {
          const episodeKey = `${episode.seasonNumber}-${episode.episodeNumber}`;

          if (existingEpisodeKeys.has(episodeKey)) {
            episodesSkipped++;
            continue;
          }

          // Generate thumbnail from Google Drive if not provided
          let thumbnailUrl = episode.thumbnailUrl;
          if (!thumbnailUrl && episode.videoUrl) {
            // Extract Google Drive file ID and create thumbnail URL
            const driveIdMatch = episode.videoUrl.match(/\/d\/([^\/]+)/);
            if (driveIdMatch) {
              const fileId = driveIdMatch[1];
              thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1280`;
            }
          }
          // Fallback to random Unsplash image if still no thumbnail
          if (!thumbnailUrl) {
            thumbnailUrl = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=1280&h=720&fit=crop`;
          }

          const newEpisode: InsertEpisode = {
            showId: existingShow.id,
            season: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
            title: episode.title,
            description: episode.description,
            thumbnailUrl,
            googleDriveUrl: episode.videoUrl,
            duration: episode.duration,
            airDate: null
          };

          await storage.createEpisode(newEpisode);
          episodesImported++;
        }

        // Update totalSeasons if needed
        const allEpisodes = await storage.getEpisodesByShowId(existingShow.id);
        const maxSeason = Math.max(...allEpisodes.map(ep => ep.season));
        if (maxSeason > existingShow.totalSeasons) {
          await storage.updateShow(existingShow.id, {
            totalSeasons: maxSeason
          });
          console.log(`📊 Updated totalSeasons to ${maxSeason}`);
        }

        console.log(`✅ Import complete!`);
        console.log(`   Episodes imported: ${episodesImported}`);
        console.log(`   Episodes skipped: ${episodesSkipped}`);

        return res.json({
          success: true,
          summary: {
            showsCreated: 0,
            showsSkipped: 1,
            episodesImported,
            episodesSkipped,
            showTitle: existingShow.title,
            totalEpisodes: importData.episodes.length
          }
        });
      }

      // Handle old format (multiple shows with seasons)
      console.log(`📊 Found ${importData.total_shows} shows with ${importData.total_episodes} episodes`);

      let showsCreated = 0;
      let showsSkipped = 0;
      let episodesImported = 0;
      let episodesSkipped = 0;

      // Process each show
      for (const importedShow of importData.shows) {
        // Check if show already exists
        const existingShow = await storage.getShowBySlug(importedShow.slug);

        let showId: string;
        if (existingShow) {
          console.log(`⏭️  Show already exists: ${importedShow.title}`);
          showId = existingShow.id;
          showsSkipped++;
        } else {
          // Create new show with default values
          const totalSeasons = Object.keys(importedShow.seasons).length;
          const newShow = await storage.createShow({
            title: importedShow.title,
            slug: importedShow.slug,
            description: `${importedShow.title} - Hindi Dubbed Series`,
            posterUrl: "https://images.unsplash.com/photo-1574267432644-f65e2d32b5c1?w=600&h=900&fit=crop",
            backdropUrl: "https://images.unsplash.com/photo-1574267432644-f65e2d32b5c1?w=1920&h=800&fit=crop",
            year: 2024,
            rating: "TV-14",
            imdbRating: "7.5",
            genres: "Drama",
            language: "Hindi",
            totalSeasons: totalSeasons,
            cast: "",
            creators: "",
            featured: false,
            trending: false,
            category: "drama"
          });
          showId = newShow.id;
          showsCreated++;
          console.log(`✅ Created show: ${importedShow.title}`);
        }

        // Import episodes for this show
        const existingEpisodes = await storage.getEpisodesByShowId(showId);
        const existingEpisodeKeys = new Set(
          existingEpisodes.map(ep => `${ep.season}-${ep.episodeNumber}`)
        );

        for (const [seasonKey, episodes] of Object.entries(importedShow.seasons)) {
          const seasonNumber = parseInt(seasonKey.replace("season_", ""));

          for (const episode of episodes as any[]) {
            const episodeKey = `${seasonNumber}-${episode.episode}`;

            if (existingEpisodeKeys.has(episodeKey)) {
              episodesSkipped++;
              continue;
            }

            const newEpisode: InsertEpisode = {
              showId: showId,
              season: seasonNumber,
              episodeNumber: episode.episode,
              title: `Episode ${episode.episode}`,
              description: `Episode ${episode.episode} of ${importedShow.title}`,
              thumbnailUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=1280&h=720&fit=crop`,
              duration: 45,
              googleDriveUrl: episode.embed_url,
              airDate: new Date().toISOString().split("T")[0],
            };

            try {
              await storage.createEpisode(newEpisode);
              episodesImported++;
            } catch (error) {
              episodesSkipped++;
            }
          }
        }
      }

      const summary = {
        showsCreated,
        showsSkipped,
        episodesImported,
        episodesSkipped,
        totalShows: showsCreated + showsSkipped,
        totalEpisodes: episodesImported + episodesSkipped
      };

      console.log(`\n\n📊 Import Summary:`);
      console.log(`   Shows created: ${showsCreated}`);
      console.log(`   Shows skipped: ${showsSkipped}`);
      console.log(`   Episodes imported: ${episodesImported}`);
      console.log(`   Episodes skipped: ${episodesSkipped}`);
      console.log(`\n✨ Import completed!`);

      res.json({
        success: true,
        message: "Import completed successfully",
        summary
      });
    } catch (error: any) {
      console.error("❌ Import failed:", error);
      res.status(500).json({
        error: "Failed to import",
        details: error.message
      });
    }
  });

  // Import episodes from JSON file
  app.post("/api/admin/import-episodes", requireAdmin, async (req, res) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: "File path is required" });
      }

      console.log(`🚀 Starting episode import from: ${filePath}`);

      // Check if file exists
      if (!existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return res.status(404).json({
          error: "File not found",
          details: `The file "${filePath}" does not exist. Please check the path and try again.`
        });
      }

      // Read the JSON file
      let rawData: string;
      try {
        rawData = readFileSync(filePath, "utf-8");
      } catch (readError: any) {
        console.error(`❌ Error reading file:`, readError);
        return res.status(500).json({
          error: "Failed to read file",
          details: readError.message
        });
      }

      // Parse JSON
      let importData: any;
      try {
        importData = JSON.parse(rawData);
      } catch (parseError: any) {
        console.error(`❌ Error parsing JSON:`, parseError);
        return res.status(400).json({
          error: "Invalid JSON file",
          details: `The file contains invalid JSON: ${parseError.message}`
        });
      }

      console.log(`📊 Found ${importData.total_shows} shows with ${importData.total_episodes} episodes`);

      // Get all existing shows from the database
      const existingShows = await storage.getAllShows();
      console.log(`💾 Found ${existingShows.length} shows in database`);

      // Create a map of slug to show ID
      const slugToShowMap = new Map<string, string>();
      existingShows.forEach(show => {
        slugToShowMap.set(show.slug, show.id);
      });

      let totalImported = 0;
      let totalSkipped = 0;
      let showsMatched = 0;
      let showsNotFound = 0;
      const notFoundShows: string[] = [];

      // Process each show in the import data
      for (const importedShow of importData.shows) {
        const showId = slugToShowMap.get(importedShow.slug);

        if (!showId) {
          console.log(`⚠️  Show not found in database: ${importedShow.title} (${importedShow.slug})`);
          notFoundShows.push(`${importedShow.title} (${importedShow.slug})`);
          showsNotFound++;
          totalSkipped += importedShow.total_episodes;
          continue;
        }

        showsMatched++;
        console.log(`✅ Processing: ${importedShow.title}`);

        // Get existing episodes for this show to avoid duplicates
        const existingEpisodes = await storage.getEpisodesByShowId(showId);
        const existingEpisodeKeys = new Set(
          existingEpisodes.map(ep => `${ep.season}-${ep.episodeNumber}`)
        );

        // Process each season
        for (const [seasonKey, episodes] of Object.entries(importedShow.seasons)) {
          const seasonNumber = parseInt(seasonKey.replace("season_", ""));

          for (const episode of episodes as any[]) {
            const episodeKey = `${seasonNumber}-${episode.episode}`;

            // Skip if episode already exists
            if (existingEpisodeKeys.has(episodeKey)) {
              console.log(`   ⏭️  Skipping S${seasonNumber}E${episode.episode} (already exists)`);
              totalSkipped++;
              continue;
            }

            // Create the episode
            const newEpisode: InsertEpisode = {
              showId: showId,
              season: seasonNumber,
              episodeNumber: episode.episode,
              title: `Episode ${episode.episode}`,
              description: `Episode ${episode.episode} of ${importedShow.title}`,
              thumbnailUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=1280&h=720&fit=crop`,
              duration: 45,
              googleDriveUrl: episode.embed_url,
              airDate: new Date().toISOString().split("T")[0],
            };

            try {
              await storage.createEpisode(newEpisode);
              console.log(`   ✅ Added S${seasonNumber}E${episode.episode}`);
              totalImported++;
            } catch (error) {
              console.error(`   ❌ Failed to add S${seasonNumber}E${episode.episode}:`, error);
              totalSkipped++;
            }
          }
        }
      }

      const summary = {
        showsMatched,
        showsNotFound,
        notFoundShows,
        episodesImported: totalImported,
        episodesSkipped: totalSkipped,
        totalProcessed: totalImported + totalSkipped
      };

      console.log(`\n\n📊 Import Summary:`);
      console.log(`   Shows matched: ${showsMatched}`);
      console.log(`   Shows not found: ${showsNotFound}`);
      console.log(`   Episodes imported: ${totalImported}`);
      console.log(`   Episodes skipped: ${totalSkipped}`);
      console.log(`\n✨ Import completed!`);

      res.json({
        success: true,
        message: "Import completed successfully",
        summary
      });
    } catch (error: any) {
      console.error("❌ Import failed:", error);
      res.status(500).json({
        error: "Failed to import episodes",
        details: error.message
      });
    }
  });

  // Admin: Get all content requests
  app.get("/api/admin/content-requests", requireAdmin, async (req, res) => {
    try {
      const requests = await storage.getAllContentRequests();
      res.json(requests);
    } catch (error: any) {
      console.error('Error fetching content requests:', error);
      res.status(500).json({ error: 'Failed to fetch content requests' });
    }
  });

  // Admin: Get all issue reports
  app.get("/api/admin/issue-reports", requireAdmin, async (req, res) => {
    try {
      const reports = await storage.getAllIssueReports();
      res.json(reports);
    } catch (error: any) {
      console.error('Error fetching issue reports:', error);
      res.status(500).json({ error: 'Failed to fetch issue reports' });
    }
  });

  // Admin: Get all comments
  app.get("/api/admin/comments", requireAdmin, async (req, res) => {
    try {
      const comments = await storage.getAllComments();
      res.json(comments);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  // Admin: Delete comment
  app.delete("/api/admin/comments/:commentId", requireAdmin, async (req, res) => {
    try {
      const { commentId } = req.params;
      await storage.deleteComment(commentId);
      res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  // Handle issue reports
  app.post("/api/report-issue", async (req, res) => {
    try {
      const { issueType, title, description, url, email } = req.body;

      // Save to storage
      const report = await storage.createIssueReport({
        issueType,
        title,
        description,
        url,
        email,
      });

      console.log('📝 Issue Report Received:', report.id);
      console.log('Type:', issueType);
      console.log('Title:', title);
      console.log('---');

      // Send email notification (don't wait for it)
      sendIssueReportEmail(report).catch(err =>
        console.error('Failed to send issue report email:', err)
      );

      res.json({
        success: true,
        message: 'Report submitted successfully',
        reportId: report.id
      });
    } catch (error: any) {
      console.error('Error submitting report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit report'
      });
    }
  });

  // Handle content requests
  app.post("/api/request-content", async (req, res) => {
    try {
      const { contentType, title, year, genre, description, reason, email } = req.body;

      // Save to storage (increments count if duplicate)
      const request = await storage.createContentRequest({
        contentType,
        title,
        year,
        genre,
        description,
        reason,
        email,
      });

      console.log('🎬 Content Request:', request.title, `(${request.requestCount} requests)`);

      // Send email notification (don't wait for it)
      sendContentRequestEmail(request).catch(err =>
        console.error('Failed to send content request email:', err)
      );

      res.json({
        success: true,
        message: 'Content request submitted successfully',
        requestCount: request.requestCount
      });
    } catch (error: any) {
      console.error('Error submitting content request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit content request'
      });
    }
  });

  // Get top content requests
  app.get("/api/top-requests", async (_req, res) => {
    try {
      const topRequests = await storage.getTopContentRequests(5);
      res.json(topRequests);
    } catch (error: any) {
      console.error('Error fetching top requests:', error);
      res.status(500).json({ error: 'Failed to fetch top requests' });
    }
  });

  // Admin - Get all content requests


  // Admin - Update content request status
  app.patch("/api/admin/content-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = await storage.updateContentRequest(id, updates);

      // Send email if request is filled
      if (updates.status === 'filled') {
        try {
          await sendContentRequestCompletedEmail(updated);
        } catch (emailError) {
          console.error("Failed to send content request completion email:", emailError);
        }
      }
      res.json(updated);
    } catch (error) {
      console.error('Error updating content request:', error);
      res.status(500).json({ error: "Failed to update content request" });
    }
  });

  // Admin - Get all issue reports


  // Admin - Update issue report status
  app.patch("/api/admin/issue-reports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = await storage.updateIssueReport(id, updates);

      // Send email if report is resolved
      if (updates.status === 'resolved') {
        try {
          await sendIssueReportResolvedEmail(updated);
        } catch (emailError) {
          console.error("Failed to send issue resolution email:", emailError);
        }
      }
      res.json(updated);
    } catch (error) {
      console.error('Error updating issue report:', error);
      res.status(500).json({ error: "Failed to update issue report" });
    }
  });

  // Comments - Get comments for an episode

  // ==========================================
  // FEEDBACK / SUGGESTIONS
  // ==========================================

  // Public: Submit feedback
  app.post("/api/feedback", async (req, res) => {
    try {
      const { category, subject, message, email, username } = req.body;

      if (!subject || !message || !category) {
        return res.status(400).json({ error: "Category, subject, and message are required" });
      }

      const feedback = await storage.createFeedback({
        category,
        subject,
        message,
        email,
        username,
      });

      console.log('💡 Feedback Received:', feedback.id);
      console.log('Category:', category);
      console.log('Subject:', subject);
      console.log('---');

      // Send email notification (don't wait for it)
      sendFeedbackEmail(feedback).catch(err =>
        console.error('Failed to send feedback email:', err)
      );

      res.json({
        success: true,
        message: 'Feedback submitted successfully! Thank you for helping us improve.',
        feedbackId: feedback.id
      });
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit feedback'
      });
    }
  });

  // Admin: Get all feedback
  app.get("/api/admin/feedback", requireAdmin, async (req, res) => {
    try {
      const feedbacks = await storage.getAllFeedback();
      res.json(feedbacks);
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  });

  // Admin: Update feedback status/note
  app.patch("/api/admin/feedback/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = await storage.updateFeedback(id, updates);
      
      // Send email if status is resolved or note is added
      if (updates.status === 'resolved' || updates.adminNote) {
        if (updated.email) {
          sendFeedbackResolvedEmail(updated).catch(err => 
            console.error('Failed to send feedback resolution email:', err)
          );
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating feedback:', error);
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  });

  // Admin: Delete feedback
  app.delete("/api/admin/feedback/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFeedback(id);
      res.json({ success: true, message: 'Feedback deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      res.status(500).json({ error: 'Failed to delete feedback' });
    }
  });

  // Comments - Get comments for an episode
  app.get("/api/comments/episode/:episodeId", requireApiKey, async (req, res) => {
    try {
      const { episodeId } = req.params;
      const comments = await storage.getCommentsByEpisodeId(episodeId);

      // Restrict external API users to 1 item per request
      if ((req as any).apiKey) {
        return res.json(comments.slice(0, 1));
      }

      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Comments - Get comments for a movie
  app.get("/api/comments/movie/:movieId", requireApiKey, async (req, res) => {
    try {
      const { movieId } = req.params;
      const comments = await storage.getCommentsByMovieId(movieId);

      // Restrict external API users to 1 item per request
      if ((req as any).apiKey) {
        return res.json(comments.slice(0, 1));
      }

      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Comments - Get comments for a blog post
  app.get("/api/comments/blog/:blogPostId", requireApiKey, async (req, res) => {
    try {
      const { blogPostId } = req.params;
      const comments = await storage.getCommentsByBlogPostId(blogPostId);

      // Restrict external API users to 1 item per request
      if ((req as any).apiKey) {
        return res.json(comments.slice(0, 1));
      }

      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Comments - Create a new comment
  app.post("/api/comments", async (req, res) => {
    try {
      const { episodeId, movieId, blogPostId, parentId, userName, comment } = req.body;

      // Validate input
      if (!userName || !comment) {
        return res.status(400).json({ error: "userName and comment are required" });
      }

      if (!episodeId && !movieId && !blogPostId) {
        return res.status(400).json({ error: "Either episodeId, movieId, or blogPostId is required" });
      }

      // Try to get authenticated user details to link comment
      let userId: string | undefined;
      let avatarUrl: string | undefined;

      const token = req.cookies?.authToken;
      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          userId = payload.userId;
          // Get latest avatar from DB
          const user = await storage.getUserById(userId);
          if (user && user.avatarUrl) {
            avatarUrl = user.avatarUrl;
          }
        }
      }

      const newComment = await storage.createComment({
        episodeId: episodeId || null,
        movieId: movieId || null,
        blogPostId: blogPostId || null,
        parentId: parentId || null,
        userId: userId || null,
        userName,
        avatarUrl: avatarUrl || null,
        comment,
      });

      // Log activity: Comment Post
      try {
        if (userId) { // Only log if authenticated user
          let entityType = "";
          let entityId = "";
          let title = "";
          let posterUrl = "";
          let link = "";

          if (movieId) {
            entityType = "movie";
            entityId = movieId;
            const movie = await storage.getMovieById(movieId);
            if (movie) {
              title = movie.title;
              posterUrl = movie.posterUrl;
              link = `/movie/${movie.slug || movie.id}`;
            }
          } else if (episodeId) {
            // Need to find show from episode?
            const episode = await storage.getEpisodeById(episodeId);
            if (episode) {
              const show = await storage.getShowById(episode.showId);
              if (show) {
                title = `${show.title} (S${episode.season} E${episode.episodeNumber})`;
                posterUrl = show.posterUrl;
                link = `/show/${show.slug || show.id}`;
                entityType = "show";
                entityId = show.id;
              }
            }
          } else if (blogPostId) {
            entityType = "blog";
            entityId = blogPostId;
            const post = await storage.getBlogPostById(blogPostId);
            if (post) {
              title = post.title;
              posterUrl = post.coverImage;
              link = `/blog/${post.slug || post.id}`;
            }
          }

          if (title) {
            // Check if this is a reply to another comment
            if (parentId) {
              // Look up parent comment to get its author
              try {
                const allComments = await storage.getAllComments();
                const parentComment = allComments.find((c: any) => c.id === parentId);
                if (parentComment && parentComment.userId && parentComment.userId !== userId) {
                  // Get the parent comment author's info
                  const parentAuthor = await storage.getUserById(parentComment.userId);
                  const currentUser = await storage.getUserById(userId);

                  // Send notification to the parent comment author
                  await storage.createNotification({
                    userId: parentComment.userId,
                    type: 'system',
                    title: 'New Reply',
                    message: `${currentUser?.username || userName} replied to your comment on ${title}`,
                    data: { link, commentId: newComment.id, fromUserId: userId },
                    read: false,
                  });

                  // Log activity as comment_reply (shows in mentions tab via targetUserId)
                  await logAndBroadcastActivity({
                    userId,
                    type: 'comment_reply',
                    entityId: newComment.id,
                    entityType: 'comment',
                    metadata: JSON.stringify({
                      contentId: entityId,
                      targetType: entityType,
                      title: title,
                      posterUrl: posterUrl,
                      link: link,
                      commentExcerpt: comment.substring(0, 50) + (comment.length > 50 ? '...' : ''),
                      parentAuthor: parentAuthor?.username || parentComment.userName || 'someone',
                      targetUserId: parentComment.userId,
                    })
                  });
                } else {
                  // Reply to own comment or anonymous comment - just log as comment_post
                  await logAndBroadcastActivity({
                    userId,
                    type: 'comment_post',
                    entityId: newComment.id,
                    entityType: 'comment',
                    metadata: JSON.stringify({
                      contentId: entityId,
                      targetType: entityType,
                      title: title,
                      posterUrl: posterUrl,
                      link: link,
                      commentExcerpt: comment.substring(0, 50) + (comment.length > 50 ? '...' : '')
                    })
                  });
                }
              } catch (replyErr) {
                console.error("Failed to handle reply notification", replyErr);
              }
            } else {
              // Top-level comment
              await logAndBroadcastActivity({
                userId,
                type: 'comment_post',
                entityId: newComment.id,
                entityType: 'comment',
                metadata: JSON.stringify({
                  contentId: entityId,
                  targetType: entityType,
                  title: title,
                  posterUrl: posterUrl,
                  link: link,
                  commentExcerpt: comment.substring(0, 50) + (comment.length > 50 ? '...' : '')
                })
              });
            }
          }
        }
      } catch (e) {
        console.error("Failed to log comment activity", e);
      }

      res.status(201).json(newComment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // ============ BLOG POSTS API ============

  // Get all published blog posts (public)
  // Get all published blog posts (public)
  app.get("/api/blog", requireApiKey, async (req, res) => {
    try {
      const posts = await storage.getPublishedBlogPosts();

      // Restrict external API users to 1 item per request
      if ((req as any).apiKey) {
        return res.json(posts.slice(0, 1));
      }

      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Get blog post by slug (public)
  app.get("/api/blog/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await storage.getBlogPostBySlug(slug);

      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // Only return published posts to public
      if (!post.published) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Admin: Get all blog posts (including unpublished)
  app.get("/api/admin/blog", requireAdmin, async (_req, res) => {
    try {
      const posts = await storage.getAllBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Admin: Get blog post by ID
  app.get("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getBlogPostById(id);

      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  // Admin: Create blog post
  app.post("/api/admin/blog", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost(validatedData);
      res.status(201).json(post);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid blog post data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });

  // Admin: Update blog post
  app.put("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.updateBlogPost(id, req.body);
      res.json(post);
    } catch (error: any) {
      if (error.message === "Blog post not found") {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.status(500).json({ error: "Failed to update blog post" });
    }
  });

  // Admin: Delete blog post
  app.delete("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBlogPost(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // ========== NEWSLETTER SUBSCRIPTION ==========

  // Subscribe to newsletter
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }

      // Read existing subscribers
      let data = { subscribers: [] as any[] };
      if (existsSync(SUBSCRIBERS_FILE)) {
        data = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf-8"));
      }

      // Check if already subscribed
      const exists = data.subscribers.some((s: any) => s.email === email);
      if (exists) {
        return res.json({ success: true, message: "Already subscribed" });
      }

      // Add new subscriber
      data.subscribers.push({
        email,
        subscribedAt: new Date().toISOString(),
        source: "footer"
      });

      // Save to file
      writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2));

      console.log(`📧 New newsletter subscriber: ${email}`);

      res.json({ success: true, message: "Successfully subscribed!" });
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Get subscriber count (admin only)
  app.get("/api/admin/newsletter/subscribers", requireAdmin, async (_req, res) => {
    try {
      if (!existsSync(SUBSCRIBERS_FILE)) {
        return res.json({ count: 0, subscribers: [] });
      }
      const data = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf-8"));
      res.json({
        count: data.subscribers.length,
        subscribers: data.subscribers
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subscribers" });
    }
  });

  // ==========================================
  // PUSH NOTIFICATIONS
  // ==========================================

  const PUSH_SUBSCRIPTIONS_FILE = path.join(__dirname, "..", "data", "push-subscriptions.json");

  // Configure web-push with VAPID keys
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:contact@streamvault.live',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
  }

  // Get VAPID public key
  app.get("/api/push/vapid-key", (_req, res) => {
    if (!VAPID_PUBLIC_KEY) {
      return res.status(500).json({ error: "VAPID key not configured" });
    }
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const subscription = req.body;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Invalid subscription" });
      }

      // Load existing subscriptions
      let data = { subscriptions: [] as any[] };
      if (existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
        data = JSON.parse(readFileSync(PUSH_SUBSCRIPTIONS_FILE, "utf-8"));
      }

      // Check for duplicate
      const exists = data.subscriptions.some((s: any) => s.endpoint === subscription.endpoint);
      if (!exists) {
        data.subscriptions.push({
          ...subscription,
          subscribedAt: new Date().toISOString()
        });
        writeFileSync(PUSH_SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));
        console.log(`🔔 New push subscriber (total: ${data.subscriptions.length})`);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Push subscription error:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;

      if (!existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
        return res.json({ success: true });
      }

      const data = JSON.parse(readFileSync(PUSH_SUBSCRIPTIONS_FILE, "utf-8"));
      data.subscriptions = data.subscriptions.filter((s: any) => s.endpoint !== endpoint);
      writeFileSync(PUSH_SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Get push subscriber count (admin only)
  app.get("/api/admin/push/subscribers", requireAdmin, async (_req, res) => {
    try {
      if (!existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
        return res.json({ count: 0 });
      }
      const data = JSON.parse(readFileSync(PUSH_SUBSCRIPTIONS_FILE, "utf-8"));
      res.json({ count: data.subscriptions?.length || 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // Send push notification (admin only)
  app.post("/api/admin/push/send", requireAdmin, async (req, res) => {
    try {
      const { title, body, url, type, contentId } = req.body;

      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return res.status(400).json({ error: "VAPID keys not configured" });
      }

      if (!existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
        return res.status(400).json({ error: "No push subscribers" });
      }

      const data = JSON.parse(readFileSync(PUSH_SUBSCRIPTIONS_FILE, "utf-8"));
      const subscriptions = data.subscriptions || [];

      if (subscriptions.length === 0) {
        return res.status(400).json({ error: "No push subscribers" });
      }

      // Build notification based on type
      let notificationTitle = title || "StreamVault Update";
      let notificationBody = body || "Check out what's new!";
      let notificationUrl = url || "https://streamvault.live";
      let notificationIcon = "https://streamvault.live/favicon.svg";
      let notificationImage = ""; // Large banner image

      // If content type is specified, fetch content details
      if (type && contentId) {
        if (type === 'show') {
          const shows = await storage.getAllShows();
          const show = shows.find((s: any) => s.id === contentId);
          if (show) {
            notificationTitle = `🎬 New on StreamVault: ${show.title}`;
            notificationBody = show.description?.substring(0, 100) + '...' || `Watch ${show.title} now!`;
            notificationUrl = `https://streamvault.live/show/${show.slug}`;
            notificationIcon = show.posterUrl || notificationIcon;
            notificationImage = show.backdropUrl || show.posterUrl || '';
          }
        } else if (type === 'movie') {
          const movies = await storage.getAllMovies();
          const movie = movies.find((m: any) => m.id === contentId);
          if (movie) {
            notificationTitle = `🎬 New Movie: ${movie.title}`;
            notificationBody = movie.description?.substring(0, 100) + '...' || `Watch ${movie.title} now!`;
            notificationUrl = `https://streamvault.live/movie/${movie.slug}`;
            notificationIcon = movie.posterUrl || notificationIcon;
            notificationImage = movie.backdropUrl || movie.posterUrl || '';
          }
        } else if (type === 'episode') {
          // For episodes, use the show's images
          const shows = await storage.getAllShows();
          const show = shows.find((s: any) => s.id === contentId);
          if (show) {
            notificationTitle = `📺 New Episode: ${show.title}`;
            notificationBody = `A new episode is now available!`;
            notificationUrl = `https://streamvault.live/show/${show.slug}`;
            notificationIcon = show.posterUrl || notificationIcon;
            notificationImage = show.backdropUrl || show.posterUrl || '';
          }
        }
      }

      const payload = JSON.stringify({
        title: notificationTitle,
        body: notificationBody,
        icon: notificationIcon,
        image: notificationImage, // Large banner image
        badge: "https://streamvault.live/favicon.svg",
        url: notificationUrl,
        timestamp: Date.now()
      });

      let sent = 0;
      let failed = 0;
      const failedEndpoints: string[] = [];

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
          sent++;
        } catch (err: any) {
          failed++;
          // Remove invalid subscriptions (410 Gone or 404)
          if (err.statusCode === 410 || err.statusCode === 404) {
            failedEndpoints.push(sub.endpoint);
          }
        }
      }

      // Clean up invalid subscriptions
      if (failedEndpoints.length > 0) {
        data.subscriptions = data.subscriptions.filter(
          (s: any) => !failedEndpoints.includes(s.endpoint)
        );
        writeFileSync(PUSH_SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));
      }

      console.log(`🔔 Push sent: ${sent} success, ${failed} failed`);
      res.json({ success: true, sent, failed, cleaned: failedEndpoints.length });
    } catch (error: any) {
      console.error("Push send error:", error);
      res.status(500).json({ error: error.message || "Failed to send push" });
    }
  });

  // Send newsletter to single subscriber (admin only)
  app.post("/api/admin/newsletter/send-one", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const DATA_FILE = path.join(__dirname, "..", "data", "streamvault-data.json");
      const RESEND_API_KEY = process.env.RESEND_API_KEY;

      if (!RESEND_API_KEY) {
        return res.status(400).json({ error: "RESEND_API_KEY not configured" });
      }

      // Load content data
      if (!existsSync(DATA_FILE)) {
        return res.status(400).json({ error: "No content data found" });
      }

      const contentData = JSON.parse(readFileSync(DATA_FILE, "utf-8"));

      // Get content - prioritize by most recent date (createdAt or updatedAt)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Helper to get most recent date (createdAt or updatedAt)
      const getLatestDate = (item: any) => {
        const created = item.createdAt ? new Date(item.createdAt).getTime() : 0;
        const updated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
        return Math.max(created, updated);
      };

      // Sort shows by most recent date (newest first)
      let allShows = (contentData.shows || [])
        .sort((a: any, b: any) => getLatestDate(b) - getLatestDate(a));

      // Get new/updated shows (in last week) or fall back to trending/featured
      let newShows = allShows.filter((s: any) => {
        const latestDate = new Date(Math.max(
          s.createdAt ? new Date(s.createdAt).getTime() : 0,
          s.updatedAt ? new Date(s.updatedAt).getTime() : 0
        )).toISOString();
        return latestDate >= oneWeekAgo;
      }).slice(0, 5);
      if (newShows.length < 5) {
        const existingIds = new Set(newShows.map((s: any) => s.id));
        const trendingShows = allShows.filter((s: any) => (s.trending || s.featured) && !existingIds.has(s.id));
        newShows = [...newShows, ...trendingShows].slice(0, 5);
      }
      if (newShows.length === 0) {
        newShows = allShows.slice(0, 5);
      }

      // Sort movies by most recent date (newest first)
      let allMovies = (contentData.movies || [])
        .sort((a: any, b: any) => getLatestDate(b) - getLatestDate(a));

      // Get new movies (in last week) or fall back to trending/featured
      let newMovies = allMovies.filter((m: any) => {
        const latestDate = new Date(Math.max(
          m.createdAt ? new Date(m.createdAt).getTime() : 0,
          m.updatedAt ? new Date(m.updatedAt).getTime() : 0
        )).toISOString();
        return latestDate >= oneWeekAgo;
      }).slice(0, 5);
      if (newMovies.length < 5) {
        const existingIds = new Set(newMovies.map((m: any) => m.id));
        const trendingMovies = allMovies.filter((m: any) => (m.trending || m.featured) && !existingIds.has(m.id));
        newMovies = [...newMovies, ...trendingMovies].slice(0, 5);
      }
      if (newMovies.length === 0) {
        newMovies = allMovies.slice(0, 5);
      }

      // Sort anime by most recent date (newest first)
      let allAnime = (contentData.anime || [])
        .sort((a: any, b: any) => getLatestDate(b) - getLatestDate(a));

      // Get new anime (in last week) or fall back to trending/featured
      let newAnime = allAnime.filter((a: any) => {
        const latestDate = new Date(Math.max(
          a.createdAt ? new Date(a.createdAt).getTime() : 0,
          a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        )).toISOString();
        return latestDate >= oneWeekAgo;
      }).slice(0, 5);
      if (newAnime.length < 5) {
        const existingIds = new Set(newAnime.map((a: any) => a.id));
        const trendingAnime = allAnime.filter((a: any) => (a.trending || a.featured) && !existingIds.has(a.id));
        newAnime = [...newAnime, ...trendingAnime].slice(0, 5);
      }
      if (newAnime.length === 0) {
        newAnime = allAnime.slice(0, 5);
      }

      // Get blog posts
      const blogPosts = await storage.getAllBlogPosts();
      const featuredBlogs = blogPosts.filter((b: any) => b.featured).slice(0, 5);
      const latestBlogs = featuredBlogs.length > 0 ? featuredBlogs : blogPosts.slice(0, 5);

      // Generate email HTML (simplified version)
      const totalShows = (contentData.shows || []).length;
      const totalMovies = (contentData.movies || []).length;
      const totalAnime = (contentData.anime || []).length;

      const generateContentRow = (items: any[], type: string) => {
        return items.slice(0, 5).map((item: any) => {
          let url;
          if (type === 'show') url = `https://streamvault.live/show/${item.slug}`;
          else if (type === 'movie') url = `https://streamvault.live/movie/${item.slug}`;
          else url = `https://streamvault.live/anime/${item.slug}`;
          return `
            <tr>
              <td style="padding:15px 0;border-bottom:1px solid #2a2a2a;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="100" style="vertical-align:top;">
                      <a href="${url}">
                        <img src="${item.posterUrl}" alt="${item.title}" width="100" height="150" style="border-radius:8px;display:block;object-fit:cover;">
                      </a>
                    </td>
                    <td style="padding-left:20px;vertical-align:top;">
                      <a href="${url}" style="text-decoration:none;">
                        <h3 style="margin:0 0 8px 0;font-size:18px;color:#ffffff;font-weight:600;">${item.title}</h3>
                      </a>
                      <p style="margin:0 0 8px 0;color:#888888;font-size:13px;">
                        ${item.year} ${item.genres ? '• ' + (item.genres.split(',')[0] || '') : ''} ${item.imdbRating ? '• ⭐ ' + item.imdbRating : ''}
                      </p>
                      <p style="margin:0 0 12px 0;color:#aaaaaa;font-size:14px;line-height:1.4;">
                        ${(item.description || '').substring(0, 120)}${item.description?.length > 120 ? '...' : ''}
                      </p>
                      <a href="${url}" style="display:inline-block;background:#e50914;color:#ffffff;padding:10px 24px;border-radius:5px;text-decoration:none;font-size:13px;font-weight:600;">
                        ▶ Watch Now
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
        }).join('');
      };

      const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StreamVault Weekly Newsletter</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#e50914 0%,#b20710 50%,#8b0000 100%);padding:40px 30px;text-align:center;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:36px;font-weight:800;letter-spacing:-1px;">StreamVault</h1>
              <p style="margin:12px 0 0 0;color:rgba(255,255,255,0.9);font-size:15px;">🎬 Your Weekly Entertainment Digest</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color:#141414;padding:30px;">
              
              <!-- Welcome Message -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;padding-bottom:30px;border-bottom:1px solid #2a2a2a;">
                    <h2 style="margin:0 0 10px 0;color:#ffffff;font-size:24px;font-weight:600;">What's Hot This Week 🔥</h2>
                    <p style="margin:0;color:#888888;font-size:15px;">Handpicked entertainment just for you</p>
                  </td>
                </tr>
              </table>

              <!-- TV Shows Section -->
              ${newShows.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">📺 Featured TV Shows</h3>
                  </td>
                </tr>
                ${generateContentRow(newShows, 'show')}
              </table>
              ` : ''}

              <!-- Movies Section -->
              ${newMovies.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">🎬 Featured Movies</h3>
                  </td>
                </tr>
                ${generateContentRow(newMovies, 'movie')}
              </table>
              ` : ''}

              <!-- Anime Section -->
              ${newAnime.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">🎌 Featured Anime</h3>
                  </td>
                </tr>
                ${generateContentRow(newAnime, 'anime')}
              </table>
              ` : ''}

              <!-- Blog Section -->
              ${latestBlogs.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">📰 Latest Articles</h3>
                  </td>
                </tr>
                ${latestBlogs.map((blog: any) => {
        const blogType = blog.contentType || 'show';
        const blogImage = blog.featuredImage || '';
        return `
                <tr>
                  <td style="padding:8px 0;">
                    <a href="https://streamvault.live/blog/${blogType}/${blog.slug}" style="text-decoration:none;display:block;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#1a1a1a;border-radius:10px;overflow:hidden;">
                        ${blogImage ? `
                        <tr>
                          <td>
                            <img src="${blogImage}" alt="${blog.title}" width="100%" height="140" style="display:block;object-fit:cover;border-radius:10px 10px 0 0;">
                          </td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td style="padding:12px 15px;">
                            <h4 style="margin:0 0 6px 0;color:#ffffff;font-size:15px;font-weight:600;">${blog.title}</h4>
                            <p style="margin:0;color:#999;font-size:11px;">${(blog.excerpt || '').substring(0, 70)}...</p>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
                `;
      }).join('')}
              </table>
              ` : ''}

              <!-- Stats Banner -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px;background:linear-gradient(135deg,#1a1a1a,#252525);border-radius:10px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="25%" style="text-align:center;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">${totalShows}+</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">TV Shows</p>
                        </td>
                        <td width="25%" style="text-align:center;border-left:1px solid #333;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">${totalMovies}+</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">Movies</p>
                        </td>
                        <td width="25%" style="text-align:center;border-left:1px solid #333;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">${totalAnime}+</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">Anime</p>
                        </td>
                        <td width="25%" style="text-align:center;border-left:1px solid #333;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">HD</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">Quality</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px;">
                <tr>
                  <td style="text-align:center;">
                    <a href="https://streamvault.live" style="display:inline-block;background:linear-gradient(90deg,#e50914,#b20710);color:#ffffff;padding:16px 50px;border-radius:50px;text-decoration:none;font-size:16px;font-weight:700;box-shadow:0 4px 15px rgba(229,9,20,0.4);">
                      🎬 Browse All Content
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0d0d0d;padding:30px;text-align:center;border-radius:0 0 12px 12px;">
              <!-- Social Links -->
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:20px;">
                <tr>
                  <td style="padding:0 8px;"><a href="https://twitter.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Twitter</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://instagram.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Instagram</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://telegram.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Telegram</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://whatsapp.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">WhatsApp</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://facebook.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Facebook</a></td>
                </tr>
              </table>
              <p style="margin:0 0 10px 0;color:#555;font-size:12px;">You received this email because you subscribed to StreamVault newsletter.</p>
              <p style="margin:0;color:#444;font-size:12px;">© 2024 StreamVault. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const subject = '🎬 StreamVault Weekly: Top Picks Just For You!';

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'StreamVault <noreply@streamvault.live>',
          to: [email],
          subject: subject,
          html: emailHTML,
        }),
      });

      if (response.ok) {
        console.log(`✅ Newsletter sent to ${email}`);
        res.json({ success: true, message: `Newsletter sent to ${email}` });
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to send to ${email}:`, errorText);
        res.status(500).json({ error: `Failed to send: ${errorText}` });
      }
    } catch (error: any) {
      console.error("Newsletter send error:", error);
      res.status(500).json({ error: error.message || "Failed to send newsletter" });
    }
  });

  // Send newsletter (admin only) - inline version to avoid child_process
  app.post("/api/admin/newsletter/send", requireAdmin, async (_req, res) => {
    try {
      const DATA_FILE = path.join(__dirname, "..", "data", "streamvault-data.json");
      const RESEND_API_KEY = process.env.RESEND_API_KEY;

      // Check for subscribers
      if (!existsSync(SUBSCRIBERS_FILE)) {
        return res.status(400).json({ error: "No subscribers file found" });
      }

      const subscribersData = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf-8"));
      const subscribers = subscribersData.subscribers || [];

      if (subscribers.length === 0) {
        return res.status(400).json({ error: "No subscribers found" });
      }

      // Load content data
      if (!existsSync(DATA_FILE)) {
        return res.status(400).json({ error: "No content data found" });
      }

      const contentData = JSON.parse(readFileSync(DATA_FILE, "utf-8"));

      // Get new/updated content from last 7 days (uses max of createdAt and updatedAt)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const getLatestDate = (item: any) => Math.max(
        item.createdAt ? new Date(item.createdAt).getTime() : 0,
        item.updatedAt ? new Date(item.updatedAt).getTime() : 0
      );

      // Sort shows by most recent date
      let allShows = (contentData.shows || [])
        .sort((a: any, b: any) => getLatestDate(b) - getLatestDate(a));

      let newShows = allShows.filter((show: any) => {
        const latestDate = new Date(getLatestDate(show));
        return latestDate >= cutoffDate;
      }).slice(0, 5);

      // Sort movies by most recent date  
      let allMovies = (contentData.movies || [])
        .sort((a: any, b: any) => getLatestDate(b) - getLatestDate(a));

      let newMovies = allMovies.filter((movie: any) => {
        const latestDate = new Date(getLatestDate(movie));
        return latestDate >= cutoffDate;
      }).slice(0, 5);

      // If not enough new content, add trending/featured content
      if (newShows.length < 5) {
        const existingIds = new Set(newShows.map((s: any) => s.id));
        const trendingShows = allShows.filter((s: any) => (s.trending || s.featured) && !existingIds.has(s.id));
        newShows = [...newShows, ...trendingShows].slice(0, 5);
      }
      if (newShows.length === 0) {
        newShows = allShows.slice(0, 5);
      }

      if (newMovies.length < 5) {
        const existingIds = new Set(newMovies.map((m: any) => m.id));
        const trendingMovies = allMovies.filter((m: any) => (m.trending || m.featured) && !existingIds.has(m.id));
        newMovies = [...newMovies, ...trendingMovies].slice(0, 5);
      }
      if (newMovies.length === 0) {
        newMovies = allMovies.slice(0, 5);
      }

      // Sort anime by most recent date
      let allAnime = (contentData.anime || [])
        .sort((a: any, b: any) => getLatestDate(b) - getLatestDate(a));

      let newAnime = allAnime.filter((anime: any) => {
        const latestDate = new Date(getLatestDate(anime));
        return latestDate >= cutoffDate;
      }).slice(0, 5);

      if (newAnime.length < 5) {
        const existingIds = new Set(newAnime.map((a: any) => a.id));
        const trendingAnime = allAnime.filter((a: any) => (a.trending || a.featured) && !existingIds.has(a.id));
        newAnime = [...newAnime, ...trendingAnime].slice(0, 5);
      }
      if (newAnime.length === 0) {
        newAnime = allAnime.slice(0, 5);
      }

      // Get blog posts - sorted by most recent, limit 5
      const blogPosts = await storage.getAllBlogPosts();
      const sortedBlogs = [...blogPosts].sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      const featuredBlogs = sortedBlogs.filter((b: any) => b.featured).slice(0, 5);
      const latestBlogs = featuredBlogs.length >= 5 ? featuredBlogs : sortedBlogs.slice(0, 5);

      // Total counts for stats (auto-updated from actual data)
      const totalShows = (contentData.shows || []).length;
      const totalMovies = (contentData.movies || []).length;
      const totalAnime = (contentData.anime || []).length;
      const totalNew = newShows.length + newMovies.length + newAnime.length;

      // Generate professional email HTML
      const generateContentRow = (items: any[], type: string) => {
        return items.map((item: any) => {
          let url;
          if (type === 'show') url = `https://streamvault.live/show/${item.slug}`;
          else if (type === 'movie') url = `https://streamvault.live/movie/${item.slug}`;
          else url = `https://streamvault.live/anime/${item.slug}`;
          return `
            <tr>
              <td style="padding:15px 0;border-bottom:1px solid #2a2a2a;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="100" style="vertical-align:top;">
                      <a href="${url}">
                        <img src="${item.posterUrl}" alt="${item.title}" width="100" height="150" style="border-radius:8px;display:block;object-fit:cover;">
                      </a>
                    </td>
                    <td style="padding-left:20px;vertical-align:top;">
                      <a href="${url}" style="text-decoration:none;">
                        <h3 style="margin:0 0 8px 0;font-size:18px;color:#ffffff;font-weight:600;">${item.title}</h3>
                      </a>
                      <p style="margin:0 0 8px 0;color:#888888;font-size:13px;">
                        ${item.year} ${item.genres ? '• ' + (item.genres.split(',')[0] || '') : ''} ${item.imdbRating ? '• ⭐ ' + item.imdbRating : ''}
                      </p>
                      <p style="margin:0 0 12px 0;color:#aaaaaa;font-size:14px;line-height:1.4;">
                        ${(item.description || '').substring(0, 120)}${item.description?.length > 120 ? '...' : ''}
                      </p>
                      <a href="${url}" style="display:inline-block;background:#e50914;color:#ffffff;padding:10px 24px;border-radius:5px;text-decoration:none;font-size:13px;font-weight:600;">
                        ▶ Watch Now
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
        }).join('');
      };

      const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StreamVault Weekly Newsletter</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#e50914 0%,#b20710 50%,#8b0000 100%);padding:40px 30px;text-align:center;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:36px;font-weight:800;letter-spacing:-1px;">StreamVault</h1>
              <p style="margin:12px 0 0 0;color:rgba(255,255,255,0.9);font-size:15px;">🎬 Your Weekly Entertainment Digest</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color:#141414;padding:30px;">
              
              <!-- Welcome Message -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;padding-bottom:30px;border-bottom:1px solid #2a2a2a;">
                    <h2 style="margin:0 0 10px 0;color:#ffffff;font-size:24px;font-weight:600;">What's Hot This Week 🔥</h2>
                    <p style="margin:0;color:#888888;font-size:15px;">Handpicked entertainment just for you</p>
                  </td>
                </tr>
              </table>

              <!-- TV Shows Section -->
              ${newShows.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">📺 Featured TV Shows</h3>
                  </td>
                </tr>
                ${generateContentRow(newShows.slice(0, 5), 'show')}
              </table>
              ` : ''}

              <!-- Movies Section -->
              ${newMovies.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">🎬 Featured Movies</h3>
                  </td>
                </tr>
                ${generateContentRow(newMovies.slice(0, 5), 'movie')}
              </table>
              ` : ''}

              <!-- Anime Section -->
              ${newAnime.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">🎌 Featured Anime</h3>
                  </td>
                </tr>
                ${generateContentRow(newAnime.slice(0, 5), 'anime')}
              </table>
              ` : ''}

              <!-- Stats Banner -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px;background:linear-gradient(135deg,#1a1a1a,#252525);border-radius:10px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="25%" style="text-align:center;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">${totalShows}+</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">TV Shows</p>
                        </td>
                        <td width="25%" style="text-align:center;border-left:1px solid #333;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">${totalMovies}+</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">Movies</p>
                        </td>
                        <td width="25%" style="text-align:center;border-left:1px solid #333;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">${totalAnime}+</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">Anime</p>
                        </td>
                        <td width="25%" style="text-align:center;border-left:1px solid #333;">
                          <p style="margin:0;color:#e50914;font-size:28px;font-weight:700;">HD</p>
                          <p style="margin:5px 0 0 0;color:#888;font-size:12px;text-transform:uppercase;">Quality</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px;">
                <tr>
                  <td style="text-align:center;">
                    <a href="https://streamvault.live" style="display:inline-block;background:linear-gradient(90deg,#e50914,#b20710);color:#ffffff;padding:16px 50px;border-radius:50px;text-decoration:none;font-size:16px;font-weight:700;box-shadow:0 4px 15px rgba(229,9,20,0.4);">
                      🎬 Browse All Content
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Blog Section -->
              ${latestBlogs.length > 0 ? `
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:25px;">
                <tr>
                  <td style="padding:12px 0;">
                    <h3 style="margin:0;color:#e50914;font-size:18px;font-weight:700;border-left:4px solid #e50914;padding-left:12px;">📰 Latest Articles</h3>
                  </td>
                </tr>
                ${latestBlogs.map((blog: any) => `
                <tr>
                  <td style="padding:15px 0;border-bottom:1px solid #2a2a2a;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        ${blog.featuredImage ? `
                        <td width="120" style="vertical-align:top;">
                          <a href="https://streamvault.live/blog/${blog.contentType || 'show'}/${blog.slug}">
                            <img src="${blog.featuredImage}" alt="${blog.title}" width="120" height="70" style="border-radius:6px;display:block;object-fit:cover;">
                          </a>
                        </td>` : ''}
                        <td style="${blog.featuredImage ? 'padding-left:15px;' : ''}vertical-align:top;">
                          <a href="https://streamvault.live/blog/${blog.contentType || 'show'}/${blog.slug}" style="text-decoration:none;">
                            <h4 style="margin:0 0 6px 0;color:#ffffff;font-size:15px;font-weight:600;">${blog.title}</h4>
                            <p style="margin:0;color:#888;font-size:13px;line-height:1.4;">${(blog.excerpt || '').substring(0, 80)}...</p>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `).join('')}
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0d0d0d;padding:30px;text-align:center;border-radius:0 0 12px 12px;">
              <!-- Social Links -->
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:20px;">
                <tr>
                  <td style="padding:0 8px;"><a href="https://twitter.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Twitter</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://instagram.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Instagram</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://telegram.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Telegram</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://whatsapp.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">WhatsApp</a></td>
                  <td style="color:#444;">•</td>
                  <td style="padding:0 8px;"><a href="https://facebook.streamvault.in" style="color:#888;text-decoration:none;font-size:13px;">Facebook</a></td>
                </tr>
              </table>
              <p style="margin:0 0 10px 0;color:#555;font-size:12px;">You received this email because you subscribed to StreamVault newsletter.</p>
              <p style="margin:0;color:#444;font-size:12px;">© 2024 StreamVault. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const subject = '🎬 StreamVault Weekly: Top Picks Just For You!';

      // Send to all subscribers
      let sent = 0;
      let failed = 0;

      for (const subscriber of subscribers) {
        try {
          if (!RESEND_API_KEY) {
            console.log(`📧 [DRY RUN] Would send to: ${subscriber.email}`);
            sent++;
            continue;
          }

          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'StreamVault <noreply@streamvault.live>',
              to: [subscriber.email],
              subject: subject,
              html: emailHTML,
            }),
          });

          if (response.ok) {
            sent++;
            console.log(`✅ Newsletter sent to ${subscriber.email}`);
          } else {
            const errorText = await response.text();
            console.error(`❌ Failed to send to ${subscriber.email}:`, errorText);
            failed++;
          }
        } catch (err: any) {
          console.error(`❌ Error sending to ${subscriber.email}:`, err.message);
          failed++;
        }

        // Rate limiting - 2 requests per second max
        await new Promise(r => setTimeout(r, 600));
      }

      res.json({
        success: true,
        message: `Newsletter sent to ${sent} subscribers`,
        sent,
        failed,
        newShows: newShows.length,
        newMovies: newMovies.length
      });
    } catch (error) {
      console.error("Newsletter send error:", error);
      res.status(500).json({ error: "Failed to send newsletter" });
    }
  });

  // Broadcast in-app notifications to all users (admin only)
  app.post("/api/admin/broadcast-notification", requireAdmin, async (req, res) => {
    try {
      const { type, contentType, contentId, contentTitle, contentPoster, customTitle, customMessage, customLink } = req.body;

      // Get all users
      const users = await storage.getAllUsers();

      let sentCount = 0;
      let title = '';
      let message = '';
      let notificationData: any = {};

      // Determine notification content based on type
      if (type === 'custom') {
        title = customTitle;
        message = customMessage;
        notificationData = {
          type: 'announcement',
          link: customLink || undefined
        };
      } else if (type === 'new_content') {
        title = '🆕 New Content Added!';
        message = `${contentTitle} is now available on StreamVault!`;
        notificationData = {
          type: 'new_content',
          contentType,
          contentId,
          contentTitle,
          contentPoster,
          link: customLink || undefined // Allow overriding link for content too
        };
      } else if (type === 'new_episode') {
        title = '📺 New Episode Available!';
        message = `A new episode of ${contentTitle} is now streaming!`;
        notificationData = {
          type: 'new_episode',
          contentType,
          contentId,
          contentTitle,
          contentPoster,
          link: customLink || undefined
        };
      }

      // Create notification for each user
      for (const user of users) {
        try {
          await storage.createNotification({
            userId: user.id,
            type: type === 'custom' ? 'announcement' : 'content_update',
            title,
            message,
            data: notificationData,
            read: false,
          });
          sentCount++;
        } catch (err) {
          console.error(`Failed to create notification for user ${user.id}:`, err);
        }
      }

      console.log(`📢 Broadcast notification sent to ${sentCount} users: ${title}`);

      res.json({
        success: true,
        sentCount,
        title,
        message
      });
    } catch (error) {
      console.error("Broadcast notification error:", error);
      res.status(500).json({ error: "Failed to broadcast notification" });
    }
  });

  // ========== VIDEO PROXY ==========
  // Proxy endpoint to stream external videos with correct headers
  app.get("/api/proxy-video", async (req, res) => {
    try {
      const videoUrl = req.query.url as string;

      if (!videoUrl) {
        return res.status(400).json({ error: "URL parameter required" });
      }

      // Only allow whitelisted domains for security
      const allowedDomains = [
        'worthcrete.com',
        'www.worthcrete.com'
      ];

      let urlOrigin: string;
      try {
        const parsedUrl = new URL(videoUrl);
        urlOrigin = parsedUrl.hostname;
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }

      if (!allowedDomains.some(domain => urlOrigin.includes(domain))) {
        return res.status(403).json({ error: "Domain not allowed" });
      }

      console.log(`📹 Proxying video: ${videoUrl}`);

      try {
        // Build headers to mimic browser request
        const headers: Record<string, string> = {
          'Referer': 'https://www.worthcrete.com/',
          'Origin': 'https://www.worthcrete.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'video/mp4,video/webm,video/*,*/*;q=0.9',
          'Accept-Encoding': 'identity',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'video',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
        };

        // Forward range header if present
        if (req.headers.range) {
          headers['Range'] = req.headers.range as string;
        }

        const fetchResponse = await fetch(videoUrl, {
          method: 'GET',
          headers,
          redirect: 'follow',
        });

        console.log(`📹 Proxy response: ${fetchResponse.status}`);

        if (!fetchResponse.ok && fetchResponse.status !== 206) {
          return res.status(fetchResponse.status).json({
            error: 'Video source unavailable',
            status: fetchResponse.status
          });
        }

        // Forward headers
        res.status(fetchResponse.status);

        const contentType = fetchResponse.headers.get('content-type');
        if (contentType) {
          res.setHeader('Content-Type', contentType);
        }

        const contentLength = fetchResponse.headers.get('content-length');
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        }

        const contentRange = fetchResponse.headers.get('content-range');
        if (contentRange) {
          res.setHeader('Content-Range', contentRange);
        }

        const acceptRanges = fetchResponse.headers.get('accept-ranges');
        if (acceptRanges) {
          res.setHeader('Accept-Ranges', acceptRanges);
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        // Stream the response body
        if (fetchResponse.body) {
          const reader = fetchResponse.body.getReader();

          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  res.end();
                  break;
                }
                res.write(Buffer.from(value));
              }
            } catch (streamError) {
              console.error('Stream error:', streamError);
              res.end();
            }
          };

          pump();
        } else {
          res.end();
        }
      } catch (fetchError: any) {
        console.error('❌ Fetch error:', fetchError.message);
        res.status(500).json({ error: 'Proxy failed', details: fetchError.message });
      }
    } catch (error: any) {
      console.error("❌ Video proxy error:", error.message);
      res.status(500).json({ error: "Proxy failed", details: error.message });
    }
  });

  // ============================================
  // Subtitle API - Manual Admin Management
  // ============================================

  // Admin endpoint to search subtitles on-demand
  app.get("/api/admin/subtitles/search", requireAdmin, async (req, res) => {
    try {
      const imdbId = req.query.imdbId as string;
      const season = req.query.season ? parseInt(req.query.season as string) : undefined;
      const episode = req.query.episode ? parseInt(req.query.episode as string) : undefined;
      const language = (req.query.language as string) || 'en';

      if (!imdbId) {
        return res.status(400).json({ error: "imdbId parameter required" });
      }

      console.log(`[Admin] 🔍 Subtitle search: imdbId=${imdbId}, season=${season}, episode=${episode}, lang=${language}`);

      const result = await searchSubtitles(imdbId, season, episode, language);
      res.json({ subtitles: result.subtitles, error: result.error });
    } catch (error: any) {
      console.error("[Admin] ❌ Subtitle search error:", error.message);
      res.status(500).json({ error: "Search failed", details: error.message });
    }
  });

  // Admin endpoint to explicitly save a subtitle to the local storage
  app.post("/api/admin/subtitles/save", requireAdmin, async (req, res) => {
    try {
      const { imdbId, season, episode, language, subtitleUrl } = req.body;

      if (!imdbId || !language || !subtitleUrl) {
        return res.status(400).json({ error: "imdbId, language, and subtitleUrl are required" });
      }

      console.log(`[Admin] ⬇️ Downloading & Saving Subtitle: ${language} for ${imdbId} ${season ? `S${season}` : ''} ${episode ? `E${episode}` : ''}`);

      // Try to download and cache the subtitle as a local .vtt file
      const cachedPath = await downloadSubtitle(subtitleUrl);

      if (!cachedPath) {
        return res.status(400).json({ 
          error: "Provider link is protected",
          details: "This provider returned a webpage or protected link instead of a raw subtitle file. Please use the manual 'Upload File' tab for this specific subtitle."
        });
      }

      console.log(`[Admin] ✅ Subtitle downloaded and cached locally`);
      const pathMod = await import('path');
      const baseName = pathMod.basename(cachedPath);
      const fileHash = baseName.split('.')[0];
      const localUrl = `/api/subtitles/file/${fileHash}`;

      const savedData = {
        imdbId,
        season: season ? parseInt(season as string) : undefined,
        episode: episode ? parseInt(episode as string) : undefined,
        language,
        url: localUrl,
        fileName: baseName
      };

      const savedSub = await storage.saveSubtitle(savedData);

      res.json({ success: true, subtitle: savedSub });
    } catch (error: any) {
      console.error("[Admin] ❌ Subtitle download error:", error.message);
      res.status(500).json({ error: "Download failed", details: error.message });
    }
  });

  // Admin endpoint to upload a subtitle file directly
  app.post("/api/admin/subtitles/upload", requireAdmin, async (req, res) => {
    try {
      const { imdbId, season, episode, language, fileName, fileContent } = req.body;

      if (!imdbId || !language || !fileName || !fileContent) {
        return res.status(400).json({ error: "imdbId, language, fileName, and fileContent are required" });
      }

      console.log(`[Admin] 📤 Uploading Subtitle: ${language} for ${imdbId} ${season ? `S${season}` : ''} ${episode ? `E${episode}` : ''}`);

      const fs = await import('fs');
      const path = await import('path');
      const crypto = await import('crypto');

      // Convert from base64 string
      const base64Data = fileContent.replace(/^data:.*\/.*;base64,/, "");
      let content = Buffer.from(base64Data, 'base64').toString('utf-8');

      // Generate cache filename from content hash
      const contentHash = crypto.createHash('md5').update(content).digest('hex');
      const SUBTITLE_CACHE_DIR = path.join(process.cwd(), 'data', 'subtitles');
      
      // Ensure cache directory exists
      if (!fs.existsSync(SUBTITLE_CACHE_DIR)) {
          fs.mkdirSync(SUBTITLE_CACHE_DIR, { recursive: true });
      }

      // Format as VTT if needed
      if (fileName.endsWith('.srt') || (content.includes('-->') && !content.startsWith('WEBVTT'))) {
        content = convertSrtToVtt(content);
      }

      const cachedPath = path.join(SUBTITLE_CACHE_DIR, `${contentHash}.vtt`);
      fs.writeFileSync(cachedPath, content, 'utf-8');

      const savedFileName = path.basename(cachedPath);
      const localUrl = `/api/subtitles/file/${contentHash}`;

      const savedData = {
        imdbId,
        season: season ? parseInt(season as string) : undefined,
        episode: episode ? parseInt(episode as string) : undefined,
        language,
        url: localUrl,
        fileName: savedFileName
      };

      const savedSub = await storage.saveSubtitle(savedData);

      res.json({ success: true, subtitle: savedSub });
    } catch (error: any) {
      console.error("[Admin] ❌ Subtitle upload error:", error.message);
      res.status(500).json({ error: "Upload failed", details: error.message });
    }
  });

  // Admin endpoint to delete a saved subtitle
  app.delete("/api/admin/subtitles/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const imdbId = req.query.imdbId as string;
      const season = req.query.season as string;
      const episode = req.query.episode as string;

      if (imdbId) {
        // Find it first to delete cache file
        const eps = episode ? parseInt(episode) : undefined;
        const ssn = season ? parseInt(season) : undefined;
        const subs = await storage.getSavedSubtitles(imdbId, ssn, eps);
        const sub = subs.find(s => s.id === id);
        
        if (sub && sub.url) {
            const hash = sub.url.split('/').pop();
            if (hash) deleteSubtitleFile(hash);
        }
      }

      await storage.deleteSavedSubtitle(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete subtitle" });
    }
  });

  // Admin endpoint to delete ALL subtitles for a content
  app.delete("/api/admin/subtitles", requireAdmin, async (req, res) => {
    try {
      const imdbId = req.query.imdbId as string;
      const season = req.query.season as string;
      const episode = req.query.episode as string;
      
      if (!imdbId) return res.status(400).json({ error: "imdbId required for bulk delete" });

      const eps = episode ? parseInt(episode) : undefined;
      const ssn = season ? parseInt(season) : undefined;
      const subs = await storage.getSavedSubtitles(imdbId, ssn, eps);

      let deletedCount = 0;
      for (const sub of subs) {
          await storage.deleteSavedSubtitle(sub.id);
          if (sub.url) {
              const hash = sub.url.split('/').pop();
              if (hash) deleteSubtitleFile(hash);
          }
          deletedCount++;
      }
      
      res.json({ success: true, deleted: deletedCount });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete all subtitles" });
    }
  });

  // Public endpoint for players to query assigned subtitles
  app.get("/api/subtitles/saved", async (req, res) => {
    try {
      const imdbId = req.query.imdbId as string;
      const season = req.query.season ? parseInt(req.query.season as string) : undefined;
      const episode = req.query.episode ? parseInt(req.query.episode as string) : undefined;

      if (!imdbId) {
        return res.status(400).json({ error: "imdbId parameter required" });
      }

      const savedSubtitles = await storage.getSavedSubtitles(imdbId, season, episode);

      // Map to the simple format the players expect: { url, language }
      const subtitles = savedSubtitles.map(s => ({
        url: s.url,
        language: s.language
      }));

      res.json({ subtitles });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch saved subtitles" });
    }
  });

  // Serve cached subtitle file by hash
  app.get("/api/subtitles/file/:hash", async (req, res) => {
    try {
      const hash = req.params.hash;
      const cachedPath = getCachedSubtitle(hash);

      if (!cachedPath) {
        return res.status(404).json({ error: "Subtitle not found in cache" });
      }

      res.setHeader('Content-Type', 'text/vtt');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const fs = await import('fs');
      const content = fs.readFileSync(cachedPath, 'utf-8');
      res.send(content);
    } catch (error: any) {
      console.error("❌ Subtitle file error:", error.message);
      res.status(500).json({ error: "File read failed", details: error.message });
    }
  });

  // ============================================
  // Widget Analytics - Track clicks from WorthCrete
  // ============================================

  // In-memory storage for widget analytics (use database in production)
  interface WidgetClick {
    timestamp: Date;
    referrer: string;
    userAgent: string;
    ip: string;
  }

  const widgetAnalytics = {
    clicks: [] as WidgetClick[],
    views: [] as { timestamp: Date; referrer: string }[]
  };

  // Track widget click
  app.post("/api/widget/click", (req, res) => {
    try {
      const referrer = req.headers.referer || req.body.referrer || "direct";
      const userAgent = req.headers["user-agent"] || "unknown";
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

      widgetAnalytics.clicks.push({
        timestamp: new Date(),
        referrer: referrer as string,
        userAgent: userAgent as string,
        ip: ip as string
      });

      console.log(`📊 Widget click from: ${referrer}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // Track widget view (impression)
  app.post("/api/widget/view", (req, res) => {
    try {
      const referrer = req.headers.referer || req.body.referrer || "direct";

      widgetAnalytics.views.push({
        timestamp: new Date(),
        referrer: referrer as string
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track view" });
    }
  });

  // Get widget analytics (admin only)
  app.get("/api/widget/analytics", requireAdmin, (req, res) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate stats
      const todayClicks = widgetAnalytics.clicks.filter(c => c.timestamp >= today).length;
      const weekClicks = widgetAnalytics.clicks.filter(c => c.timestamp >= weekAgo).length;
      const monthClicks = widgetAnalytics.clicks.filter(c => c.timestamp >= monthAgo).length;
      const totalClicks = widgetAnalytics.clicks.length;

      const todayViews = widgetAnalytics.views.filter(v => v.timestamp >= today).length;
      const weekViews = widgetAnalytics.views.filter(v => v.timestamp >= weekAgo).length;
      const monthViews = widgetAnalytics.views.filter(v => v.timestamp >= monthAgo).length;
      const totalViews = widgetAnalytics.views.length;

      // Group by referrer
      const clicksByReferrer: Record<string, number> = {};
      widgetAnalytics.clicks.forEach(c => {
        try {
          const url = new URL(c.referrer);
          const domain = url.hostname;
          clicksByReferrer[domain] = (clicksByReferrer[domain] || 0) + 1;
        } catch {
          clicksByReferrer["direct"] = (clicksByReferrer["direct"] || 0) + 1;
        }
      });

      // Daily clicks for chart (last 7 days)
      const dailyClicks: { date: string; clicks: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const clicks = widgetAnalytics.clicks.filter(
          c => c.timestamp >= date && c.timestamp < nextDate
        ).length;
        dailyClicks.push({
          date: date.toISOString().split("T")[0],
          clicks
        });
      }

      // Recent clicks
      const recentClicks = widgetAnalytics.clicks
        .slice(-20)
        .reverse()
        .map(c => ({
          timestamp: c.timestamp,
          referrer: c.referrer,
          userAgent: c.userAgent.substring(0, 50)
        }));

      res.json({
        summary: {
          clicks: { today: todayClicks, week: weekClicks, month: monthClicks, total: totalClicks },
          views: { today: todayViews, week: weekViews, month: monthViews, total: totalViews },
          ctr: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) + "%" : "N/A"
        },
        clicksByReferrer,
        dailyClicks,
        recentClicks
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // ============================================
  // Site Analytics - Track visitors and content
  // ============================================

  interface PageView {
    timestamp: Date;
    path: string;
    referrer: string;
    userAgent: string;
    sessionId: string;
    ip: string;
  }

  interface WatchEvent {
    timestamp: Date;
    contentType: 'show' | 'movie';
    contentId: string;
    contentTitle: string;
    episodeId?: string;
    duration: number; // seconds watched
    sessionId: string;
  }

  const siteAnalytics = {
    pageViews: [] as PageView[],
    watchEvents: [] as WatchEvent[],
    activeSessions: new Map<string, { lastSeen: Date; pages: number }>()
  };

  // Clean up old sessions every 5 minutes
  setInterval(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    siteAnalytics.activeSessions.forEach((data, sessionId) => {
      if (data.lastSeen < fiveMinutesAgo) {
        siteAnalytics.activeSessions.delete(sessionId);
      }
    });
  }, 60 * 1000);

  // Track page view
  app.post("/api/analytics/pageview", (req, res) => {
    try {
      const { path, sessionId } = req.body;
      const referrer = req.headers.referer || req.body.referrer || "direct";
      const userAgent = req.headers["user-agent"] || "unknown";
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown") as string;

      siteAnalytics.pageViews.push({
        timestamp: new Date(),
        path: path || "/",
        referrer: referrer as string,
        userAgent: userAgent as string,
        sessionId: sessionId || "anonymous",
        ip: ip.split(",")[0].trim()
      });

      // Update active session
      const session = siteAnalytics.activeSessions.get(sessionId) || { lastSeen: new Date(), pages: 0 };
      session.lastSeen = new Date();
      session.pages++;
      siteAnalytics.activeSessions.set(sessionId, session);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track pageview" });
    }
  });

  // Track watch event
  app.post("/api/analytics/watch", (req, res) => {
    try {
      const { contentType, contentId, contentTitle, episodeId, duration, sessionId } = req.body;

      siteAnalytics.watchEvents.push({
        timestamp: new Date(),
        contentType,
        contentId,
        contentTitle,
        episodeId,
        duration: duration || 0,
        sessionId: sessionId || "anonymous"
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track watch" });
    }
  });

  // Get site analytics (admin only)
  app.get("/api/analytics/site", requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Page view stats
      const todayViews = siteAnalytics.pageViews.filter(p => p.timestamp >= today).length;
      const weekViews = siteAnalytics.pageViews.filter(p => p.timestamp >= weekAgo).length;
      const monthViews = siteAnalytics.pageViews.filter(p => p.timestamp >= monthAgo).length;
      const totalViews = siteAnalytics.pageViews.length;

      // Unique visitors (by sessionId)
      const todayVisitors = new Set(siteAnalytics.pageViews.filter(p => p.timestamp >= today).map(p => p.sessionId)).size;
      const weekVisitors = new Set(siteAnalytics.pageViews.filter(p => p.timestamp >= weekAgo).map(p => p.sessionId)).size;
      const totalVisitors = new Set(siteAnalytics.pageViews.map(p => p.sessionId)).size;

      // Active users (sessions in last 5 mins)
      const activeUsers = siteAnalytics.activeSessions.size;

      // Popular pages
      const pageCounts: Record<string, number> = {};
      siteAnalytics.pageViews.forEach(p => {
        pageCounts[p.path] = (pageCounts[p.path] || 0) + 1;
      });
      const popularPages = Object.entries(pageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([path, views]) => ({ path, views }));

      // Traffic sources
      const sourceCounts: Record<string, number> = {};
      siteAnalytics.pageViews.forEach(p => {
        try {
          if (p.referrer === "direct" || !p.referrer) {
            sourceCounts["Direct"] = (sourceCounts["Direct"] || 0) + 1;
          } else {
            const url = new URL(p.referrer);
            const domain = url.hostname.replace("www.", "");
            sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
          }
        } catch {
          sourceCounts["Direct"] = (sourceCounts["Direct"] || 0) + 1;
        }
      });
      const trafficSources = Object.entries(sourceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([source, visits]) => ({ source, visits }));

      // Device stats
      const deviceCounts = { mobile: 0, desktop: 0, tablet: 0 };
      siteAnalytics.pageViews.forEach(p => {
        const ua = p.userAgent.toLowerCase();
        if (ua.includes("mobile") || ua.includes("android")) {
          deviceCounts.mobile++;
        } else if (ua.includes("tablet") || ua.includes("ipad")) {
          deviceCounts.tablet++;
        } else {
          deviceCounts.desktop++;
        }
      });

      // Browser stats
      const browserCounts: Record<string, number> = {};
      siteAnalytics.pageViews.forEach(p => {
        const ua = p.userAgent;
        let browser = "Other";
        if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
        else if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
        else if (ua.includes("Edg")) browser = "Edge";
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      });

      // Watch stats - top content
      const showWatchCounts: Record<string, { title: string; watches: number; duration: number }> = {};
      const movieWatchCounts: Record<string, { title: string; watches: number; duration: number }> = {};

      siteAnalytics.watchEvents.forEach(w => {
        if (w.contentType === "show") {
          if (!showWatchCounts[w.contentId]) {
            showWatchCounts[w.contentId] = { title: w.contentTitle, watches: 0, duration: 0 };
          }
          showWatchCounts[w.contentId].watches++;
          showWatchCounts[w.contentId].duration += w.duration;
        } else {
          if (!movieWatchCounts[w.contentId]) {
            movieWatchCounts[w.contentId] = { title: w.contentTitle, watches: 0, duration: 0 };
          }
          movieWatchCounts[w.contentId].watches++;
          movieWatchCounts[w.contentId].duration += w.duration;
        }
      });

      const topShows = Object.entries(showWatchCounts)
        .sort(([, a], [, b]) => b.watches - a.watches)
        .slice(0, 10)
        .map(([id, data]) => ({ id, ...data }));

      const topMovies = Object.entries(movieWatchCounts)
        .sort(([, a], [, b]) => b.watches - a.watches)
        .slice(0, 10)
        .map(([id, data]) => ({ id, ...data }));

      // Total watch time
      const totalWatchTime = siteAnalytics.watchEvents.reduce((sum, w) => sum + w.duration, 0);

      // Daily views for chart (last 7 days)
      const dailyViews: { date: string; views: number; visitors: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const dayViews = siteAnalytics.pageViews.filter(
          p => p.timestamp >= date && p.timestamp < nextDate
        );
        dailyViews.push({
          date: date.toISOString().split("T")[0],
          views: dayViews.length,
          visitors: new Set(dayViews.map(p => p.sessionId)).size
        });
      }

      // Hourly activity (last 24 hours)
      const hourlyActivity: { hour: number; views: number }[] = [];
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      for (let h = 0; h < 24; h++) {
        const hourViews = siteAnalytics.pageViews.filter(p => {
          if (p.timestamp < dayAgo) return false;
          return p.timestamp.getHours() === h;
        }).length;
        hourlyActivity.push({ hour: h, views: hourViews });
      }

      // Recent activity
      const recentPageViews = siteAnalytics.pageViews
        .slice(-20)
        .reverse()
        .map(p => ({
          timestamp: p.timestamp,
          path: p.path,
          referrer: p.referrer.substring(0, 50)
        }));

      // Badge stats
      const badgeStats = await storage.getBadgeStats();

      res.json({
        overview: {
          pageViews: { today: todayViews, week: weekViews, month: monthViews, total: totalViews },
          visitors: { today: todayVisitors, week: weekVisitors, total: totalVisitors },
          activeUsers,
          totalWatchTimeHours: Math.round(totalWatchTime / 3600 * 10) / 10
        },
        dailyViews,
        hourlyActivity,
        popularPages,
        trafficSources,
        devices: deviceCounts,
        browsers: browserCounts,
        topShows,
        topMovies,
        recentPageViews,
        badgeStats
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // Admin Analytics - User Stats
  app.get("/api/admin/stats/users", requireAdmin, async (_req, res) => {
    try {
      // 1. Get User Counts
      const users = await storage.getAllUsers();
      const totalUsers = users.length;
      const activeUsers = users.length;

      // 2. Get Guest Subscribers (Emails)
      let subscribers: string[] = [];
      if (existsSync(SUBSCRIBERS_FILE)) {
        const fileContent = readFileSync(SUBSCRIBERS_FILE, 'utf-8');
        const data = JSON.parse(fileContent);
        if (Array.isArray(data)) {
          subscribers = data;
        } else if (data.subscribers && Array.isArray(data.subscribers)) {
          subscribers = data.subscribers.map((s: any) => typeof s === 'string' ? s : s.email);
        }
      }

      res.json({
        totalUsers,
        activeUsers,
        subscribers
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // ============================================
  // BADGE MANAGEMENT ROUTES
  // ============================================



  // Create badge (Admin only)
  app.post("/api/admin/badges", requireAdmin, async (req, res) => {
    try {
      const badge = await storage.createBadge(req.body);
      res.json(badge);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update badge (Admin only)
  app.patch("/api/admin/badges/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`🔧 Updating badge ${id} with:`, req.body); // DEBUG LOG
      const badge = await storage.updateBadge(id, req.body);
      if (!badge) return res.status(404).json({ error: "Badge not found" });
      res.json(badge);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete badge (Admin only)
  app.delete("/api/admin/badges/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      // Note: Ideally check for user badges constraints, but strict deletion allowed for now
      await storage.deleteBadge(id);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });


  // ==========================================
  // URL Health Check Routes
  // ==========================================

  // ── URL Health Check: Background Job Pattern ──
  // In-memory job state (survives across requests, cleared on restart)
  let healthCheckJob: {
    status: 'idle' | 'running' | 'done' | 'error';
    startedAt?: Date;
    completedAt?: Date;
    checked: number;
    total: number;
    report?: any;
    error?: string;
  } = { status: 'idle', checked: 0, total: 0 };

  // Start a health check (POST) — returns immediately, runs in background
  app.post("/api/admin/url-health/start", requireAdmin, async (req, res) => {
    if (healthCheckJob.status === 'running') {
      return res.json({ message: "Health check already running", status: healthCheckJob.status, checked: healthCheckJob.checked, total: healthCheckJob.total });
    }

    const archiveOnly = req.body.archiveOnly !== false; // default true
    const limit = req.body.limit || 0;

    // Reset job state
    healthCheckJob = { status: 'running', startedAt: new Date(), checked: 0, total: 0 };

    // Fire and forget — runs in background
    (async () => {
      try {
        const { checkUrl } = await import("./url-health");

        const episodes = await storage.getAllEpisodes();
        const animeEpisodes = await storage.getAllAnimeEpisodes();
        const movies = await storage.getAllMovies();
        const shows = await storage.getAllShows();
        const anime = await storage.getAllAnime();

        // Build lookup maps
        const showMap = new Map(shows.map((s: any) => [s.id, s.title]));
        const animeMap = new Map(anime.map((a: any) => [a.id, a.title]));

        const shouldCheck = (url: string | null | undefined) => {
          if (!url) return false;
          if (archiveOnly) return url.includes('archive.org');
          return !url.includes('drive.google.com');
        };

        // Collect URLs
        const urlsToCheck: any[] = [];

        for (const ep of episodes) {
          if (shouldCheck(ep.videoUrl)) {
            urlsToCheck.push({ id: ep.id, type: 'episode', title: ep.title, parentTitle: showMap.get(ep.showId) || 'Unknown Show', season: ep.season, episodeNumber: ep.episodeNumber, url: ep.videoUrl, urlField: 'videoUrl' });
          } else if (shouldCheck(ep.googleDriveUrl)) {
            urlsToCheck.push({ id: ep.id, type: 'episode', title: ep.title, parentTitle: showMap.get(ep.showId) || 'Unknown Show', season: ep.season, episodeNumber: ep.episodeNumber, url: ep.googleDriveUrl, urlField: 'googleDriveUrl' });
          }
          // Check alternative audio track URLs
          if (ep.audioTracks) {
            try {
              const tracks = typeof ep.audioTracks === 'string' ? JSON.parse(ep.audioTracks) : ep.audioTracks;
              if (Array.isArray(tracks)) {
                for (const track of tracks) {
                  if (track.url && shouldCheck(track.url)) {
                    urlsToCheck.push({ id: ep.id, type: 'episode', title: `${ep.title} [${track.language || 'Alt'} Audio]`, parentTitle: showMap.get(ep.showId) || 'Unknown Show', season: ep.season, episodeNumber: ep.episodeNumber, url: track.url, urlField: `audioTrack:${track.language}` });
                  }
                }
              }
            } catch {}
          }
        }

        for (const ep of animeEpisodes) {
          if (shouldCheck(ep.videoUrl)) {
            urlsToCheck.push({ id: ep.id, type: 'animeEpisode', title: ep.title, parentTitle: animeMap.get(ep.animeId) || 'Unknown Anime', season: ep.season, episodeNumber: ep.episodeNumber, url: ep.videoUrl, urlField: 'videoUrl' });
          } else if (shouldCheck(ep.googleDriveUrl)) {
            urlsToCheck.push({ id: ep.id, type: 'animeEpisode', title: ep.title, parentTitle: animeMap.get(ep.animeId) || 'Unknown Anime', season: ep.season, episodeNumber: ep.episodeNumber, url: ep.googleDriveUrl, urlField: 'googleDriveUrl' });
          }
          // Check alternative audio track URLs
          if (ep.audioTracks) {
            try {
              const tracks = typeof ep.audioTracks === 'string' ? JSON.parse(ep.audioTracks) : ep.audioTracks;
              if (Array.isArray(tracks)) {
                for (const track of tracks) {
                  if (track.url && shouldCheck(track.url)) {
                    urlsToCheck.push({ id: ep.id, type: 'animeEpisode', title: `${ep.title} [${track.language || 'Alt'} Audio]`, parentTitle: animeMap.get(ep.animeId) || 'Unknown Anime', season: ep.season, episodeNumber: ep.episodeNumber, url: track.url, urlField: `audioTrack:${track.language}` });
                  }
                }
              }
            } catch {}
          }
        }

        for (const movie of movies) {
          if (shouldCheck(movie.googleDriveUrl)) {
            urlsToCheck.push({ id: movie.id, type: 'movie', title: movie.title, parentTitle: 'Movie', url: movie.googleDriveUrl, urlField: 'googleDriveUrl' });
          }
          // Check alternative audio track URLs
          if ((movie as any).audioTracks) {
            try {
              const tracks = typeof (movie as any).audioTracks === 'string' ? JSON.parse((movie as any).audioTracks) : (movie as any).audioTracks;
              if (Array.isArray(tracks)) {
                for (const track of tracks) {
                  if (track.url && shouldCheck(track.url)) {
                    urlsToCheck.push({ id: movie.id, type: 'movie', title: `${movie.title} [${track.language || 'Alt'} Audio]`, parentTitle: 'Movie', url: track.url, urlField: `audioTrack:${track.language}` });
                  }
                }
              }
            } catch {}
          }
        }

        const toCheck = limit > 0 ? urlsToCheck.slice(0, limit) : urlsToCheck;
        healthCheckJob.total = toCheck.length;

        const brokenItems: any[] = [];
        const summary = { episodes: { total: 0, broken: 0 }, animeEpisodes: { total: 0, broken: 0 }, movies: { total: 0, broken: 0 } };

        // Count totals by type
        for (const item of toCheck) {
          if (item.type === 'episode') summary.episodes.total++;
          if (item.type === 'animeEpisode') summary.animeEpisodes.total++;
          if (item.type === 'movie') summary.movies.total++;
        }

        // Check in batches of 50
        const batchSize = 50;
        for (let i = 0; i < toCheck.length; i += batchSize) {
          const batch = toCheck.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (item: any) => {
              const result = await checkUrl(item.url);
              return { item, result };
            })
          );

          for (const { item, result } of results) {
            if (!result.valid) {
              brokenItems.push({ ...item, checkResult: result });
              if (item.type === 'episode') summary.episodes.broken++;
              if (item.type === 'animeEpisode') summary.animeEpisodes.broken++;
              if (item.type === 'movie') summary.movies.broken++;
            }
          }

          healthCheckJob.checked = Math.min(i + batchSize, toCheck.length);
        }

        healthCheckJob.report = {
          checkedAt: new Date(),
          totalChecked: toCheck.length,
          valid: toCheck.length - brokenItems.length,
          broken: brokenItems.length,
          brokenItems,
          summary,
        };
        healthCheckJob.status = 'done';
        healthCheckJob.completedAt = new Date();
        console.log(`✅ URL health check complete: ${toCheck.length} checked, ${brokenItems.length} broken`);
      } catch (err: any) {
        healthCheckJob.status = 'error';
        healthCheckJob.error = err.message;
        console.error("❌ URL health check background job failed:", err);
      }
    })();

    res.json({ message: "Health check started", status: "running", total: 0 });
  });

  // Poll health check status (GET) — lightweight, returns instantly
  app.get("/api/admin/url-health/status", requireAdmin, async (_req, res) => {
    res.json({
      status: healthCheckJob.status,
      checked: healthCheckJob.checked,
      total: healthCheckJob.total,
      startedAt: healthCheckJob.startedAt,
      completedAt: healthCheckJob.completedAt,
      report: healthCheckJob.status === 'done' ? healthCheckJob.report : undefined,
      error: healthCheckJob.error,
    });
  });

  // Keep the old GET endpoint for backwards compatibility — now just returns last result or starts a new check
  app.get("/api/admin/url-health", requireAdmin, async (req, res) => {
    // If a completed report exists, return it
    if (healthCheckJob.status === 'done' && healthCheckJob.report) {
      return res.json(healthCheckJob.report);
    }
    // If running, return progress
    if (healthCheckJob.status === 'running') {
      return res.json({ status: 'running', checked: healthCheckJob.checked, total: healthCheckJob.total, message: 'Health check in progress. Poll /api/admin/url-health/status for updates.' });
    }
    // Otherwise return idle
    res.json({ status: 'idle', message: 'No health check has been run. POST to /api/admin/url-health/start to begin.' });
  });

  // Check for pending/incomplete content (Admin)
  // Optimized: batched concurrent TMDB lookups + overall timeout to prevent 504
  app.get("/api/admin/pending-content", requireAdmin, async (req, res) => {
    try {
      const shows = await storage.getAllShows();
      const animeList = await storage.getAllAnime();

      const pendingShows: any[] = [];
      const pendingAnime: any[] = [];

      // Helper: process a batch of items concurrently
      async function processBatch<T>(
        items: T[],
        handler: (item: T) => Promise<void>,
        concurrency = 5
      ) {
        for (let i = 0; i < items.length; i += concurrency) {
          const batch = items.slice(i, i + concurrency);
          await Promise.all(batch.map(handler));
        }
      }

      // Helper: TMDB lookup with per-item timeout (3s)
      async function tmdbLookup(title: string): Promise<{ tmdbId: number | null; details: any }> {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);

          const tmdbId = await Promise.race([
            searchShow(title),
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 3000)
            )
          ]).catch(() => null);

          clearTimeout(timeout);

          if (!tmdbId) return { tmdbId: null, details: null };

          const details = await Promise.race([
            getShowDetails(tmdbId),
            new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 3000)
            )
          ]).catch(() => null);

          return { tmdbId, details };
        } catch {
          return { tmdbId: null, details: null };
        }
      }

      // ── Process Shows ──
      // First pass: quick check for shows with zero episodes (no TMDB needed)
      const showsNeedingTmdb: typeof shows = [];

      for (const show of shows) {
        const episodes = await storage.getEpisodesByShowId(show.id);

        if (episodes.length === 0) {
          pendingShows.push({
            id: show.id,
            title: show.title,
            posterUrl: show.posterUrl,
            localEpisodes: 0,
            tmdbEpisodes: null,
            status: "No Episodes",
            missing: "All Episodes"
          });
        } else {
          showsNeedingTmdb.push({ ...show, _episodes: episodes } as any);
        }
      }

      // Second pass: batch TMDB lookups for shows with episodes
      await processBatch(showsNeedingTmdb, async (show: any) => {
        const episodes = show._episodes;
        const { details: tmdbDetails } = await tmdbLookup(show.title);

        if (tmdbDetails && tmdbDetails.number_of_episodes > episodes.length) {
          const missing: string[] = [];
          const localMap = new Set(episodes.map((e: any) => `S${e.season}E${e.episodeNumber}`));

          for (const season of tmdbDetails.seasons) {
            if (season.season_number === 0) continue;
            const seasonEpisodes = episodes.filter((e: any) => e.season === season.season_number);
            if (seasonEpisodes.length < season.episode_count) {
              if (season.episode_count - seasonEpisodes.length <= 5) {
                for (let i = 1; i <= season.episode_count; i++) {
                  if (!localMap.has(`S${season.season_number}E${i}`)) {
                    missing.push(`S${season.season_number}E${i}`);
                  }
                }
              } else {
                missing.push(`Season ${season.season_number} (incomplete)`);
              }
            }
          }

          if (missing.length > 0) {
            pendingShows.push({
              id: show.id,
              title: show.title,
              posterUrl: show.posterUrl,
              localEpisodes: episodes.length,
              tmdbEpisodes: tmdbDetails.number_of_episodes,
              status: "Incomplete",
              missing: missing.slice(0, 5).join(", ") + (missing.length > 5 ? "..." : "")
            });
          }
        }
      }, 5);

      // ── Process Anime ──
      const animeNeedingTmdb: typeof animeList = [];

      for (const item of animeList) {
        const episodes = await storage.getAnimeEpisodesByAnimeId(item.id);

        if (episodes.length === 0) {
          pendingAnime.push({
            id: item.id,
            title: item.title,
            posterUrl: item.posterUrl,
            localEpisodes: 0,
            tmdbEpisodes: item.totalEpisodes || null,
            status: "No Episodes",
            missing: "All Episodes"
          });
        } else if (item.totalEpisodes && episodes.length < item.totalEpisodes) {
          // We already have totalEpisodes locally — no TMDB needed
          pendingAnime.push({
            id: item.id,
            title: item.title,
            posterUrl: item.posterUrl,
            localEpisodes: episodes.length,
            tmdbEpisodes: item.totalEpisodes,
            status: "Incomplete",
            missing: `${item.totalEpisodes - episodes.length} episodes missing (Source: Local Metadata)`
          });
        } else if (!item.totalEpisodes) {
          animeNeedingTmdb.push({ ...item, _episodes: episodes } as any);
        }
      }

      // Batch TMDB lookups for anime without totalEpisodes
      await processBatch(animeNeedingTmdb, async (item: any) => {
        const episodes = item._episodes;
        const { details: tmdbDetails } = await tmdbLookup(item.title);

        const targetCount = tmdbDetails?.number_of_episodes;
        if (targetCount && episodes.length < targetCount) {
          pendingAnime.push({
            id: item.id,
            title: item.title,
            posterUrl: item.posterUrl,
            localEpisodes: episodes.length,
            tmdbEpisodes: targetCount,
            status: "Incomplete",
            missing: `${targetCount - episodes.length} episodes missing (Source: TMDB)`
          });
        }
      }, 5);

      res.json({
        shows: pendingShows,
        anime: pendingAnime,
        partial: false
      });
    } catch (error) {
      console.error("Pending content check error:", error);
      res.status(500).json({ error: "Failed to check pending content" });
    }
  });

  // Detailed analysis for a single show/anime pending content
  app.get("/api/admin/pending-content/:type/:id", requireAdmin, async (req, res) => {
    try {
      const { type, id } = req.params;

      let content: any;
      let episodes: any[] = [];

      if (type === 'show') {
        const shows = await storage.getAllShows();
        content = shows.find(s => s.id === id);
        if (!content) return res.status(404).json({ error: "Show not found" });
        episodes = await storage.getEpisodesByShowId(id);
      } else if (type === 'anime') {
        const animeList = await storage.getAllAnime();
        content = animeList.find(a => a.id === id);
        if (!content) return res.status(404).json({ error: "Anime not found" });
        episodes = await storage.getAnimeEpisodesByAnimeId(id);
      } else {
        return res.status(400).json({ error: "Type must be 'show' or 'anime'" });
      }

      // Build local season map
      const localSeasons: Record<number, { episodes: number[]; total: number }> = {};
      for (const ep of episodes) {
        const s = ep.season;
        if (!localSeasons[s]) localSeasons[s] = { episodes: [], total: 0 };
        localSeasons[s].episodes.push(ep.episodeNumber);
        localSeasons[s].total++;
      }

      // Get TMDB data (with retry for rate limiting)
      let tmdbData: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const tmdbId = await searchShow(content.title);
        if (tmdbId) {
          tmdbData = await getShowDetails(tmdbId);
          if (tmdbData) break;
        }
        if (attempt < 1) await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
      }

      // For anime, use local totalEpisodes as fallback if TMDB fails
      const fallbackTotalEpisodes = type === 'anime' && content.totalEpisodes ? content.totalEpisodes : null;

      // Build per-season analysis
      const seasonAnalysis: any[] = [];

      if (tmdbData && tmdbData.seasons) {
        for (const tmdbSeason of tmdbData.seasons) {
          if (tmdbSeason.season_number === 0) continue; // skip specials

          const local = localSeasons[tmdbSeason.season_number];
          const localEps = local ? local.episodes.sort((a: number, b: number) => a - b) : [];
          const tmdbCount = tmdbSeason.episode_count;

          // Find missing episodes
          const missingEps: number[] = [];
          for (let i = 1; i <= tmdbCount; i++) {
            if (!localEps.includes(i)) missingEps.push(i);
          }

          seasonAnalysis.push({
            season: tmdbSeason.season_number,
            tmdbEpisodeCount: tmdbCount,
            localEpisodeCount: localEps.length,
            airDate: tmdbSeason.air_date,
            localEpisodes: localEps,
            missingEpisodes: missingEps,
            status: missingEps.length === 0 ? 'complete' :
              localEps.length === 0 ? 'empty' : 'incomplete',
            completionPercent: tmdbCount > 0 ? Math.round((localEps.length / tmdbCount) * 100) : 100
          });
        }
      } else {
        // No TMDB data — just show local seasons
        for (const [seasonNum, data] of Object.entries(localSeasons)) {
          seasonAnalysis.push({
            season: parseInt(seasonNum),
            tmdbEpisodeCount: null,
            localEpisodeCount: data.total,
            airDate: null,
            localEpisodes: data.episodes.sort((a: number, b: number) => a - b),
            missingEpisodes: [],
            status: 'unknown',
            completionPercent: null
          });
        }
      }

      res.json({
        id: content.id,
        title: content.title,
        posterUrl: content.posterUrl,
        backdropUrl: content.backdropUrl,
        year: content.year,
        genres: content.genres,
        rating: content.rating,
        imdbRating: content.imdbRating,
        totalSeasons: content.totalSeasons,
        totalLocalEpisodes: episodes.length,
        totalTmdbEpisodes: tmdbData?.number_of_episodes || fallbackTotalEpisodes,
        tmdbStatus: tmdbData?.status || null,
        seasonAnalysis,
        overallCompletion: (tmdbData?.number_of_episodes || fallbackTotalEpisodes)
          ? Math.round((episodes.length / (tmdbData?.number_of_episodes || fallbackTotalEpisodes)) * 100)
          : null
      });
    } catch (error) {
      console.error("Pending content detail error:", error);
      res.status(500).json({ error: "Failed to fetch content details" });
    }
  });



  // Check a single URL
  app.post("/api/admin/url-health/check-single", requireAdmin, async (req, res) => {
    try {
      const { checkUrl } = await import("./url-health");
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const result = await checkUrl(url);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to check URL" });
    }
  });

  // Sync system achievements to badges DB
  app.post("/api/admin/badges/sync", requireAdmin, async (_req, res) => {
    try {
      const existingBadges = await storage.getBadges();
      const existingIds = new Set(existingBadges.map(b => b.id));

      let created = 0;

      for (const achievement of ACHIEVEMENTS) {
        if (!existingIds.has(achievement.id)) {
          // Force use of ID from achievement definition
          await storage.createBadge({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            imageUrl: "",
            category: "achievement",
            active: true
          });
          created++;
        }
      }

      res.json({ success: true, created, message: `Synced ${created} new achievements to database.` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Award badge to user (Admin only)
  app.post("/api/admin/badges/award", requireAdmin, async (req, res) => {
    try {
      const { userId, userIds, badgeId } = req.body;

      const targets = userIds || (userId ? [userId] : []);
      if (targets.length === 0) return res.status(400).json({ error: "No users specified" });

      const badge = await storage.getBadge(badgeId);
      if (!badge) return res.status(404).json({ error: "Badge not found" });

      const results = [];
      for (const uid of targets) {
        const user = await storage.getUserById(uid);
        if (!user) continue;

        await storage.awardBadge(uid, badgeId);

        // Notify User
        await storage.createNotification({
          userId: uid,
          type: 'achievement',
          title: 'New Badge Earned! 🏅',
          message: `You have been awarded the "${badge.name}" badge!`,
          data: { badgeId: badge.id, name: badge.name, icon: 'award' },
          read: false
        });
        results.push(uid);
      }

      res.json({ success: true, awardedCount: results.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/subscription/autorenew", async (req, res) => {
    try {
      const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: "Not authenticated" });
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Invalid token" });

      const { autoRenew } = req.body;
      if (typeof autoRenew !== 'boolean') {
        return res.status(400).json({ error: "autoRenew must be a boolean" });
      }

      const user = await storage.updateSubscriptionAutoRenew(payload.userId, autoRenew);
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Failed to update subscription settings" });
    }
  });

  const httpServer = createServer(app);

  // ============================================
  // Community Feed API
  // ============================================

  // Get community feed activities
  app.get("/api/feed", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const activities = await storage.getActivities(limit);

      // Transform for frontend if needed, or send as is
      // storage.getActivities already joins with user data

      res.json(activities);
    } catch (error) {
      console.error("Get feed error:", error);
      res.status(500).json({ error: "Failed to get feed" });
    }
  });

  return httpServer;
}
