import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { clerkAuth } from "./middleware/auth.middleware.js";
import postRoutes from "./features/posts/post.routes.js";
import commentRoutes from "./features/comments/comment.routes.js";
import { seedPosts } from "./features/posts/post.controller.js";
import connectDB from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(clerkAuth);

// ── Routen ──────────────────────────────────────────
app.use("/api/posts", postRoutes);
app.use("/api/posts", commentRoutes);
app.use("/api/comments", commentRoutes);

// ── 404 Handler ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route nicht gefunden" });
});

// ── Fehler Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Interner Serverfehler" });
});

connectDB().then(async () => {
  await seedPosts();
  app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
  });
});
