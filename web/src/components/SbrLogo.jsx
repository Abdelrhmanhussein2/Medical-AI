import React from 'react';

export default function SbrLogo({ size = 40, showText = false, textClass = '', dark = false }) {
  // We use the pixel-perfect transparent PNG assets:
  // - /logo_full.png (is logo_last_full.png, which has just S-mark + SBR AI wordmark)
  // - /logo_icon.png (is Icone.png, which has just the S-mark icon)
  const logoSrc = showText ? '/logo_full.png' : '/logo_icon.png';

  return (
    <div className={`flex flex-col select-none ${textClass}`}>
      <div className="flex items-center">
        <img
          src={logoSrc}
          alt="SBR AI"
          style={{
            height: `${size}px`,
            width: 'auto',
            objectFit: 'contain',
            display: 'block'
          }}
          className="max-w-none"
        />
      </div>
      {showText && (
        <span
          style={{
            fontSize: '8px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginTop: '3px',
            marginLeft: '4px',
            color: dark ? '#94A3B8' : '#475569',
            opacity: 0.8,
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            whiteSpace: 'nowrap'
          }}
        >
          Smarter Care. Better Outcomes.
        </span>
      )}
    </div>
  );
}
