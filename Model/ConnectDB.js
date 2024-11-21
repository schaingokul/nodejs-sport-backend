import mongoose from "mongoose";
const MONGO_URI = 'mongodb+srv://schaingokul:schaingokul@cluster0.yrr9x.mongodb.net/sportsApp?retryWrites=true&w=majority&appName=Cluster0'


const connectDB = async () => {
    try {
      const conn = await mongoose.connect(MONGO_URI);
      console.log(`DB successfully connected: ${conn.connection.host}`);
  
      // Check and drop index if it exists
      console.log
    (
        mongoose.connection.db.collection('userdetails').indexes((err, indexes) => {
        if (err) {
          console.log('Error fetching indexes:', err);
        } else {
          const indexName = indexes.find(index => index.name === 'uuid_1');
          if (indexName) {
            mongoose.connection.db.collection('userdetails').dropIndex('uuid_1', (err, res) => {
              if (err) console.log('Error dropping index:', err);
              else console.log('Index dropped:', res);
            });
          }
        }
      })
    )
      // Ensure unique index on uuid
    console.log
    (
        mongoose.connection.db.collection('userdetails').createIndex({ uuid: 1 }, { unique: true }, (err, res) => {
            if (err) {
              console.log('Error creating index:', err);
            } else {
              console.log('Index created:', res);
            }
          })
    )  
      
  
    } catch (error) {
      console.log('Error connecting to MongoDB:', error);
      process.exit(1);
    }
  }
  
  export { connectDB };