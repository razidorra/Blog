import Comment from "./comment.model.js";
import Post from "../posts/post.model.js";
import { getUserId } from "../../middleware/auth.middleware.js";

// Alle Kommentare eines Beitrags abrufen
export const getCommentsByPost = async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id }).sort({
      createdAt: -1,
    });
    res.json(comments);
  } catch (error) {
    res.status(400).json({ error: "Fehler beim Laden der Kommentare" });
  }
};

// Neuen Kommentar erstellen
export const createComment = async (req, res) => {
  try {
    // Beitrag existiert?
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Beitrag nicht gefunden" });
    }

    // Eingaben holen
    const text = req.body.text?.trim();
    const username = req.body.username?.trim() || "Anonym";

    // Backend-Validierung
    if (!text) {
      return res.status(400).json({ error: "Kommentar darf nicht leer sein" });
    }
    if (text.length > 1000) {
      return res
        .status(400)
        .json({ error: "Kommentar darf maximal 1000 Zeichen lang sein" });
    }

    // Benutzer-ID aus Clerk Token holen
    const userId = getUserId(req);

    // Kommentar speichern
    const comment = await Comment.create({
      postId: req.params.id,
      userId,
      username,
      text,
    });

    res.status(201).json(comment);
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res.status(500).json({ error: "Fehler beim Speichern des Kommentars" });
  }
};

// Kommentar löschen
export const deleteComment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: "Kommentar nicht gefunden" });
    }

    // Nur eigene Kommentare löschen
    if (comment.userId !== userId) {
      return res.status(403).json({ error: "Keine Berechtigung" });
    }

    await comment.deleteOne();
    res.json({ message: "Kommentar gelöscht" });
  } catch (error) {
    res.status(400).json({ error: "Fehler beim Löschen" });
  }
};
