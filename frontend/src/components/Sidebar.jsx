import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AiFillHome, AiOutlineHome, AiOutlineSearch, AiOutlineCompass, AiFillCompass, AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { BiMoviePlay, BiSolidMoviePlay } from 'react-icons/bi';
import { CgProfile } from 'react-icons/cg';
import { BsPlusSquare, BsPlusSquareFill } from 'react-icons/bs';
import { FaRegPaperPlane } from 'react-icons/fa';
import useAuth from '../hooks/useAuth';

const Sidebar = ({ openPostModal }) => {
    const { pathname } = useLocation();
    const { user, logout } = useAuth();

    const isActive = (path) => pathname === path;

    return (
        <div className="hidden md:flex flex-col w-60 h-screen border-r border-white/20 px-4 pt-8 fixed top-0 left-0 bg-black/40 backdrop-blur-md z-10 text-white">
            <Link to="/" className="mb-8 px-2">
                <h1 className="text-2xl font-serif">Instagram</h1>
            </Link>

            <nav className="flex flex-col gap-2 flex-grow">
                <Link to="/" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    {isActive('/') ? <AiFillHome size={28} /> : <AiOutlineHome size={28} />}
                    <span className={`text-base ${isActive('/') ? 'font-bold' : ''}`}>Home</span>
                </Link>

                <Link to="/search" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    <AiOutlineSearch size={28} />
                    <span className="text-base">Search</span>
                </Link>

                <Link to="/explore" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    {isActive('/explore') ? <AiFillCompass size={28} /> : <AiOutlineCompass size={28} />}
                    <span className={`text-base ${isActive('/explore') ? 'font-bold' : ''}`}>Explore</span>
                </Link>

                <Link to="/reels" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    {isActive('/reels') ? <BiSolidMoviePlay size={28} /> : <BiMoviePlay size={28} />}
                    <span className={`text-base ${isActive('/reels') ? 'font-bold' : ''}`}>Reels</span>
                </Link>

                <Link to="/direct/inbox" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    <FaRegPaperPlane size={24} />
                    <span className={`text-base ${isActive('/direct/inbox') ? 'font-bold' : ''}`}>Messages</span>
                </Link>

                <Link to="/notifications" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition text-left">
                    <AiOutlineHeart size={28} />
                    <span className="text-base">Notifications</span>
                </Link>

                <button onClick={openPostModal} className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition text-left">
                    {/* Assume not staying on create page but opening modal */}
                    <BsPlusSquare size={28} />
                    <span className="text-base">Create</span>
                </button>

                <Link to={user?.username ? `/profile/${user.username}` : '#'} className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    {user?.profilePic ? (
                        <img src={user.profilePic} alt="profile" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                        <CgProfile size={28} />
                    )}
                    <span className={`text-base ${isActive(user?.username ? `/profile/${user.username}` : '') ? 'font-bold' : ''}`}>Profile</span>
                </Link>

                <Link to="/settings" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    <div className={`${isActive('/settings') ? 'bg-white/10' : ''}`}>
                        <svg aria-label="Settings" className="_ab6-" color="currentColor" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                            <path d="M24 12.001a11.962 11.962 0 01-3.264 8.353l-1.428-1.41a10.007 10.007 0 10-14.62 0l-1.426 1.41a12.002 12.002 0 1114.128 6.474l.012.012 1.412 1.414.07-.07c1.192.3 2.455.438 3.737.408l.067-.001a.34.34 0 00.324-.326l-.001-.067c-.03-1.282-.168-2.545-.468-3.737l.07-.07-1.414-1.414-.012-.012A11.93 11.93 0 0124 12.001zM14.28 21.056c-1.398.243-2.836.257-4.225-.01l-.066-.013c-.09-.02-.12-.132-.055-.197l1.378-1.365a1.002 1.002 0 011.417.001l1.378 1.366c.066.065.035.177-.056.196l-.065.013l-.711.022zM21.056 14.28c-.243 1.398-.257 2.836.01 4.225l.013.066c.02.09.132.12.197.055l1.365-1.378a1.002 1.002 0 01-.001-1.417l-1.366-1.378c-.065-.066-.177-.035-.196.056l-.013.065-.022.711z"></path>
                            <circle cx="12" cy="12.001" r="3.734"></circle>
                        </svg>
                    </div>
                    <span className={`text-base ${isActive('/settings') ? 'font-bold' : ''}`}>Settings</span>
                </Link>
            </nav>

            <div className="mb-4">
                <button onClick={logout} className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition w-full text-left">
                    <span className="text-base">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
