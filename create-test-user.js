const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/f1tipping';

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Define User schema
    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      totalPoints: Number,
      createdAt: {
        type: Date,
        default: Date.now
      }
    });
    
    // Create User model
    const User = mongoose.model('User', userSchema);
    
    // Hash the password
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create a new user document
    const newUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      totalPoints: 0
    });
    
    // Save the user to the database
    await newUser.save();
    
    console.log('Test user created successfully!');
    console.log('Username: testuser');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
createTestUser();