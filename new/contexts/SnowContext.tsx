import React, { useState, useEffect, ReactNode } from 'react';
import { SnowContext, useSnow } from './snow-context-utils';

export { useSnow };

export const SnowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to false (Snowing is disabled by default)
  const [isSnowing, setIsSnowing] = useState<boolean>(() => {
    const saved = localStorage.getItem('isSnowing');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('isSnowing', JSON.stringify(isSnowing));
  }, [isSnowing]);

  const toggleSnow = () => setIsSnowing((prev) => !prev);

  return (
    <SnowContext.Provider value={{ isSnowing, toggleSnow }}>
      {children}
      {isSnowing && (
        <>
            <style>{`
                #christmas-character {
                    position: fixed;
                    width: 120px;
                    top: 50%;
                    left: -150px;
                    transform: translateY(-50%);
                    animation: flyAcross 10s linear infinite;
                    pointer-events: none;
                    z-index: 9998;
                }

                @keyframes flyAcross {
                    0%   { left: -150px; transform: translateY(-50%) scale(1); }
                    50%  { transform: translateY(-70%) scale(1.1); }
                    100% { left: 110%; transform: translateY(-50%) scale(1); }
                }
            `}</style>
            <img id="christmas-character" src="https://i.ibb.co/G3tP69Pt/ognoel.gif" alt="Christmas Character" />
            
            <div className="snowflakes" aria-hidden="true">
                <div className="snowflake">❅</div>
                <div className="snowflake">❆</div>
                <div className="snowflake">❅</div>
                <div className="snowflake">❆</div>
                <div className="snowflake">❅</div>
                <div className="snowflake">❆</div>
                <div className="snowflake">❅</div>
                <div className="snowflake">❆</div>
                <div className="snowflake">❅</div>
                <div className="snowflake">❆</div>
            </div>
        </>
      )}
    </SnowContext.Provider>
  );
};