import mongoose from "mongoose";
import { MONGO_URI } from "../env.js";


// Function to ensure collections exist
const ensureCollectionsExist = async (db) => {
  try {
    const userDetailsCollectionExists = await db.listCollections({ name: 'userdetails' }).hasNext();
    if (!userDetailsCollectionExists) {
      await db.createCollection('userdetails');
    }

    const postImagesCollectionExists = await db.listCollections({ name: 'postimages' }).hasNext();
    if (!postImagesCollectionExists) {
      await db.createCollection('postimages');
    }

  } catch (error) {
    console.error("Error ensuring collections:", error.message);
  }
};

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI,{
      serverSelectionTimeoutMS: 30000, // Timeout after 30 seconds
      connectTimeoutMS: 30000, // Connection timeout
    });
    console.log(`DB successfully connected: ${conn.connection.host}`);

    const db = mongoose.connection.db;
    mongoose.connection.setMaxListeners(20);
    
    // Ensure collections exist
    await ensureCollectionsExist(db);

    // Ensure indexes and other operations here
    await createIndexes(db);

  } catch (error) {
    console.error("Error connecting to MongoDB or managing indexes:", error.message);
    process.exit(1); // Exit if connection fails
  }
};

// Function to create indexes for collections
const createIndexes = async (db) => {
  const userDetailsCollection = db.collection("userdetails");
  const postImagesCollection = db.collection("postimages");

  // Drop existing unique index on userdetails.uuid if it exists
  const userIndexes = await userDetailsCollection.indexes();
  const userUuidIndex = userIndexes.find((index) => index.name === "uuid_1");

  if (userUuidIndex) {
    await userDetailsCollection.dropIndex("uuid_1");
  }

  // Create a new unique index on userdetails.uuid
  await userDetailsCollection.createIndex({ uuid: 1 }, { unique: true });

  // Index management for postimages collection
  const postIndexes = await postImagesCollection.indexes();
  const imageUrlIndex = postIndexes.find((index) => index.name === "imageURLindex");
  if (imageUrlIndex) {
    await postImagesCollection.dropIndex("imageURLindex");
  }

  await postImagesCollection.createIndex({ imageURL: 1 }, { name: "imageURLindex", unique: false });
};

export { connectDB };