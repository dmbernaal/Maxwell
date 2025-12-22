import React from 'react';

export function TinyGhost({ size = 24, className, ...props }: React.SVGProps<SVGSVGElement> & { size?: number | string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <defs>
                <linearGradient id="tinyGhostGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff99cc" />
                    <stop offset="25%" stopColor="#7bbbff" />
                    <stop offset="50%" stopColor="#6f3bf5" />
                    <stop offset="75%" stopColor="#5b2fcb" />
                    <stop offset="100%" stopColor="#26153f" />
                </linearGradient>
            </defs>
            <path
                d="M47.5 23V49.5C47.5 56 42.5 60 36 60C32 60 28.5 58 26 55C24 52.5 20.5 52.5 18 55C15.5 57 12.5 58 9 58C3.5 58 0 54 0 49V23C0 10.5 10.5 0 23 0C35.5 0 47.5 10.5 47.5 23Z"
                fill="url(#tinyGhostGradient)"
            />
            {/* Eyes */}
            <ellipse cx="16" cy="24" rx="4" ry="6" fill="white" />
            <ellipse cx="32" cy="24" rx="4" ry="6" fill="white" />
        </svg>
    );
}
