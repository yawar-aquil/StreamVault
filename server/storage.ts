import type { Show, Episode, Movie, Anime, AnimeEpisode, Comment, CommentWithBadges, InsertShow, InsertEpisode, InsertMovie, InsertAnime, InsertAnimeEpisode, InsertComment, WatchlistItem, ViewingProgress, Category, BlogPost, InsertBlogPost, User, Badge, InsertBadge, UserBadge, Reminder, InsertReminder, Review, ReviewHelpfulVote, Challenge, UserChallenge, Poll, PollVote, XpHistoryEntry, CoinTransaction, InsertCoinTransaction, Activity, InsertActivity, ModeratorLog } from "@shared/schema";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

interface WatchlistEntry extends WatchlistItem {
  id: string;
}

interface ProgressEntry extends ViewingProgress {
  id: string;
}

export interface ContentRequest {
  id: string;
  contentType: string;
  title: string;
  year?: string;
  genre?: string;
  description?: string;
  reason?: string;
  email?: string;
  requestCount: number;
  status: 'pending' | 'filled' | 'rejected';
  createdAt: string;
}

export interface IssueReport {
  id: string;
  issueType: string;
  title: string;
  description: string;
  url?: string;
  email?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface Feedback {
  id: string;
  category: 'feature' | 'improvement' | 'bug' | 'content' | 'other';
  subject: string;
  message: string;
  email?: string;
  username?: string;
  status: 'new' | 'reviewed' | 'planned' | 'implemented' | 'dismissed' | 'resolved';
  adminNote?: string;
  createdAt: string;
}

// Friends System Types
export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'friend_request' | 'friend_accepted' | 'room_invite' | 'dm' | 'system' | 'announcement' | 'content_update';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  // Attachment support
  attachmentType?: 'image' | 'video' | 'audio' | 'gif' | 'file';
  attachmentUrl?: string;
  attachmentFilename?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
  // Voice message specific
  audioDuration?: number;
  // Reply support
  replyToId?: string;
  reactions?: { userId: string, emoji: string }[];
  read: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  userId: string;
  scope: 'read-only';
  createdAt: string;
  lastUsed?: string;
  // Rate limiting
  // Rate limiting
  requestsToday: number;
  requestsThisMinute: number;
  lastMinuteReset: string;
  lastDayReset: string;
  // Dynamic Limits (defaults: 1000/day, 60/min)
  rateLimitDaily: number;
  rateLimitMinute: number;
  tier: 'free' | 'pro' | 'enterprise';
}

export interface PasswordResetToken {
  email: string;
  token: string;
  expiresAt: number;
}

export interface EmailVerificationToken {
  email: string;
  token: string;
  expiresAt: number;
}

// Extend User type to include equippedBadge
declare module "@shared/schema" {
  interface User {
    equippedBadge?: string;
  }
}

export interface IStorage {
  // Shows
  getAllShows(): Promise<Show[]>;
  getShowById(id: string): Promise<Show | undefined>;
  getShowBySlug(slug: string): Promise<Show | undefined>;
  createShow(show: InsertShow): Promise<Show>;
  updateShow(id: string, updates: Partial<Show>): Promise<Show>;
  deleteShow(id: string): Promise<void>;
  searchShows(query: string): Promise<Show[]>;

  // Episodes
  getAllEpisodes(): Promise<Episode[]>;
  getEpisodesByShowId(showId: string): Promise<Episode[]>;
  getEpisodeById(id: string): Promise<Episode | undefined>;
  createEpisode(episode: InsertEpisode): Promise<Episode>;
  updateEpisode(id: string, updates: Partial<Episode>): Promise<Episode>;
  deleteEpisode(id: string): Promise<void>;

  // Movies
  getAllMovies(): Promise<Movie[]>;
  getMovieById(id: string): Promise<Movie | undefined>;
  getMovieBySlug(slug: string): Promise<Movie | undefined>;
  createMovie(movie: InsertMovie): Promise<Movie>;
  updateMovie(id: string, updates: Partial<Movie>): Promise<Movie>;
  deleteMovie(id: string): Promise<void>;
  searchMovies(query: string): Promise<Movie[]>;

  // Anime
  getAllAnime(): Promise<Anime[]>;
  getAnimeById(id: string): Promise<Anime | undefined>;
  getAnimeBySlug(slug: string): Promise<Anime | undefined>;
  createAnime(anime: InsertAnime): Promise<Anime>;
  updateAnime(id: string, updates: Partial<Anime>): Promise<Anime>;
  deleteAnime(id: string): Promise<void>;
  searchAnime(query: string): Promise<Anime[]>;
  getUpcomingAnime(): Promise<Anime[]>;

  // Anime Episodes
  getAllAnimeEpisodes(): Promise<AnimeEpisode[]>;
  getAnimeEpisodesByAnimeId(animeId: string): Promise<AnimeEpisode[]>;
  getAnimeEpisodeById(id: string): Promise<AnimeEpisode | undefined>;
  createAnimeEpisode(episode: InsertAnimeEpisode): Promise<AnimeEpisode>;
  updateAnimeEpisode(id: string, updates: Partial<AnimeEpisode>): Promise<AnimeEpisode>;
  deleteAnimeEpisode(id: string): Promise<void>;

  // Categories
  getAllCategories(): Promise<Category[]>;

  // Watchlist (simulated per-session storage)
  getWatchlist(sessionId: string): Promise<WatchlistEntry[]>;
  addToWatchlist(sessionId: string, item: WatchlistItem): Promise<WatchlistEntry>;
  removeFromWatchlist(sessionId: string, id: string, isMovie?: boolean): Promise<void>;

  // Viewing Progress (simulated per-session storage)
  getViewingProgress(sessionId: string): Promise<ProgressEntry[]>;
  updateViewingProgress(sessionId: string, progress: ViewingProgress): Promise<ProgressEntry>;

  // Content Requests
  getAllContentRequests(): Promise<ContentRequest[]>;
  getTopContentRequests(limit: number): Promise<ContentRequest[]>;
  createContentRequest(request: Omit<ContentRequest, 'id' | 'requestCount' | 'createdAt'>): Promise<ContentRequest>;
  updateContentRequest(id: string, updates: Partial<ContentRequest>): Promise<ContentRequest>;

  // Issue Reports
  getAllIssueReports(): Promise<IssueReport[]>;
  createIssueReport(report: Omit<IssueReport, 'id' | 'status' | 'createdAt'>): Promise<IssueReport>;
  updateIssueReport(id: string, updates: Partial<IssueReport>): Promise<IssueReport>;

  // Feedback
  getAllFeedback(): Promise<Feedback[]>;
  createFeedback(feedback: Omit<Feedback, 'id' | 'status' | 'createdAt'>): Promise<Feedback>;
  updateFeedback(id: string, updates: Partial<Feedback>): Promise<Feedback>;
  deleteFeedback(id: string): Promise<void>;

  // Comments
  getCommentsByEpisodeId(episodeId: string): Promise<CommentWithBadges[]>;
  getCommentsByMovieId(movieId: string): Promise<CommentWithBadges[]>;
  getCommentsByBlogPostId(blogPostId: string): Promise<CommentWithBadges[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  getAllComments(): Promise<any[]>;
  deleteComment(commentId: string): Promise<void>;

  // Blog Posts
  getAllBlogPosts(): Promise<BlogPost[]>;
  getPublishedBlogPosts(): Promise<BlogPost[]>;
  getBlogPostById(id: string): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;

  // Social
  getSuggestedFriends(userId: string): Promise<User[]>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;

  updateSubscriptionAutoRenew(userId: string, autoRenew: boolean): Promise<User>;

  // Activity Feed
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivities(limit?: number, filter?: 'all' | 'friends' | 'mentions', userId?: string): Promise<(Activity & { user?: User })[]>; // Join with user for display


  // Users (Authentication)
  getAllUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  searchUsers(query: string): Promise<User[]>;

  // Password Reset
  createPasswordResetToken(email: string): Promise<string>;
  verifyPasswordResetToken(email: string, token: string): Promise<boolean>;

  // Email Verification
  createEmailVerificationToken(email: string): Promise<string>;
  verifyEmailVerificationToken(email: string, token: string): Promise<boolean>;

  // Coins & Transactions
  updateUserCoins(userId: string, amount: number): Promise<User>;
  updateAdFreeStatus(userId: string, until: Date): Promise<User>;
  createCoinTransaction(transaction: InsertCoinTransaction): Promise<CoinTransaction>;
  getUserCoinTransactions(userId: string): Promise<CoinTransaction[]>;
  deletePasswordResetToken(email: string): Promise<void>;

  // Friends
  getFriends(userId: string): Promise<Friend[]>;
  addFriend(userId: string, friendId: string): Promise<Friend>;
  removeFriend(userId: string, friendId: string): Promise<void>;
  areFriends(userId: string, friendId: string): Promise<boolean>;

  // Friend Requests
  getFriendRequests(userId: string): Promise<FriendRequest[]>;
  getSentFriendRequests(userId: string): Promise<FriendRequest[]>;
  createFriendRequest(fromUserId: string, toUserId: string): Promise<FriendRequest>;
  getFriendRequestById(id: string): Promise<FriendRequest | undefined>;
  updateFriendRequest(id: string, updates: Partial<FriendRequest>): Promise<FriendRequest>;
  deleteFriendRequest(id: string): Promise<void>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  markDmNotificationsRead(userId: string, fromUserId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;

  // Direct Messages
  getConversations(userId: string): Promise<{ friendId: string; lastMessage: DirectMessage; unreadCount: number }[]>;
  getMessages(userId: string, friendId: string): Promise<DirectMessage[]>;
  sendMessage(
    fromUserId: string,
    toUserId: string,
    message: string,
    attachmentType?: 'image' | 'video' | 'audio' | 'gif' | 'file',
    attachmentUrl?: string,
    attachmentFilename?: string,
    attachmentSize?: number,
    attachmentMimeType?: string,
    audioDuration?: number
  ): Promise<DirectMessage>;
  markMessagesRead(userId: string, friendId: string): Promise<void>;
  addReaction(messageId: string, userId: string, emoji: string): Promise<DirectMessage>;

  // API Keys
  getApiKeysByUserId(userId: string): Promise<ApiKey[]>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  createApiKey(userId: string, name: string): Promise<ApiKey>;
  deleteApiKey(id: string, userId: string): Promise<void>;
  updateApiKeyUsage(id: string): Promise<{ allowed: boolean; reason?: string }>;
  upgradeApiKey(userId: string, keyId: string, tier: 'pro' | 'enterprise'): Promise<ApiKey>;

  // Gamification
  updateUserXP(userId: string, amount: number): Promise<{ user: User; levelUp: boolean }>;
  getLeaderboard(limit: number): Promise<User[]>;

  // Last Active
  setLastActive(userId: string): Promise<void>;

  // Reminders
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  getReminders(userId: string): Promise<Reminder[]>;
  deleteReminder(id: string): Promise<void>;

  // Streak tracking
  updateUserStreak(userId: string): Promise<{ user: User; streakIncreased: boolean; milestone?: number }>;
  getUserStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number; lastWatchDate: string | null; claimedMilestones: number[] }>;
  claimStreakMilestone(userId: string, claimedMilestones: number[]): Promise<void>;

  // Reviews
  createReview(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'helpfulCount'>): Promise<Review>;
  getReviews(contentType: string, contentId: string): Promise<(Review & { username: string; avatarUrl: string | null })[]>;
  getAllReviews(): Promise<(Review & { username: string; avatarUrl: string | null; badges?: any[]; contentTitle?: string })[]>;
  getUserReview(userId: string, contentType: string, contentId: string): Promise<Review | undefined>;
  deleteReview(id: string, userId?: string): Promise<void>; // Make userId optional for admin delete
  markReviewHelpful(reviewId: string, userId: string): Promise<void>;
  getAverageRating(contentType: string, contentId: string): Promise<{ average: number; count: number }>;

  // Challenges
  getChallenges(type?: 'daily' | 'weekly'): Promise<Challenge[]>;

  // Moderators
  logModeratorAction(userId: string, action: string, details?: string): Promise<ModeratorLog>;
  getModeratorLogs(): Promise<(ModeratorLog & { username: string; email: string })[]>;
  updateUserRole(userId: string, isModerator: boolean): Promise<User>;
  getModerators(): Promise<User[]>;
  getUserChallenges(userId: string): Promise<(UserChallenge & { challenge: Challenge })[]>;
  updateChallengeProgress(userId: string, challengeId: string, increment: number): Promise<UserChallenge>;
  claimChallengeReward(userId: string, challengeId: string): Promise<{ xpAwarded: number; badgeAwarded?: string }>;
  createChallenge(challenge: Omit<Challenge, 'id' | 'createdAt'>): Promise<Challenge>;

  // Referrals
  generateReferralCode(userId: string): Promise<string>;
  applyReferralCode(newUserId: string, code: string): Promise<void>;
  getReferralLeaderboard(limit: number): Promise<{ userId: string; username: string; avatarUrl: string | null; referralCount: number }[]>;

  // Polls
  createPoll(poll: Omit<Poll, 'id' | 'createdAt'>): Promise<Poll>;
  getPolls(activeOnly?: boolean): Promise<Poll[]>;
  getPollById(id: string): Promise<Poll | undefined>;
  votePoll(pollId: string, userId: string, optionIndex: number): Promise<PollVote>;
  getPollResults(pollId: string): Promise<{ optionIndex: number; count: number }[]>;
  getUserVote(pollId: string, userId: string): Promise<PollVote | undefined>;
  getPollVotesDetails(pollId: string): Promise<{ userId: string; username: string; optionIndex: number; avatarUrl: string | null }[]>;
  // Badges
  getBadges(): Promise<Badge[]>;
  getBadge(id: string): Promise<Badge | undefined>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  updateBadge(id: string, updates: Partial<InsertBadge>): Promise<Badge | undefined>;
  deleteBadge(id: string): Promise<void>;
  getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]>;
  awardBadge(userId: string, badgeId: string): Promise<UserBadge>;
  revokeBadge(userId: string, badgeId: string): Promise<void>;
  getEquippedBadge(userId: string): Promise<Badge | undefined>;
  updateUserBadgeEquippedStatus(userId: string, badgeId: string, equipped: boolean): Promise<void>;

