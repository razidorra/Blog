import { randomUUID } from "node:crypto";
import { readData, updateData } from "../../data/store.js";
import { getIdentity, resolveByline } from "../../utils/identity.js";
import { asTrimmedString } from "../../utils/validation.js";
import { getYouTubeId } from "./video.controller.js";

const isAdmin = (req) => getIdentity(req).isAdmin;

export const getRaajiVideos = async (req, res) => {
  try {
    const { raajiVideos } = await readData();
    raajiVideos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(raajiVideos);
  } catch (error) {
    console.error("Error reading Raaji videos:", error);
    res.status(500).json({ error: "Failed to load Raaji videos" });
  }
};

export const createRaajiVideo = async (req, res) => {
  try {
    const identity = getIdentity(req);
    if (!identity.isAdmin) {
      return res.status(403).json({
        error: "Only Raaji Baluch can publish videos on this page",
      });
    }

    const title = asTrimmedString(req.body.title);
    const description =
      asTrimmedString(req.body.description) || "Official Raaji Baluch video";
    const url = asTrimmedString(req.body.url);
    const youtubeId = getYouTubeId(url);
    const { byline, error: bylineError } = resolveByline(
      identity,
      req.body.author,
    );

    if (bylineError) {
      return res.status(400).json({ error: bylineError });
    }

    if (!title) {
      return res.status(400).json({ error: "Video title is required" });
    }
    if (title.length > 200) {
      return res
        .status(400)
        .json({ error: "Video title cannot exceed 200 characters" });
    }
    if (description.length > 500) {
      return res
        .status(400)
        .json({ error: "Description cannot exceed 500 characters" });
    }
    if (url.length > 2_048) {
      return res.status(400).json({ error: "Video URL is too long" });
    }
    if (!youtubeId || !/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
      return res.status(400).json({ error: "Enter a valid YouTube video URL" });
    }

    const now = new Date().toISOString();
    const video = {
      _id: randomUUID(),
      title,
      description,
      youtubeId,
      url,
      username: byline,
      createdAt: now,
      updatedAt: now,
    };

    await updateData((data) => {
      data.raajiVideos.push(video);
    });

    res.status(201).json(video);
  } catch (error) {
    console.error("Error publishing Raaji video:", error);
    res.status(500).json({ error: "Failed to publish Raaji video" });
  }
};

export const updateRaajiVideo = async (req, res) => {
  try {
    const identity = getIdentity(req);
    if (!identity.isAdmin) {
      return res.status(403).json({
        error: "Only Raaji Baluch can edit videos on this page",
      });
    }

    const title = asTrimmedString(req.body.title);
    const description =
      asTrimmedString(req.body.description) || "Official Raaji Baluch video";
    const url = asTrimmedString(req.body.url);
    const youtubeId = getYouTubeId(url);
    const { byline, error: bylineError } = resolveByline(
      identity,
      req.body.author,
    );

    if (bylineError) {
      return res.status(400).json({ error: bylineError });
    }
    if (!title) {
      return res.status(400).json({ error: "Video title is required" });
    }
    if (title.length > 200) {
      return res
        .status(400)
        .json({ error: "Video title cannot exceed 200 characters" });
    }
    if (description.length > 500) {
      return res
        .status(400)
        .json({ error: "Description cannot exceed 500 characters" });
    }
    if (url.length > 2_048) {
      return res.status(400).json({ error: "Video URL is too long" });
    }
    if (!youtubeId || !/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
      return res.status(400).json({ error: "Enter a valid YouTube video URL" });
    }

    const result = await updateData((data) => {
      const video = data.raajiVideos.find(({ _id }) => _id === req.params.id);
      if (!video) return null;

      video.title = title;
      video.description = description;
      video.youtubeId = youtubeId;
      video.url = url;
      video.username = byline;
      video.updatedAt = new Date().toISOString();
      return video;
    });

    if (!result) {
      return res.status(404).json({ error: "Raaji video not found" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error editing Raaji video:", error);
    res.status(500).json({ error: "Failed to edit Raaji video" });
  }
};

export const deleteRaajiVideo = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        error: "Only Raaji Baluch can delete videos from this page",
      });
    }

    const deleted = await updateData((data) => {
      const index = data.raajiVideos.findIndex(
        ({ _id }) => _id === req.params.id,
      );
      if (index === -1) return false;

      data.raajiVideos.splice(index, 1);
      return true;
    });

    if (!deleted) {
      return res.status(404).json({ error: "Raaji video not found" });
    }

    res.json({ message: "Raaji video deleted" });
  } catch (error) {
    console.error("Error deleting Raaji video:", error);
    res.status(500).json({ error: "Failed to delete Raaji video" });
  }
};
