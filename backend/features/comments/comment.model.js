import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: [true, "Beitrag-ID ist erforderlich"],
    },
    userId: {
      type: String,
      required: [true, "Benutzer-ID ist erforderlich"],
    },
    username: {
      type: String,
      required: [true, "Benutzername ist erforderlich"],
      trim: true,
    },
    text: {
      type: String,
      required: [true, "Kommentartext ist erforderlich"],
      trim: true,
      minlength: [1, "Kommentar darf nicht leer sein"],
      maxlength: [1000, "Kommentar darf maximal 1000 Zeichen lang sein"],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Comment", commentSchema);
