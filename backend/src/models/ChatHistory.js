const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  question:     { type: String, required: true },
  answer:       { type: String, default: '' },
  verification: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt:    { type: Date, default: Date.now },
});

const chatHistorySchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, default: 'New Verification' },
  messages: [messageSchema],
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
