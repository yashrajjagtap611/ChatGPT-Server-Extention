import mongoose from 'mongoose';
import { User } from './src/models/User.js';

const MONGODB_URI = 'mongodb://localhost:27017/cookie_admin';

async function resetUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete all existing users
        await User.deleteMany({});
        console.log('Cleared existing users');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetUsers();
