import React from 'react';

const Notifications = () => {
    return (
        <div className="flex min-h-screen bg-transparent justify-center p-8">
            <div className="w-full max-w-2xl text-white">
                <h1 className="text-2xl font-semibold mb-6">Notifications</h1>
                <div className="flex flex-col gap-4">
                    <div className="bg-black/40 backdrop-blur-md border border-white/20 p-4 rounded-lg flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">👋</div>
                        <div>
                            <p className="font-semibold">Welcome to Instagram!</p>
                            <span className="text-gray-400 text-sm">Just now</span>
                        </div>
                    </div>
                    <div className="p-10 text-center text-gray-400">
                        No new notifications.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
