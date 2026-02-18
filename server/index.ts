import { config } from "dotenv";
config(); // Load environment variables first

import rateLimit from "express-rate-limit";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupWatchTogether } from "./watch-together";
import { initSocialSocket } from "./social";
import cookieParser from "cookie-parser";
import path from "path";
import { startCleanupSchedule } from "./cleanup";
import { startSubscriptionScheduler } from "./subscription-scheduler";

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx)

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Cookie parser for auth tokens
app.use(cookieParser());

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Rate limiting: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.headers['x-client-source'] === 'frontend',
});

// Apply rate limiting to all API routes
app.use("/api", limiter);

// CORS for Extension
app.use("/api/external", (req, res, next) => {
  // Allow all extensions and direct calls
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve uploads folder statically (for avatars, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Add caching headers for static assets
app.use((req, res, next) => {
  // Cache static assets for 1 year
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Cache HTML for 1 hour
  else if (req.url.match(/\.html$/)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Serve IndexNow verification file
app.get('/430747cadbbf78f339306f7049a8f3c5.txt', (_req, res) => {
  res.type('text/plain');
  res.send('430747cadbbf78f339306f7049a8f3c5');
});

const server = await registerRoutes(app);

// Initialize Watch Together Socket.io
setupWatchTogether(server);

// Initialize Social Socket.io (friends, DMs, online status)
initSocialSocket(server);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

// importantly only setup vite in development and after
// setting up all the other routes so the catch-all route
// doesn't interfere with the other routes
if (app.get("env") === "development") {
  await setupVite(app, server);
} else {
  serveStatic(app);
}

// ALWAYS serve the app on the port specified in the environment variable PORT
// Other ports are firewalled. Default to 5000 if not specified.
// this serves both the API and the client.
// It is the only port that is not firewalled.
const port = parseInt(process.env.PORT || '5000', 10);
const host = '0.0.0.0';
server.listen(port, host, () => {
  log(`serving on ${host}:${port}`);
  startCleanupSchedule();
  startSubscriptionScheduler();
});