  // XP History for time-based leaderboards
  addXpHistory(userId: string, amount: number, source: string): Promise<XpHistoryEntry>;
  getLeaderboardByPeriod(period: 'daily' | 'weekly' | 'monthly', limit: number): Promise<{ userId: string; username: string; avatarUrl: string | null; xpGained: number; level: number }[]>;
  getBadgeStats(): Promise<{ totalBadges: number; totalAwarded: number; popularBadges: { name: string; count: number }[] }>;

  // Account Deletion
  deleteUserCompletely(userId: string): Promise<void>;
  async getActivitiesForUser(userId: string): Promise<Activity[]>;

  // Subtitles
  getSavedSubtitles(imdbId: string, season?: number, episode?: number): Promise<SavedSubtitle[]>;
  saveSubtitle(data: Omit<SavedSubtitle, 'id' | 'addedAt'>): Promise<SavedSubtitle>;
  deleteSavedSubtitle(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private shows: Map<string, Show>;
  private episodes: Map<string, Episode>;
  private movies: Map<string, Movie>;
  private anime: Map<string, Anime>;
  private animeEpisodes: Map<string, AnimeEpisode>;
  private comments: Map<string, Comment>;
  private watchlists: Map<string, Map<string, WatchlistEntry>>;
  private viewingProgress: Map<string, Map<string, ProgressEntry>>;
  private categories: Category[];
  private contentRequests: Map<string, ContentRequest>;
  private issueReports: Map<string, IssueReport>;
  private feedbacks: Map<string, Feedback>;
  private blogPosts: Map<string, BlogPost>;
  private users: Map<string, User>;
  private friends: Map<string, Friend>;
  private friendRequests: Map<string, FriendRequest>;
  private notifications: Map<string, Notification>;
  private directMessages: Map<string, DirectMessage>;
  private apiKeys: Map<string, ApiKey>;
  private reminders: Map<string, Reminder>;
  private reviews: Map<string, Review>;
  private reviewHelpful: Map<string, ReviewHelpfulVote>;
  private challenges: Map<string, Challenge>;
  private userChallenges: Map<string, UserChallenge>;
  private polls: Map<string, Poll>;
  private pollVotes: Map<string, PollVote>;
  private xpHistory: Map<string, XpHistoryEntry>;
  private badges: Map<string, Badge>;
  private userBadges: Map<string, UserBadge>;
  private passwordResetTokens: Map<string, PasswordResetToken>;
  private emailVerificationTokens: Map<string, EmailVerificationToken>;
  private coinTransactions: Map<string, CoinTransaction>;
  private activities: Map<string, Activity>;
  private savedSubtitles: Map<string, SavedSubtitle>;
  private moderatorLogs: Map<string, ModeratorLog>;
  private dataFile: string;
  private usersFile: string;
  private friendsFile!: string;
  private apiKeysFile!: string;
  private moderatorLogsFile!: string;

  constructor() {
    this.dataFile = join(process.cwd(), "data", "streamvault-data.json");
    this.usersFile = join(process.cwd(), "data", "users.json");
    this.shows = new Map();
    this.episodes = new Map();
    this.movies = new Map();
    this.anime = new Map();
    this.animeEpisodes = new Map();
    this.comments = new Map();
    this.watchlists = new Map();
    this.viewingProgress = new Map();
    this.contentRequests = new Map();
    this.issueReports = new Map();
    this.feedbacks = new Map();
    this.blogPosts = new Map();
    this.users = new Map();
    this.friends = new Map();
    this.friendRequests = new Map();
    this.notifications = new Map();
    this.directMessages = new Map();
    this.apiKeys = new Map();
    this.reminders = new Map();
    this.reviews = new Map();
    this.reviewHelpful = new Map();
    this.challenges = new Map();
    this.userChallenges = new Map();
    this.polls = new Map();
    this.pollVotes = new Map();
    this.xpHistory = new Map();
    this.badges = new Map();
    this.userBadges = new Map();
    this.passwordResetTokens = new Map();
    this.emailVerificationTokens = new Map();
    this.coinTransactions = new Map();
    this.activities = new Map();
    this.savedSubtitles = new Map();
    this.moderatorLogs = new Map();
    this.categories = [
      { id: "action", name: "Action & Thriller", slug: "action" },
      { id: "drama", name: "Drama & Romance", slug: "drama" },
      { id: "comedy", name: "Comedy", slug: "comedy" },
      { id: "horror", name: "Horror & Mystery", slug: "horror" },
      { id: "romance", name: "Romance", slug: "romance" },
      { id: "thriller", name: "Thriller", slug: "thriller" },
      { id: "sci-fi", name: "Sci-Fi & Fantasy", slug: "sci-fi" },
      { id: "crime", name: "Crime & Mystery", slug: "crime" },
      { id: "adventure", name: "Adventure", slug: "adventure" },
    ];
    this.loadData();
    this.usersFile = join(process.cwd(), "data", "users.json");
    this.loadUsers();
    this.friendsFile = join(process.cwd(), "data", "friends.json");
    this.loadFriendsData();
    this.apiKeysFile = join(process.cwd(), "data", "api-keys.json");
    this.loadApiKeys();
    this.savedSubtitlesFile = join(process.cwd(), "data", "saved_subtitles.json");
    this.loadSavedSubtitles();
    this.moderatorLogsFile = join(process.cwd(), "data", "moderator_logs.json");
    this.loadModeratorLogs();
  }

  private loadSavedSubtitles() {
    try {
      if (existsSync(this.savedSubtitlesFile)) {
        console.log("📂 Loading saved subtitles from file...");
        const data = JSON.parse(readFileSync(this.savedSubtitlesFile, "utf-8"));
        Object.entries(data).forEach(([id, sub]) => {
          this.savedSubtitles.set(id, sub as SavedSubtitle);
        });
        console.log(`✅ Loaded ${this.savedSubtitles.size} saved subtitles`);
      }
    } catch (error) {
      console.error("Failed to load saved subtitles:", error);
    }
  }

  private loadModeratorLogs() {
    try {
      if (existsSync(this.moderatorLogsFile)) {
        const data = JSON.parse(readFileSync(this.moderatorLogsFile, "utf-8"));
        if (data.logs) {
          data.logs.forEach((log: ModeratorLog) => this.moderatorLogs.set(log.id, log));
          console.log(`✅ Loaded ${data.logs.length} moderator logs`);
        }
      }
    } catch (error) {
      console.error("❌ Error loading moderator logs:", error);
    }
  }

  private saveModeratorLogs() {
    try {
      const data = {
        logs: Array.from(this.moderatorLogs.values()),
        lastUpdated: new Date().toISOString(),
      };
      const dataDir = join(process.cwd(), "data");
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }
      writeFileSync(this.moderatorLogsFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.error("❌ Error saving moderator logs:", error);
    }
  }

  private saveSavedSubtitles() {
    try {
      const dataDir = join(process.cwd(), "data");
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }
      const data = Object.fromEntries(this.savedSubtitles.entries());
      writeFileSync(this.savedSubtitlesFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to save subtitles:", error);
    }
  }

  private savedSubtitlesFile!: string;

  // Email Verification
  async createEmailVerificationToken(email: string): Promise<string> {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

    this.emailVerificationTokens.set(email, {
      email,
      token,
      expiresAt,
    });

    return token;
  }

  async verifyEmailVerificationToken(email: string, token: string): Promise<boolean> {
    const record = this.emailVerificationTokens.get(email);
    if (!record) return false;

    if (Date.now() > record.expiresAt) {
      this.emailVerificationTokens.delete(email);
      return false;
    }

    if (record.token !== token) {
      return false;
    }

    this.emailVerificationTokens.delete(email);
    // Also mark user as verified
    const user = await this.getUserByEmail(email);
    if (user) {
      await this.updateUser(user.id, { emailVerified: true });
    }
    return true;
  }

  // Load data from JSON file or seed if file doesn't exist
  private loadData() {
    try {
      if (existsSync(this.dataFile)) {
        console.log("📂 Loading data from file...");
        const data = JSON.parse(readFileSync(this.dataFile, "utf-8"));

        // Restore shows
        if (data.shows) {
          data.shows.forEach((show: Show) => {
            // Backfill createdAt if missing
            if (!show.createdAt) { show.createdAt = new Date(0); } // epoch for old items
            this.shows.set(show.id, show);
          });
          console.log(`✅ Loaded ${data.shows.length} shows`);
        }

        // Restore episodes
        if (data.episodes) {
          data.episodes.forEach((episode: Episode) => this.episodes.set(episode.id, episode));
          console.log(`✅ Loaded ${data.episodes.length} episodes`);
        }

        // Restore movies
        if (data.movies) {
          data.movies.forEach((movie: Movie) => {
            if (!movie.createdAt) { movie.createdAt = new Date(0); }
            this.movies.set(movie.id, movie);
          });
          console.log(`✅ Loaded ${data.movies.length} movies`);
        }

        // Restore anime
        if (data.anime) {
          data.anime.forEach((a: Anime) => {
            if (!a.createdAt) { a.createdAt = new Date(0); }
            this.anime.set(a.id, a);
          });
          console.log(`✅ Loaded ${data.anime.length} anime`);
        }

        // Restore anime episodes
        if (data.animeEpisodes) {
          data.animeEpisodes.forEach((ep: AnimeEpisode) => this.animeEpisodes.set(ep.id, ep));
          console.log(`✅ Loaded ${data.animeEpisodes.length} anime episodes`);
        }

        // Restore comments
        if (data.comments) {
          data.comments.forEach((comment: any) => {
            // Ensure parentId exists for old comments
            const normalizedComment: Comment = {
              ...comment,
              parentId: comment.parentId || null,
            };
            this.comments.set(comment.id, normalizedComment);
          });
          console.log(`✅ Loaded ${data.comments.length} comments`);
        }

        // Restore content requests
        if (data.contentRequests) {
          data.contentRequests.forEach((request: ContentRequest) => this.contentRequests.set(request.id, request));
          console.log(`✅ Loaded ${data.contentRequests.length} content requests`);
        }

        // Restore issue reports
        if (data.issueReports) {
          data.issueReports.forEach((report: IssueReport) => this.issueReports.set(report.id, report));
          console.log(`✅ Loaded ${data.issueReports.length} issue reports`);
        }

        // Restore feedback
        if (data.feedbacks) {
          data.feedbacks.forEach((fb: Feedback) => this.feedbacks.set(fb.id, fb));
          console.log(`✅ Loaded ${data.feedbacks.length} feedbacks`);
        }

        // Restore blog posts
        if (data.blogPosts) {
          data.blogPosts.forEach((post: BlogPost) => this.blogPosts.set(post.id, post));
          console.log(`✅ Loaded ${data.blogPosts.length} blog posts`);
        }

        // Restore viewing progress
        // viewingProgress structure: Map<sessionId, Map<contentId, ProgressEntry>>
        if (data.viewingProgress) {
          let progressCount = 0;
          Object.entries(data.viewingProgress).forEach(([sessionId, progressMap]: [string, any]) => {
            const innerMap = new Map<string, ProgressEntry>();
            Object.values(progressMap).forEach((entry: any) => {
              innerMap.set(entry.showId || entry.movieId || entry.animeId, entry);
              progressCount++;
            });
            this.viewingProgress.set(sessionId, innerMap);
          });
          console.log(`✅ Loaded viewing progress for ${this.viewingProgress.size} users`);
        }

        // Restore reminders
        if (data.reminders) {
          data.reminders.forEach((r: Reminder) => this.reminders.set(r.id, r));
          console.log(`✅ Loaded ${data.reminders.length} reminders`);
        }

        // Restore reviews
        if (data.reviews) {
          data.reviews.forEach((review: Review) => this.reviews.set(review.id, review));
          console.log(`✅ Loaded ${data.reviews.length} reviews`);
        }

        // Restore badges
        if (data.badges) {
          data.badges.forEach((badge: Badge) => this.badges.set(badge.id, badge));
          console.log(`✅ Loaded ${data.badges.length} badges`);
        }

        // Restore user badges
        if (data.userBadges) {
          data.userBadges.forEach((ub: UserBadge) => this.userBadges.set(ub.id, ub));
          console.log(`✅ Loaded ${data.userBadges.length} user badges`);
        }

        // Restore polls
        if (data.polls) {
          data.polls.forEach((poll: Poll) => this.polls.set(poll.id, poll));
          console.log(`✅ Loaded ${data.polls.length} polls`);
        }


        // Restore coin transactions
        if (data.coinTransactions) {
          data.coinTransactions.forEach((tx: CoinTransaction) => this.coinTransactions.set(tx.id, tx));
          console.log(`✅ Loaded ${data.coinTransactions.length} coin transactions`);
        }

        // Restore activities
        if (data.activities) {
          data.activities.forEach((activity: Activity) => this.activities.set(activity.id, activity));
          console.log(`✅ Loaded ${data.activities.length} activities`);
        }

      } else {
        console.log("📦 No data file found, seeding initial data...");
        this.seedData();
        this.saveData();
      }
    } catch (error) {
      console.error("❌ Error loading data, using seed data:", error);
      this.seedData();
      this.saveData();
    }
  }

  // Save data to JSON file
  private saveData() {
    try {
      // Convert viewingProgress Map<Map> to Object for JSON
      const progressObj: Record<string, Record<string, ProgressEntry>> = {};
      this.viewingProgress.forEach((innerMap, sessionId) => {
        progressObj[sessionId] = {};
        innerMap.forEach((entry, contentId) => {
          progressObj[sessionId][contentId] = entry;
        });
      });

      const data = {
        shows: Array.from(this.shows.values()),
        episodes: Array.from(this.episodes.values()),
        movies: Array.from(this.movies.values()),
        anime: Array.from(this.anime.values()),
        animeEpisodes: Array.from(this.animeEpisodes.values()),
        comments: Array.from(this.comments.values()),
        contentRequests: Array.from(this.contentRequests.values()),
        issueReports: Array.from(this.issueReports.values()),
        feedbacks: Array.from(this.feedbacks.values()),
        blogPosts: Array.from(this.blogPosts.values()),
        viewingProgress: progressObj,
        reminders: Array.from(this.reminders.values()),
        reviews: Array.from(this.reviews.values()),
        challenges: Array.from(this.challenges.values()),
        userChallenges: Array.from(this.userChallenges.values()),
        polls: Array.from(this.polls.values()),
        pollVotes: Array.from(this.pollVotes.values()),
        xpHistory: Array.from(this.xpHistory.values()),
        badges: Array.from(this.badges.values()),
        userBadges: Array.from(this.userBadges.values()),
        coinTransactions: Array.from(this.coinTransactions.values()),
        activities: Array.from(this.activities.values()),
        lastUpdated: new Date().toISOString(),
      };

      // Create data directory if it doesn't exist
      const dataDir = join(process.cwd(), "data");
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      writeFileSync(this.dataFile, JSON.stringify(data, null, 2), "utf-8");
      // console.log("💾 Data saved to file"); // Commented out to reduce noise
    } catch (error) {
      console.error("❌ Error saving data:", error);
    }
  }

  // Load users from users.json
  private loadUsers() {
    try {
      if (existsSync(this.usersFile)) {
        const data = JSON.parse(readFileSync(this.usersFile, "utf-8"));
        if (data.users) {
          data.users.forEach((user: User) => this.users.set(user.id, user));
          console.log(`✅ Loaded ${data.users.length} users`);
        }
      }
    } catch (error) {
      console.error("❌ Error loading users:", error);
    }
  }

  // Save users to users.json
  private saveUsers() {
    try {
      const data = {
        users: Array.from(this.users.values()),
        lastUpdated: new Date().toISOString(),
      };

      const dataDir = join(process.cwd(), "data");
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      writeFileSync(this.usersFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.error("❌ Error saving users:", error);
    }
  }

  // Shows methods
  async getAllShows(): Promise<Show[]> {
    return Array.from(this.shows.values());
  }

  async getShowById(id: string): Promise<Show | undefined> {
    return this.shows.get(id);
  }

  async getShowBySlug(slug: string): Promise<Show | undefined> {
    return Array.from(this.shows.values()).find((show) => show.slug === slug);
  }

  async createShow(insertShow: InsertShow): Promise<Show> {
    const id = randomUUID();
    const show: Show = {
      ...insertShow,
      id,
      imdbRating: insertShow.imdbRating || null,
      category: insertShow.category || null,
      cast: insertShow.cast || null,
      creators: insertShow.creators || null,
      featured: insertShow.featured || false,
      trending: insertShow.trending || false,
      createdAt: new Date(),
    };
    this.shows.set(id, show);
    this.saveData(); // Persist to file
    return show;
  }

  async updateShow(id: string, updates: Partial<Show>): Promise<Show> {
    const existingShow = this.shows.get(id);
    if (!existingShow) {
      throw new Error("Show not found");
    }

    // Merge updates with existing show, ensuring all required fields are present
    const updatedShow: Show = {
      id: existingShow.id, // Never change ID
      title: updates.title ?? existingShow.title,
      slug: updates.slug ?? existingShow.slug,
      description: updates.description ?? existingShow.description,
      posterUrl: updates.posterUrl ?? existingShow.posterUrl,
      backdropUrl: updates.backdropUrl ?? existingShow.backdropUrl,
      year: updates.year ?? existingShow.year,
      rating: updates.rating ?? existingShow.rating,
      imdbRating: updates.imdbRating !== undefined ? updates.imdbRating : existingShow.imdbRating,
      genres: updates.genres ?? existingShow.genres,
      language: updates.language ?? existingShow.language,
      totalSeasons: updates.totalSeasons ?? existingShow.totalSeasons,
      cast: updates.cast !== undefined ? updates.cast : existingShow.cast,
      creators: updates.creators !== undefined ? updates.creators : existingShow.creators,
      featured: updates.featured !== undefined ? updates.featured : existingShow.featured,
      trending: updates.trending !== undefined ? updates.trending : existingShow.trending,
      category: updates.category !== undefined ? updates.category : existingShow.category,
    };

    this.shows.set(id, updatedShow);
    this.saveData(); // Persist to file
    return updatedShow;
  }

  async deleteShow(id: string): Promise<void> {
    this.shows.delete(id);
    // Also delete all episodes for this show
    const episodes = await this.getEpisodesByShowId(id);
    episodes.forEach(ep => this.episodes.delete(ep.id));
    this.saveData(); // Persist to file
  }

  async searchShows(query: string): Promise<Show[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.shows.values()).filter(
      (show) =>
        show.title?.toLowerCase().includes(lowerQuery) ||
        show.description?.toLowerCase().includes(lowerQuery) ||
        show.genres?.some((g) => g.toLowerCase().includes(lowerQuery)) ||
        show.cast?.some((c) => c.toLowerCase().includes(lowerQuery)) ||
        false
    );
  }

  // Episodes methods
  async getAllEpisodes(): Promise<Episode[]> {
    return Array.from(this.episodes.values());
  }

  async getEpisodesByShowId(showId: string): Promise<Episode[]> {
    return Array.from(this.episodes.values()).filter(
      (episode) => episode.showId === showId
    );
  }

  async getEpisodeById(id: string): Promise<Episode | undefined> {
    return this.episodes.get(id);
  }

  async createEpisode(insertEpisode: InsertEpisode): Promise<Episode> {
    const id = randomUUID();
    const episode: Episode = {
      ...insertEpisode,
      id,
      airDate: insertEpisode.airDate || null
    };
    this.episodes.set(id, episode);
    this.saveData(); // Persist to file
    return episode;
  }

  async updateEpisode(id: string, updates: Partial<Episode>): Promise<Episode> {
    const existingEpisode = this.episodes.get(id);
    if (!existingEpisode) {
      throw new Error(`Episode with id ${id} not found`);
    }

    const updatedEpisode: Episode = {
      ...existingEpisode,
      ...updates,
      id: existingEpisode.id, // Never change ID
      showId: existingEpisode.showId, // Never change showId
    };

    this.episodes.set(id, updatedEpisode);
    this.saveData(); // Persist to file
    return updatedEpisode;
  }

  async deleteEpisode(id: string): Promise<void> {
    this.episodes.delete(id);
    this.saveData(); // Persist to file
  }

  // Movie methods
  async getAllMovies(): Promise<Movie[]> {
    return Array.from(this.movies.values());
  }

  async getMovieById(id: string): Promise<Movie | undefined> {
    return this.movies.get(id);
  }

  async getMovieBySlug(slug: string): Promise<Movie | undefined> {
    return Array.from(this.movies.values()).find((movie) => movie.slug === slug);
  }

  async createMovie(insertMovie: InsertMovie): Promise<Movie> {
    const id = randomUUID();
    const movie: Movie = {
      id,
      title: insertMovie.title,
      slug: insertMovie.slug,
      description: insertMovie.description,
      posterUrl: insertMovie.posterUrl,
      backdropUrl: insertMovie.backdropUrl,
      year: insertMovie.year,
      rating: insertMovie.rating,
      imdbRating: insertMovie.imdbRating || null,
      genres: insertMovie.genres,
      language: insertMovie.language,
      duration: insertMovie.duration,
      cast: insertMovie.cast || null,
      directors: insertMovie.directors || null,
      googleDriveUrl: insertMovie.googleDriveUrl,
      featured: insertMovie.featured ?? false,
      trending: insertMovie.trending ?? false,
      category: insertMovie.category || null,
      createdAt: new Date(),
    };
    this.movies.set(id, movie);
    this.saveData(); // Persist to file
    return movie;
  }

  async updateMovie(id: string, updates: Partial<Movie>): Promise<Movie> {
    const movie = this.movies.get(id);
    if (!movie) {
      throw new Error(`Movie with id ${id} not found`);
    }
    const updatedMovie = { ...movie, ...updates, id };
    this.movies.set(id, updatedMovie);
    this.saveData(); // Persist to file
    return updatedMovie;
  }

  async deleteMovie(id: string): Promise<void> {
    this.movies.delete(id);
    this.saveData(); // Persist to file
  }

  async searchMovies(query: string): Promise<Movie[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.movies.values()).filter(
      (movie) =>
        movie.title.toLowerCase().includes(lowerQuery) ||
        movie.description.toLowerCase().includes(lowerQuery) ||
        movie.genres?.toLowerCase().includes(lowerQuery)
    );
  }

