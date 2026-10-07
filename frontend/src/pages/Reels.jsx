import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
    AiOutlineHeart, 
    AiFillHeart, 
    AiOutlineMessage, 
    AiOutlineShareAlt 
} from 'react-icons/ai';
import { 
    BsBookmark, 
    BsBookmarkFill, 
    BsVolumeMute, 
    BsVolumeUp, 
    BsPlayFill, 
    BsPauseFill, 
    BsMusicNote 
} from 'react-icons/bs';
import { IoTrashOutline } from 'react-icons/io5';
import { MdClose, MdSend } from 'react-icons/md';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import ShareModal from '../components/ShareModal';

const ReelItem = ({ 
    reel, 
    isMuted, 
    toggleMute, 
    onOpenComments, 
    onShare, 
    onDelete,
    isActive 
}) => {
    const { user, updateUser } = useAuth();
    const [isLiked, setIsLiked] = useState(reel.likes?.includes(user?._id) || false);
    const [likeCount, setLikeCount] = useState(reel.likes?.length || 0);
    const [isSaved, setIsSaved] = useState(user?.savedPosts?.includes(reel._id) || false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlayIcon, setShowPlayIcon] = useState(null); // 'play' | 'pause' | null
    const [showHeartAnim, setShowHeartAnim] = useState(false);
    const [progress, setProgress] = useState(0);
    const [expandedCaption, setExpandedCaption] = useState(false);

    const videoRef = useRef(null);
    const lastTapRef = useRef(0);

    // Initial check for following status
    useEffect(() => {
        if (user && reel.userId?._id) {
            setIsFollowing(user.following?.includes(reel.userId._id));
        }
    }, [user, reel.userId]);

    // Handle intersection observer to auto-play when in view
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    videoEl.play().then(() => {
                        setIsPlaying(true);
                    }).catch(() => {
                        // If browser restricts unmuted playback, try muted
                        videoEl.muted = true;
                        videoEl.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
                    });
                    
                    // Log watch history if real reel
                    if (!reel.isSample) {
                        api.post(`/users/reels/watch/${reel._id}`).catch(() => {});
                    }
                } else {
                    videoEl.pause();
                    setIsPlaying(false);
                }
            },
            { threshold: 0.7 }
        );

        observer.observe(videoEl);
        return () => observer.disconnect();
    }, [reel._id]);

    // Update muted property when global mute state changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    // Track video progress
    const handleTimeUpdate = () => {
        if (videoRef.current && videoRef.current.duration) {
            const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(percent);
        }
    };

    // Toggle Play/Pause on single click / tap
    const handleVideoClick = () => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap detected -> Like reel
            handleDoubleTapLike();
        } else {
            // Single tap -> toggle Play / Pause after short delay
            setTimeout(() => {
                if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY) {
                    togglePlayPause();
                }
            }, DOUBLE_TAP_DELAY);
        }
        lastTapRef.current = now;
    };

    const togglePlayPause = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
            setShowPlayIcon('pause');
        } else {
            videoRef.current.play().then(() => {
                setIsPlaying(true);
                setShowPlayIcon('play');
            }).catch(console.error);
        }
        setTimeout(() => setShowPlayIcon(null), 1000);
    };

    const handleDoubleTapLike = async () => {
        setShowHeartAnim(true);
        setTimeout(() => setShowHeartAnim(false), 800);
        if (!isLiked) {
            handleLike();
        }
    };

    const handleLike = async () => {
        if (reel.isSample) {
            setIsLiked(!isLiked);
            setLikeCount(prev => (isLiked ? prev - 1 : prev + 1));
            return;
        }
        try {
            const { data } = await api.put(`/posts/${reel._id}/like`);
            setIsLiked(!isLiked);
            setLikeCount(Array.isArray(data) ? data.length : data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        if (reel.isSample) {
            setIsSaved(!isSaved);
            toast.success(isSaved ? 'Reel removed from saved' : 'Reel saved!');
            return;
        }
        try {
            const { data } = await api.put(`/posts/${reel._id}/save`);
            setIsSaved(!isSaved);
            if (data.savedPosts) {
                updateUser({ savedPosts: data.savedPosts });
            }
            toast.success(isSaved ? 'Reel unsaved' : 'Reel saved!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save reel');
        }
    };

    const handleFollowToggle = async () => {
        if (reel.isSample || !reel.userId?._id) {
            setIsFollowing(!isFollowing);
            toast.success(isFollowing ? `Unfollowed ${reel.userId.username}` : `Following ${reel.userId.username}`);
            return;
        }
        try {
            await api.put(`/users/${reel.userId._id}/follow`);
            setIsFollowing(!isFollowing);
            toast.success(isFollowing ? `Unfollowed @${reel.userId.username}` : `Following @${reel.userId.username}`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to update follow status');
        }
    };

    const isOwnReel = user?._id && (reel.userId?._id === user._id || reel.userId === user._id);

    return (
        <div className="h-full w-full relative snap-start snap-always flex items-center justify-center bg-black overflow-hidden select-none border-b border-zinc-800/40">
            {/* Video Player */}
            {reel.videoUrl ? (
                <video
                    ref={videoRef}
                    src={reel.videoUrl}
                    className="h-full w-full object-cover cursor-pointer"
                    loop
                    playsInline
                    muted={isMuted}
                    onTimeUpdate={handleTimeUpdate}
                    onClick={handleVideoClick}
                />
            ) : (
                <img src={reel.imageUrl} className="h-full w-full object-cover" alt="reel" />
            )}

            {/* Tap Feedback Animation (Play/Pause) */}
            {showPlayIcon && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="bg-black/60 backdrop-blur-md p-5 rounded-full text-white animate-ping text-3xl">
                        {showPlayIcon === 'play' ? <BsPlayFill /> : <BsPauseFill />}
                    </div>
                </div>
            )}

            {/* Double Tap Heart Animation */}
            {showHeartAnim && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <AiFillHeart className="text-red-500 text-8xl drop-shadow-2xl animate-bounce" />
                </div>
            )}

            {/* Mute / Unmute Top Right Button */}
            <button
                onClick={toggleMute}
                className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/80 backdrop-blur-md text-white p-2.5 rounded-full transition transform hover:scale-110 border border-white/10"
                title={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted ? <BsVolumeMute size={20} /> : <BsVolumeUp size={20} />}
            </button>

            {/* Bottom Gradient Overlay & Reels Info */}
            <div className="absolute bottom-0 left-0 w-full p-5 pb-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none">
                <div className="pointer-events-auto max-w-[80%]">
                    {/* User Profile Info */}
                    <div className="flex items-center gap-3 mb-3">
                        <Link to={reel.userId?.username ? `/profile/${reel.userId.username}` : '#'}>
                            <img
                                src={reel.userId?.profilePic || '/default-avatar.png'}
                                className="w-10 h-10 rounded-full border-2 border-white/60 shadow-lg object-cover hover:scale-105 transition"
                                alt="avatar"
                            />
                        </Link>
                        <Link 
                            to={reel.userId?.username ? `/profile/${reel.userId.username}` : '#'}
                            className="font-bold text-white text-sm hover:underline drop-shadow-md truncate max-w-[140px]"
                        >
                            {reel.userId?.username || 'user'}
                        </Link>

                        {!isOwnReel && (
                            <button
                                onClick={handleFollowToggle}
                                className={`px-4 py-1 rounded-full text-xs font-bold transition duration-200 border ${
                                    isFollowing 
                                        ? 'bg-transparent text-white border-white/30 hover:bg-white/10' 
                                        : 'bg-white text-black border-white hover:bg-gray-200'
                                }`}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>

                    {/* Reel Caption */}
                    {reel.caption && (
                        <div className="text-sm text-gray-100 drop-shadow mb-2 leading-relaxed">
                            <span className={expandedCaption ? '' : 'line-clamp-2'}>
                                {reel.caption}
                            </span>
                            {reel.caption.length > 70 && (
                                <button
                                    onClick={() => setExpandedCaption(!expandedCaption)}
                                    className="text-xs text-gray-400 ml-1 font-semibold hover:text-white"
                                >
                                    {expandedCaption ? 'less' : 'more'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Audio track info */}
                    <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
                        <BsMusicNote className="animate-pulse text-white" />
                        <span className="truncate">{reel.userId?.username || 'original_audio'} • Original audio</span>
                    </div>
                </div>
            </div>

            {/* Video Progress Bar */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 z-20">
                <div 
                    className="h-full bg-white transition-all duration-100 ease-linear rounded-r-full" 
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Right Action Buttons */}
            <div className="absolute bottom-20 right-3 flex flex-col gap-5 items-center z-20">
                {/* Like Button */}
                <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                    <div className={`p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 transition transform group-active:scale-125 ${isLiked ? 'text-red-500' : 'text-white hover:bg-white/20'}`}>
                        {isLiked ? <AiFillHeart size={26} /> : <AiOutlineHeart size={26} />}
                    </div>
                    <span className="text-xs font-bold text-white drop-shadow">{likeCount}</span>
                </button>

                {/* Comment Button */}
                <button onClick={() => onOpenComments(reel)} className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 transition transform group-active:scale-125 text-white hover:bg-white/20">
                        <AiOutlineMessage size={26} />
                    </div>
                    <span className="text-xs font-bold text-white drop-shadow">{reel.comments?.length || 0}</span>
                </button>

                {/* Save / Bookmark Button */}
                <button onClick={handleSave} className="flex flex-col items-center gap-1 group">
                    <div className={`p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 transition transform group-active:scale-125 ${isSaved ? 'text-yellow-400' : 'text-white hover:bg-white/20'}`}>
                        {isSaved ? <BsBookmarkFill size={24} /> : <BsBookmark size={24} />}
                    </div>
                    <span className="text-[10px] font-semibold text-white drop-shadow">Save</span>
                </button>

                {/* Share Button */}
                <button onClick={() => onShare(reel)} className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 transition transform group-active:scale-125 text-white hover:bg-white/20">
                        <AiOutlineShareAlt size={26} />
                    </div>
                    <span className="text-[10px] font-semibold text-white drop-shadow">Share</span>
                </button>

                {/* Delete Button (if owner) */}
                {isOwnReel && !reel.isSample && (
                    <button
                        onClick={() => onDelete(reel)}
                        className="flex flex-col items-center gap-1 group"
                        title="Delete Reel"
                    >
                        <div className="p-3 rounded-full bg-red-600/30 backdrop-blur-md border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white transition transform group-active:scale-125">
                            <IoTrashOutline size={24} />
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
};

/* Comments Sheet / Drawer Component */
const CommentsDrawer = ({ reel, onClose, onCommentAdded }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState(reel.comments || []);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const commentsEndRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;

        if (reel.isSample) {
            const mockComment = {
                _id: 'c_' + Date.now(),
                text: text.trim(),
                userId: {
                    _id: user?._id || 'me',
                    username: user?.username || 'you',
                    profilePic: user?.profilePic || '/default-avatar.png'
                },
                createdAt: new Date().toISOString()
            };
            const updated = [...comments, mockComment];
            setComments(updated);
            onCommentAdded(reel._id, updated);
            setText('');
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            return;
        }

        setSubmitting(true);
        try {
            const { data } = await api.post(`/posts/${reel._id}/comment`, { text: text.trim() });
            const updated = [...comments, data];
            setComments(updated);
            onCommentAdded(reel._id, updated);
            setText('');
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (error) {
            console.error(error);
            toast.error('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex justify-center items-end md:items-center p-0 md:p-4 animate-fadeIn">
            <div 
                className="w-full max-w-lg bg-zinc-900 border border-white/20 rounded-t-2xl md:rounded-2xl h-[75vh] md:h-[600px] flex flex-col text-white overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950">
                    <h3 className="font-bold text-base text-center flex-grow">Comments ({comments.length})</h3>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
                    >
                        <MdClose size={24} />
                    </button>
                </div>

                {/* Comment List */}
                <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
                    {comments.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                            <AiOutlineMessage size={48} className="mb-2 text-zinc-600" />
                            <p className="text-sm font-semibold">No comments yet</p>
                            <p className="text-xs text-zinc-500 mt-1">Start the conversation!</p>
                        </div>
                    ) : (
                        comments.map((c, i) => (
                            <div key={c._id || i} className="flex items-start gap-3 text-sm">
                                <img 
                                    src={c.userId?.profilePic || '/default-avatar.png'} 
                                    className="w-9 h-9 rounded-full object-cover border border-white/10" 
                                    alt="avatar" 
                                />
                                <div className="flex flex-col flex-grow">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-white text-xs">{c.userId?.username || 'user'}</span>
                                        <span className="text-[10px] text-gray-400">
                                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Just now'}
                                        </span>
                                    </div>
                                    <p className="text-gray-200 text-sm mt-0.5 leading-snug">{c.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={commentsEndRef} />
                </div>

                {/* Comment Input */}
                <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-zinc-950 flex items-center gap-2">
                    <img 
                        src={user?.profilePic || '/default-avatar.png'} 
                        className="w-8 h-8 rounded-full object-cover" 
                        alt="me" 
                    />
                    <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-grow bg-zinc-800/80 border border-white/10 text-white rounded-full px-4 py-2 text-sm outline-none focus:border-white/30 transition placeholder-gray-500"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <button 
                        type="submit" 
                        disabled={!text.trim() || submitting}
                        className="p-2 text-blue-500 hover:text-blue-400 disabled:opacity-40 transition"
                    >
                        <MdSend size={22} />
                    </button>
                </form>
            </div>
        </div>
    );
};

/* Main Reels Page Component */
const Reels = () => {
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [activeCommentReel, setActiveCommentReel] = useState(null);
    const [shareReel, setShareReel] = useState(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const fetchReels = async () => {
            try {
                const { data } = await api.get('/posts/reels');
                setReels(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching reels:", error);
                // Fallback attempt
                try {
                    const { data: exploreData } = await api.get('/posts/explore');
                    const filtered = exploreData.filter(p => p.videoUrl || p.imageUrl);
                    setReels(filtered);
                } catch (err) {
                    console.error("Fallback reels fetch failed:", err);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchReels();
    }, []);

    // Global keyboard navigation listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'm' || e.key === 'M') {
                setIsMuted(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleMute = () => {
        setIsMuted(prev => !prev);
    };

    const handleCommentAdded = (reelId, updatedComments) => {
        setReels(prev => prev.map(r => r._id === reelId ? { ...r, comments: updatedComments } : r));
    };

    const handleDeleteReel = async (reel) => {
        if (!window.confirm("Move this reel to recently deleted?")) return;

        try {
            await api.delete(`/posts/${reel._id}`);
            setReels(prev => prev.filter(r => r._id !== reel._id));
            toast.success("Reel moved to recently deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete reel");
        }
    };

    return (
        <div className="flex bg-black min-h-[calc(100vh-56px)] md:min-h-screen text-white justify-center items-center overflow-hidden">
            <div 
                ref={containerRef}
                className="w-full max-w-md h-[calc(100vh-56px)] md:h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar flex-grow bg-black shadow-2xl relative"
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                        <p className="text-zinc-400 text-sm font-medium">Loading Reels...</p>
                    </div>
                ) : reels.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-10">
                        <div className="p-4 rounded-full bg-zinc-900 mb-4 border border-zinc-800">
                            <AiOutlineShareAlt size={48} className="text-zinc-400" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">No reels available</h2>
                        <p className="text-zinc-400 text-sm">Be the first to share a reel with your followers!</p>
                    </div>
                ) : (
                    reels.map((reel) => (
                        <ReelItem
                            key={reel._id}
                            reel={reel}
                            isMuted={isMuted}
                            toggleMute={toggleMute}
                            onOpenComments={(r) => setActiveCommentReel(r)}
                            onShare={(r) => setShareReel(r)}
                            onDelete={handleDeleteReel}
                        />
                    ))
                )}
            </div>

            {/* Comments Drawer */}
            {activeCommentReel && (
                <CommentsDrawer
                    reel={activeCommentReel}
                    onClose={() => setActiveCommentReel(null)}
                    onCommentAdded={handleCommentAdded}
                />
            )}

            {/* Share Modal */}
            {shareReel && (
                <ShareModal
                    post={shareReel}
                    onClose={() => setShareReel(null)}
                />
            )}
        </div>
    );
};

export default Reels;
