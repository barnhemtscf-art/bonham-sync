import React from 'react';
import { BearAppearanceConfig } from '../types/barnhem';
import { BEAR_COLOR_PALETTE, resolveBearAppearance } from '../utils/bearStyle';

interface PeekingBearMascotProps {
  appearance?: BearAppearanceConfig | null;
  className?: string;
}

export const PeekingBearMascot: React.FC<PeekingBearMascotProps> = ({
  appearance,
  className = '',
}) => {
  const style = resolveBearAppearance(appearance);
  const palette = BEAR_COLOR_PALETTE[style.outfitColor];

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 176 134"
      data-testid="peeking-bear-svg"
      data-glasses={style.glasses ? 'on' : 'off'}
      data-hat={style.hat}
      data-outfit={style.outfit}
      data-prop={style.prop}
      className={className}
    >
      {/* Wireless Headphones band behind ears (if selected) */}
      {style.prop === 'headphones' && (
        <path
          d="M36 49 C36 16, 140 16, 140 49"
          fill="none"
          stroke={palette.dark}
          strokeWidth="6.5"
          strokeLinecap="round"
        />
      )}

      {/* Left & Right round ears */}
      <circle cx="48" cy="30" r="14.5" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.6" />
      <circle cx="48" cy="30" r="8" fill="#F9DEC9" />
      <circle cx="128" cy="30" r="14.5" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.6" />
      <circle cx="128" cy="30" r="8" fill="#F9DEC9" />

      {/* Headphone ear cups */}
      {style.prop === 'headphones' && (
        <>
          <rect
            x="29"
            y="40"
            width="13"
            height="23"
            rx="6"
            fill={palette.accent}
            stroke="#5B4031"
            strokeWidth="2.2"
          />
          <rect
            x="134"
            y="40"
            width="13"
            height="23"
            rx="6"
            fill={palette.accent}
            stroke="#5B4031"
            strokeWidth="2.2"
          />
        </>
      )}

      {/* Bear upper body & Outfit */}
      {style.outfit === 'hoodie' && (
        <>
          <path
            d="M42 121 C42 90, 58 78, 88 78 C118 78, 134 90, 134 121 Z"
            fill={palette.main}
            stroke="#5B4031"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          {/* Hoodie neck rim & drawstrings */}
          <path
            d="M65 80 Q88 94 111 80"
            fill="none"
            stroke="#5B4031"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line x1="80" y1="88" x2="79" y2="104" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="96" y1="88" x2="97" y2="104" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {style.outfit === 'overall' && (
        <>
          <path
            d="M42 121 C42 90, 58 78, 88 78 C118 78, 134 90, 134 121 Z"
            fill="#FFF9F2"
            stroke="#5B4031"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path
            d="M52 121 L55 89 L121 89 L124 121 Z"
            fill={palette.dark}
            stroke="#5B4031"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <rect x="61" y="80" width="9" height="14" rx="3" fill={palette.dark} stroke="#5B4031" strokeWidth="2.2" />
          <rect x="106" y="80" width="9" height="14" rx="3" fill={palette.dark} stroke="#5B4031" strokeWidth="2.2" />
        </>
      )}

      {style.outfit === 'blazer' && (
        <>
          <path
            d="M42 121 C42 90, 58 78, 88 78 C118 78, 134 90, 134 121 Z"
            fill={palette.dark}
            stroke="#5B4031"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path
            d="M73 80 L88 106 L103 80 Z"
            fill="#FFF9F2"
            stroke="#5B4031"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <path d="M68 80 L79 102 L72 103 L62 84 Z" fill={palette.main} stroke="#5B4031" strokeWidth="1.9" strokeLinejoin="round" />
          <path d="M108 80 L97 102 L104 103 L114 84 Z" fill={palette.main} stroke="#5B4031" strokeWidth="1.9" strokeLinejoin="round" />
        </>
      )}

      {style.outfit === 'cardigan_scarf' && (
        <>
          <path
            d="M42 121 C42 90, 58 78, 88 78 C118 78, 134 90, 134 121 Z"
            fill={palette.main}
            stroke="#5B4031"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path
            d="M72 80 L88 98 L104 80 Z"
            fill="#FFF9F2"
            stroke="#5B4031"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* Fashionable yellow neckerchief / scarf (when enabled) */}
      {style.hasScarf && (
        <>
          <path
            d="M57 78 Q88 92 119 78 Q121 87 112 91 Q88 100 64 91 Q55 87 57 78 Z"
            fill="#FCE08B"
            stroke="#5B4031"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M64 87 L56 101 L68 103 L73 91 Z"
            fill="#F7D06B"
            stroke="#5B4031"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="67" cy="88" r="5" fill="#FCE08B" stroke="#5B4031" strokeWidth="2.2" />
        </>
      )}

      {/* Bear chubby head (creamy beige fur) */}
      <ellipse cx="88" cy="54" rx="43" ry="33" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.6" />

      {/* Cute tuft of fur when no hat */}
      {style.hat === 'none' && (
        <path
          d="M84 21 Q87 16 90 21 Q93 17 94 22"
          fill="none"
          stroke="#5B4031"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}

      {/* Hat Styles */}
      {(style.hat === 'beret_bow' || style.hat === 'beret') && (
        <>
          <path
            d="M84 9 C86 4, 91 4, 93 9"
            fill="none"
            stroke="#5B4031"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M55 28 C53 15, 72 8, 92 9 C112 10, 125 18, 121 29 C106 23, 71 23, 55 28 Z"
            fill="#F6E2CC"
            stroke="#5B4031"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M57 28 Q88 21 119 28"
            fill="none"
            stroke="#5B4031"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          {style.hat === 'beret_bow' && (
            <>
              <path
                d="M111 19 L103 14 L105 22 Z M111 19 L120 15 L117 23 Z"
                fill={palette.accent}
                stroke="#5B4031"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="111" cy="19" r="2.6" fill={palette.main} stroke="#5B4031" strokeWidth="1.6" />
            </>
          )}
        </>
      )}

      {style.hat === 'headband_bow' && (
        <>
          <path
            d="M53 31 Q88 18 123 31"
            fill="none"
            stroke={palette.accent}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M108 20 L98 13 L100 24 Z M108 20 L119 15 L115 26 Z"
            fill={palette.accent}
            stroke="#5B4031"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="108" cy="20" r="3" fill={palette.main} stroke="#5B4031" strokeWidth="1.8" />
        </>
      )}

      {style.hat === 'cap' && (
        <>
          <path
            d="M55 28 C57 12, 119 12, 121 28 Z"
            fill={palette.dark}
            stroke="#5B4031"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M53 28 Q88 20 128 29 Q114 34 55 29 Z"
            fill={palette.accent}
            stroke="#5B4031"
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <circle cx="88" cy="14" r="2.3" fill="#FFFFFF" stroke="#5B4031" strokeWidth="1.5" />
        </>
      )}

      {/* Rosy cheeks */}
      <ellipse cx="59" cy="63" rx="7" ry="4.2" fill="#F4A4B8" opacity="0.9" />
      <ellipse cx="117" cy="63" rx="7" ry="4.2" fill="#F4A4B8" opacity="0.9" />

      {/* Cute feminine eyes with subtle lashes */}
      <path d="M62 50 L59 47.5 M63 53 L59.5 52" stroke="#3D2A20" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M114 50 L117 47.5 M113 53 L116.5 52" stroke="#3D2A20" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="71" cy="54" r="3.9" fill="#3D2A20" />
      <circle cx="72.4" cy="52.5" r="1.4" fill="#FFFFFF" />
      <circle cx="105" cy="54" r="3.9" fill="#3D2A20" />
      <circle cx="106.4" cy="52.5" r="1.4" fill="#FFFFFF" />

      {/* Cream muzzle, button nose & kawaii 'w' smile */}
      <ellipse cx="88" cy="63" rx="12.5" ry="9" fill="#FDF5EC" />
      <ellipse cx="88" cy="59.5" rx="4" ry="2.8" fill="#4A3224" />
      <path
        d="M88 62.3 L88 64.5 M82.8 65 Q85.4 68.2 88 64.8 Q90.6 68.2 93.2 65"
        fill="none"
        stroke="#4A3224"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Chic round glasses (when glasses === true) */}
      {style.glasses && (
        <g data-testid="bear-glasses-layer">
          <circle cx="70.5" cy="54" r="11.5" fill="#FFFFFF" fillOpacity="0.28" stroke="#6D4438" strokeWidth="2.4" />
          <circle cx="105.5" cy="54" r="11.5" fill="#FFFFFF" fillOpacity="0.28" stroke="#6D4438" strokeWidth="2.4" />
          <path d="M82 53.5 Q88 51 94 53.5" fill="none" stroke="#6D4438" strokeWidth="2.3" strokeLinecap="round" />
          <line x1="46" y1="51" x2="59" y2="53.5" stroke="#6D4438" strokeWidth="2.3" strokeLinecap="round" />
          <line x1="117" y1="53.5" x2="130" y2="51" stroke="#6D4438" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M64 48.5 L67.5 45.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <path d="M99 48.5 L102.5 45.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
        </g>
      )}

      {/* Left & Right arms */}
      <ellipse cx="44" cy="107" rx="11" ry="8" transform="rotate(-18 44 107)" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.5" />
      <ellipse cx="132" cy="107" rx="11" ry="8" transform="rotate(18 132 107)" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.5" />

      {/* Prop: Laptop */}
      {style.prop === 'laptop' && (
        <g data-testid="bear-prop-laptop">
          <rect
            x="51"
            y="83"
            width="74"
            height="38"
            rx="7.5"
            fill="#F5F7FB"
            stroke="#5B4031"
            strokeWidth="2.6"
          />
          <rect x="56" y="88" width="64" height="28" rx="4.5" fill="#E3ECF7" />
          <path
            d="M88 93.5 L90.6 98.8 L96.4 99.6 L92.2 103.7 L93.2 109.5 L88 106.7 L82.8 109.5 L83.8 103.7 L79.6 99.6 L85.4 98.8 Z"
            fill="#FACC15"
            stroke="#B45309"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M111 94 C111 92.5, 113 92, 114 93.2 C115 92, 117 92.5, 117 94 C117 96, 114 98, 114 98 C114 98, 111 96, 111 94 Z"
            fill="#F48FB1"
          />
          <rect
            x="44"
            y="118"
            width="88"
            height="9"
            rx="4.5"
            fill="#D4DFEE"
            stroke="#5B4031"
            strokeWidth="2.5"
          />
          <line x1="79" y1="122.5" x2="97" y2="122.5" stroke="#7A8A9E" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {/* Prop: Tablet */}
      {style.prop === 'tablet' && (
        <g data-testid="bear-prop-tablet">
          <rect
            x="60"
            y="82"
            width="56"
            height="43"
            rx="7"
            fill="#3B2F2A"
            stroke="#5B4031"
            strokeWidth="2.4"
          />
          <rect x="64" y="86" width="48" height="34" rx="4" fill="#E7FAF6" />
          <path
            d="M88 94 L90.2 98.5 L95 99.2 L91.5 102.6 L92.3 107.4 L88 105.1 L83.7 107.4 L84.5 102.6 L81 99.2 L85.8 98.5 Z"
            fill="#FACC15"
            stroke="#B45309"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          {/* Tiny stylus pen */}
          <line x1="115" y1="84" x2="123" y2="108" stroke={palette.accent} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}

      {/* Center star badge when no desk device */}
      {(style.prop === 'headphones' || style.prop === 'none') && (
        <path
          d="M88 94 L90.6 99.3 L96.4 100.1 L92.2 104.2 L93.2 110 L88 107.2 L82.8 110 L83.8 104.2 L79.6 100.1 L85.4 99.3 Z"
          fill="#FACC15"
          stroke="#B45309"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      )}

      {/* Cute paws gripping the sides/border */}
      <ellipse cx="42" cy="119" rx="10" ry="7.2" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.5" />
      <ellipse cx="42" cy="120.2" rx="4.8" ry="3" fill="#F9DEC9" />
      <ellipse cx="134" cy="119" rx="10" ry="7.2" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.5" />
      <ellipse cx="134" cy="120.2" rx="4.8" ry="3" fill="#F9DEC9" />
    </svg>
  );
};
