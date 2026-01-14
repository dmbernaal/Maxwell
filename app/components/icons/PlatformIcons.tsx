import React from 'react';

export const PLATFORM_COLORS = {
  polymarket: '#2E5CFF',
  kalshi: '#09C285',
} as const;

/** Source: https://polymarket.com/brand */
export const PolymarketLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    viewBox="51 209 123 155" 
    fill="none" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="currentColor"
      d="M173.2,363.2L51.1,328.3v-83.7l122.1-34.9V363.2z M161.4,296.2l-89.8,25.6l89.8,25.6L161.4,296.2z M62.9,260.8v51.3l89.8-25.6L62.9,260.8z M161.4,225.3L71.6,251l89.8,25.6L161.4,225.3z"
    />
  </svg>
);

/** Source: https://kalshi.com/brandkit */
export const KalshiLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M5 3H8.5V10.5L14.5 3H19L12 11.5L19.5 21H15L9.5 13V21H5V3Z" 
      fill="currentColor"
    />
  </svg>
);
