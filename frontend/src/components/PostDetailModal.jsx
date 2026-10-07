import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { AiOutlineHeart, AiFillHeart, AiOutlineMessage } from 'react-icons/ai';
import { BsBookmark, BsBookmarkFill, BsThreeDots } from 'react-icons/bs';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { Link } from 'react-router-dom';

const PostDetailModal = ({ post: initialPost, onClose, onRefresh, onDelete }) => {
    const { user, updateUser } = useAuth();
    const [post, setPost] = useState(initialPost);
    const [commentText, setCommentText] = useState('');
    const [isLiked, setIsLiked] = useState(initialPost?.likes?.includes(user?._id) || false);
    const isSaved = user?.savedPosts?.includes(post?._id);

    const handleLike = async () => {
        try {
            const { data } = await api.put(`/posts/${post._id}/like`);
            setIsLiked(!isLiked);
            setPost({ ...post, likes: data });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        try {
            const { data } = await api.post(`/posts/${post._id}/comment`, { text: commentText });
            setPost({ ...post, comments: [...post.comments, data] });
            setCommentText('');
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        try {
            const { data } = await api.put(`/posts/${post._id}/save`);
            updateUser({ savedPosts: data.savedPosts });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white z-50"><MdClose size={30} /></button>

            <div className="bg-black border border-white/20 w-full max-w-5xl h-[90vh] flex flex-col md:flex-row rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Media Section */}
                <div className="flex-grow bg-black flex items-center justify-center overflow-hidden h-1/2 md:h-full">
                    {post.imageUrl ? (
                        <img src={post.imageUrl} alt="post" className="max-h-full max-w-full object-contain" />
                    ) : (
                        <video src={post.videoUrl} controls className="max-h-full max-w-full object-contain" />
                    )}
                </div>

                {/* Info Section */}
                <div className="w-full md:w-[400px] flex flex-col bg-black text-white h-1/2 md:h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-white/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={post?.userId?.profilePic || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                            <Link to={`/profile/${post?.userId?.username}`} className="font-semibold text-sm hover:opacity-70">{post?.userId?.username}</Link>
                        </div>
                        <button><BsThreeDots /></button>
                    </div>

                    {/* Comments section */}
                    <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
                        {/* Caption */}
                        <div className="flex gap-3">
                            <img src={post?.userId?.profilePic || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                            <div className="text-sm">
                                <span className="font-semibold mr-2">{post?.userId?.username}</span>
                                <span>{post?.caption}</span>
                                <div className="text-gray-400 text-xs mt-1">{post?.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</div>
                            </div>
                        </div>

                        {/* Real Comments */}
                        {post?.comments?.map((comment, i) => (
                            <div key={i} className="flex gap-3">
                                <img src={comment?.userId?.profilePic || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                                <div className="text-sm">
                                    <span className="font-semibold mr-2">{comment?.userId?.username}</span>
                                    <span>{comment?.text}</span>
                                    <div className="text-gray-400 text-xs mt-1">{comment?.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-white/20">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-4">
                                <button onClick={handleLike}>
                                    {isLiked ? <AiFillHeart size={24} className="text-red-500" /> : <AiOutlineHeart size={24} />}
                                </button>
                                <button><AiOutlineMessage size={24} /></button>
                                {user?._id === post?.userId?._id && onDelete && (
                                    <button onClick={onDelete} className="text-red-500 hover:text-red-600 transition" title="Delete Post">
                                        <MdClose size={24} />
                                    </button>
                                )}
                            </div>
                            <button onClick={handleSave}>
                                {isSaved ? <BsBookmarkFill size={22} /> : <BsBookmark size={22} />}
                            </button>
                        </div>
                        <div className="font-semibold text-sm">{post?.likes?.length || 0} likes</div>
                    </div>

                    {/* Add Comment */}
                    <form onSubmit={handleComment} className="p-4 border-t border-white/20 flex items-center">
                        <input
                            type="text"
                            placeholder="Add a comment..."
                            className="flex-grow bg-transparent text-sm outline-none placeholder-gray-500"
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                        />
                        <button type="submit" className="text-blue-500 font-semibold disabled:opacity-50" disabled={!commentText.trim()}>Post</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PostDetailModal;
