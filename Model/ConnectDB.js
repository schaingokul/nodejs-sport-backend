import mongoose from "mongoose";

const MONGO_URI = "mongodb+srv://schaingokul:schaingokul@cluster0.yrr9x.mongodb.net/sportsApp?retryWrites=true&w=majority&appName=Cluster0" || "mongodb://127.0.0.1:27017" ;

const connectDB = async () => {
  try {
    // Connect to the database
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`DB successfully connected: ${conn.connection.host}`);

    const userDetailsCollection = mongoose.connection.db.collection("userdetails");
    const postImagesCollection = mongoose.connection.db.collection("postimages");

    // Check and drop existing unique index on userdetails.uuid
    const userIndexes = await userDetailsCollection.indexes();
    const userUuidIndex = userIndexes.find((index) => index.name === "uuid_1");

    if (userUuidIndex) {
      await userDetailsCollection.dropIndex("uuid_1");
      console.log("Dropped existing unique index on userdetails.uuid");
    }

    // Create a new unique index on userdetails.uuid
    await userDetailsCollection.createIndex({ uuid: 1 }, { unique: true });
    console.log("Created unique index on userdetails.uuid");

    // Check and drop existing unique index on postimages.PostBy_uuid
    const postImageIndexes = await postImagesCollection.indexes();
    const postUuidIndex = postImageIndexes.find((index) => index.name === "PostBy_uuid_1");

    if (postUuidIndex) {
      await postImagesCollection.dropIndex("PostBy_uuid_1");
      console.log("Dropped existing unique index on postimages.PostBy_uuid");
    }

    // Create a new index on postimages.PostBy_uuid (not unique to allow multiple posts by the same user)
    await postImagesCollection.createIndex({ PostBy_uuid: 1 });
    console.log("Created non-unique index on postimages.PostBy_uuid");

  } catch (error) {
    console.error("Error connecting to MongoDB or managing indexes:", error);
    process.exit(1);
  }
};

export { connectDB };