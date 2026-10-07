import React, { useState, useEffect } from 'react';
import { BiSearch } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import api from '../services/api';


const Search = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.trim()) {
                setLoading(true);
                try {
                    const { data } = await api.get(`/users/search?q=${query}`);
                    setResults(data);
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    return (
        <div className="flex bg-transparent min-h-screen p-8 justify-center">
            <div className="w-full max-w-xl text-white">
                <h1 className="text-2xl font-semibold mb-6">Search</h1>

                <div className="relative mb-8">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BiSearch className="text-gray-400 text-xl" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-lg focus:outline-none focus:bg-white/20 border border-white/20 focus:border-white/50 text-white placeholder-gray-400 transition-colors"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-4">
                    {loading && <div className="text-gray-500 text-center">Searching...</div>}

                    {!loading && results.length === 0 && query && (
                        <div className="text-gray-500 text-center">No users found.</div>
                    )}

                    {results.map((user) => (
                        <Link to={`/profile/${user.username}`} key={user._id} className="flex items-center justify-between p-3 hover:bg-white/10 rounded-lg transition border border-transparent hover:border-white/10">
                            <div className="flex items-center gap-3">
                                <img
                                    src={user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                    alt={user.username}
                                    className="w-12 h-12 rounded-full object-cover border border-white/20"
                                />
                                <div>
                                    <div className="font-semibold text-sm text-white">{user.username}</div>
                                    <div className="text-gray-400 text-sm">{user.bio || 'No bio available'}</div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Search;
