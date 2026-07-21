import { randomUUID } from "node:crypto";
import { readData, updateData } from "../../data/store.js";
import { getIdentity } from "../../utils/identity.js";
import { asTrimmedString } from "../../utils/validation.js";

export const getCommentsByPost = async (req, res) => {
  try {
    const { comments } = await readData();
    const postComments = comments
      .filter(({ postId }) => postId === req.params.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(postComments);
  } catch (error) {
    console.error("Error reading comments:", error);
    res.status(500).json({ error: "Failed to load comments" });
  }
};

export const createComment = async (req, res) => {
  try {
    const text = asTrimmedString(req.body.text);
    const { userId, displayName } = getIdentity(req);

    if (!text) {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }
    if (text.length > 1000) {
      return res
        .status(400)
        .json({ error: "Comment cannot exceed 1,000 characters" });
    }

    const now = new Date().toISOString();
    const comment = {
      _id: randomUUID(),
      postId: req.params.id,
      userId,
      username: displayName,
      text,
      createdAt: now,
      updatedAt: now,
    };

    const postExists = await updateData((data) => {
      if (!data.posts.some(({ _id }) => _id === req.params.id)) return false;
      data.comments.push(comment);
      return true;
    });

    if (!postExists) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error saving comment:", error);
    res.status(500).json({ error: "Failed to save comment" });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { userId, isAdmin } = getIdentity(req);

    const result = await updateData((data) => {
      const index = data.comments.findIndex(
        ({ _id }) => _id === req.params.id,
      );
      if (index === -1) return "not-found";
      if (data.comments[index].userId !== userId && !isAdmin) {
        return "forbidden";
      }

      data.comments.splice(index, 1);
      return "deleted";
    });

    if (result === "not-found") {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (result === "forbidden") {
      return res.status(403).json({ error: "Permission denied" });
    }

    res.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};
