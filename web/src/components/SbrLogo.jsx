import React from 'react';

export default function SbrLogo({ size = 32, color = 'currentColor', showText = false, textClass = 'text-on-surface' }) {
  return (
    <div className={`flex items-center gap-2 select-none ${textClass}`}>
      {/* SVG Logomark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Left Bar (shortest: 40% height) */}
        <rect
          x="15"
          y="50"
          width="16"
          height="40"
          rx="8"
          fill={color}
        />
        {/* Middle Bar (medium: 68% height) */}
        <rect
          x="42"
          y="22"
          width="16"
          height="68"
          rx="8"
          fill={color}
        />
        {/* Right Bar (tallest: 100% height) */}
        <rect
          x="69"
          y="0"
          width="16"
          height="90"
          rx="8"
          fill={color}
        />
        {/* Small Golden/Brass Accent dot representing clinical precision */}
        <circle
          cx="77"
          y="10"
          r="4.5"
          fill="#C89144"
        />
      </svg>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-none text-left">
          <div className="flex items-baseline gap-1 font-display-md">
            <span className="font-bold tracking-wide uppercase text-sm">SBR AI</span>
          </div>
          <span className="text-[8px] tracking-tight opacity-75 uppercase font-medium mt-0.5">Clinical Note Agent</span>
        </div>
      )}
    </div>
  );
}
