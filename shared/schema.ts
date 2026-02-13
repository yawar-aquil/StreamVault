import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  socialLinks: text("social_links"), // JSON string: { twitter, instagram, youtube, tiktok, discord }
  favorites: text("favorites"), // JSON string: { shows: [], movies: [], anime: [] }
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  badges: text("badges").default("[]").notNull(), // JSON string: Array of Badge objects
  // Streak tracking
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastWatchDate: text("last_watch_date"), // ISO date string (YYYY-MM-DD)
  // Referral system
  referralCode: varchar("referral_code").unique(),
  referredBy: varchar("referred_by"),
  referralCount: integer("referral_count").default(0).notNull(),
  emailVerified: boolean("email_verified").default(false),
  coins: integer("coins").default(0).notNull(),
  activityVisible: boolean("activity_visible").default(true),
  settings: text("settings"), // JSON string for all user preferences
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Coin Transactions for wallet history
export const coinTransactions = pgTable("coin_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(), // Positive for credit, negative for debit
  type: text("type").notNull(), // "purchase", "spend", "gift", "refund", "bonus"
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON string for storing related IDs (stripeId, productId, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reminders table for scheduling
export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  contentId: varchar("content_id").notNull(), // showId, movieId, or animeId
  contentType: text("content_type").notNull(), // "show", "movie", "anime"
  title: text("title").notNull(),
  remindAt: timestamp("remind_at").notNull(),
  notified: boolean("notified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reviews table for user ratings and reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  contentType: text("content_type").notNull(), // "movie" | "show" | "anime"
  contentId: varchar("content_id").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  reviewText: text("review_text"),
  spoilerWarning: boolean("spoiler_warning").default(false),
  helpfulCount: integer("helpful_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertReviewSchema = createInsertSchema(reviews);
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// Review helpful votes
export const reviewHelpful = pgTable("review_helpful", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Challenges table for daily/weekly challenges
export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "daily" | "weekly"
  targetType: text("target_type").notNull(), // "watch_movie", "watch_show", "watch_anime", "watch_genre", "watch_count"
  targetValue: integer("target_value").notNull(), // e.g., 3 for "watch 3 movies"
  targetGenre: text("target_genre"), // Optional genre filter
  xpReward: integer("xp_reward").notNull(),
  badgeReward: text("badge_reward"), // Optional badge ID
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User challenge progress
export const userChallenges = pgTable("user_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  challengeId: varchar("challenge_id").notNull(),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  claimed: boolean("claimed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Polls table for community voting
export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  options: text("options").notNull(), // JSON array of option strings
  createdBy: varchar("created_by").notNull(), // admin user ID
  endDate: timestamp("end_date"),
  active: boolean("active").default(true),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Poll votes
export const pollVotes = pgTable("poll_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull(),
  userId: varchar("user_id").notNull(),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Badges table for custom image badges
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").default("general"), // "challenge", "achievement", "general"
  // Store integration
  price: integer("price").default(0), // Price in cents (0 = free/earned only)
  currency: text("currency").default("USD"),
  isForSale: boolean("is_for_sale").default(false), // Listed in store
  giftable: boolean("giftable").default(true), // Can be gifted to others
  displayPriority: integer("display_priority").default(0), // Higher = shown first
  isSpecial: boolean("is_special").default(false), // VIP, Sweetie - show next to username
  limited: boolean("limited").default(false), // Limited edition
  stock: integer("stock"), // null = unlimited
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Badges mapping (Many-to-Many)
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  badgeId: varchar("badge_id").notNull(),
  giftedFrom: varchar("gifted_from"), // userId who gifted this badge
  giftMessage: text("gift_message"),
  equipped: boolean("equipped").default(true), // Show in profile
  equippedAt: timestamp("equipped_at"), // When this badge was equipped (for ordering)
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

// User Inventory (for purchased items)
export const userInventory = pgTable("user_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  badgeId: varchar("badge_id").notNull(),
  quantity: integer("quantity").default(1),
  isGift: boolean("is_gift").default(false),
  giftedFrom: varchar("gifted_from"),
  giftMessage: text("gift_message"),
  purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
});

// Gift Transactions
export const giftTransactions = pgTable("gift_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  badgeId: varchar("badge_id").notNull(),
  message: text("message"),
  status: text("status").default("pending"), // pending, claimed, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
  claimedAt: timestamp("claimed_at"),
});

// Payment Transactions (placeholder for Stripe)
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntent: text("stripe_payment_intent"),
  amount: integer("amount").notNull(), // In cents
  currency: text("currency").default("USD"),
  status: text("status").default("pending"), // pending, completed, failed, refunded
  badgeIds: text("badge_ids").notNull(), // JSON array of badge IDs
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// XP History for time-based leaderboards
export const xpHistory = pgTable("xp_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  source: varchar("source", { length: 50 }).notNull(), // watch_movie, watch_show, watch_anime, streak_bonus, referral, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type XpHistoryEntry = typeof xpHistory.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, passwordHash: true }).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

// Social links schema
export const socialLinksSchema = z.object({
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  tiktok: z.string().optional(),
  discord: z.string().optional(),
}).optional();

// Favorites schema
export const favoritesSchema = z.object({
  shows: z.array(z.string()).optional(),
  movies: z.array(z.string()).optional(),
  anime: z.array(z.string()).optional(),
}).optional();

export const updateProfileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores").optional(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  socialLinks: socialLinksSchema,
  favorites: favoritesSchema,
});

export type SocialLinks = z.infer<typeof socialLinksSchema>;
export type Favorites = z.infer<typeof favoritesSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;


// Shows table
export const shows = pgTable("shows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  posterUrl: text("poster_url").notNull(),
  backdropUrl: text("backdrop_url").notNull(),
  year: integer("year").notNull(),
  rating: text("rating").notNull(), // e.g., "TV-MA", "PG-13"
  imdbRating: text("imdb_rating"), // e.g., "8.5"
  genres: text("genres").notNull(), // comma-separated string
  language: text("language").notNull(),
  totalSeasons: integer("total_seasons").notNull(),
  cast: text("cast"), // comma-separated string
  castDetails: text("cast_details"), // JSON string with cast photos and character names
  creators: text("creators"), // comma-separated string
  featured: boolean("featured").default(false),
  trending: boolean("trending").default(false),
  category: text("category"), // "action", "drama", "comedy", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Episodes table
export const episodes = pgTable("episodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  showId: varchar("show_id").notNull(),
  season: integer("season").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  duration: integer("duration").notNull(), // in minutes
  googleDriveUrl: text("google_drive_url").notNull(),
  videoUrl: text("video_url"), // New field for video URLs (Archive.org, etc.)
  airDate: text("air_date"),
});

// Movies table
export const movies = pgTable("movies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  posterUrl: text("poster_url").notNull(),
  backdropUrl: text("backdrop_url").notNull(),
  year: integer("year").notNull(),
  rating: text("rating").notNull(), // e.g., "PG-13", "R"
  imdbRating: text("imdb_rating"), // e.g., "8.5"
  genres: text("genres").notNull(), // comma-separated string
  language: text("language").notNull(),
  duration: integer("duration").notNull(), // in minutes
  cast: text("cast"), // comma-separated string
  castDetails: text("cast_details"), // JSON string with cast photos and character names
  directors: text("directors"), // comma-separated string
  googleDriveUrl: text("google_drive_url").notNull(),
  featured: boolean("featured").default(false),
  trending: boolean("trending").default(false),
  category: text("category"), // "action", "drama", "comedy", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Anime table (similar structure to Shows, for anime content)
export const anime = pgTable("anime", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  alternativeTitles: text("alternative_titles"), // Japanese title, romaji, etc.
  description: text("description").notNull(),
  posterUrl: text("poster_url").notNull(),
  backdropUrl: text("backdrop_url").notNull(),
  year: integer("year").notNull(),
  rating: text("rating").notNull(), // "TV-14", "TV-MA", "PG"
  imdbRating: text("imdb_rating"),
  malRating: text("mal_rating"), // MyAnimeList rating
  genres: text("genres").notNull(), // comma-separated string
  language: text("language").notNull().default("Japanese"),
  totalSeasons: integer("total_seasons").notNull(),
  totalEpisodes: integer("total_episodes"),
  status: text("status"), // "Ongoing", "Completed", "Upcoming"
  studio: text("studio"), // Animation studio
  cast: text("cast"), // Voice actors
  castDetails: text("cast_details"), // JSON string with cast photos and character names
  creators: text("creators"), // Directors/creators
  featured: boolean("featured").default(false),
  trending: boolean("trending").default(false),
  category: text("category"), // "action", "romance", "shonen", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Anime Episodes table
export const animeEpisodes = pgTable("anime_episodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  animeId: varchar("anime_id").notNull(),
  season: integer("season").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  duration: integer("duration").notNull(), // in minutes
  googleDriveUrl: text("google_drive_url").notNull(),
  videoUrl: text("video_url"), // Archive.org or other video URLs
  airDate: text("air_date"),
  dubbed: boolean("dubbed").default(false), // English dub available
});

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  episodeId: varchar("episode_id"), // null if it's a movie comment
  movieId: varchar("movie_id"), // null if it's an episode comment
  blogPostId: varchar("blog_post_id"), // NEW: null if not blog post comment
  animeEpisodeId: varchar("anime_episode_id"), // null if not anime comment
  parentId: varchar("parent_id"), // null if it's a top-level comment
  userId: varchar("user_id"), // Optional: link to registered user
  userName: text("user_name").notNull(),
  avatarUrl: text("avatar_url"), // Optional: snapshot of avatar or link
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Watchlist table (localStorage for MVP)
export const watchlistSchema = z.object({
  showId: z.string().optional(),
  movieId: z.string().optional(),
  animeId: z.string().optional(),
  addedAt: z.string(),
}).refine(data => data.showId || data.movieId || data.animeId, {
  message: "Either showId, movieId, or animeId must be provided"
});

// Viewing progress (localStorage for MVP)
export const viewingProgressSchema = z.object({
  showId: z.string().optional(),
  movieId: z.string().optional(),
  animeId: z.string().optional(),
  episodeId: z.string().optional(),
  season: z.number().optional(),
  episodeNumber: z.number().optional(),
  progress: z.number(), // seconds watched
  duration: z.number(), // total duration in seconds
  lastWatched: z.string(),
});

// Insert schemas
export const insertShowSchema = createInsertSchema(shows).omit({ id: true });
export const insertEpisodeSchema = createInsertSchema(episodes).omit({ id: true });
export const insertMovieSchema = createInsertSchema(movies).omit({ id: true });
export const insertAnimeSchema = createInsertSchema(anime).omit({ id: true });
export const insertAnimeEpisodeSchema = createInsertSchema(animeEpisodes).omit({ id: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true, createdAt: true });
export const insertCoinTransactionSchema = createInsertSchema(coinTransactions);
export const selectCoinTransactionSchema = createInsertSchema(coinTransactions);

// Select types
export type Show = typeof shows.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Movie = typeof movies.$inferSelect;
export type Anime = typeof anime.$inferSelect;
export type AnimeEpisode = typeof animeEpisodes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type InsertShow = z.infer<typeof insertShowSchema>;
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type InsertAnime = z.infer<typeof insertAnimeSchema>;
export type InsertAnimeEpisode = z.infer<typeof insertAnimeEpisodeSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type WatchlistItem = z.infer<typeof watchlistSchema>;
export type ViewingProgress = z.infer<typeof viewingProgressSchema>;
export type CoinTransaction = z.infer<typeof selectCoinTransactionSchema>;

// Blog posts table
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  contentType: text("content_type").notNull(), // "movie", "show", or "anime"
  contentId: varchar("content_id"), // Reference to movie, show, or anime ID (optional)
  featuredImage: text("featured_image").notNull(),
  excerpt: text("excerpt").notNull(), // Short description for cards
  content: text("content").notNull(), // Full HTML/Markdown content
  plotSummary: text("plot_summary"), // Detailed plot
  review: text("review"), // Review section
  boxOffice: text("box_office"), // Box office info (JSON string)
  trivia: text("trivia"), // Fun facts (JSON array string)
  behindTheScenes: text("behind_the_scenes"), // Production info
  awards: text("awards"), // Awards info
  keywords: text("keywords"), // TMDB keywords (JSON array string)
  seasonDetails: text("season_details"), // Season info for shows (JSON array string)
  // NEW: Production company & external links for SEO backlinks
  productionCompanies: text("production_companies"), // JSON: [{name, logoUrl, website}]
  externalLinks: text("external_links"), // JSON: {imdb, facebook, twitter, instagram, homepage}
  author: text("author").default("StreamVault"),
  published: boolean("published").default(false),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({ id: true, createdAt: true, updatedAt: true });
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

// Insert Reminder schema
export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true, createdAt: true, notified: true });

// Types
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;

// Review types

export type ReviewHelpfulVote = typeof reviewHelpful.$inferSelect;

// Challenge types
export type Challenge = typeof challenges.$inferSelect;
export type UserChallenge = typeof userChallenges.$inferSelect;

// Poll types
export type Poll = typeof polls.$inferSelect;
export type PollVote = typeof pollVotes.$inferSelect;

// Store types
export type UserInventory = typeof userInventory.$inferSelect;
export type GiftTransaction = typeof giftTransactions.$inferSelect;
export type Payment = typeof payments.$inferSelect;

// Category type
export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type CommentWithBadges = Comment & {
  authorBadges?: Badge[];
};

// Activity Feed System
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // 'watch_start', 'friend_connect', 'room_create', 'comment_post', 'blog_read', 'review_post', 'coin_purchase', 'item_purchase', 'item_gift', 'coin_topup'
  entityId: varchar("entity_id"), // Optional ID of related object
  entityType: text("entity_type"), // Optional type of related object
  metadata: text("metadata"), // JSON string for extra details
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivitySchema = createInsertSchema(activities);
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export interface WatchActivity {
  roomCode: string;
  contentType: 'show' | 'movie' | 'anime';
  contentId: string;
  contentTitle: string;
  contentPoster?: string;
  episodeTitle?: string;
  startedAt: Date;
}
