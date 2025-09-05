import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  browser: String
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  expiryDate: { type: Date },
  loginCount: { type: Number, default: 0 },
  lastLogin: { type: Date },
  sessionTimeout: { type: Number, default: 60 }, // minutes
  loginHistory: [loginHistorySchema],
  websitePermissions: [{
    website: String,
    hasAccess: Boolean,
    lastAccessed: Date,
    requestedAt: Date,
    approvedBy: String
  }],
  cookieInsertions: [{
    website: String,
    timestamp: Date,
    success: Boolean
  }],
  accessRequests: [{
    website: String,
    reason: String,
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    reviewedBy: String,
    reviewedAt: Date
  }]
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.passwordHash;
      return ret;
    }
  }
});

export const User = mongoose.model('User', userSchema);



