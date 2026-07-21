import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import {
  createRaajiVideo,
  deleteRaajiVideo,
  getRaajiVideos,
  updateRaajiVideo,
} from "./raaji-video.controller.js";

const router = express.Router();

router.get("/", getRaajiVideos);
router.post("/", protectRoute, createRaajiVideo);
router.put("/:id", protectRoute, updateRaajiVideo);
router.delete("/:id", protectRoute, deleteRaajiVideo);

export default router;
