const Post = require('../models/Post.js');
const User = require('../models/User.js');

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
    try {
        const { caption, isReel } = req.body;
        // Assuming file upload is handled by middleware and url is attached to req.file
        let imageUrl = '';
        let videoUrl = '';

        if (req.file) {
            // Simple check for image vs video based on mimetype or similar
            if (req.file.mimetype.startsWith('video')) {
                videoUrl = req.file.path; // Cloudinary URL
            } else {
                imageUrl = req.file.path; // Cloudinary URL
            }
        }

        const isReelPost = isReel === 'true' || isReel === true || (uploadType => uploadType === 'reel')(req.body.uploadType) || Boolean(videoUrl);

        const newPost = new Post({
            userId: req.user._id,
            imageUrl,
            videoUrl,
            caption,
            isReel: isReelPost,
            likes: [],
            comments: [],
        });

        const savedPost = await newPost.save();
        // Populate user details for the response
        await savedPost.populate('userId', 'username profilePic');

        res.status(201).json(savedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const SAMPLE_REELS = [
    {
        _id: 'sample-reel-1',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4',
        caption: 'Neon city aesthetic vibes ✨🌃 #reels #aesthetic #tokyo',
        likes: [],
        comments: [
            { _id: 'c1', text: 'This lighting is incredible! 🔥', userId: { _id: 'u-101', username: 'alex_vibes', profilePic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }, createdAt: new Date() }
        ],
        userId: { _id: 'sample-user-1', username: 'neon_dreams', profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
        isSample: true,
        createdAt: new Date()
    },
    {
        _id: 'sample-reel-2',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
        caption: 'Ocean breeze & peaceful waves 🌊 Blue hour reflections',
        likes: [],
        comments: [
            { _id: 'c2', text: 'So soothing 😌', userId: { _id: 'u-102', username: 'nature_goer', profilePic: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' }, createdAt: new Date() }
        ],
        userId: { _id: 'sample-user-2', username: 'ocean_breeze', profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
        isSample: true,
        createdAt: new Date()
    },
    {
        _id: 'sample-reel-3',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4',
        caption: 'Spring blooms in full color 🌸 Golden hour sunlight',
        likes: [],
        comments: [],
        userId: { _id: 'sample-user-3', username: 'flower_power', profilePic: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
        isSample: true,
        createdAt: new Date()
    },
    {
        _id: 'sample-reel-4',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        caption: 'Cinematic adventures & outdoor trails 🏔️ #nature #explore',
        likes: [],
        comments: [],
        userId: { _id: 'sample-user-4', username: 'wanderlust_pro', profilePic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
        isSample: true,
        createdAt: new Date()
    },
    {
        _id: 'sample-reel-5',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        caption: 'Life is a journey, enjoy the ride! 🚗💨 #reelsvideo',
        likes: [],
        comments: [],
        userId: { _id: 'sample-user-5', username: 'roadtripper', profilePic: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
        isSample: true,
        createdAt: new Date()
    }
];

// @desc    Get Reels
// @route   GET /api/posts/reels
// @access  Private
const getReelPosts = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        const blockedUsers = currentUser?.blockedUsers || [];
        const whoBlockedMe = await User.find({ blockedUsers: req.user._id }).select('_id');
        const whoBlockedMeIds = whoBlockedMe.map(u => u._id);

        const reels = await Post.find({
            isDeleted: false,
            userId: { $nin: [...blockedUsers, ...whoBlockedMeIds] },
            $or: [{ videoUrl: { $ne: '' } }, { isReel: true }]
        })
            .sort({ createdAt: -1 })
            .populate('userId', 'username profilePic')
            .populate('comments.userId', 'username profilePic');

        // Always merge user reels + sample reels so there's rich reel content to watch
        const combined = [...reels, ...SAMPLE_REELS];
        res.json(combined);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all posts (Feed)
// @route   GET /api/posts
// @access  Private
const getFeedPosts = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        // Create safe lists with fallbacks
        const followingIds = currentUser.following || [];
        const blockedUsers = currentUser.blockedUsers || [];

        // Find users who have blocked current user
        let whoBlockedMeIds = [];
        try {
            const whoBlockedMe = await User.find({ blockedUsers: req.user._id }).select('_id');
            whoBlockedMeIds = whoBlockedMe.map(u => u._id);
        } catch (err) {
            console.error("Error fetching who blocked me:", err);
        }

        // Get posts from following + own posts, excluding blocked users (mutual)
        const posts = await Post.find({
            userId: {
                $in: [...followingIds, req.user._id],
                $nin: [...blockedUsers, ...whoBlockedMeIds]
            },
            isDeleted: false
        })
            .sort({ createdAt: -1 })
            .populate('userId', 'username profilePic')
            .populate('comments.userId', 'username profilePic');

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get explore posts (Public)
// @route   GET /api/posts/explore
// @access  Public
const getExplorePosts = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        const blockedUsers = currentUser?.blockedUsers || [];

        // Find users who have blocked current user
        const whoBlockedMe = await User.find({ blockedUsers: req.user._id }).select('_id');
        const whoBlockedMeIds = whoBlockedMe.map(u => u._id);

        const posts = await Post.find({
            isDeleted: false,
            userId: { $nin: [...blockedUsers, ...whoBlockedMeIds] }
        })
            .sort({ createdAt: -1 })
            .populate('userId', 'username profilePic');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user posts
// @route   GET /api/posts/:username
const getUserPosts = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const posts = await Post.find({ userId: user._id, isDeleted: false })
            .sort({ createdAt: -1 })
            .populate('userId', 'username profilePic');

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// @desc    Like / Unlike post
// @route   PUT /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.likes.includes(req.user._id)) {
            post.likes = post.likes.filter((id) => id.toString() !== req.user._id.toString());
        } else {
            post.likes.push(req.user._id);
        }

        await post.save();
        res.json(post.likes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add comment
// @route   POST /api/posts/:id/comment
// @access  Private
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = {
            userId: req.user._id,
            text,
            createdAt: new Date(),
        };

        post.comments.push(comment);
        await post.save();

        // We might want to populate the new comment user to return it
        const updatedPost = await Post.findById(req.params.id).populate('comments.userId', 'username profilePic');

        // Return the last comment (the new one)
        res.status(201).json(updatedPost.comments[updatedPost.comments.length - 1]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        post.isDeleted = true;
        post.deletedAt = new Date();
        await post.save();

        res.json({ message: 'Post moved to recently deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save / Unsave post
// @route   PUT /api/posts/:id/save
// @access  Private
const savePost = async (req, res) => {
    try {
        const postId = req.params.id;

        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'User not authorized based on token' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (user.savedPosts.includes(postId)) {
            user.savedPosts.pull(postId);
            await user.save();
            res.json({ message: 'Post unsaved', savedPosts: user.savedPosts });
        } else {
            user.savedPosts.push(postId);
            await user.save();
            res.json({ message: 'Post saved', savedPosts: user.savedPosts });
        }
    } catch (error) {
        console.error("Save Post Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get saved posts
// @route   GET /api/posts/saved
// @access  Private
const getSavedPosts = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'savedPosts',
            populate: {
                path: 'userId',
                select: 'username profilePic'
            }
        });

        const blockedUsers = user.blockedUsers.map(id => id.toString());
        res.json(user.savedPosts.filter(post => !post.isDeleted && !blockedUsers.includes(post.userId._id.toString())));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get deleted posts (History)
// @route   GET /api/posts/history/deleted
// @access  Private
const getDeletedPosts = async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.user._id, isDeleted: true })
            .sort({ deletedAt: -1 })
            .populate('userId', 'username profilePic');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Restore deleted post
// @route   PUT /api/posts/:id/restore
// @access  Private
const restorePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        post.isDeleted = false;
        post.deletedAt = null;
        await post.save();

        res.json({ message: 'Post restored', post });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Permanently delete post
// @route   DELETE /api/posts/:id/permanent
// @access  Private
const permanentlyDeletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await post.deleteOne();
        res.json({ message: 'Post permanently deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPost,
    getReelPosts,
    getFeedPosts,
    getExplorePosts,
    getUserPosts,
    likePost,
    addComment,
    deletePost,
    savePost,
    getSavedPosts,
    getDeletedPosts,
    restorePost,
    permanentlyDeletePost
};
