import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import {
  createVideo,
  deleteVideo,
  getAllVideos,
  updateVideo,
} from "./video.controller.js";

const router = express.Router();

router.get("/", getAllVideos);
router.post("/", protectRoute, createVideo);
router.put("/:id", protectRoute, updateVideo);
router.delete("/:id", protectRoute, deleteVideo);

export default router;
