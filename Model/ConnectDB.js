import mongoose from "mongoose";

// Replace with your MongoDB Atlas URI or local URI
const MONGO_URI = "mongodb+srv://schaingokul:schaingokul@cluster0.yrr9x.mongodb.net/sportsApp?retryWrites=true&w=majority&appName=Cluster0";
// const MONGO_URI = "mongodb://127.0.0.1:27017";

// Function to ensure collections exist
const ensureCollectionsExist = async (db) => {
  try {
    // Check if the collection "userdetails" exists
    const userDetailsCollectionExists = await db.listCollections({ name: 'userdetails' }).hasNext();
    if (!userDetailsCollectionExists) {
      //console.log("Creating 'userdetails' collection...");
      await db.createCollection('userdetails');
    } else {
      //console.log("'userdetails' collection already exists.");
    }

    // Check if the collection "postimages" exists
    const postImagesCollectionExists = await db.listCollections({ name: 'postimages' }).hasNext();
    if (!postImagesCollectionExists) {
      //console.log("Creating 'postimages' collection...");
      await db.createCollection('postimages');
    } else {
      //console.log("'postimages' collection already exists.");
    }

  } catch (error) {
    console.error("Error ensuring collections:", error);
  }
};

// Connect to the MongoDB database
const connectDB = async () => {
  try {
    // Connect to the database
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`DB successfully connected: ${conn.connection.host}`);

    // Access the database object directly
    const db = mongoose.connection.db;

    // Ensure collections exist
    await ensureCollectionsExist(db);

    // Access the collections for further operations
    const userDetailsCollection = db.collection("userdetails");
    const postImagesCollection = db.collection("postimages");

    // Check and drop existing unique index on userdetails.uuid if it exists
    const userIndexes = await userDetailsCollection.indexes();
    const userUuidIndex = userIndexes.find((index) => index.name === "uuid_1");

    if (userUuidIndex) {
      await userDetailsCollection.dropIndex("uuid_1");
     // console.log("Dropped existing unique index on userdetails.uuid");
    }

    // Create a new unique index on userdetails.uuid
    await userDetailsCollection.createIndex({ uuid: 1 }, { unique: true });
    //console.log("Created unique index on userdetails.uuid");

    await postImagesCollection.createIndex(
      { "images.PostBy_Name": 1 },
      { name: "PostBy_Name_index" }
    );
    //console.log("Created index on postimages.images.PostBy_Name");

    // Create a new index on postimages.PostBy_uuid (non-unique to allow multiple posts by the same user)
    await postImagesCollection.createIndex(
      { "images.PostImage_URL": 1 },
      { name: "PostImage_URL_index" }
    );
    //console.log("Created index on postimages.images.PostImage_URL");

  } catch (error) {
    console.error("Error connecting to MongoDB or managing indexes:", error);
    process.exit(1); // Exit
  }
};

export { connectDB };