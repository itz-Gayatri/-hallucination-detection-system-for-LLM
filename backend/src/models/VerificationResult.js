const mongoose = require('mongoose');

const verificationResultSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inputText:        { type: String, required: true },
  detectedLanguage: { type: String, default: 'en' },
  inputType:        { type: String, default: 'general' },
  accuracyScore:    { type: Number, default: 0 },
  hallucinationScore: { type: Number, default: 100 },
  confidenceScore:  { type: Number, default: 0 },
  correctAnswer:    { type: String, default: '' },
  sourceUrl:        { type: String, default: '' },
  sourceName:       { type: String, default: 'Wikipedia' },
  keyMatches:       [String],
  semanticSimilarity: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('VerificationResult', verificationResultSchema);
