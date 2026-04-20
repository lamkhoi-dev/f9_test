import React, { useState, useEffect } from 'react';

const OnlineStatus: React.FC = () => {
  const [onlineCount, setOnlineCount] = useState(63);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate fluctuation in online users
      setOnlineCount(prevCount => {
        const fluctuation = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
        const newCount = prevCount + fluctuation;
        return newCount > 0 ? newCount : 1; // Ensure count is always at least 1
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#1a4a44] text-white px-3 py-1.5 rounded-full flex items-center space-x-2">
      <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
      <span className="font-semibold text-sm">{onlineCount}</span>
      <span className="text-sm">Online</span>
    </div>
  );
};

export default OnlineStatus;
