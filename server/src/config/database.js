const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000, // 10s timeout for Atlas
            socketTimeoutMS: 45000,
        });

        const isAtlas = process.env.MONGODB_URI?.includes("mongodb+srv");
        console.log(`MongoDB connected successfully [${isAtlas ? "Atlas" : "Local"}]`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;