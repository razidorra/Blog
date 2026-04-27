import express from "express";
import {
  getAllPosts,
  getPostById,
  createPost,
  deletePost,
  updatePost,
} from "./post.controller.js";
import { protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllPosts);
router.get("/:id", getPostById);
router.post("/", protectRoute, createPost);
router.delete("/:id", protectRoute, deletePost);
router.put("/:id", protectRoute, updatePost);

export default router;
