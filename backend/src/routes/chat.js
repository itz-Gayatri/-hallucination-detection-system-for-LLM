const express = require('express');
const { auth } = require('../middleware/auth');
const ChatHistory = require('../models/ChatHistory');

const router = express.Router();

// GET /api/chat — list all chats for user
router.get('/', auth, async (req, res) => {
  try {
    const chats = await ChatHistory.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('title updatedAt createdAt')
      .limit(50);
    res.json(chats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat — create new chat
router.post('/', auth, async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await ChatHistory.create({ userId: req.user._id, title: title || 'New Verification' });
    res.status(201).json(chat);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/:id — get single chat with messages
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/chat/:id — rename chat
router.patch('/:id', auth, async (req, res) => {
  try {
    const chat = await ChatHistory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title },
      { new: true }
    );
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/chat/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await ChatHistory.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat/:id/message — save a message to chat
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { question, answer, verification } = req.body;
    const chat = await ChatHistory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        $push: { messages: { question, answer, verification } },
        updatedAt: Date.now(),
      },
      { new: true }
    );
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
