import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth'; // We'll create this hook helper

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, user } = useAuth();
    const navigate = useNavigate();



    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(email, password);
        if (success) navigate('/');
    };

    return (
        <div className="h-screen flex items-center justify-center bg-transparent">
            <div className="w-full max-w-xs sm:max-w-sm bg-black/30 backdrop-blur-md border border-white/20 p-8 rounded shadow-lg text-white">
                <h1 className="text-4xl font-serif text-center mb-8">Instagram-clone</h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                        type="email"
                        placeholder="Email"
                        className="border border-white/20 p-2 rounded text-xs bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:border-white/50"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="border border-white/20 p-2 rounded text-xs bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:border-white/50"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded font-semibold text-sm mt-2 disabled:opacity-50 transition"
                        disabled={!email || !password}
                    >
                        Log In
                    </button>
                </form>

                <div className="flex items-center my-4">
                    <div className="h-px bg-white/20 flex-1"></div>
                    <span className="px-4 text-xs text-gray-300 font-semibold">OR</span>
                    <div className="h-px bg-white/20 flex-1"></div>
                </div>

                <div className="text-center">
                    <p className="text-xs text-blue-400 font-semibold cursor-pointer">Log in with Facebook</p>
                    <p className="text-xs text-blue-400 mt-3 cursor-pointer">Forgot password?</p>
                </div>

            </div>

            <div className="absolute bottom-4 w-full max-w-xs sm:max-w-sm">
                <div className="bg-black/30 backdrop-blur-md border border-white/20 p-4 text-center rounded text-white">
                    <span className="text-sm">Don't have an account? <Link to="/signup" className="text-blue-500 font-semibold">Sign up</Link></span>
                </div>
            </div>
        </div>
    );
};

export default Login;
