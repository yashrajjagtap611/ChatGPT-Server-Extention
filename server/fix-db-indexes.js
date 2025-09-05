import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection;
    const usersCollection = db.collection('users');
    
    // Drop the email index
    await usersCollection.dropIndex('email_1');
    console.log('Successfully dropped email index');

    // List remaining indexes to verify
    const indexes = await usersCollection.listIndexes().toArray();
    console.log('Remaining indexes:', indexes);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixIndexes();
