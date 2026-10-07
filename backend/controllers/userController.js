const User = require('../models/User.js');

// @desc    Get user profile by username
// @route   GET /api/users/:username
// @access  Public
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findOne({
            username: req.params.username,
            isDeactivated: false,
            isDeleted: false
        })
            .select('-password')
            .populate('followers', 'username profilePic')
            .populate('following', 'username profilePic');
        if (!user) {
            return res.status(404).json({ message: 'User not found or account deactivated' });
        }
        // Check if requester is blocked or has blocked this user
        const requester = await User.findById(req.user._id);
        if (!requester) return res.status(401).json({ message: 'User not found' });

        const userBlockedUsers = user.blockedUsers || [];
        const requesterBlockedUsers = requester.blockedUsers || [];

        const isBlockedByTarget = userBlockedUsers.some(id => id.toString() === req.user._id.toString());
        const hasBlockedTarget = requesterBlockedUsers.some(id => id.toString() === user._id.toString());

        if (isBlockedByTarget || hasBlockedTarget) {
            return res.status(403).json({ message: 'User not found or you are blocked', isBlocked: true });
        }

        // Check privacy
        const isFollowing = user.followers.some(f => (f._id || f).toString() === req.user._id.toString());
        const isOwner = user._id.toString() === req.user._id.toString();

        const profileData = user.toObject();
        if (user.isPrivate && !isFollowing && !isOwner) {
            profileData.posts = []; // Hide sensitive data
            profileData.followers = [];
            profileData.following = [];
            profileData.isPrivateRestricted = true;
        }

        res.json(profileData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Follow / Unfollow user
// @route   PUT /api/users/:id/follow
// @access  Private
const followUser = async (req, res) => {
    if (req.user._id.toString() === req.params.id) {
        return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    try {
        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user._id);

        if (!userToFollow || !currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Block check
        const userToFollowBlocked = userToFollow.blockedUsers || [];
        const currentUserBlocked = currentUser.blockedUsers || [];

        if (userToFollowBlocked.some(id => id.toString() === req.user._id.toString()) ||
            currentUserBlocked.some(id => id.toString() === userToFollow._id.toString())) {
            return res.status(403).json({ message: "Action not allowed" });
        }

        // Check if already following
        if (userToFollow.followers.includes(req.user._id)) {
            // Unfollow
            await userToFollow.updateOne({ $pull: { followers: req.user._id } });
            await currentUser.updateOne({ $pull: { following: req.params.id } });
            res.json({ message: 'User unfollowed' });
        } else {
            // Follow
            await userToFollow.updateOne({ $push: { followers: req.user._id } });
            await currentUser.updateOne({ $push: { following: req.params.id } });
            res.json({ message: 'User followed' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search Users
// @route   GET /api/users/search?q=...
// @access  Public
const searchUsers = async (req, res) => {
    try {
        const keyword = req.query.q ? {
            username: {
                $regex: req.query.q,
                $options: 'i'
            }
        } : {};

        const requester = await User.findById(req.user._id);
        const blockedUsers = requester.blockedUsers || [];

        // Find users who have blocked current user (mutual block hiding)
        let whoBlockedMeIds = [];
        try {
            const whoBlockedMe = await User.find({ blockedUsers: req.user._id }).select('_id');
            whoBlockedMeIds = whoBlockedMe.map(u => u._id);
        } catch (e) {
            console.error(e);
        }

        const users = await User.find({
            ...keyword,
            isDeactivated: false,
            isDeleted: false,
            _id: { $nin: [...blockedUsers, ...whoBlockedMeIds] }
        }).select('-password');

        // Log search query for history
        if (req.query.q && req.user) {
            await User.findByIdAndUpdate(req.user._id, {
                $push: {
                    searchHistory: {
                        $each: [{ query: req.query.q }],
                        $slice: -20 // Keep last 20
                    }
                }
            });
        }

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Deactivate current user account
// @route   PUT /api/users/account/deactivate
// @access  Private
const deactivateAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isDeactivated = true;
        await user.save();

        res.json({ message: 'Account deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete current user account
// @route   DELETE /api/users/account/delete
// @access  Private
const deleteAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isDeleted = true;
        // In a real app, you might want to schedule permanent deletion or anonymize data
        await user.save();

        res.json({ message: 'Account flagged for deletion' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (req.body.username) user.username = req.body.username;

        // Track Bio History
        if (req.body.bio !== undefined && req.body.bio !== user.bio) {
            user.bioHistory.push({ text: user.bio, timestamp: new Date() });
            user.bio = req.body.bio;
        }

        if (req.body.note !== undefined) user.note = req.body.note;

        // Track Profile Pic History
        if (req.file) {
            if (user.profilePic) {
                user.profilePicHistory.push({ url: user.profilePic, timestamp: new Date() });
            }
            user.profilePic = req.file.path; // Cloudinary URL
        }

        await user.save();

        const updatedUser = await User.findById(req.user._id)
            .select('-password')
            .populate('followers', 'username profilePic')
            .populate('following', 'username profilePic');

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update account settings
// @route   PUT /api/users/settings
const updateSettings = async (req, res) => {
    try {
        // Safety check if middleware failed
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'User not authorized (Session missing)' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { isPrivate, tagsPolicy, mentionsPolicy, timeSpentToday } = req.body;

        if (isPrivate !== undefined) user.isPrivate = isPrivate;
        if (tagsPolicy) user.tagsPolicy = tagsPolicy;
        if (mentionsPolicy) user.mentionsPolicy = mentionsPolicy;

        if (timeSpentToday !== undefined) {
            const today = new Date().toISOString().split('T')[0];
            if (user.lastSyncDate === today) {
                user.timeSpentToday += timeSpentToday;
            } else {
                user.timeSpentToday = timeSpentToday;
                user.lastSyncDate = today;
            }
        }

        await user.save();
        res.json(user);
    } catch (error) {
        console.error("Error in updateSettings:", error);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
};

// @desc    Block user
// @route   PUT /api/users/block/:id
const blockUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user.blockedUsers.includes(req.params.id)) {
            user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== req.params.id);
            await user.save();
            res.json({ message: 'User unblocked', blockedUsers: user.blockedUsers });
        } else {
            user.blockedUsers.push(req.params.id);
            // Remove following/follower relationship in real-time
            await user.save();
            await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id, following: req.user._id } });
            await User.findByIdAndUpdate(req.user._id, { $pull: { followers: req.params.id, following: req.params.id } });
            res.json({ message: 'User blocked', blockedUsers: user.blockedUsers });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Log reel watch
// @route   POST /api/users/reels/watch/:id
const logReelWatch = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $push: {
                reelsWatched: {
                    $each: [{ reelId: req.params.id }],
                    $slice: -50 // Keep last 50
                }
            }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get activity logs
// @route   GET /api/users/activity/logs
const getActivityLogs = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('reelsWatched.reelId', 'videoUrl imageUrl caption')
            .populate('blockedUsers', 'username profilePic');

        res.json({
            bioHistory: user.bioHistory,
            profilePicHistory: user.profilePicHistory,
            searchHistory: user.searchHistory,
            reelsWatched: user.reelsWatched,
            blockedUsers: user.blockedUsers,
            timeSpentToday: user.timeSpentToday,
            isPrivate: user.isPrivate,
            tagsPolicy: user.tagsPolicy,
            mentionsPolicy: user.mentionsPolicy
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getUserProfile,
    followUser,
    searchUsers,
    deactivateAccount,
    deleteAccount,
    updateProfile,
    updateSettings,
    blockUser,
    logReelWatch,
    getActivityLogs
};
