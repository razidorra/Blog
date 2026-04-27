import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Titel ist erforderlich"],
      trim: true,
      minlength: [3, "Titel muss mindestens 3 Zeichen lang sein"],
      maxlength: [200, "Titel darf maximal 200 Zeichen lang sein"],
    },
    content: {
      type: String,
      required: [true, "Inhalt ist erforderlich"],
      minlength: [10, "Inhalt muss mindestens 10 Zeichen lang sein"],
    },
    author: {
      type: String,
      default: "Admin",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Post", postSchema);
