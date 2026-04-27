import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Mit MongoDB verbunden");
  } catch (error) {
    console.error("MongoDB Fehler:", error.message);
    process.exit(1);
  }
};

export default connectDB;
