import React from 'react';

interface StreamCoinProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const StreamCoin: React.FC<StreamCoinProps> = ({ className = '', size = 'md' }) => {
    const sizeClasses = {
        'sm': 'w-4 h-4',
        'md': 'w-6 h-6',
        'lg': 'w-8 h-8',
        'xl': 'w-12 h-12'
    };

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            className={`${sizeClasses[size]} inline-block align-middle ${className}`}
            fill="none"
        >
            {/* Outer Ring / Edge */}
            <circle cx="32" cy="32" r="30" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />

            {/* Inner Gold Face */}
            <circle cx="32" cy="32" r="26" fill="url(#coinGradient)" />

            {/* Inner Ring Detail */}
            <circle cx="32" cy="32" r="22" stroke="#B45309" strokeWidth="1" opacity="0.5" strokeDasharray="2 2" />

            {/* Embossed "S" */}
            <text
                x="32"
                y="43"
                fontFamily="serif"
                fontSize="38"
                fontWeight="bold"
                fill="#78350F"
                textAnchor="middle"
                style={{ filter: 'drop-shadow(1px 1px 0px rgba(255,255,255,0.4))' }}
            >
                S
            </text>

            {/* Shine/Reflection */}
            <path d="M32 6 A 26 26 0 0 1 58 32" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

            <defs>
                <linearGradient id="coinGradient" x1="10" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FCD34D" />
                    <stop offset="0.5" stopColor="#F59E0B" />
                    <stop offset="1" stopColor="#D97706" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export default StreamCoin;
