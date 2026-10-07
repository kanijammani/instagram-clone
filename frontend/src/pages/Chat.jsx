import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { io } from 'socket.io-client';
import { BiImageAdd, BiMicrophone, BiSend } from 'react-icons/bi';
import { BsEye, BsLock } from 'react-icons/bs';
import { IoClose } from 'react-icons/io5';
import { toast } from 'react-toastify';

const ENDPOINT = "http://localhost:5001";
var socket, selectedChatCompare;

const Chat = () => {
    const { user } = useAuth();
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [file, setFile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isOneTime, setIsOneTime] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // New Message Modal State
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [followingUsers, setFollowingUsers] = useState([]);

    const [socketConnected, setSocketConnected] = useState(false);

    // Helper to get the other user in a conversation
    const getOtherUser = (participants) => {
        return participants.find(p => p._id !== user._id) || {};
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Initialize Socket
    useEffect(() => {
        socket = io(ENDPOINT);
        socket.emit("setup", user);
        socket.on("connected", () => setSocketConnected(true));
        socket.on("message_received", (newMessageReceived) => {
            // Update sidebar chats list
            setChats(prevChats => {
                // Check if chat exists in list
                const chatExists = prevChats.find(c => c._id === newMessageReceived.conversationId._id);

                let updatedChats;
                if (chatExists) {
                    updatedChats = prevChats.map(chat =>
                        chat._id === newMessageReceived.conversationId._id
                            ? { ...chat, lastMessage: newMessageReceived, updatedAt: new Date().toISOString() }
                            : chat
                    );
                } else {
                    // If chat doesn't exist (new chat started by someone else), we might need to fetch it or just ignore until refresh.
                    // Ideally we should fetch the conversation details, but for now let's hope it's rare or handled by fetchChats.
                    // Only fetch if we really need to.
                    // For simplicity, we won't add it if it's missing to avoid complexity with missing populated fields.
                    updatedChats = [...prevChats];
                }

                // Sort by last updated (mocking the sort)
                return updatedChats.sort((a, b) => {
                    const dateA = new Date(a.updatedAt || 0);
                    const dateB = new Date(b.updatedAt || 0);
                    return dateB - dateA;
                });
            });

            if (
                !selectedChatCompare ||
                selectedChatCompare._id !== newMessageReceived.conversationId._id
            ) {
                // Notification could be added here
            } else {
                setMessages((prev) => [...prev, newMessageReceived]);
                scrollToBottom();
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    // Fetch Chats
    const fetchChats = async () => {
        try {
            const { data } = await api.get('/chat');
            setChats(data);
        } catch (error) {
            console.error("Failed to fetch chats", error);
            toast.error("Failed to load chats");
        }
    };

    useEffect(() => {
        fetchChats();
    }, [user]);

    // Fetch Messages when chat selected
    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedChat) return;
            try {
                const { data } = await api.get(`/chat/${selectedChat._id}`);
                setMessages(data);
                scrollToBottom();
                socket.emit("join_chat", selectedChat._id);
                selectedChatCompare = selectedChat;
            } catch (error) {
                toast.error("Failed to load messages");
            }
        };

        fetchMessages();
    }, [selectedChat]);

    // Scroll to bottom on new message
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e) => {
        if (e) e.preventDefault();
        if ((!newMessage.trim() && !file) || !selectedChat) return;

        if (selectedChat.isAI) {
            const userText = newMessage.trim();
            const userMsg = {
                _id: 'user_' + Date.now(),
                sender: { _id: user._id, username: user.username, profilePic: user.profilePic },
                content: userText,
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, userMsg]);
            setNewMessage("");

            try {
                const { data } = await api.post('/ai/chat', { message: userText });
                const aiReply = {
                    _id: 'ai_' + Date.now(),
                    sender: { _id: 'meta-ai-bot', username: 'Meta AI 🤖', profilePic: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150' },
                    content: data.reply,
                    createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiReply]);
            } catch (error) {
                console.error(error);
                toast.error("AI service error");
            }
            return;
        }

        const formData = new FormData();
        formData.append('conversationId', selectedChat._id);
        if (newMessage) formData.append('content', newMessage);
        if (file) {
            formData.append('file', file);
            if (file.type.startsWith('image/')) formData.append('type', 'image');
            else if (file.type.startsWith('video/')) formData.append('type', 'video');
            else if (file.type.startsWith('audio/')) formData.append('type', 'audio');
        }
        if (isOneTime) formData.append('isOneTimeView', true);

        try {
            setNewMessage("");
            setFile(null);
            setIsOneTime(false);

            const { data } = await api.post('/chat/message', formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            socket.emit("new message", data);
            setMessages([...messages, data]);

            // Update last message in chat list
            setChats(prevChats => {
                const updatedChats = prevChats.map(c =>
                    c._id === selectedChat._id
                        ? { ...c, lastMessage: data, updatedAt: new Date().toISOString() }
                        : c
                );
                return updatedChats.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
            });
        } catch (error) {
            toast.error("Failed to send message");
            console.error(error);
        }
    };

    // Modal - Fetch Following
    useEffect(() => {
        if (showModal) {
            const fetchFollowing = async () => {
                try {
                    const { data } = await api.get(`/users/${user.username}`);
                    setFollowingUsers(data.following || []);
                } catch (error) {
                    console.error("Failed to fetch following", error);
                }
            }
            fetchFollowing();
        }
    }, [showModal, user.username]);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            const { data } = await api.get(`/users/search?q=${query}`);
            setSearchResults(data);
        } catch (error) {
            console.error(error);
        }
    };

    const startNewChat = async (targetUserId) => {
        try {
            const { data } = await api.post('/chat/conversation', { userId: targetUserId });
            if (!chats.find(c => c._id === data._id)) {
                setChats([data, ...chats]);
            }
            setSelectedChat(data);
            setShowModal(false);
            setSearchQuery("");
            setSearchResults([]);
        } catch (error) {
            toast.error("Failed to start conversation");
        }
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
        }
    };

    // Basic View Once Handler (just updates UI state strictly for this session if needed, or calls API)
    const handleViewOneTime = async (msgId) => {
        try {
            await api.put(`/chat/message/${msgId}/view`);
            // Refresh messages to show it as viewed/expired
            const { data } = await api.get(`/chat/${selectedChat._id}`);
            setMessages(data);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex h-[calc(100vh-112px)] md:h-screen bg-transparent relative">
            {/* Sidebar List */}
            <div className={`w-full md:w-1/3 border-r border-white/20 bg-black/40 backdrop-blur-md text-white ${selectedChat ? 'hidden md:block' : 'block'}`}>
                <div className="p-4 border-b border-white/20 flex justify-between items-center">
                    <h2 className="font-bold text-xl">{user.username}</h2>
                    <button onClick={() => setShowModal(true)} className="text-blue-400 font-semibold mt-2 hover:text-blue-300">New Message</button>
                </div>
                <div className="overflow-y-auto h-full pb-20">
                    {/* Meta AI Special Assistant Chat item */}
                    <div
                        onClick={() => {
                            const aiChat = {
                                _id: 'meta-ai-chat',
                                isAI: true,
                                participants: [
                                    {
                                        _id: 'meta-ai-bot',
                                        username: 'Meta AI 🤖',
                                        profilePic: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'
                                    }
                                ]
                            };
                            setSelectedChat(aiChat);
                            setMessages([
                                {
                                    _id: 'welcome-ai',
                                    sender: { _id: 'meta-ai-bot', username: 'Meta AI 🤖' },
                                    content: '👋 Hi! I am Meta AI on Instagram. I can write post captions, give photo tips, brainstorm Reel scripts, or answer any questions!',
                                    createdAt: new Date().toISOString()
                                }
                            ]);
                        }}
                        className={`flex items-center gap-3 p-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-pink-900/20 hover:from-purple-900/50 hover:to-pink-900/40 cursor-pointer transition ${selectedChat?._id === 'meta-ai-chat' ? 'ring-1 ring-purple-500 bg-purple-900/50' : ''}`}
                    >
                        <div className="relative">
                            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150" alt="Meta AI" className="w-12 h-12 rounded-full object-cover border-2 border-purple-400 p-0.5" />
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-500 border-2 border-black rounded-full"></span>
                        </div>
                        <div className="flex-grow">
                            <div className="font-bold flex items-center justify-between">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Meta AI 🤖</span>
                                <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-semibold">AI Assistant</span>
                            </div>
                            <div className="text-gray-300 text-xs truncate">Ask me anything or get caption ideas ✨</div>
                        </div>
                    </div>

                    {chats.map(chat => {
                        const otherUser = getOtherUser(chat.participants);
                        const isLastSenderMe = chat.lastMessage?.sender?._id === user._id || chat.lastMessage?.sender === user._id;
                        return (
                            <div
                                key={chat._id}
                                onClick={() => setSelectedChat(chat)}
                                className={`flex items-center gap-3 p-4 hover:bg-white/10 cursor-pointer transition ${selectedChat?._id === chat._id ? 'bg-white/10' : ''}`}
                            >
                                <img src={otherUser.profilePic || "/default-avatar.png"} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <div className="font-semibold">{otherUser.username}</div>
                                    <div className="text-gray-300 text-sm truncate">
                                        {chat.lastMessage ? (
                                            isLastSenderMe ? `You: ${chat.lastMessage.content || 'Sent attachment'}` : (chat.lastMessage.content || 'Sent attachment')
                                        ) : 'New chat'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {chats.length === 0 && (
                        <div className="p-6 text-center text-gray-500">
                            <p>No messages yet.</p>
                            <button onClick={() => setShowModal(true)} className="mt-2 text-blue-500 font-semibold">Start a chat</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className={`w-full md:w-2/3 flex flex-col bg-black/20 backdrop-blur-sm text-white ${!selectedChat ? 'hidden md:flex' : 'flex'} relative`}>
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/20 flex items-center justify-between bg-black/40">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedChat(null)} className="md:hidden text-gray-300">Back</button>
                                <img src={getOtherUser(selectedChat.participants).profilePic || "/default-avatar.png"} className="w-10 h-10 rounded-full object-cover" />
                                <span className="font-bold">{getOtherUser(selectedChat.participants).username}</span>
                            </div>
                            <button className="text-gray-400"><BsEye size={20} /></button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-grow overflow-y-auto p-4 space-y-3">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender._id === user._id;
                                const isRead = msg.viewedBy?.includes(user._id);

                                return (
                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>
                                            {msg.isOneTimeView && !isMe ? (
                                                <div onClick={() => !isRead && handleViewOneTime(msg._id)} className="cursor-pointer flex items-center gap-2">
                                                    {isRead ? <span className="text-gray-300 italic">Viewed</span> : <><BsEye /> Tap to view</>}
                                                </div>
                                            ) : (
                                                <>
                                                    {msg.mediaUrl && (
                                                        msg.type === 'video' ?
                                                            <video src={msg.mediaUrl} controls className="max-w-full rounded mb-2" /> :
                                                            <img src={msg.mediaUrl} className="max-w-full rounded mb-2" />
                                                    )}
                                                    {msg.content && <p>{msg.content}</p>}
                                                </>
                                            )}
                                            <span className="text-[10px] opacity-70 block text-right">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 border-t border-white/20 bg-black/40 flex items-center gap-3">
                            <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            <button onClick={() => fileInputRef.current.click()} className="text-blue-400">
                                <BiImageAdd size={24} />
                            </button>
                            {file && <span className="text-xs text-green-400 whitespace-nowrap">{file.name}</span>}

                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage(e)}
                                placeholder="Message..."
                                className="flex-grow bg-transparent border border-white/20 rounded-full px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />

                            {/* One Time Toggle */}
                            <button onClick={() => setIsOneTime(!isOneTime)} className={`${isOneTime ? 'text-green-400' : 'text-gray-400'}`}>
                                <BsLock size={20} title="View Once" />
                            </button>

                            {newMessage.trim() || file ? (
                                <button onClick={sendMessage} className="text-blue-500 font-semibold">Send</button>
                            ) : (
                                <button className="text-gray-500 cursor-not-allowed">Send</button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <h2 className="text-2xl font-light mb-2">Your Messages</h2>
                            <p className="text-gray-500">Send private photos and messages to a friend or group.</p>
                            <button onClick={() => setShowModal(true)} className="bg-blue-500 text-white px-4 py-1.5 rounded mt-4 hover:bg-blue-600 transition">Send Message</button>
                        </div>
                    </div>
                )}
            </div>

            {/* New Message Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-zinc-900 w-full max-w-sm rounded-xl border border-white/20 overflow-hidden flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <span className="font-bold text-center flex-grow">New Message</span>
                            <button onClick={() => setShowModal(false)}><IoClose size={24} /></button>
                        </div>
                        <div className="p-3 border-b border-white/10">
                            <div className="flex items-center bg-zinc-800 rounded-lg px-3 py-1.5 gap-2">
                                <span className="text-gray-400">To:</span>
                                <input
                                    autoFocus
                                    className="bg-transparent outline-none flex-grow text-sm text-white placeholder-gray-500"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto p-2 flex-grow">
                            {searchQuery ? (
                                searchResults.length > 0 ? searchResults.map(u => (
                                    <div key={u._id} onClick={() => startNewChat(u._id)} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg cursor-pointer">
                                        <img src={u.profilePic || "/default-avatar.png"} className="w-10 h-10 rounded-full object-cover" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{u.username}</span>
                                            <span className="text-xs text-gray-400">{u.fullname}</span>
                                        </div>
                                    </div>
                                )) : <p className="p-4 text-center text-gray-500 text-sm">No user found.</p>
                            ) : (
                                followingUsers.length > 0 ? (
                                    <>
                                        <p className="px-3 py-2 text-xs font-semibold text-gray-400">Suggested</p>
                                        {followingUsers.map(u => (
                                            <div key={u._id} onClick={() => startNewChat(u._id)} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg cursor-pointer">
                                                <img src={u.profilePic || "/default-avatar.png"} className="w-10 h-10 rounded-full object-cover" />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm">{u.username}</span>
                                                    <span className="text-xs text-gray-400">Following</span>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : <p className="p-4 text-center text-gray-500 text-sm">No followers found. Search for users.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
