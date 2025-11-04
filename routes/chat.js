// routes/chat.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');

// Get recent chat messages
router.get('/messages', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const messages = await Chat.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .populate('user', 'username')
      .lean();

    // Reverse to show oldest first in the chat
    const reversedMessages = messages.reverse();

    res.json({
      messages: reversedMessages,
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send a new chat message
router.post('/messages', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    if (message.length > 500) {
      return res.status(400).json({ message: 'Message too long (max 500 characters)' });
    }

    // Check for spam (max 5 messages per minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentMessages = await Chat.countDocuments({
      user: req.user.id,
      timestamp: { $gte: oneMinuteAgo }
    });

    if (recentMessages >= 5) {
      return res.status(429).json({ message: 'Too many messages. Please wait before sending another message.' });
    }

    const newMessage = new Chat({
      user: req.user.id,
      username: req.user.username,
      message: message.trim()
    });

    await newMessage.save();

    // Populate user data for response
    await newMessage.populate('user', 'username');

    res.status(201).json({
      _id: newMessage._id,
      user: newMessage.user,
      username: newMessage.username,
      message: newMessage.message,
      timestamp: newMessage.timestamp,
      edited: newMessage.edited
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Edit a message (only own messages, within 5 minutes)
router.put('/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    if (message.length > 500) {
      return res.status(400).json({ message: 'Message too long (max 500 characters)' });
    }

    const chatMessage = await Chat.findById(messageId);

    if (!chatMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user owns the message
    if (chatMessage.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    // Check if message is within edit time limit (5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (chatMessage.timestamp < fiveMinutesAgo) {
      return res.status(400).json({ message: 'Messages can only be edited within 5 minutes of posting' });
    }

    // Update the message
    chatMessage.message = message.trim();
    chatMessage.edited = true;
    chatMessage.editedAt = new Date();
    await chatMessage.save();

    await chatMessage.populate('user', 'username');

    res.json({
      _id: chatMessage._id,
      user: chatMessage.user,
      username: chatMessage.username,
      message: chatMessage.message,
      timestamp: chatMessage.timestamp,
      edited: chatMessage.edited,
      editedAt: chatMessage.editedAt
    });

  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Failed to edit message' });
  }
});

// Delete a message (only own messages, within 5 minutes)
router.delete('/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const chatMessage = await Chat.findById(messageId);

    if (!chatMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user owns the message
    if (chatMessage.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    // Check if message is within delete time limit (5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (chatMessage.timestamp < fiveMinutesAgo) {
      return res.status(400).json({ message: 'Messages can only be deleted within 5 minutes of posting' });
    }

    await Chat.findByIdAndDelete(messageId);

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

// Get chat statistics (for admin or info purposes)
router.get('/stats', auth, async (req, res) => {
  try {
    const totalMessages = await Chat.countDocuments();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayMessages = await Chat.countDocuments({
      timestamp: { $gte: todayStart }
    });

    const activeUsers = await Chat.distinct('user', {
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      totalMessages,
      todayMessages,
      activeUsersLast24h: activeUsers.length
    });

  } catch (error) {
    console.error('Error fetching chat stats:', error);
    res.status(500).json({ message: 'Failed to fetch chat statistics' });
  }
});

module.exports = router;