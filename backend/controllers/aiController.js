// AI Assistant Controller for Instagram Clone

// Presets for Caption Generation based on Tone
const CAPTION_TEMPLATES = {
    trendy: (prompt) => [
        `Main character energy ✨ | ${prompt || 'Living my best life'} 🔥 #viral #reels #trending #explore #fyp #vibes`,
        `No skip steps, just pure vibes 💫 | ${prompt || 'Current mood'} #aesthetic #instadaily #photooftheday #explorepage`,
        `Obsessed with this layout ⚡ ${prompt ? `- ${prompt}` : ''} #lifestyle #slay #newpost #foryou`
    ],
    aesthetic: (prompt) => [
        `soft golden hour thoughts 🌿✨ ${prompt ? `\n"${prompt}"` : ''} #aesthetic #goldenhour #softvibes #minimal`,
        `chasing sunsets & quiet moments 🌄 ${prompt || 'serenity'} #warmtones #visuals #moodygrams #artofvisuals`,
        `a chapter full of peace 🕊️ ${prompt ? `\n${prompt}` : ''} #simplepleasures #cozy #naturelovers`
    ],
    inspirational: (prompt) => [
        `Trust the journey, love the process 🌱✨\n${prompt ? `"${prompt}"\n` : ''}#growth #mindset #motivation #dailyinspiration #positivity`,
        `Create the life you can't wait to wake up to 🌅 ${prompt || ''} #dreamBig #inspiration #goals #keepgoing`,
        `Small steps every day lead to massive results 💫 ${prompt ? `| ${prompt}` : ''} #success #mindfulness #inspiration`
    ],
    funny: (prompt) => [
        `I followed my heart and it led me to the fridge 🍕 ${prompt ? `(${prompt})` : ''} #relatable #humor #instafunny #lol`,
        `10% luck, 20% skill, 70% wondering what I came into this room for 🤪 ${prompt || ''} #funny #vibes #silly`,
        `Reality called so I hung up 📞✨ ${prompt ? `- ${prompt}` : ''} #funnymemes #mood #weekendvibes`
    ],
    minimalist: (prompt) => [
        `${prompt || 'Details.'} ✨ #minimalism #clean #aesthetic #mood`,
        `. ${prompt || 'simplicity'} . #vibe #curated #lessismore`,
        `${prompt ? prompt.toLowerCase() : 'silence'} 🌿 #monochrome #essentials`
    ]
};

// Presets for Bio Generation based on Vibe
const BIO_TEMPLATES = {
    creator: (prompt) => `✨ Content Creator & Visual Storyteller\n📍 ${prompt || 'Digital Explorer'}\n🎥 Turning ideas into pixels\n👇 Check my latest work!`,
    minimal: (prompt) => `▫️ ${prompt || 'creating & curating'}\n▫️ less is more\n✨ ${new Date().getFullYear()} chapter`,
    fitness: (prompt) => `💪 ${prompt || 'Fitness & Lifestyle'}\n🏋️‍♂️ Daily grind | Health & Wellness\n🔥 Push your limits every day`,
    tech: (prompt) => `💻 ${prompt || 'Developer & Builder'}\n🚀 Turning coffee into code ☕\n⚡ Building the future of web`,
    aesthetic: (prompt) => `🌸 ${prompt || 'soft vibes & quiet places'}\n📷 Capturing moments\n🕊️ Living in color`
};

// AI Meta Bot Smart DM Responses
const generateAIMessageResponse = (userText) => {
    const text = userText.toLowerCase();

    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
        return "Hey there! 👋 I'm your Meta AI assistant on Instagram. How can I help you today? I can suggest caption ideas, give photography tips, write reel scripts, or answer questions!";
    }
    if (text.includes('reel') || text.includes('video') || text.includes('idea')) {
        return "🎬 Here are 3 trending Reel ideas for you:\n1. 'A Day in My Life' timelapse with a trending chill beat 🎵\n2. 'Behind the Scenes' transition snippet ⚡\n3. '3 Things I Wish I Knew Sooner' quick tip video 💡";
    }
    if (text.includes('caption') || text.includes('hashtag')) {
        return "✨ Looking for a great caption? Try this:\n'Collecting moments, not things 🌅✨ #reels #explore #aesthetic #vibes'\nOr ask me to generate a specific tone!";
    }
    if (text.includes('photo') || text.includes('picture') || text.includes('camera') || text.includes('filter')) {
        return "📸 Photo Tip: Use natural golden hour light (around sunset) and turn on Grid lines in your camera settings for rule-of-thirds composition! Apply warm vintage filters for an aesthetic feel. ✨";
    }
    if (text.includes('who are you') || text.includes('what can you do')) {
        return "🤖 I'm Meta AI! Built right into your Instagram DMs. You can ask me for captions, bio ideas, creative advice, status updates, or just chat with me anytime!";
    }
    
    // Default smart response
    return `That's an awesome idea! 🌟 "${userText}" sounds really creative. If you'd like, I can turn this into a full post caption with trending hashtags, a Reel script, or suggest aesthetic filters! What would you like to create?`;
};

// @desc    Generate AI Captions & Hashtags
// @route   POST /api/ai/generate-caption
// @access  Private
const generateCaption = async (req, res) => {
    try {
        const { prompt, tone = 'trendy' } = req.body;
        const toneKey = tone.toLowerCase();
        const templates = CAPTION_TEMPLATES[toneKey] || CAPTION_TEMPLATES.trendy;
        
        // Generate a set of caption suggestions for the user
        const suggestions = templates.map(fn => fn(prompt));
        const randomCaption = suggestions[Math.floor(Math.random() * suggestions.length)];

        res.json({ 
            caption: randomCaption,
            suggestions: suggestions 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate AI Bio
// @route   POST /api/ai/generate-bio
// @access  Private
const generateBio = async (req, res) => {
    try {
        const { prompt, vibe = 'creator' } = req.body;
        const vibeKey = vibe.toLowerCase();
        const templateFn = BIO_TEMPLATES[vibeKey] || BIO_TEMPLATES.creator;
        const bio = templateFn(prompt);

        res.json({ bio });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Chat with AI Assistant (Meta AI DM)
// @route   POST /api/ai/chat
// @access  Private
const chatWithAI = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: 'Message is required' });

        const reply = generateAIMessageResponse(message);
        res.json({
            reply,
            sender: {
                _id: 'meta-ai-bot',
                username: 'Meta AI 🤖',
                profilePic: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    AI Content Moderation
// @route   POST /api/ai/moderate
// @access  Private
const moderateContent = async (req, res) => {
    try {
        const { text } = req.body;
        const badWords = ['hate', 'abuse', 'attack', 'scam'];
        const isBad = badWords.some(w => text?.toLowerCase().includes(w));

        if (isBad) {
            return res.json({ safe: false, reason: 'Content flagged by AI moderation safety rules.' });
        }
        res.json({ safe: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    generateCaption,
    generateBio,
    chatWithAI,
    moderateContent
};
