import { randomUUID } from "node:crypto";
import { readData, updateData } from "../../data/store.js";
import { getIdentity, resolveByline } from "../../utils/identity.js";
import { asTrimmedString } from "../../utils/validation.js";

export const getYouTubeId = (value) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }
    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/").filter(Boolean)[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

export const getAllVideos = async (req, res) => {
  try {
    const { videos } = await readData();
    videos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(videos);
  } catch (error) {
    console.error("Error reading videos:", error);
    res.status(500).json({ error: "Failed to load videos" });
  }
};

export const createVideo = async (req, res) => {
  try {
    const identity = getIdentity(req);
    const { userId } = identity;
    const { byline, error: bylineError } = resolveByline(
      identity,
      req.body.author,
    );
    const title = asTrimmedString(req.body.title);
    const description =
      asTrimmedString(req.body.description) || "Shared by a community member";
    const url = asTrimmedString(req.body.url);
    const youtubeId = getYouTubeId(url);

    if (bylineError) {
      return res.status(400).json({ error: bylineError });
    }

    if (!title) {
      return res.status(400).json({ error: "Video title is required" });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: "Video title cannot exceed 200 characters" });
    }
    if (description.length > 500) {
      return res.status(400).json({ error: "Description cannot exceed 500 characters" });
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
      userId,
      username: byline,
      createdAt: now,
      updatedAt: now,
    };

    await updateData((data) => {
      data.videos.push(video);
    });

    res.status(201).json(video);
  } catch (error) {
    console.error("Error creating video:", error);
    res.status(500).json({ error: "Failed to publish video" });
  }
};

export const updateVideo = async (req, res) => {
  try {
    const identity = getIdentity(req);
    const { userId, isAdmin } = identity;
    const { byline, error: bylineError } = resolveByline(
      identity,
      req.body.author,
    );
    const title = asTrimmedString(req.body.title);
    const description =
      asTrimmedString(req.body.description) || "Shared by a community member";
    const url = asTrimmedString(req.body.url);
    const youtubeId = getYouTubeId(url);

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
      const video = data.videos.find(({ _id }) => _id === req.params.id);
      if (!video) return { status: "not-found" };
      if (video.userId !== userId && !isAdmin) {
        return { status: "forbidden" };
      }

      video.title = title;
      video.description = description;
      video.youtubeId = youtubeId;
      video.url = url;
      video.username = byline;
      video.updatedAt = new Date().toISOString();
      return { status: "updated", video };
    });

    if (result.status === "not-found") {
      return res.status(404).json({ error: "Video not found" });
    }
    if (result.status === "forbidden") {
      return res.status(403).json({ error: "You can only edit your own videos" });
    }

    res.json(result.video);
  } catch (error) {
    console.error("Error editing video:", error);
    res.status(500).json({ error: "Failed to edit video" });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { userId, isAdmin } = getIdentity(req);

    const result = await updateData((data) => {
      const index = data.videos.findIndex(({ _id }) => _id === req.params.id);
      if (index === -1) return "not-found";
      if (data.videos[index].userId !== userId && !isAdmin) return "forbidden";

      data.videos.splice(index, 1);
      return "deleted";
    });

    if (result === "not-found") {
      return res.status(404).json({ error: "Video not found" });
    }
    if (result === "forbidden") {
      return res
        .status(403)
        .json({ error: "You can only delete your own videos" });
    }

    res.json({ message: "Video deleted" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ error: "Failed to delete video" });
  }
};
