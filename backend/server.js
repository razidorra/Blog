import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import {
  createClerkAuth,
  protectRoute,
} from "./middleware/auth.middleware.js";
import { getIdentity } from "./utils/identity.js";
import postRoutes from "./features/posts/post.routes.js";
import commentRoutes from "./features/comments/comment.routes.js";
import videoRoutes from "./features/videos/video.routes.js";
import raajiVideoRoutes from "./features/videos/raaji-video.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = Boolean(
  process.env.RENDER || process.env.NODE_ENV === "production",
);

if (isProduction) {
  const requiredVariables = [
    "CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "ADMIN_USER_ID",
    "FRONTEND_URL",
  ];
  const missingVariables = requiredVariables.filter(
    (name) => !process.env[name],
  );

  if (missingVariables.length) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(", ")}`,
    );
  }
}
const localOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS || "").split(","),
]
  .filter(Boolean)
  .map((value) => {
    try {
      return new URL(value.trim()).origin;
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([...(isProduction ? [] : localOrigins), ...configuredOrigins]),
];

if (isProduction) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(createClerkAuth(allowedOrigins));
app.use(helmet());
app.use(express.json({ limit: "20kb", strict: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many changes. Please wait and try again." },
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use("/api", apiLimiter);
app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    writeLimiter(req, res, next);
    return;
  }
  next();
});
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ── Routen ──────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", storage: "json" });
});
app.get("/api/session", protectRoute, (req, res) => {
  const { userId, isAdmin } = getIdentity(req);
  res.json({ userId, isAdmin });
});
app.use("/api/posts", postRoutes);
app.use("/api/posts", commentRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/raaji-videos", raajiVideoRoutes);

// ── 404 Handler ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Fehler Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message === "Origin is not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }
  console.error(err instanceof Error ? err.message : err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log("📁 Posts are stored in backend/data/blog.json");
});
