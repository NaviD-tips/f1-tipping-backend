// scripts/testAtlasConnection.js
const mongoose = require('mongoose');

// Replace with your newly reset password
const username = 'clintpmorrison';
const password = 'YIplQKS8BuBA2ddO';

const uri = `mongodb+srv://${username}:${password}@tippiingcluster1.1o5la.mongodb.net/test?retryWrites=true&w=majority&appName=TippiingCluster1`;

console.log('Attempting to connect to MongoDB Atlas...');
mongoose.connect(uri)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas!');
    console.log(`Database: ${mongoose.connection.db.databaseName}`);
    console.log('Listing collections:');
    return mongoose.connection.db.listCollections().toArray();
  })
  .then(collections => {
    collections.forEach(coll => console.log(`- ${coll.name}`));
    return mongoose.disconnect();
  })
  .then(() => {
    console.log('Disconnected from MongoDB Atlas');
  })
  .catch(err => {
    console.error('Connection error:', err.message);
    if (err.message.includes('bad auth')) {
      console.log('\nAuthentication failed. Please check:\n1. Username and password are correct\n2. The user has the appropriate permissions\n3. The authentication database is correct');
    }
  });

  