  // Anime methods
  async getAllAnime(): Promise<Anime[]> {
    return Array.from(this.anime.values());
  }

  async getAnimeById(id: string): Promise<Anime | undefined> {
    return this.anime.get(id);
  }

  async getUpcomingAnime(): Promise<Anime[]> {
    return Array.from(this.anime.values()).filter(
      (anime) => anime.status === "Upcoming"
    );
  }

  async getAnimeBySlug(slug: string): Promise<Anime | undefined> {
    return Array.from(this.anime.values()).find((a) => a.slug === slug);
  }

  async createAnime(insertAnime: InsertAnime): Promise<Anime> {
    const id = randomUUID();
    const animeEntry: Anime = {
      id,
      title: insertAnime.title,
      slug: insertAnime.slug,
      alternativeTitles: insertAnime.alternativeTitles || null,
      description: insertAnime.description,
      posterUrl: insertAnime.posterUrl,
      backdropUrl: insertAnime.backdropUrl,
      year: insertAnime.year,
      rating: insertAnime.rating,
      imdbRating: insertAnime.imdbRating || null,
      malRating: insertAnime.malRating || null,
      genres: insertAnime.genres,
      language: insertAnime.language || "Japanese",
      totalSeasons: insertAnime.totalSeasons,
      totalEpisodes: insertAnime.totalEpisodes || null,
      status: insertAnime.status || null,
      studio: insertAnime.studio || null,
      cast: insertAnime.cast || null,
      castDetails: insertAnime.castDetails || null,
      creators: insertAnime.creators || null,
      featured: insertAnime.featured ?? false,
      trending: insertAnime.trending ?? false,
      category: insertAnime.category || null,
      createdAt: new Date(),
    };
    this.anime.set(id, animeEntry);
    this.saveData();
    return animeEntry;
  }

  async updateAnime(id: string, updates: Partial<Anime>): Promise<Anime> {
    const existing = this.anime.get(id);
    if (!existing) {
      throw new Error(`Anime with id ${id} not found`);
    }
    const updated = { ...existing, ...updates, id };
    this.anime.set(id, updated);
    this.saveData();
    return updated;
  }

  async deleteAnime(id: string): Promise<void> {
    this.anime.delete(id);
    // Also delete all episodes for this anime
    const episodes = await this.getAnimeEpisodesByAnimeId(id);
    episodes.forEach(ep => this.animeEpisodes.delete(ep.id));
    this.saveData();
  }

