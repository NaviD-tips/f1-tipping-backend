const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
console.log('JWT_SECRET:', process.env.JWT_SECRET);


// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }
    
    // Create new user
    const newUser = new User({
      username,
      email,
      password
    });
    
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        totalPoints: newUser.totalPoints
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        totalPoints: user.totalPoints
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Request password reset link
 * @access  Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Don't reveal that a user with this email doesn't exist
    if (!user) {
      return res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent' 
      });
    }
    
    // Generate a reset token that expires in 1 hour
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    
    // Store the token and expiry on the user document
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();
    
    // Create password reset URL (frontend reset page)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    // Send email with reset link
    await sendPasswordResetEmail(user, resetUrl);
    
    res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent' 
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/auth/reset-password/:token
 * @desc    Verify reset token validity
 * @access  Public
 */
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find user with this token and make sure it hasn't expired
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Token is valid
    res.status(200).json({ message: 'Token is valid', username: user.username });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

    /**
     * @route   POST /api/auth/reset-password/:token
     * @desc    Reset password with token
     * @access  Public
     */
    router.post('/reset-password/:token', async (req, res) => {
      try {
        const { token } = req.params;
        const { password } = req.body;
        
        if (!password || password.length < 6) {
          return res.status(400).json({ 
            message: 'Password is required and must be at least 6 characters long' 
          });
        }
        
        // Hash the new password directly here instead of relying on the pre-save hook
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        console.log('Attempting to reset password');
        console.log('Token:', token);
        console.log('New password length:', password.length);
        console.log('Hashed password length:', hashedPassword.length);
        
        // Find and update user directly with updateOne
        const result = await User.updateOne(
          { 
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
          },
          { 
            $set: { password: hashedPassword },
            $unset: { resetToken: "", resetTokenExpiry: "" }
          }
        );
        
        console.log('Update result:', result);
        
        if (result.matchedCount === 0) {
          return res.status(400).json({ message: 'Invalid or expired reset token' });
        }
        
        if (result.modifiedCount === 0) {
          return res.status(500).json({ message: 'Failed to update password' });
        }
        
        // Get the user for sending email
        const user = await User.findOne({ resetToken: token });
        
        // If user was found (shouldn't happen since we just removed the token)
        if (user) {
          // Clear the tokens just in case
          user.resetToken = undefined;
          user.resetTokenExpiry = undefined;
          await user.save();
        } else {
          // Get the user by token before it was removed
          const updatedUser = await User.findOne({ password: hashedPassword });
          if (updatedUser) {
            // Send confirmation email
            await sendPasswordChangedEmail(updatedUser);
          }
        }
        
        res.status(200).json({ message: 'Password has been reset successfully' });
        
      } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });

// Helper function to send password reset email
async function sendPasswordResetEmail(user, resetUrl) {
  // Create a transporter object
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  // Email options
  const mailOptions = {
    from: `"F1 Predictor" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Password Reset Request',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Hello ${user.username},</p>
        <p>We received a request to reset your password. Click the link below to set a new password:</p>
        <div style="margin: 20px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4a68aa; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Thanks,<br>The F1 Predictor Team</p>
      </div>
    `
  };
  
  // Send the email
  await transporter.sendMail(mailOptions);
}

// Helper function to send password changed confirmation email
async function sendPasswordChangedEmail(user) {
  // Create a transporter object
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  // Email options
  const mailOptions = {
    from: `"F1 Predictor" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Your Password Has Been Changed',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Password Changed Successfully</h2>
        <p>Hello ${user.username},</p>
        <p>Your password has been successfully reset.</p>
        <p>If you didn't make this change, please contact us immediately.</p>
        <p>Thanks,<br>The F1 Predictor Team</p>
      </div>
    `
  };
  
  // Send the email
  await transporter.sendMail(mailOptions);
}

module.exports = router;