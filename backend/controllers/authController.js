const User = require('../models/User.js');
const generateToken = (id) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const registerUser = async (req, res) => {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
        username,
        email,
        password,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.isDeleted) {
        return res.status(403).json({ message: 'Account has been deleted or scheduled for deletion' });
    }

    if (user && (await user.matchPassword(password))) {
        // Automatically reactivate account if it was deactivated
        if (user.isDeactivated) {
            user.isDeactivated = false;
            await user.save();
        }

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

const getMe = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            createdAt: user.createdAt,
            savedPosts: user.savedPosts
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

module.exports = { registerUser, loginUser, getMe };
