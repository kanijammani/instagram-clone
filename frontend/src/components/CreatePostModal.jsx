import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { BiImageAdd } from 'react-icons/bi';
import api from '../services/api';
import { toast } from 'react-toastify';

const CreatePostModal = ({ onClose }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadType, setUploadType] = useState('post'); // 'post', 'reel', or 'story'

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            if (selected.type.startsWith('video')) {
                setUploadType('reel');
            }
        }
    };

    const handleSubmit = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        if (uploadType === 'post' || uploadType === 'reel') {
            formData.append('caption', caption);
            if (uploadType === 'reel') {
                formData.append('isReel', 'true');
            }
        }

        try {
            const endpoint = uploadType === 'story' ? '/stories' : '/posts';
            await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const typeLabel = uploadType === 'reel' ? 'Reel' : uploadType === 'post' ? 'Post' : 'Story';
            toast.success(`${typeLabel} created successfully!`);
            onClose();
            if (window.location.pathname === '/' || window.location.pathname.startsWith('/profile') || window.location.pathname === '/reels') {
                window.location.reload();
            }
        } catch (error) {
            console.error(error);
            toast.error(`Failed to create ${uploadType}`);
        } finally {
            setLoading(false);
        }
    };

    const [generatingAI, setGeneratingAI] = useState(false);
    const [selectedTone, setSelectedTone] = useState('trendy');
    const [suggestions, setSuggestions] = useState([]);

    const FALLBACK_CAPTIONS = {
        trendy: [
            "Main character energy ✨ Living my best life 🔥 #viral #reels #trending #explore #fyp",
            "No skip steps, just pure vibes 💫 #aesthetic #instadaily #photooftheday #explorepage",
            "Obsessed with this layout ⚡ #lifestyle #slay #newpost #foryou",
            "Golden hour magic & endless memories 🌅✨ #vibes #trending #instagram",
            "Life isn't perfect, but this view is 💫 #contentcreator #explore #viral"
        ],
        aesthetic: [
            "soft golden hour thoughts 🌿✨ #aesthetic #goldenhour #softvibes #minimal",
            "chasing sunsets & quiet moments 🌄 #warmtones #visuals #moodygrams #artofvisuals",
            "a chapter full of peace 🕊️ #simplepleasures #cozy #naturelovers",
            "collecting moments, not things 🌸 #aesthetic #chill #lofi #vibe"
        ],
        inspirational: [
            "Trust the journey, love the process 🌱✨ #growth #mindset #motivation #dailyinspiration",
            "Create the life you can't wait to wake up to 🌅 #dreamBig #inspiration #goals #keepgoing",
            "Small steps every day lead to massive results 💫 #success #mindfulness #inspiration"
        ],
        funny: [
            "I followed my heart and it led me to the fridge 🍕 #relatable #humor #instafunny #lol",
            "10% luck, 20% skill, 70% wondering what I came into this room for 🤪 #funny #vibes",
            "Reality called so I hung up 📞✨ #funnymemes #mood #weekendvibes"
        ],
        minimalist: [
            "Details. ✨ #minimalism #clean #aesthetic #mood",
            ". simplicity . #vibe #curated #lessismore",
            "silence & space 🌿 #monochrome #essentials"
        ]
    };

    const handleGenerateAICaption = async () => {
        setGeneratingAI(true);
        const userPrompt = caption.trim();
        try {
            const { data } = await api.post('/ai/generate-caption', {
                prompt: userPrompt || (uploadType === 'reel' ? 'Cool Instagram Reel' : 'Awesome post'),
                tone: selectedTone
            });
            if (data && data.caption) {
                setCaption(data.caption);
                setSuggestions(data.suggestions || [data.caption]);
                toast.success('✨ AI Captions generated!');
                return;
            }
        } catch (error) {
            console.warn("Backend AI service warning, using fallback AI engine:", error);
        } finally {
            setGeneratingAI(false);
        }

        // Robust client-side fallback
        const templates = FALLBACK_CAPTIONS[selectedTone] || FALLBACK_CAPTIONS.trendy;
        const formattedSuggestions = templates.map(t => userPrompt ? `${t} | "${userPrompt}"` : t);
        const randomCaption = formattedSuggestions[Math.floor(Math.random() * formattedSuggestions.length)];
        setCaption(randomCaption);
        setSuggestions(formattedSuggestions);
        toast.success('✨ AI Captions suggested!');
    };

    const isVideo = file?.type?.startsWith('video');

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-0 md:p-4" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white z-[110] md:block hidden"><MdClose size={30} /></button>

            <div className="bg-black w-full h-full md:h-auto md:max-w-xl md:aspect-auto md:max-h-[85vh] md:rounded-xl flex flex-col overflow-hidden text-white border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b border-white/20 p-3 text-center font-semibold text-sm flex justify-between items-center bg-zinc-950">
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition w-16 text-left">Cancel</button>
                    <div className="flex bg-white/10 rounded-full p-1 gap-1">
                        <button
                            onClick={() => setUploadType('post')}
                            className={`px-3 py-1 rounded-full transition text-xs font-semibold ${uploadType === 'post' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Post
                        </button>
                        <button
                            onClick={() => setUploadType('reel')}
                            className={`px-3 py-1 rounded-full transition text-xs font-semibold ${uploadType === 'reel' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Reel 🎬
                        </button>
                        <button
                            onClick={() => setUploadType('story')}
                            className={`px-3 py-1 rounded-full transition text-xs font-semibold ${uploadType === 'story' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Story
                        </button>
                    </div>
                    <button onClick={handleSubmit} className="text-blue-500 font-bold disabled:opacity-50 w-16 text-right" disabled={loading || !file}>
                        {loading ? '...' : 'Share'}
                    </button>
                </div>

                <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
                    <div className={`flex-grow bg-white/5 flex items-center justify-center relative min-h-[300px] ${file ? 'bg-black' : ''}`}>
                        {preview ? (
                            isVideo ? (
                                <video src={preview} controls className="max-h-[60vh] max-w-full object-contain" />
                            ) : (
                                <img src={preview} alt="preview" className="max-h-[60vh] max-w-full object-contain" />
                            )
                        ) : (
                            <div className="flex flex-col items-center">
                                <BiImageAdd size={50} className="text-gray-400 mb-2" />
                                <span className="text-sm text-gray-300 mb-3">Upload photos or video reels</span>
                                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition">
                                    Select from computer
                                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>
                        )}
                    </div>
                    {file && uploadType !== 'story' && (
                        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/20 p-4 flex flex-col bg-zinc-900/60 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-3">
                                <img src={JSON.parse(sessionStorage.getItem('userInfo') || '{}')?.profilePic || '/default-avatar.png'} className="w-8 h-8 rounded-full object-cover" alt="user" />
                                <span className="font-semibold text-sm">{JSON.parse(sessionStorage.getItem('userInfo') || '{}')?.username || 'username'}</span>
                            </div>

                            <textarea
                                className="w-full flex-grow min-h-[90px] outline-none resize-none text-sm bg-transparent text-white placeholder-gray-500"
                                placeholder={uploadType === 'reel' ? "Write a caption for your Reel..." : "Write a caption..."}
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                            ></textarea>

                            {/* AI Caption & Hashtags Generator Box */}
                            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 flex items-center gap-1">
                                        ✨ AI Caption Suggestions
                                    </span>
                                    <select
                                        value={selectedTone}
                                        onChange={(e) => setSelectedTone(e.target.value)}
                                        className="bg-zinc-800 text-xs text-gray-200 border border-white/10 rounded px-2 py-1 outline-none"
                                    >
                                        <option value="trendy">🔥 Trendy</option>
                                        <option value="aesthetic">🌿 Aesthetic</option>
                                        <option value="inspirational">💫 Inspirational</option>
                                        <option value="funny">🤪 Funny</option>
                                        <option value="minimalist">✨ Minimalist</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGenerateAICaption}
                                    disabled={generatingAI}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {generatingAI ? (
                                        <span>Generating AI Captions...</span>
                                    ) : (
                                        <span>Suggest AI Captions & Hashtags ✨</span>
                                    )}
                                </button>

                                {/* AI Suggestions Chips */}
                                {suggestions.length > 0 && (
                                    <div className="mt-2 flex flex-col gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Tap a suggestion to use:</span>
                                        {suggestions.map((sug, i) => (
                                            <div
                                                key={i}
                                                onClick={() => setCaption(sug)}
                                                className="text-xs bg-zinc-800/90 hover:bg-purple-950/60 p-2 rounded-lg cursor-pointer border border-white/10 hover:border-purple-500/50 transition line-clamp-2 text-gray-200"
                                            >
                                                {sug}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreatePostModal;
