const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const { accessConversation, fetchChats, sendMessage, allMessages, viewOneTimeMessage } = require('../controllers/chatController');

const router = express.Router();

router.route('/').get(protect, fetchChats);
router.route('/conversation').post(protect, accessConversation);
router.route('/message').post(protect, upload.single('file'), sendMessage);
router.route('/:conversationId').get(protect, allMessages);

router.route('/message/:id/view').put(protect, viewOneTimeMessage);

module.exports = router;
