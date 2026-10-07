const express = require('express');
const { generateCaption, generateBio, chatWithAI, moderateContent } = require('../controllers/aiController.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/generate-caption', generateCaption);
router.post('/generate-bio', generateBio);
router.post('/chat', protect, chatWithAI);
router.post('/moderate', protect, moderateContent);

module.exports = router;
