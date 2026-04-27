import express from "express";
import {
  getCommentsByPost,
  createComment,
  deleteComment,
} from "./comment.controller.js";
import { protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:id/comments", getCommentsByPost);
router.post("/:id/comments", protectRoute, createComment);
router.delete("/:id", protectRoute, deleteComment);

export default router;
