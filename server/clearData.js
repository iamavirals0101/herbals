import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // to load your .env with MONGODB_URI

const mongoURI = process.env.MONGODB_URI;

const clearAllCollections = async () => {
  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✔️ Connected to MongoDB');

    const collections = await mongoose.connection.db.listCollections().toArray();

    for (const { name } of collections) {
      await mongoose.connection.db.collection(name).deleteMany({});
      console.log(`🧹 Cleared collection: ${name}`);
    }

    console.log('✅ All collections wiped successfully');
    process.exit();
  } catch (err) {
    console.error('❌ Error wiping collections:', err);
    process.exit(1);
  }
};

clearAllCollections();