  async searchAnime(query: string): Promise<Anime[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.anime.values()).filter(
      (a) =>
        a.title.toLowerCase().includes(lowerQuery) ||
        a.description.toLowerCase().includes(lowerQuery) ||
        a.genres?.toLowerCase().includes(lowerQuery) ||
        a.alternativeTitles?.toLowerCase().includes(lowerQuery)
    );
  }

  // Anime Episodes methods
  async getAllAnimeEpisodes(): Promise<AnimeEpisode[]> {
    return Array.from(this.animeEpisodes.values());
  }

  async getAnimeEpisodesByAnimeId(animeId: string): Promise<AnimeEpisode[]> {
    return Array.from(this.animeEpisodes.values()).filter(
      (ep) => ep.animeId === animeId
    );
  }

  async getAnimeEpisodeById(id: string): Promise<AnimeEpisode | undefined> {
    return this.animeEpisodes.get(id);
  }

  async createAnimeEpisode(insertEp: InsertAnimeEpisode): Promise<AnimeEpisode> {
    const id = randomUUID();
    const episode: AnimeEpisode = {
      id,
      animeId: insertEp.animeId,
      season: insertEp.season,
      episodeNumber: insertEp.episodeNumber,
      title: insertEp.title,
      description: insertEp.description,
      thumbnailUrl: insertEp.thumbnailUrl,
      duration: insertEp.duration,
      googleDriveUrl: insertEp.googleDriveUrl,
      videoUrl: insertEp.videoUrl || null,
      airDate: insertEp.airDate || null,
      dubbed: insertEp.dubbed ?? false,
    };
    this.animeEpisodes.set(id, episode);
    this.saveData();
    return episode;
  }

  async updateAnimeEpisode(id: string, updates: Partial<AnimeEpisode>): Promise<AnimeEpisode> {
    const existing = this.animeEpisodes.get(id);
    if (!existing) {
      throw new Error(`Anime episode with id ${id} not found`);
    }
    const updated = { ...existing, ...updates, id, animeId: existing.animeId };
    this.animeEpisodes.set(id, updated);
    this.saveData();
    return updated;
  }

  async deleteAnimeEpisode(id: string): Promise<void> {
    this.animeEpisodes.delete(id);
    this.saveData();
  }

  // Categories methods
  async getAllCategories(): Promise<Category[]> {
    return this.categories;
  }

  // Watchlist methods
  async getWatchlist(sessionId: string): Promise<WatchlistEntry[]> {
    const userWatchlist = this.watchlists.get(sessionId);
    return userWatchlist ? Array.from(userWatchlist.values()) : [];
  }

  async addToWatchlist(sessionId: string, item: WatchlistItem): Promise<WatchlistEntry> {
    if (!this.watchlists.has(sessionId)) {
      this.watchlists.set(sessionId, new Map());
    }

    const userWatchlist = this.watchlists.get(sessionId)!;
    const id = randomUUID();
    const entry: WatchlistEntry = { ...item, id };
    const key = item.showId || item.movieId || id;
    userWatchlist.set(key, entry);

    return entry;
  }

  async removeFromWatchlist(sessionId: string, id: string, isMovie?: boolean): Promise<void> {
    const userWatchlist = this.watchlists.get(sessionId);
    if (userWatchlist) {
      userWatchlist.delete(id);
    }
  }

  // Viewing Progress methods
  async getViewingProgress(sessionId: string): Promise<ProgressEntry[]> {
    const userProgress = this.viewingProgress.get(sessionId);
    return userProgress ? Array.from(userProgress.values()) : [];
  }

  async updateViewingProgress(sessionId: string, progress: ViewingProgress): Promise<ProgressEntry> {
    if (!this.viewingProgress.has(sessionId)) {
      this.viewingProgress.set(sessionId, new Map());
    }

    const userProgress = this.viewingProgress.get(sessionId)!;
    const id = randomUUID();
    const entry: ProgressEntry = { ...progress, id };
    userProgress.set(progress.showId, entry);

    return entry;
  }

  // Seed sample data
  private seedData() {
    // Sample shows with Netflix-quality data
    const shows: InsertShow[] = [
      {
        title: "Stranger Things",
        slug: "stranger-things",
        description:
          "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
        posterUrl: "https://images.unsplash.com/photo-1574267432644-f65e2d32b5c1?w=600&h=900&fit=crop",
        backdropUrl: "https://images.unsplash.com/photo-1574267432644-f65e2d32b5c1?w=1920&h=800&fit=crop",
        year: 2016,
        rating: "TV-14",
        imdbRating: "8.7",
        genres: ["Sci-Fi", "Horror", "Drama"],
        language: "English",
        totalSeasons: 4,
        cast: ["Millie Bobby Brown", "Finn Wolfhard", "Winona Ryder"],
        creators: ["The Duffer Brothers"],
        featured: true,
        trending: true,
        category: "horror",
      },
      {
        title: "Breaking Bad",
        slug: "breaking-bad",
        description:
          "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
        posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&h=900&fit=crop",
        backdropUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&h=800&fit=crop",
        year: 2008,
        rating: "TV-MA",
        imdbRating: "9.5",
        genres: ["Crime", "Drama", "Thriller"],
        language: "English",
        totalSeasons: 5,
        cast: ["Bryan Cranston", "Aaron Paul", "Anna Gunn"],
        creators: ["Vince Gilligan"],
        featured: true,
        trending: true,
        category: "drama",
      },
      {
        title: "The Crown",
        slug: "the-crown",
        description:
          "Follows the political rivalries and romance of Queen Elizabeth II's reign and the events that shaped the second half of the 20th century.",
        posterUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&h=900&fit=crop",
        backdropUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&h=800&fit=crop",
        year: 2016,
        rating: "TV-MA",
        imdbRating: "8.6",
        genres: ["Drama", "History"],
        language: "English",
        totalSeasons: 6,
        cast: ["Claire Foy", "Olivia Colman", "Imelda Staunton"],
        creators: ["Peter Morgan"],
        featured: true,
        trending: false,
        category: "drama",
      },
      {
        title: "Money Heist",
        slug: "money-heist",
        description:
          "An unusual group of robbers attempt to carry out the most perfect robbery in Spanish history - stealing 2.4 billion euros from the Royal Mint of Spain.",
        posterUrl: "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=600&h=900&fit=crop",
        backdropUrl: "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=1920&h=800&fit=crop",
        year: 2017,
        rating: "TV-MA",
        imdbRating: "8.2",
        genres: ["Action", "Crime", "Thriller"],
        language: "Spanish",
        totalSeasons: 5,
        cast: ["Álvaro Morte", "Itziar Ituño", "Pedro Alonso"],
        creators: ["Álex Pina"],
        featured: true,
        trending: true,
        category: "action",
      },
      {
        title: "The Office",
        slug: "the-office",
        description:
          "A mockumentary on a group of typical office workers, where the workday consists of ego clashes, inappropriate behavior, and tedium.",
        posterUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&h=900&fit=crop",
        backdropUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1920&h=800&fit=crop",
        year: 2005,
        rating: "TV-14",
        imdbRating: "9.0",
        genres: ["Comedy"],
        language: "English",
        totalSeasons: 9,
        cast: ["Steve Carell", "John Krasinski", "Jenna Fischer"],
        creators: ["Greg Daniels"],
        featured: true,
        trending: true,
        category: "comedy",
      },
      {
        title: "Dark",
        slug: "dark",
        description:
          "A family saga with a supernatural twist, set in a German town, where the disappearance of two young children exposes the relationships among four families.",
        posterUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&h=900&fit=crop",
        backdropUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=1920&h=800&fit=crop",
        year: 2017,
        rating: "TV-MA",
        imdbRating: "8.8",
        genres: ["Sci-Fi", "Thriller", "Mystery"],
        language: "German",
        totalSeasons: 3,
        cast: ["Louis Hofmann", "Karoline Eichhorn", "Lisa Vicari"],
        creators: ["Baran bo Odar", "Jantje Friese"],
        featured: false,
        trending: true,
        category: "horror",
      },
      {
        title: "Peaky Blinders",
        slug: "peaky-blinders",
        description:
          "A gangster family epic set in 1900s England, centering on a gang who sew razor blades in the peaks of their caps, and their fierce boss Tommy Shelby.",
        posterUrl: "https://images.unsplash.com/photo-1472457897821-70d3819a0e24?w=600&h=900&fit=crop",
        backdropUrl: "https://images.unsplash.com/photo-1472457897821-70d3819a0e24?w=1920&h=800&fit=crop",
        year: 2013,
        rating: "TV-MA",
        imdbRating: "8.8",
        genres: ["Crime", "Drama"],
        language: "English",
        totalSeasons: 6,
        cast: ["Cillian Murphy", "Paul Anderson", "Sophie Rundle"],
        creators: ["Steven Knight"],
        featured: false,
        trending: true,
        category: "drama",
      },
      {
        title: "Narcos",
        slug: "narcos",
        description:
          "A chronicled look at the criminal exploits of Colombian drug lord Pablo Escobar, as well as the many other drug kingpins who plagued the country through the years.",
        posterUrl: "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=600&h=900&fit=crop",
        backdropUrl: "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=1920&h=800&fit=crop",
        year: 2015,
        rating: "TV-MA",
        imdbRating: "8.8",
        genres: ["Crime", "Drama", "Thriller"],
        language: "English",
        totalSeasons: 3,
        cast: ["Wagner Moura", "Boyd Holbrook", "Pedro Pascal"],
        creators: ["Chris Brancato", "Carlo Bernard", "Doug Miro"],
        featured: false,
        trending: false,
        category: "action",
      },
      {
        title: "The Witcher",
        slug: "the-witcher",
        description:
          "Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world where people often prove more wicked than beasts.",
        posterUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=900&fit=crop",
        backdropUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=800&fit=crop",
        year: 2019,
        rating: "TV-MA",
        imdbRating: "8.0",
        genres: ["Action", "Adventure", "Fantasy"],
        language: "English",
        totalSeasons: 3,
        cast: ["Henry Cavill", "Anya Chalotra", "Freya Allan"],
        creators: ["Lauren Schmidt Hissrich"],
        featured: false,
        trending: true,
        category: "action",
      },
      {
        title: "Friends",
        slug: "friends",
        description:
          "Follows the personal and professional lives of six twenty to thirty-something-year-old friends living in Manhattan.",
        posterUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=900&fit=crop",
        backdropUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1920&h=800&fit=crop",
        year: 1994,
        rating: "TV-14",
        imdbRating: "8.9",
        genres: ["Comedy", "Romance"],
        language: "English",
        totalSeasons: 10,
        cast: ["Jennifer Aniston", "Courteney Cox", "Lisa Kudrow"],
        creators: ["David Crane", "Marta Kauffman"],
        featured: false,
        trending: false,
        category: "comedy",
      },
    ];

    // Create shows
    shows.forEach((show) => {
      const id = randomUUID();
      this.shows.set(id, {
        ...show,
        id,
        imdbRating: show.imdbRating || null,
        category: show.category || null,
        cast: show.cast || null,
        creators: show.creators || null,
        featured: show.featured || false,
        trending: show.trending || false
      });
    });

    // Create sample episodes for each show
    Array.from(this.shows.values()).forEach((show) => {
      for (let season = 1; season <= Math.min(show.totalSeasons, 2); season++) {
        const episodeCount = season === 1 ? 8 : 6;
        for (let ep = 1; ep <= episodeCount; ep++) {
          const episode: InsertEpisode = {
            showId: show.id,
            season,
            episodeNumber: ep,
            title: `Episode ${ep}`,
            description: `In this exciting episode of ${show.title}, the story continues to unfold with unexpected twists and turns that will keep you on the edge of your seat.`,
            thumbnailUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=1280&h=720&fit=crop`,
            duration: 42 + Math.floor(Math.random() * 18),
            googleDriveUrl: `https://drive.google.com/file/d/1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd/preview`,
            airDate: `${show.year}-${String(season).padStart(2, "0")}-${String(ep * 7).padStart(2, "0")}`,
          };

          const id = randomUUID();
          this.episodes.set(id, {
            ...episode,
            id,
            airDate: episode.airDate || null
          });
        }
      }
    });
  }

  // Content Requests
  async getAllContentRequests(): Promise<ContentRequest[]> {
    return Array.from(this.contentRequests.values());
  }

  async getTopContentRequests(limit: number): Promise<ContentRequest[]> {
    const requests = Array.from(this.contentRequests.values());
    return requests
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, limit);
  }

  async createContentRequest(request: Omit<ContentRequest, 'id' | 'requestCount' | 'status' | 'createdAt'>): Promise<ContentRequest> {
    // Check if similar request already exists
    const existing = Array.from(this.contentRequests.values()).find(
      r => r.title.toLowerCase() === request.title.toLowerCase() && r.contentType === request.contentType
    );

    if (existing) {
      // Increment request count
      existing.requestCount++;
      this.saveData();
      return existing;
    }

    // Create new request
    const id = randomUUID();
    const newRequest: ContentRequest = {
      ...request,
      id,
      requestCount: 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.contentRequests.set(id, newRequest);
    this.saveData();
    return newRequest;
  }

  async updateContentRequest(id: string, updates: Partial<ContentRequest>): Promise<ContentRequest> {
    const request = this.contentRequests.get(id);
    if (!request) {
      throw new Error(`Content request with id ${id} not found`);
    }
    const updated = { ...request, ...updates };
    this.contentRequests.set(id, updated);
    this.saveData();
    return updated;
  }

  // Issue Reports
  async getAllIssueReports(): Promise<IssueReport[]> {
    return Array.from(this.issueReports.values());
  }

  async createIssueReport(report: Omit<IssueReport, 'id' | 'status' | 'createdAt'>): Promise<IssueReport> {
    const id = randomUUID();
    const newReport: IssueReport = {
      ...report,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.issueReports.set(id, newReport);
    this.saveData();
    return newReport;
  }

  async updateIssueReport(id: string, updates: Partial<IssueReport>): Promise<IssueReport> {
    const report = this.issueReports.get(id);
    if (!report) {
      throw new Error(`Issue report with id ${id} not found`);
    }
    const updated = { ...report, ...updates };
    this.issueReports.set(id, updated);
    this.saveData();
    return updated;
  }

  // Feedback
  async getAllFeedback(): Promise<Feedback[]> {
    return Array.from(this.feedbacks.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createFeedback(feedback: Omit<Feedback, 'id' | 'status' | 'createdAt'>): Promise<Feedback> {
    const id = randomUUID();
    const newFeedback: Feedback = {
      ...feedback,
      id,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    this.feedbacks.set(id, newFeedback);
    this.saveData();
    return newFeedback;
  }

  async updateFeedback(id: string, updates: Partial<Feedback>): Promise<Feedback> {
    const feedback = this.feedbacks.get(id);
    if (!feedback) {
      throw new Error(`Feedback with id ${id} not found`);
    }
    const updated = { ...feedback, ...updates };
    this.feedbacks.set(id, updated);
    this.saveData();
    return updated;
  }

  async deleteFeedback(id: string): Promise<void> {
    this.feedbacks.delete(id);
    this.saveData();
  }


  // Comments
  private enrichCommentsWithBadges(comments: Comment[]): CommentWithBadges[] {
    return comments.map(comment => {
      let authorBadges: Badge[] = [];
      let isModerator = false;
      let isAdmin = comment.userName && comment.userName.toLowerCase() === (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
      if (comment.userId) {
        // Find equipped user badges
        const userBadges = Array.from(this.userBadges.values())
          .filter(ub => ub.userId === comment.userId && ub.equipped);

        // Get badge details
        authorBadges = userBadges
          .map(ub => {
            const badge = this.badges.get(ub.badgeId);
            return badge ? { ...badge, equippedAt: ub.equippedAt } : null;
          })
          .filter((b): b is Badge & { equippedAt: any } => !!b)
          // Sort by display priority (descending)
          .sort((a, b) => (b.displayPriority || 0) - (a.displayPriority || 0));
      }
      return { ...comment, authorBadges };
    });
  }

  async getCommentsByEpisodeId(episodeId: string): Promise<CommentWithBadges[]> {
    const comments = Array.from(this.comments.values())
      .filter(comment => comment.episodeId === episodeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return this.enrichCommentsWithBadges(comments);
  }

  async getCommentsByMovieId(movieId: string): Promise<CommentWithBadges[]> {
    const comments = Array.from(this.comments.values())
      .filter(comment => comment.movieId === movieId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return this.enrichCommentsWithBadges(comments);
  }

  async getCommentsByBlogPostId(blogPostId: string): Promise<CommentWithBadges[]> {
    const comments = Array.from(this.comments.values())
      .filter(comment => comment.blogPostId === blogPostId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return this.enrichCommentsWithBadges(comments);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const newComment: Comment = {
      id,
      episodeId: comment.episodeId || null,
      movieId: comment.movieId || null,
      blogPostId: comment.blogPostId || null,
      parentId: comment.parentId || null,
      userId: comment.userId || null,
      userName: comment.userName,
      avatarUrl: comment.avatarUrl || null,
      comment: comment.comment,
      createdAt: new Date(),
    };
    this.comments.set(id, newComment);
    this.saveData();
    return newComment;
  }

  async getAllComments(): Promise<any[]> {
    const allComments = Array.from(this.comments.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Enrich with user badges
    return allComments.map(comment => {
      if (comment.userId) {
        const user = this.users.get(comment.userId);
        const userBadges = user?.badges ?
          (typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges)
            .filter((b: any) => b.equipped) : [];
        return {
          ...comment,
          badges: userBadges,
          avatarUrl: user?.avatarUrl || comment.avatarUrl,
        };
      }
      return { ...comment, badges: [] };
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    this.comments.delete(commentId);
    this.saveData();
  }

  // Blog Posts methods
  async getAllBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getPublishedBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values())
      .filter(post => post.published)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getBlogPostById(id: string): Promise<BlogPost | undefined> {
    return this.blogPosts.get(id);
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    return Array.from(this.blogPosts.values()).find(post => post.slug === slug);
  }

  async createBlogPost(insertPost: InsertBlogPost): Promise<BlogPost> {
    const id = randomUUID();
    const now = new Date();
    const post: BlogPost = {
      id,
      title: insertPost.title,
      slug: insertPost.slug,
      contentType: insertPost.contentType,
      contentId: insertPost.contentId || null,
      featuredImage: insertPost.featuredImage,
      excerpt: insertPost.excerpt,
      content: insertPost.content,
      plotSummary: insertPost.plotSummary || null,
      review: insertPost.review || null,
      boxOffice: insertPost.boxOffice || null,
      trivia: insertPost.trivia || null,
      behindTheScenes: insertPost.behindTheScenes || null,
      awards: insertPost.awards || null,
      author: insertPost.author || "StreamVault",
      published: insertPost.published || false,
      featured: insertPost.featured || false,
      createdAt: now,
      updatedAt: now,
    };
    this.blogPosts.set(id, post);
    this.saveData();
    return post;
  }

  async updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
    const existingPost = this.blogPosts.get(id);
    if (!existingPost) {
      throw new Error("Blog post not found");
    }

    const updatedPost: BlogPost = {
      ...existingPost,
      ...updates,
      id: existingPost.id,
      createdAt: existingPost.createdAt,
      updatedAt: new Date(),
    };

    this.blogPosts.set(id, updatedPost);
    this.saveData();
    return updatedPost;
  }

  async deleteBlogPost(id: string): Promise<void> {
    this.blogPosts.delete(id);
    this.saveData();
  }

  // User Authentication Methods
  private enrichUser(user: User): User {
    const userBadges = Array.from(this.userBadges.values())
      .filter(ub => ub.userId === user.id);

    const badges = userBadges.map(ub => {
      let badgeDefinition = this.badges.get(ub.badgeId);

      // Fallback: If definition is missing (e.g. legacy data or sync issue), create a temporary one
      if (!badgeDefinition) {
        // console.warn(`[Storage] Warning: Missing badge definition for ${ub.badgeId}, using fallback.`);
        badgeDefinition = {
          id: ub.badgeId,
          name: ub.badgeId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '), // "new-comer" -> "New Comer"
          description: "Awarded Badge",
          imageUrl: "",
          icon: "star",
          category: "achievement",
          active: true,
          createdAt: new Date(),
          price: 0,
          currency: "USD",
          isForSale: false,
          giftable: false,
          displayPriority: 0,
          isSpecial: false,
          limited: false,
          stock: null
        };
        // Ideally, we might want to save this fallback to this.badges, but let's just use it for now 
        // to prevent the "hidden badge" loop.
        this.badges.set(ub.badgeId, badgeDefinition);
      }

      return {
        id: badgeDefinition.id,
        badgeId: badgeDefinition.id,
        name: badgeDefinition.name,
        description: badgeDefinition.description,
        imageUrl: badgeDefinition.imageUrl,
        category: badgeDefinition.category,
        equipped: ub.equipped,
        equippedAt: ub.equippedAt,
        earnedAt: ub.earnedAt,
        icon: badgeDefinition.icon || 'star'
      };
    });

    // Find equipped badge URL
    const equippedBadge = badges.find(b => b.equipped)?.imageUrl;

    return {
      ...user,
      badges: JSON.stringify(badges),
      equippedBadge
    };
  }

  async getAllUsers(): Promise<User[]> {
    // Ensure users are loaded
    if (this.users.size === 0) {
      this.loadUsers();
    }
    return Array.from(this.users.values()).map(u => this.enrichUser(u));
  }

  async getUserById(id: string): Promise<User | undefined> {
    // Ensure users are loaded
    if (this.users.size === 0) {
      this.loadUsers();
    }
    const user = this.users.get(id);
    return user ? this.enrichUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Ensure users are loaded
    if (this.users.size === 0) {
      this.loadUsers();
    }
    const user = Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
    return user ? this.enrichUser(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Ensure users are loaded
    if (this.users.size === 0) {
      this.loadUsers();
    }
    const user = Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
    return user ? this.enrichUser(user) : undefined;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = {
      ...userData,
      xp: 0,
      level: 1,
      badges: "[]",
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    this.saveUsers();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...existingUser,
      ...updates,
      id: existingUser.id,
      createdAt: existingUser.createdAt,
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    this.saveUsers();
    return updatedUser;
  }

  async setLastActive(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    const now = new Date();
    // Update in memory immediately
    user.lastActive = now;
    this.users.set(userId, user);

    // Persist to disk occasionally (e.g., probability check or just do it)
    // For safety in this environment, we'll save. 
    // To prevent IO thrashing, maybe we can implement a dirty flag system later, 
    // but for now, let's save but catch errors silently to not block content.
    try {
      this.saveUsers();
    } catch (e) {
      console.error("Background save failed", e);
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    if (this.users.size === 0) {
      this.loadUsers();
    }
    const lowerQuery = query.toLowerCase();
    return Array.from(this.users.values())
      .filter(u => u.username.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }


  // Password Reset Methods
  async createPasswordResetToken(email: string): Promise<string> {
    // Generate 6-digit code
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    this.passwordResetTokens.set(email, {
      email,
      token,
      expiresAt
    });

    return token;
  }

  async verifyPasswordResetToken(email: string, token: string): Promise<boolean> {
    const record = this.passwordResetTokens.get(email);
    if (!record) return false;

    if (Date.now() > record.expiresAt) {
      this.passwordResetTokens.delete(email);
      return false;
    }

    // crypto-safe comparison not strictly necessary for simple 6-digit code but good practice? 
    // simple string comparison is fine here.
    return record.token === token;
  }

  async deletePasswordResetToken(email: string): Promise<void> {
    this.passwordResetTokens.delete(email);
  }


  // Friends methods
  async getSuggestedFriends(userId: string): Promise<User[]> {
    // Ensure users are loaded
    if (this.users.size === 0) {
      this.loadUsers();
    }

    const allUsers = Array.from(this.users.values());
    const friends = await this.getFriends(userId);
    const friendIds = new Set(friends.map(f => f.userId === userId ? f.friendId : f.userId));

    // Filter out self and existing friends
    const candidates = allUsers.filter(u => u.id !== userId && !friendIds.has(u.id));

    // Enrich users with badges before returning
    const enrichedCandidates = candidates.map(u => this.enrichUser(u));

    // Shuffle and pick 5
    return enrichedCandidates.sort(() => 0.5 - Math.random()).slice(0, 5);
  }

  async getFriends(userId: string): Promise<Friend[]> {
    return Array.from(this.friends.values()).filter(
      f => f.userId === userId || f.friendId === userId
    );
  }

  async addFriend(userId: string, friendId: string): Promise<Friend> {
    const id = randomUUID();
    const friend: Friend = {
      id,
      userId,
      friendId,
      createdAt: new Date().toISOString(),
    };
    this.friends.set(id, friend);
    this.saveFriendsData();
    return friend;
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    for (const [id, friend] of this.friends) {
      if ((friend.userId === userId && friend.friendId === friendId) ||
        (friend.userId === friendId && friend.friendId === userId)) {
        this.friends.delete(id);
        break;
      }
    }
    this.saveFriendsData();
  }

  async areFriends(userId: string, friendId: string): Promise<boolean> {
    for (const friend of this.friends.values()) {
      if ((friend.userId === userId && friend.friendId === friendId) ||
        (friend.userId === friendId && friend.friendId === userId)) {
        return true;
      }
    }
    return false;
  }

  // Friend Requests methods
  async getFriendRequests(userId: string): Promise<FriendRequest[]> {
    return Array.from(this.friendRequests.values()).filter(
      req => req.toUserId === userId && req.status === 'pending'
    );
  }

  async getSentFriendRequests(userId: string): Promise<FriendRequest[]> {
    return Array.from(this.friendRequests.values()).filter(
      req => req.fromUserId === userId
    );
  }

  async createFriendRequest(fromUserId: string, toUserId: string): Promise<FriendRequest> {
    const id = randomUUID();
    const request: FriendRequest = {
      id,
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.friendRequests.set(id, request);
    this.saveFriendsData();
    return request;
  }

  async getFriendRequestById(id: string): Promise<FriendRequest | undefined> {
    return this.friendRequests.get(id);
  }

  async updateFriendRequest(id: string, updates: Partial<FriendRequest>): Promise<FriendRequest> {
    const request = this.friendRequests.get(id);
    if (!request) throw new Error("Friend request not found");
    const updated = { ...request, ...updates };
    this.friendRequests.set(id, updated);
    this.saveFriendsData();
    return updated;
  }

  async deleteFriendRequest(id: string): Promise<void> {
    this.friendRequests.delete(id);
    this.saveFriendsData();
  }

  // Notifications methods
  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.read).length;
  }

  async createNotification(notificationData: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...notificationData,
      id,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, notification);
    this.saveFriendsData();
    return notification;
  }

  async markNotificationRead(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.notifications.set(id, notification);
      this.saveFriendsData();
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId) {
        notification.read = true;
      }
    }
    this.saveFriendsData();
  }

  async markDmNotificationsRead(userId: string, fromUserId: string): Promise<void> {
    for (const notification of this.notifications.values()) {
      if (
        notification.userId === userId &&
        notification.type === 'dm' &&
        notification.data?.fromUserId === fromUserId
      ) {
        notification.read = true;
      }
    }
    this.saveFriendsData();
  }

  async deleteNotification(id: string): Promise<void> {
    this.notifications.delete(id);
    this.saveFriendsData();
  }

  // Direct Messages methods
  async getConversations(userId: string): Promise<{ friendId: string; lastMessage: DirectMessage; unreadCount: number }[]> {
    const messages = Array.from(this.directMessages.values());
    const conversationMap = new Map<string, { lastMessage: DirectMessage; unreadCount: number }>();

    for (const msg of messages) {
      let otherId: string;
      if (msg.fromUserId === userId) {
        otherId = msg.toUserId;
      } else if (msg.toUserId === userId) {
        otherId = msg.fromUserId;
      } else {
        continue;
      }

      const existing = conversationMap.get(otherId);
      if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
        const unreadCount = msg.toUserId === userId && !msg.read ? 1 : 0;
        conversationMap.set(otherId, {
          lastMessage: msg,
          unreadCount: (existing?.unreadCount || 0) + unreadCount
        });
      } else if (msg.toUserId === userId && !msg.read) {
        existing.unreadCount++;
      }
    }

    return Array.from(conversationMap.entries()).map(([friendId, data]) => ({
      friendId,
      lastMessage: data.lastMessage,
      unreadCount: data.unreadCount,
    })).sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  }

  async getMessages(userId: string, friendId: string): Promise<DirectMessage[]> {
    return Array.from(this.directMessages.values())
      .filter(msg =>
        (msg.fromUserId === userId && msg.toUserId === friendId) ||
        (msg.fromUserId === friendId && msg.toUserId === userId)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async sendMessage(
    fromUserId: string,
    toUserId: string,
    message: string,
    attachmentType?: 'image' | 'video' | 'audio' | 'gif' | 'file' | 'call',
    attachmentUrl?: string,
    attachmentFilename?: string,
    attachmentSize?: number,
    attachmentMimeType?: string,
    audioDuration?: number,
    replyToId?: string
  ): Promise<DirectMessage> {
    const id = randomUUID();
    const dm: DirectMessage = {
      id,
      fromUserId,
      toUserId,
      message,
      attachmentType,
      attachmentUrl,
      attachmentFilename,
      attachmentSize,
      attachmentMimeType,
      audioDuration,
      replyToId,
      reactions: [],
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.directMessages.set(id, dm);
    this.saveFriendsData();
    return dm;
  }

  async markMessagesRead(userId: string, friendId: string): Promise<void> {
    for (const msg of this.directMessages.values()) {
      if (msg.fromUserId === friendId && msg.toUserId === userId && !msg.read) {
        msg.read = true;
      }
    }
    this.saveFriendsData();
  }

  async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const msg of this.directMessages.values()) {
      if (msg.toUserId === userId && !msg.read) {
        counts[msg.fromUserId] = (counts[msg.fromUserId] || 0) + 1;
      }
    }
    return counts;
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<DirectMessage> {
    const message = this.directMessages.get(messageId);
    if (!message) throw new Error("Message not found");

    if (!message.reactions) {
      message.reactions = [];
    }

    // Check if user already reacted with ANY emoji (to replace) or SAME emoji (to remove)
    const existingReactionIndex = message.reactions.findIndex(r => r.userId === userId);

    if (existingReactionIndex !== -1) {
      const existing = message.reactions[existingReactionIndex];
      if (existing.emoji === emoji) {
        // Toggle off if same emoji
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Replace if different emoji
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ userId, emoji });
    }

    this.saveFriendsData();
    return message;
  }

  // Save/Load friends data
  private saveFriendsData(): void {
    try {
      const friendsFile = join(process.cwd(), "data", "friends.json");
      const data = {
        friends: Array.from(this.friends.values()),
        friendRequests: Array.from(this.friendRequests.values()),
        notifications: Array.from(this.notifications.values()),
        directMessages: Array.from(this.directMessages.values()),
      };
      writeFileSync(friendsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving friends data:", error);
    }
  }

  private loadFriendsData(): void {
    try {
      const friendsFile = join(process.cwd(), "data", "friends.json");
      if (existsSync(friendsFile)) {
        const data = JSON.parse(readFileSync(friendsFile, "utf-8"));
        if (data.friends) {
          for (const f of data.friends) {
            this.friends.set(f.id, f);
          }
        }
        if (data.friendRequests) {
          for (const r of data.friendRequests) {
            this.friendRequests.set(r.id, r);
          }
        }
        if (data.notifications) {
          for (const n of data.notifications) {
            this.notifications.set(n.id, n);
          }
        }
        if (data.directMessages) {
          for (const m of data.directMessages) {
            this.directMessages.set(m.id, m);
          }
        }
        console.log(`✅ Loaded ${this.friends.size} friends, ${this.friendRequests.size} requests, ${this.notifications.size} notifications, ${this.directMessages.size} messages`);
      }
    } catch (error) {
      console.error("Error loading friends data:", error);
    }
  }

  // Gamification Implementation
  async updateUserXP(userId: string, amount: number): Promise<{ user: User; levelUp: boolean }> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    user.xp = (user.xp || 0) + amount;

    // Level calculation: 1000 XP per level
    const newLevel = Math.floor(user.xp / 1000) + 1;
    const levelUp = newLevel > (user.level || 1);
    user.level = newLevel;

    this.users.set(userId, user);
    this.saveUsers();

    return { user, levelUp };
  }

  // Badge Methods
  async getBadges(): Promise<Badge[]> {
    return Array.from(this.badges.values());
  }

  async getBadge(id: string): Promise<Badge | undefined> {
    return this.badges.get(id);
  }

  async createBadge(badgeInit: InsertBadge & { id?: string }): Promise<Badge> {
    const id = badgeInit.id || randomUUID();
    const badge: Badge = {
      ...badgeInit,
      id,
      category: badgeInit.category || "general",
      active: badgeInit.active ?? true,
      imageUrl: badgeInit.imageUrl || "",
      createdAt: new Date(),
    };
    this.badges.set(id, badge);
    this.saveData();
    return badge;
  }

  async updateBadge(id: string, updates: Partial<InsertBadge>): Promise<Badge | undefined> {
    const badge = this.badges.get(id);
    if (!badge) return undefined;
    const updated = { ...badge, ...updates };
    this.badges.set(id, updated);
    this.saveData();
    return updated;
  }

  async deleteBadge(id: string): Promise<void> {
    this.badges.delete(id);
    this.saveData();
  }

  async getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]> {
    const userBadges = Array.from(this.userBadges.values())
      .filter(ub => ub.userId === userId);

    // Join with Badge details
    return userBadges.map(ub => {
      const badge = this.badges.get(ub.badgeId);
      if (!badge) throw new Error(`Badge not found for id ${ub.badgeId}`);
      return { ...ub, badge };
    });
  }

  // Add badge directly to user's badges JSON field (for achievements that aren't in the badges table)
  async addBadge(userId: string, badgeData: { id: string; name: string; description: string; icon: string; imageUrl?: string; earnedAt?: string }): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    // 1. Ensure Badge exists in definitions
    if (!this.badges.has(badgeData.id)) {
      // Create it if missing (lazy migration of code-defined achievements to DB)
      this.badges.set(badgeData.id, {
        id: badgeData.id,
        name: badgeData.name,
        description: badgeData.description,
        imageUrl: badgeData.imageUrl || "",  // Achievements might not have images yet
        icon: badgeData.icon,
        category: "achievement",
        active: true,
        createdAt: new Date(),
        price: 0,
        currency: "USD",
        isForSale: false,
        giftable: false,
        displayPriority: 0,
        isSpecial: false,
        limited: false,
        stock: null
      });
      // console.log(`[Storage] Auto-created missing badge definition: ${badgeData.name}`);
    }

    // 2. Add to UserBadges (the source of truth)
    const existingUserBadge = Array.from(this.userBadges.values()).find(
      ub => ub.userId === userId && ub.badgeId === badgeData.id
    );

    if (!existingUserBadge) {
      const id = randomUUID();
      const userBadge: UserBadge = {
        id,
        userId,
        badgeId: badgeData.id,
        equipped: false,
        earnedAt: new Date(badgeData.earnedAt || new Date()),
        giftedFrom: null,
        giftMessage: null
      };
      this.userBadges.set(id, userBadge);
      this.saveData(); // Persist changes
    }
  }

  async awardBadge(userId: string, badgeId: string): Promise<UserBadge> {
    // Check if valid badge
    const badge = this.badges.get(badgeId);
    if (!badge) throw new Error("Badge not found");

    // Check availability (already has it?)
    const existing = Array.from(this.userBadges.values())
      .find(ub => ub.userId === userId && ub.badgeId === badgeId);

    if (existing) return existing;

    const id = randomUUID();
    const userBadge: UserBadge = {
      id,
      userId,
      badgeId,
      earnedAt: new Date(),
    };
    this.userBadges.set(id, userBadge);

    // Also update User profile JSON for backward compatibility? 
    // Or assume frontend reads from new API.
    // The user schema has `badges` string field. I should update that too to keep sync?
    // "badges": text("badges").default("[]").notNull()
    const user = this.users.get(userId);
    if (user) {
      // Parse existing badges
      let currentBadges: any[] = [];
      try {
        currentBadges = JSON.parse(user.badges || "[]");
      } catch (e) { currentBadges = []; }

      // Add new badge minimal info
      currentBadges.push({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: 'award', // Fallback for old UI
        categoryId: badge.category, // Store category for frontend filtering
        category: badge.category,
        imageUrl: badge.imageUrl,
        earnedAt: userBadge.earnedAt.toISOString()
      });

      user.badges = JSON.stringify(currentBadges);
      this.users.set(userId, user);
    }

    this.saveData();
    return userBadge;
  }

  async revokeBadge(userId: string, badgeId: string): Promise<void> {
    const userBadgesToRemove = Array.from(this.userBadges.values())
      .filter(ub => ub.userId === userId && ub.badgeId === badgeId);

    if (userBadgesToRemove.length > 0) {
      // Remove all instances (handles potential duplicates)
      userBadgesToRemove.forEach(ub => this.userBadges.delete(ub.id));

      // Update legacy JSON field
      const user = this.users.get(userId);
      if (user) {
        let currentBadges: any[] = [];
        try {
          currentBadges = JSON.parse(user.badges || "[]");
        } catch (e) { currentBadges = []; }

        // Remove the badge
        const updatedBadges = currentBadges.filter(b => b.id !== badgeId);
        user.badges = JSON.stringify(updatedBadges);
        this.users.set(userId, user);
        this.saveUsers(); // Persist user changes
      }

      this.saveData();
      console.log(`✅ Revoked ${userBadgesToRemove.length} instances of badge ${badgeId} for user ${userId}`);
    }
  }

  async getEquippedBadge(userId: string): Promise<Badge | undefined> {
    const userBadge = Array.from(this.userBadges.values()).find(
      ub => ub.userId === userId && ub.equipped
    );

    if (!userBadge) return undefined;
    return this.badges.get(userBadge.badgeId);
  }

  async getLeaderboard(limit: number): Promise<User[]> {
    // Ensure users loaded
    if (this.users.size === 0) this.loadUsers();

    return Array.from(this.users.values())
      .sort((a, b) => (b.xp || 0) - (a.xp || 0))
      .slice(0, limit)
      .map(u => ({ ...u, passwordHash: "" })); // Safety
  }

  // Reminders Implementation
  async createReminder(insertReminder: InsertReminder): Promise<Reminder> {
    const id = randomUUID();
    const reminder: Reminder = {
      ...insertReminder,
      id,
      notified: false,
      createdAt: new Date(),
    };
    this.reminders.set(id, reminder);
    this.saveData();
    return reminder;
  }

  async getReminders(userId: string): Promise<Reminder[]> {
    return Array.from(this.reminders.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
  }

  async deleteReminder(id: string): Promise<void> {
    this.reminders.delete(id);
    this.saveData();
  }

  private loadApiKeys(): void {
    try {
      if (existsSync(this.apiKeysFile)) {
        const data = JSON.parse(readFileSync(this.apiKeysFile, "utf-8"));
        for (const key of data) {
          this.apiKeys.set(key.id, key);
        }
        console.log(`🔑 Loaded ${this.apiKeys.size} API keys`);
      }
    } catch (error) {
      console.error("Error loading API keys:", error);
    }
  }

  private saveApiKeys(): void {
    try {
      const data = Array.from(this.apiKeys.values());
      writeFileSync(this.apiKeysFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving API keys:", error);
    }
  }

  async getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter(k => k.userId === userId);
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    return Array.from(this.apiKeys.values()).find(k => k.key === key);
  }

  async createApiKey(userId: string, name: string): Promise<ApiKey> {
    // Generate a secure random key (32 chars hex)
    const key = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 8);
    const now = new Date().toISOString();

    const apiKey: ApiKey = {
      id: randomUUID(),
      key: `sv_${key}`, // Prefix for easy identification
      name,
      userId,
      scope: 'read-only',
      lastUsed: undefined,
      requestsToday: 0,
      requestsThisMinute: 0,
      lastMinuteReset: new Date().toISOString(),
      lastDayReset: new Date().toISOString(),
      rateLimitDaily: 1000,
      rateLimitMinute: 60,
      tier: 'free'
    };

    this.apiKeys.set(apiKey.id, apiKey);
    this.saveApiKeys();
    return apiKey;
  }

  async deleteApiKey(id: string, userId: string): Promise<void> {
    const apiKey = this.apiKeys.get(id);
    if (apiKey && apiKey.userId === userId) {
      this.apiKeys.delete(id);
      this.saveApiKeys();
    }
  }

  async updateApiKeyUsage(id: string): Promise<{ allowed: boolean; reason?: string }> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) {
      return { allowed: false, reason: 'Invalid API key' };
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Check and reset daily counter (midnight UTC)
    const lastDayReset = new Date(apiKey.lastDayReset);
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    if (lastDayReset < todayStart) {
      apiKey.requestsToday = 0;
      apiKey.lastDayReset = nowIso;
    }

    // Check and reset minute counter
    const lastMinuteReset = new Date(apiKey.lastMinuteReset);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    if (lastMinuteReset < oneMinuteAgo) {
      apiKey.requestsThisMinute = 0;
      apiKey.lastMinuteReset = nowIso;
    }

    // Check rate limits
    // Check rate limits
    const dailyLimit = apiKey.rateLimitDaily || 1000;
    const minuteLimit = apiKey.rateLimitMinute || 60;

    if (apiKey.requestsToday >= dailyLimit) {
      return { allowed: false, reason: `Daily rate limit exceeded: ${dailyLimit} requests per day. Resets at midnight UTC.` };
    }

    if (apiKey.requestsThisMinute >= minuteLimit) {
      return { allowed: false, reason: `Rate limit exceeded: ${minuteLimit} requests per minute. Please wait and try again.` };
    }

    // Increment counters
    apiKey.requestsThisMinute++;
    apiKey.requestsToday++;
    apiKey.lastUsed = nowIso;

    this.apiKeys.set(id, apiKey);
    this.saveApiKeys();

    return { allowed: true };
  }

  async upgradeApiKey(userId: string, keyId: string, tier: 'pro' | 'enterprise'): Promise<ApiKey> {
    const key = this.apiKeys.get(keyId);
    if (!key) throw new Error("API Key not found");
    // if (key.userId !== userId) throw new Error("Unauthorized"); // Allow admin or same user

    // Validate Tier
    const TIER_CONFIG = {
      'pro': { daily: 10000, minute: 600, cost: 1000, name: 'Pro' },
      'enterprise': { daily: 100000, minute: 6000, cost: 5000, name: 'Enterprise' }
    };

    interface TierConfig {
      daily: number;
      minute: number;
      cost: number;
      name: string;
    }

    // Explicit type to satisfy TS
    const config: TierConfig | undefined = (TIER_CONFIG as any)[tier];
    if (!config) throw new Error("Invalid tier");

    // Deduct Coins
    // Note: deductUserCoins handles the check for sufficient balance
    const deductionSuccess = await this.deductUserCoins(userId, config.cost);
    if (!deductionSuccess) {
      throw new Error(`Insufficient coins. ${config.name} tier costs ${config.cost} coins.`);
    }

    // Update Key
    key.tier = tier;
    key.rateLimitDaily = config.daily;
    key.rateLimitMinute = config.minute;

    this.apiKeys.set(keyId, key);
    this.saveApiKeys();

    // Log Transaction
    await this.createCoinTransaction({
      userId,
      amount: -config.cost,
      type: 'purchase',
      description: `Upgraded API Key (${key.name}) to ${config.name} Tier`,
      metadata: JSON.stringify({ keyId, tier })
    });

    return key;
  }

  // ============================================
  // STREAK TRACKING IMPLEMENTATION
  // ============================================

  async updateUserStreak(userId: string): Promise<{ user: User; streakIncreased: boolean; milestone?: number }> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastWatch = user.lastWatchDate;

    let streakIncreased = false;
    let milestone: number | undefined;

    if (!lastWatch) {
      // First time watching
      user.currentStreak = 1;
      user.longestStreak = Math.max(user.longestStreak || 0, 1);
      streakIncreased = true;
    } else if (lastWatch === today) {
      // Already watched today, no change
    } else {
      const lastDate = new Date(lastWatch);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day - increment streak
        user.currentStreak = (user.currentStreak || 0) + 1;
        user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
        streakIncreased = true;

        // Check for milestones (7, 30, 100, 365 days)
        const milestones = [7, 30, 100, 365];
        for (const m of milestones) {
          if (user.currentStreak === m) {
            milestone = m;
            break;
          }
        }
      } else if (diffDays > 1) {
        // Streak broken - reset to 1
        user.currentStreak = 1;
        streakIncreased = true;
      }
    }

    user.lastWatchDate = today;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    this.saveUsers();

    return { user, streakIncreased, milestone };
  }

  async getUserStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number; lastWatchDate: string | null; claimedMilestones: number[] }> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    return {
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      lastWatchDate: user.lastWatchDate || null,
      claimedMilestones: (user as any).claimedStreakMilestones || [],
    };
  }

  async claimStreakMilestone(userId: string, claimedMilestones: number[]): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    (user as any).claimedStreakMilestones = claimedMilestones;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    this.saveUsers();
  }

  // ============================================
  // SAVED SUBTITLES IMPLEMENTATION
  // ============================================

  async getSavedSubtitles(imdbId: string, season?: number, episode?: number): Promise<SavedSubtitle[]> {
    return Array.from(this.savedSubtitles.values()).filter(sub => {
      // Must match IMDB ID
      if (sub.imdbId !== imdbId) return false;
      
      // If content demands season/episode, it must match.
      // If subtitle has season/episode attached, it must match the request's season/episode.
      // E.g., a movie subtitle has undefined season/episode, which matches a movie request.
      if (sub.season !== season || sub.episode !== episode) return false;
      
      return true;
    });
  }

  async saveSubtitle(data: Omit<SavedSubtitle, 'id' | 'addedAt'>): Promise<SavedSubtitle> {
    // Check if an existing one with same language+imdbid+season+episode exists
    const existing = Array.from(this.savedSubtitles.values()).find(sub => 
      sub.imdbId === data.imdbId && 
      sub.season === data.season && 
      sub.episode === data.episode &&
      sub.language === data.language
    );

    if (existing) {
      // Overwrite it!
      const updated: SavedSubtitle = {
        ...existing,
        ...data,
      };
      this.savedSubtitles.set(existing.id, updated);
      this.saveSavedSubtitles();
      return updated;
    }

    const id = randomUUID();
    const sub: SavedSubtitle = {
      ...data,
      id,
      addedAt: new Date().toISOString()
    };
    
    this.savedSubtitles.set(id, sub);
    this.saveSavedSubtitles();
    return sub;
  }

  async deleteSavedSubtitle(id: string): Promise<void> {
    this.savedSubtitles.delete(id);
    this.saveSavedSubtitles();
  }

  // Moderators
  async logModeratorAction(userId: string, action: string, details?: string): Promise<ModeratorLog> {
    const log: ModeratorLog = {
      id: Math.random().toString(36).substring(2, 9),
      userId,
      action,
      details: details || null,
      createdAt: new Date(),
    };
    this.moderatorLogs.set(log.id, log);
    this.saveModeratorLogs();
    return log;
  }

  async getModeratorLogs(): Promise<(ModeratorLog & { username: string; email: string })[]> {
    return Array.from(this.moderatorLogs.values())
      .map(log => {
        const user = this.users.get(log.userId);
        return {
          ...log,
          username: user?.username || 'Unknown',
          email: user?.email || 'Unknown',
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateUserRole(userId: string, isModerator: boolean): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    user.isModerator = isModerator;
    this.saveUsers();
    return user;
  }

  async getModerators(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.isModerator);
  }

  // ============================================
  // REVIEWS IMPLEMENTATION
  // ============================================

  async createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'helpfulCount'>): Promise<Review> {
    // Check if user already has a review for this content
    const existing = await this.getUserReview(reviewData.userId, reviewData.contentType, reviewData.contentId);

    const now = new Date();
    if (existing) {
      // Update existing review
      const updated: Review = {
        ...existing,
        ...reviewData,
        updatedAt: now,
      };
      this.reviews.set(existing.id, updated);
      this.saveData();
      return updated;
    }

    // Create new review
    const id = randomUUID();
    const review: Review = {
      ...reviewData,
      id,
      helpfulCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.reviews.set(id, review);
    this.saveData();
    return review;
  }

  async getReviews(contentType: string, contentId: string): Promise<(Review & { username: string; avatarUrl: string | null })[]> {
    const reviews = Array.from(this.reviews.values())
      .filter(r => r.contentType === contentType && r.contentId === contentId)
      .sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));

    return reviews.map(review => {
      const user = this.users.get(review.userId);

      // Fetch equipped badges
      let authorBadges: Badge[] = [];
      if (user) {
        const userBadges = Array.from(this.userBadges.values())
          .filter(ub => ub.userId === user.id && ub.equipped);

        authorBadges = userBadges
          .map(ub => {
            const badge = this.badges.get(ub.badgeId);
            return badge ? { ...badge, equippedAt: ub.equippedAt } : null;
          })
          .filter((b): b is Badge & { equippedAt: any } => !!b)
          .sort((a, b) => (b.displayPriority || 0) - (a.displayPriority || 0));
      }

      return {
        ...review,
        username: user?.username || 'Unknown',
        avatarUrl: user?.avatarUrl || null,
        authorBadges
      };
    });
  }

  async getAllReviews(): Promise<(Review & { username: string; avatarUrl: string | null; badges?: any[]; contentTitle?: string })[]> {
    const allReviews = Array.from(this.reviews.values());

    // Sort by newest first
    allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Enrich with user data and content title
    return allReviews.map(review => {
      const user = this.users.get(review.userId);
      let contentTitle = "Unknown Content";

      if (review.contentType === 'movie') {
        const movie = this.movies.get(review.contentId);
        if (movie) contentTitle = movie.title;
      } else if (review.contentType === 'show') {
        const show = this.shows.get(review.contentId);
        if (show) contentTitle = show.title;
      } else if (review.contentType === 'anime') {
        const anime = this.anime.get(review.contentId);
        if (anime) contentTitle = anime.title;
      }

      // Get equipped badges for this user
      const userBadges = user?.badges ?
        (typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges)
          .filter((b: any) => b.equipped) : [];

      return {
        ...review,
        username: user?.username || "Unknown User",
        avatarUrl: user?.avatarUrl || null,
        badges: userBadges,
        contentTitle
      };
    });
  }

  async getUserReview(userId: string, contentType: string, contentId: string): Promise<Review | undefined> {
    return Array.from(this.reviews.values()).find(
      r => r.userId === userId && r.contentType === contentType && r.contentId === contentId
    );
  }

  async deleteReview(id: string, userId?: string): Promise<void> {
    const review = this.reviews.get(id);
    if (!review) return;

    // If userId is provided, verify ownership (user deleting own review)
    // If not provided, assume admin override (routes should enforce admin check)
    if (userId && review.userId !== userId) {
      throw new Error("Unauthorized to delete this review");
    }

    this.reviews.delete(id);
    this.saveData();
  }

  async markReviewHelpful(reviewId: string, userId: string): Promise<void> {
    // Check if user already marked this review
    const existing = Array.from(this.reviewHelpful.values()).find(
      h => h.reviewId === reviewId && h.userId === userId
    );
    if (existing) return;

    // Add helpful vote
    const id = randomUUID();
    const vote: ReviewHelpfulVote = {
      id,
      reviewId,
      userId,
      createdAt: new Date(),
    };
    this.reviewHelpful.set(id, vote);

    // Update review's helpful count
    const review = this.reviews.get(reviewId);
    if (review) {
      review.helpfulCount = (review.helpfulCount || 0) + 1;
      this.reviews.set(reviewId, review);
    }
    this.saveData();
  }

  async getAverageRating(contentType: string, contentId: string): Promise<{ average: number; count: number }> {
    const reviews = Array.from(this.reviews.values())
      .filter(r => r.contentType === contentType && r.contentId === contentId);

    if (reviews.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Math.round((sum / reviews.length) * 10) / 10,
      count: reviews.length,
    };
  }

  // ============================================
  // CHALLENGES IMPLEMENTATION
  // ============================================

  async getChallenges(type?: 'daily' | 'weekly'): Promise<Challenge[]> {
    const now = new Date();
    return Array.from(this.challenges.values())
      .filter(c => {
        if (!c.active) return false;
        if (type && c.type !== type) return false;
        if (new Date(c.endDate) < now) return false;
        return true;
      })
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  }

  async getUserChallenges(userId: string): Promise<(UserChallenge & { challenge: Challenge })[]> {
    const userChallenges = Array.from(this.userChallenges.values())
      .filter(uc => uc.userId === userId);

    return userChallenges.map(uc => {
      const challenge = this.challenges.get(uc.challengeId);
      return { ...uc, challenge: challenge! };
    }).filter(uc => uc.challenge);
  }

  async updateChallengeProgress(userId: string, challengeId: string, increment: number): Promise<UserChallenge> {
    // Find or create user challenge entry
    let userChallenge = Array.from(this.userChallenges.values()).find(
      uc => uc.userId === userId && uc.challengeId === challengeId
    );

    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error("Challenge not found");

    if (!userChallenge) {
      const id = randomUUID();
      userChallenge = {
        id,
        userId,
        challengeId,
        progress: 0,
        completed: false,
        claimed: false,
        completedAt: null,
        createdAt: new Date(),
      };
      this.userChallenges.set(id, userChallenge);
    }

    // Update progress
    userChallenge.progress = (userChallenge.progress || 0) + increment;

    // Check if completed
    if (userChallenge.progress >= challenge.targetValue && !userChallenge.completed) {
      userChallenge.completed = true;
      userChallenge.completedAt = new Date();
    }

    this.userChallenges.set(userChallenge.id, userChallenge);
    this.saveData();
    return userChallenge;
  }

  async claimChallengeReward(userId: string, challengeId: string): Promise<{ xpAwarded: number; badgeAwarded?: string }> {
    const userChallenge = Array.from(this.userChallenges.values()).find(
      uc => uc.userId === userId && uc.challengeId === challengeId
    );

    if (!userChallenge || !userChallenge.completed || userChallenge.claimed) {
      throw new Error("Cannot claim reward");
    }

    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error("Challenge not found");

    // Mark as claimed
    userChallenge.claimed = true;
    this.userChallenges.set(userChallenge.id, userChallenge);

    // Award XP
    await this.updateUserXP(userId, challenge.xpReward);

    // Award badge if applicable
    let badgeAwarded: string | undefined;
    if (challenge.badgeReward) {
      // Check if badge exists in badges table
      const badge = await this.getBadge(challenge.badgeReward);
      if (badge) {
        badgeAwarded = badge.id;
        await this.awardBadge(userId, badge.id);
      }
    }

    this.saveData();
    return { xpAwarded: challenge.xpReward, badgeAwarded };
  }

  async createChallenge(challengeData: Omit<Challenge, 'id' | 'createdAt'>): Promise<Challenge> {
    const id = randomUUID();
    const challenge: Challenge = {
      ...challengeData,
      id,
      createdAt: new Date(),
    };
    this.challenges.set(id, challenge);
    this.saveData();
    return challenge;
  }

  // ============================================
  // REFERRALS IMPLEMENTATION
  // ============================================

  async generateReferralCode(userId: string): Promise<string> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate unique 8-character code
    const code = randomUUID().slice(0, 8).toUpperCase();
    user.referralCode = code;
    this.users.set(userId, user);
    this.saveUsers();
    return code;
  }

  async applyReferralCode(newUserId: string, code: string): Promise<void> {
    const referrer = Array.from(this.users.values()).find(u => u.referralCode === code);
    if (!referrer) throw new Error("Invalid referral code");
    if (referrer.id === newUserId) throw new Error("Cannot refer yourself");

    const newUser = this.users.get(newUserId);
    if (!newUser) throw new Error("User not found");
    if (newUser.referredBy) throw new Error("Already used a referral code");

    // Update new user
    newUser.referredBy = referrer.id;
    newUser.xp = (newUser.xp || 0) + 50; // Welcome bonus
    this.users.set(newUserId, newUser);

    // Update referrer
    referrer.referralCount = (referrer.referralCount || 0) + 1;
    referrer.xp = (referrer.xp || 0) + 200; // Increased base reward to 200 XP

    // Check for Milestone Rewards (Multiples of 5)
    let milestoneMessage = "";
    if (referrer.referralCount % 5 === 0) {
      const tier = referrer.referralCount / 5;

      // Calculate Milestone Bonuses
      // Series: 5 -> 500xp, 100 coins
      //        10 -> 1000xp, 150 coins
      //        15 -> 1500xp, 200 coins
      const bonusXP = tier * 500;
      const bonusCoins = 100 + ((tier - 1) * 50);

      referrer.xp += bonusXP;
      referrer.coins = (referrer.coins || 0) + bonusCoins;

      // Record Milestone Transaction
      await this.createCoinTransaction({
        userId: referrer.id,
        amount: bonusCoins,
        type: 'referral_bonus',
        description: `Referral Milestone: ${referrer.referralCount} Users!`,
        metadata: JSON.stringify({ tier, bonusXP, bonusCoins })
      });

      await this.addXpHistory(referrer.id, bonusXP, `referral_milestone_${referrer.referralCount}`);

      milestoneMessage = ` Milestone reached! Bonus: ${bonusXP} XP & ${bonusCoins} Coins!`;
    }

    this.users.set(referrer.id, referrer);

    // Add XP History
    await this.addXpHistory(newUserId, 50, 'referral_bonus');
    await this.addXpHistory(referrer.id, 200, 'referral_reward');

    // Notify Referrer
    await this.createNotification({
      userId: referrer.id,
      type: 'system',
      title: 'Referral Bonus! 🎉',
      message: `${newUser.username} used your referral code. You earned 200 XP!${milestoneMessage}`,
      read: false,
      data: { referralId: newUser.id }
    });

    this.saveUsers();
  }

  async getReferralLeaderboard(limit: number): Promise<{ userId: string; username: string; avatarUrl: string | null; referralCount: number }[]> {
    return Array.from(this.users.values())
      .filter(u => (u.referralCount || 0) > 0)
      .sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))
      .slice(0, limit)
      .map(u => ({
        userId: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        referralCount: u.referralCount || 0,
      }));
  }

  // ============================================
  // POLLS IMPLEMENTATION
  // ============================================

  async createPoll(pollData: Omit<Poll, 'id' | 'createdAt'>): Promise<Poll> {
    const id = randomUUID();
    const poll: Poll = {
      ...pollData,
      id,
      createdAt: new Date(),
    };
    this.polls.set(id, poll);
    this.saveData();
    return poll;
  }

  async getPolls(activeOnly: boolean = true): Promise<Poll[]> {
    const now = new Date();
    return Array.from(this.polls.values())
      .filter(p => {
        if (activeOnly && !p.active) return false;
        if (activeOnly && p.endDate && new Date(p.endDate) < now) return false;
        return true;
      })
      .sort((a, b) => {
        // Featured first, then by creation date
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  async getPollById(id: string): Promise<Poll | undefined> {
    return this.polls.get(id);
  }

  async votePoll(pollId: string, userId: string, optionIndex: number): Promise<void> {
    const poll = this.polls.get(pollId);
    if (!poll) throw new Error("Poll not found");
    if (!poll.active) throw new Error("Poll is closed");
    if (poll.endDate && new Date(poll.endDate) < new Date()) throw new Error("Poll has ended");

    // Check if user already voted
    const existingVote = await this.getUserVote(pollId, userId);
    if (existingVote) throw new Error("Already voted");

    // Validate option index
    const options = JSON.parse(poll.options);
    if (optionIndex < 0 || optionIndex >= options.length) throw new Error("Invalid option");

    const id = randomUUID();
    const vote: PollVote = {
      id,
      pollId,
      userId,
      optionIndex,
      createdAt: new Date(),
    };
    this.pollVotes.set(id, vote);
    this.saveData();
  }

  async getPollResults(pollId: string): Promise<{ optionIndex: number; count: number }[]> {
    const votes = Array.from(this.pollVotes.values()).filter(v => v.pollId === pollId);

    // Count votes per option
    const counts = new Map<number, number>();
    for (const vote of votes) {
      counts.set(vote.optionIndex, (counts.get(vote.optionIndex) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([optionIndex, count]) => ({ optionIndex, count }));
  }

  async getUserVote(pollId: string, userId: string): Promise<PollVote | undefined> {
    return Array.from(this.pollVotes.values()).find(
      v => v.pollId === pollId && v.userId === userId
    );
  }

  async getPollVotesDetails(pollId: string): Promise<{ userId: string; username: string; optionIndex: number; avatarUrl: string | null }[]> {
    const votes = Array.from(this.pollVotes.values()).filter(v => v.pollId === pollId);
    return votes.map(v => {
      const user = this.users.get(v.userId);
      return { 
        userId: v.userId, 
        username: user?.username || 'Unknown', 
        optionIndex: v.optionIndex,
        avatarUrl: user?.avatarUrl || null
      };
    });
  }

  // ============================================
  // XP HISTORY IMPLEMENTATION
  // ============================================

  async addXpHistory(userId: string, amount: number, source: string): Promise<XpHistoryEntry> {
    const id = randomUUID();
    const entry: XpHistoryEntry = {
      id,
      userId,
      amount,
      source,
      createdAt: new Date(),
    };
    this.xpHistory.set(id, entry);
    this.saveData();
    return entry;
  }

  async getLeaderboardByPeriod(period: 'daily' | 'weekly' | 'monthly', limit: number): Promise<{ userId: string; username: string; avatarUrl: string | null; xpGained: number; level: number }[]> {
    const now = new Date();
    let startDate: Date;

    if (period === 'daily') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === 'weekly') {
      // Start of week (Sunday)
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Start of month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Filter XP history by date
    const xpEntries = Array.from(this.xpHistory.values()).filter(entry =>
      new Date(entry.createdAt) >= startDate
    );

    // Aggregate XP by user
    const userXpMap = new Map<string, number>();
    for (const entry of xpEntries) {
      const current = userXpMap.get(entry.userId) || 0;
      userXpMap.set(entry.userId, current + entry.amount);
    }

    // Map to return format
    const leaderboard = [];
    for (const [userId, xpGained] of userXpMap.entries()) {
      const user = this.users.get(userId);
      if (user) {
        leaderboard.push({
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          xpGained,
          level: user.level,
        });
      }
    }

    // Sort by XP gained descending
    return leaderboard
      .sort((a, b) => b.xpGained - a.xpGained)
      .slice(0, limit);
  }

  // Coins & Transactions
  // The following methods are typically part of an interface (like IStorage)
  // and would need concrete implementations in this class (MemStorage).
  // As per the instruction, these are added as abstract method signatures.
  // If this is a concrete class, these would need to be implemented.
  // For example:
  // async updateUserCoins(userId: string, amount: number): Promise<User> {
  //   // Implementation here
  //   throw new Error("Method not implemented.");
  // }
  // async createCoinTransaction(transaction: InsertCoinTransaction): Promise<CoinTransaction> {
  //   // Implementation here
  //   throw new Error("Method not implemented.");
  async updateUserCoins(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, coins: (user.coins || 0) + amount };
    this.users.set(userId, updatedUser);
    this.saveUsers();
    return updatedUser;
  }

  async deductUserCoins(userId: string, amount: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    // Initialize coins if undefined
    const currentCoins = user.coins || 0;

    // Atomic check
    if (currentCoins < amount) {
      return false;
    }

    // Atomic update
    const updatedUser = { ...user, coins: currentCoins - amount };
    this.users.set(userId, updatedUser);
    this.saveUsers();
    return true;
  }

  async updateAdFreeStatus(userId: string, until: Date): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, adFreeUntil: until };
    this.users.set(userId, updatedUser);
    this.saveUsers();
    return updatedUser;
  }

  async createCoinTransaction(transaction: InsertCoinTransaction): Promise<CoinTransaction> {
    const id = randomUUID();
    const newTransaction: CoinTransaction = {
      ...transaction,
      id,
      createdAt: new Date(),
    };
    this.coinTransactions.set(id, newTransaction);
    this.saveData();
    return newTransaction;
  }

  async getUserCoinTransactions(userId: string): Promise<CoinTransaction[]> {
    return Array.from(this.coinTransactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllCoinTransactions(): Promise<CoinTransaction[]> {
    return Array.from(this.coinTransactions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }



  // Admin stats
  // async getStats(): Promise<{
  //   users: number;
  //   shows: number;
  //   movies: number;
  //   anime: number;
  // }> {
  //   // Implementation here
  //   throw new Error("Method not implemented.");
  // }

  async getBadgeStats(): Promise<{ totalBadges: number; totalAwarded: number; popularBadges: { name: string; count: number }[] }> {
    const totalBadges = this.badges.size;
    const totalAwarded = this.userBadges.size;

    const badgeCounts = new Map<string, number>();
    for (const ub of this.userBadges.values()) {
      badgeCounts.set(ub.badgeId, (badgeCounts.get(ub.badgeId) || 0) + 1);
    }

    const popularBadges = Array.from(badgeCounts.entries())
      .map(([id, count]) => {
        const badge = this.badges.get(id);
        return { name: badge?.name || 'Unknown', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { totalBadges, totalAwarded, popularBadges };
  }

  async updateUserBadgeEquippedStatus(userId: string, badgeId: string, equipped: boolean): Promise<void> {
    const userBadge = Array.from(this.userBadges.values()).find(
      ub => ub.userId === userId && ub.badgeId === badgeId
    );

    if (userBadge) {
      userBadge.equipped = equipped;
      userBadge.equippedAt = equipped ? new Date() : null;
      this.userBadges.set(userBadge.id, userBadge);
      this.saveData();

      // SYNC: Update the users.badges JSON column to match the new equipped state
      // This ensures the leaderboard (which reads the JSON) reflects the change immediately.
      try {
        const allUserBadges = await this.getUserBadges(userId);
        const badgesJson = allUserBadges.map(ub => ({
          ...ub.badge,
          equipped: ub.equipped,
          equippedAt: ub.equippedAt,
          earnedAt: ub.earnedAt
        }));

        await this.updateUser(userId, { badges: JSON.stringify(badgesJson) });
      } catch (error) {
        console.error("Failed to sync badges to user profile:", error);
      }
    }
  }

  // Complete account deletion - removes all user data
  async deleteUserCompletely(userId: string): Promise<void> {
    console.log(`Starting complete deletion for user: ${userId}`);

    // Delete user from users map
    this.users.delete(userId);

    // Delete all friend relationships
    for (const [id, friend] of this.friends.entries()) {
      if (friend.userId === userId || friend.friendId === userId) {
        this.friends.delete(id);
      }
    }

    // Delete all friend requests (sent and received)
    for (const [id, request] of this.friendRequests.entries()) {
      if (request.fromUserId === userId || request.toUserId === userId) {
        this.friendRequests.delete(id);
      }
    }

    // Delete all notifications
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId) {
        this.notifications.delete(id);
      }
    }

    // Delete all direct messages (sent and received)
    for (const [id, dm] of this.directMessages.entries()) {
      if (dm.fromUserId === userId || dm.toUserId === userId) {
        this.directMessages.delete(id);
      }
    }

    // Delete all API keys
    for (const [id, apiKey] of this.apiKeys.entries()) {
      if (apiKey.userId === userId) {
        this.apiKeys.delete(id);
      }
    }

    // Delete watchlist
    this.watchlists.delete(userId);

    // Delete viewing progress
    this.viewingProgress.delete(userId);

    // Delete all comments by user
    for (const [id, comment] of this.comments.entries()) {
      if (comment.userId === userId) {
        this.comments.delete(id);
      }
    }

    // Delete all reviews by user
    for (const [id, review] of this.reviews.entries()) {
      if (review.userId === userId) {
        this.reviews.delete(id);
      }
    }

    // Delete review helpful votes by user
    for (const [id, vote] of this.reviewHelpful.entries()) {
      if (vote.userId === userId) {
        this.reviewHelpful.delete(id);
      }
    }

    // Delete all user badges
    for (const [id, userBadge] of this.userBadges.entries()) {
      if (userBadge.userId === userId) {
        this.userBadges.delete(id);
      }
    }

    // Delete all reminders
    for (const [id, reminder] of this.reminders.entries()) {
      if (reminder.userId === userId) {
        this.reminders.delete(id);
      }
    }

    // Delete user challenges
    for (const [id, userChallenge] of this.userChallenges.entries()) {
      if (userChallenge.userId === userId) {
        this.userChallenges.delete(id);
      }
    }

    // Delete poll votes
    for (const [id, vote] of this.pollVotes.entries()) {
      if (vote.userId === userId) {
        this.pollVotes.delete(id);
      }
    }

    // Delete XP history
    for (const [id, entry] of this.xpHistory.entries()) {
      if (entry.userId === userId) {
        this.xpHistory.delete(id);
      }
    }

    // Save all data files
    this.saveData();
    this.saveUsers();
    this.saveFriendsData();
    this.saveApiKeys();

    console.log(`Completed deletion for user: ${userId}`);
  }

  // ============================================
  // ACTIVITY FEED IMPLEMENTATION
  // ============================================



  async updateSubscriptionAutoRenew(userId: string, autoRenew: boolean): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, subscriptionAutoRenew: autoRenew };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = {
      ...insertActivity,
      id,
      entityId: insertActivity.entityId || null,
      entityType: insertActivity.entityType || null,
      metadata: insertActivity.metadata || null,
      createdAt: new Date(),
    };
    this.activities.set(id, activity);
    this.saveData(); // Persist activities to disk
    return activity;
  }

  async getActivities(limit: number = 20, filter: 'all' | 'friends' | 'mentions' = 'all', userId?: string): Promise<(Activity & { user?: User })[]> {
    let allActivities = Array.from(this.activities.values());

    // Sort by createdAt desc (handle both Date objects and date strings from JSON)
    allActivities.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    if (filter === 'friends' && userId) {
      const friends = await this.getFriends(userId);
      const friendIds = new Set(friends.map(f => f.userId === userId ? f.friendId : f.userId));
      allActivities = allActivities.filter(a => friendIds.has(a.userId));
    } else if (filter === 'mentions' && userId) {
      // Filter for activities where the user is mentioned or it's relevant to them
      allActivities = allActivities.filter(a => {
        // 1. Direct entity reference (e.g. someone liked YOUR post)
        if (a.entityId === userId) return true;

        // 2. Metadata check for mentions (assuming basic structure or JSON string)
        try {
          const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata;
          // Check if metadata has targetUserId or mentionedUserIds
          if (meta?.targetUserId === userId) return true;
          if (meta?.mentionedUserIds && Array.isArray(meta.mentionedUserIds) && meta.mentionedUserIds.includes(userId)) return true;
        } catch (e) {
          // Ignore parse errors
        }

        return false;
      });
    }

    const sliced = allActivities.slice(0, limit);

    // Join with user data
    return Promise.all(sliced.map(async (activity) => {
      const user = await this.getUserById(activity.userId);
      let equippedBadges: any[] = [];
      if (user) {
        const userBadges = await this.getUserBadges(user.id);
        equippedBadges = userBadges
          .filter(ub => ub.equipped &&
            ub.badge.category !== 'theme' &&
            ub.badge.category !== 'skin' &&
            !ub.badge.name.includes('Skin') &&
            ub.badge.category !== 'feature'
          )
          .map(ub => ({ ...ub.badge, equippedAt: ub.equippedAt }));
      }
      // Return user with the extra property
      return {
        ...activity,
        user: user ? { ...user, equippedBadges } : undefined
      };
    }));
  }
  async getActivitiesForUser(userId: string): Promise<Activity[]> {
    const activities = Array.from(this.activities.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
    return activities;
  }
}


export const storage = new MemStorage();
