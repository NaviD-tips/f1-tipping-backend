// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// ===========================
// CORS Configuration
// ===========================
const allowedOrigins = [
  'https://f1predictor.club',
  'https://thunderous-muffin-0ec09a.netlify.app',
  'http://localhost:3000'
];

// Use CORS middleware for all routes
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Explicitly handle preflight OPTIONS requests
app.options('*', cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));


// Other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Run initial race status update after DB connection
    updatePastRaces();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Function to update race statuses
const updatePastRaces = async () => {
  try {
    // Import Race model - make sure path is correct
    const Race = require('./models/Race');
    
    const now = new Date();
    
    // Find races that are in the past but still marked as "upcoming"
    const pastRaces = await Race.find({
      date: { $lt: now },
      status: "upcoming"
    });
    
    if (pastRaces.length === 0) {
      console.log('No past races to update');
      return;
    }
    
    console.log(`Found ${pastRaces.length} past races to update`);
    
    // Update each race
    for (const race of pastRaces) {
      race.status = "completed";
      race.resultsProcessed = true;
      race.predictionsOpen = false;
      await race.save();
      console.log(`Updated race: ${race.raceName} (${race._id})`);
    }
    
    console.log('Race status update completed');
    
  } catch (error) {
    console.error('Error updating race statuses:', error);
  }
};

// Schedule periodic race status updates (every 6 hours = 6 * 60 * 60 * 1000 ms)
setInterval(updatePastRaces, 6 * 60 * 60 * 1000);

// Function to validate if an object is a valid Express router
const isValidRouter = (router) => {
  return router && 
         typeof router === 'function' && 
         router.name === 'router' ||
         (router.get && router.post && router.use && router.param && router.route);
};

// Add this temporary debug route to your server.js (after your other routes)
app.get('/api/debug/user/:userId', async (req, res) => {
  try {
    const User = require('./models/User');
    const user = await User.findById(req.params.userId);
    res.json({
      userExists: !!user,
      userData: user ? { id: user._id, username: user.username, email: user.email } : null
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Add a test endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Add an endpoint to manually trigger race status updates
app.post('/api/admin/update-race-status', async (req, res) => {
  try {
    await updatePastRaces();
    res.json({ success: true, message: 'Race status update triggered successfully' });
  } catch (error) {
    console.error('Error in manual race status update:', error);
    res.status(500).json({ success: false, message: 'Failed to update race statuses' });
  }
});

// Log the directory structure
const routesPath = path.join(__dirname, 'routes');
console.log('Current directory:', __dirname);
console.log('Routes directory exists:', fs.existsSync(routesPath));
if (fs.existsSync(routesPath)) {
  console.log('Files in routes directory:', fs.readdirSync(routesPath));
}

// Try to import route modules safely
try {
  // Import auth routes if they exist
  if (fs.existsSync(path.join(routesPath, 'auth.js'))) {
    const authRoutes = require('./routes/auth');
    if (isValidRouter(authRoutes)) {
      app.use('/api/auth', authRoutes);
      console.log('Auth routes mounted successfully');
    } else {
      console.error('Auth routes module is not a valid Express router');
    }
  } else {
    console.warn('Auth routes file not found');
  }
  
  // Import predictions routes if they exist
  if (fs.existsSync(path.join(routesPath, 'predictions.js'))) {
    const predictionRoutes = require('./routes/predictions');
    if (isValidRouter(predictionRoutes)) {
      app.use('/api/predictions', predictionRoutes);
      console.log('Prediction routes mounted successfully');
    } else {
      console.error('Prediction routes module is not a valid Express router');
    }
  } else {
    console.warn('Predictions routes file not found');
  }
  
  // Import f1data routes if they exist
  if (fs.existsSync(path.join(routesPath, 'f1data.js'))) {
    const f1DataRoutes = require('./routes/f1data');
    if (isValidRouter(f1DataRoutes)) {
      app.use('/api/f1data', f1DataRoutes);
      console.log('F1Data routes mounted successfully');
    } else {
      console.error('F1Data routes module is not a valid Express router');
    }
  } else {
    console.warn('F1Data routes file not found');
  }
  
  // Import results routes if they exist
  if (fs.existsSync(path.join(routesPath, 'results.js'))) {
    const resultRoutes = require('./routes/results');
    if (isValidRouter(resultRoutes)) {
      app.use('/api/results', resultRoutes);
      console.log('Result routes mounted successfully');
    } else {
      console.error('Result routes module is not a valid Express router');
    }
  } else {
    console.warn('Results routes file not found');
  }
  
  // Import scores routes if they exist
  if (fs.existsSync(path.join(routesPath, 'scores.js'))) {
    const scoreRoutes = require('./routes/scores');
    if (isValidRouter(scoreRoutes)) {
      app.use('/api/scores', scoreRoutes);
      console.log('Score routes mounted successfully');
    } else {
      console.error('Score routes module is not a valid Express router');
    }
  } else {
    console.warn('Scores routes file not found');
  }
  
  // Import head-to-head routes if they exist - using headToHead.js (without "Routes" suffix)
  const headToHeadPath = path.join(routesPath, 'headToHead.js');
  if (fs.existsSync(headToHeadPath)) {
    const headToHeadRoutes = require('./routes/headToHead');
    if (isValidRouter(headToHeadRoutes)) {
      app.use('/api/head-to-head', headToHeadRoutes);
      console.log('Head-to-head routes mounted successfully');
    } else {
      console.error('Head-to-head routes module is not a valid Express router');
    }
  } else {
    console.warn('Head-to-head routes file not found at', headToHeadPath);
  }
} catch (error) {
  console.error('Error importing route modules:', error.message);
}

/*
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}
*/

// Import chat routes if they exist
if (fs.existsSync(path.join(routesPath, 'chat.js'))) {
  const chatRoutes = require('./routes/chat');
  if (isValidRouter(chatRoutes)) {
    app.use('/api/chat', chatRoutes);
    console.log('Chat routes mounted successfully');
  } else {
    console.error('Chat routes module is not a valid Express router');
  }
} else {
  console.warn('Chat routes file not found');
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error handler:', err);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  console.error('Stack trace:', err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // It's generally best to restart the process on uncaught exceptions
  process.exit(1);
});