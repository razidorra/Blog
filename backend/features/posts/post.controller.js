import { randomUUID } from "node:crypto";
import { readData, updateData } from "../../data/store.js";
import { getIdentity, resolveByline } from "../../utils/identity.js";
import { asTrimmedString } from "../../utils/validation.js";

const canManagePost = (post, userId) =>
  post.userId === userId || userId === process.env.ADMIN_USER_ID;

export const getAllPosts = async (req, res) => {
  try {
    const { posts } = await readData();
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(posts);
  } catch (error) {
    console.error("Error reading posts:", error);
    res.status(500).json({ error: "Failed to load posts" });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { posts } = await readData();
    const post = posts.find(({ _id }) => _id === req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error reading post:", error);
    res.status(500).json({ error: "Failed to load post" });
  }
};

export const createPost = async (req, res) => {
  try {
    const identity = getIdentity(req);
    const { userId } = identity;
    const { byline, error: bylineError } = resolveByline(
      identity,
      req.body.author,
    );
    const title = asTrimmedString(req.body.title);
    const content = asTrimmedString(req.body.content);

    if (bylineError) {
      return res.status(400).json({ error: bylineError });
    }

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }
    if (title.length < 3) {
      return res
        .status(400)
        .json({ error: "Title must contain at least 3 characters" });
    }
    if (title.length > 200) {
      return res
        .status(400)
        .json({ error: "Title cannot exceed 200 characters" });
    }
    if (content.length < 10) {
      return res
        .status(400)
        .json({ error: "Content must contain at least 10 characters" });
    }
    if (content.length > 20_000) {
      return res
        .status(400)
        .json({ error: "Content cannot exceed 20,000 characters" });
    }

    const now = new Date().toISOString();
    const post = {
      _id: randomUUID(),
      title,
      content,
      author: byline,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    await updateData((data) => {
      data.posts.push(post);
    });

    res.status(201).json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { userId } = getIdentity(req);

    const result = await updateData((data) => {
      const index = data.posts.findIndex(({ _id }) => _id === req.params.id);
      if (index === -1) return "not-found";
      if (!canManagePost(data.posts[index], userId)) return "forbidden";

      data.posts.splice(index, 1);
      data.comments = data.comments.filter(
        ({ postId }) => postId !== req.params.id,
      );
      return "deleted";
    });

    if (result === "not-found") {
      return res.status(404).json({ error: "Post not found" });
    }
    if (result === "forbidden") {
      return res
        .status(403)
        .json({ error: "You can only delete your own posts" });
    }

    res.json({ message: "Post deleted" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
};

export const updatePost = async (req, res) => {
  try {
    const identity = getIdentity(req);
    const { userId } = identity;
    const { byline, error: bylineError } = resolveByline(
      identity,
      req.body.author,
    );
    const title = asTrimmedString(req.body.title);
    const content = asTrimmedString(req.body.content);

    if (bylineError) {
      return res.status(400).json({ error: bylineError });
    }

    if (!title || !content) {
      return res
        .status(400)
        .json({ error: "Title and content are required" });
    }
    if (
      title.length < 3 ||
      title.length > 200 ||
      content.length < 10 ||
      content.length > 20_000
    ) {
      return res.status(400).json({ error: "Title or content is invalid" });
    }

    const result = await updateData((data) => {
      const existingPost = data.posts.find(
        ({ _id }) => _id === req.params.id,
      );
      if (!existingPost) return { status: "not-found" };
      if (!canManagePost(existingPost, userId)) {
        return { status: "forbidden" };
      }

      existingPost.title = title;
      existingPost.content = content;
      existingPost.author = byline;
      existingPost.updatedAt = new Date().toISOString();
      return { status: "updated", post: existingPost };
    });

    if (result.status === "not-found") {
      return res.status(404).json({ error: "Post not found" });
    }
    if (result.status === "forbidden") {
      return res
        .status(403)
        .json({ error: "You can only edit your own posts" });
    }

    res.json(result.post);
  } catch (error) {
    console.error("Error editing post:", error);
    res.status(500).json({ error: "Failed to edit post" });
  }
};
