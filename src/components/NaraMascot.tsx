"use client";

import React, { useState } from "react";

export type MascotPose = "idle" | "focus" | "thinking" | "success" | "error" | "sleep";

interface NaraMascotProps {
  pose?: MascotPose;
  size?: "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  alt?: string;
  showShadow?: boolean;
}

export const NaraMascot: React.FC<NaraMascotProps> = ({
  pose = "idle",
  size = "md",
  className = "",
  alt,
  showShadow = true,
}) => {
  const [imgError, setImgError] = useState(false);

  // Size mapping
  let dimension = 140;
  if (typeof size === "number") {
    dimension = size;
  } else {
    switch (size) {
      case "sm":
        dimension = 72;
        break;
      case "md":
        dimension = 130;
        break;
      case "lg":
        dimension = 190;
        break;
      case "xl":
        dimension = 260;
        break;
    }
  }

  const defaultAlt = `Maskot Nara — Pose ${pose}`;

  // SVG Fallback Silhouettes carefully crafted to reflect the elegant white fox with black paws & inner ears
  const renderFallbackSvg = () => {
    switch (pose) {
      case "focus":
        // Fox reading a book
        return (
          <svg
            viewBox="0 0 200 200"
            width={dimension}
            height={dimension}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-sm select-none"
          >
            {/* Soft Shadow */}
            {showShadow && <ellipse cx="100" cy="180" rx="65" ry="12" fill="currentColor" className="text-black/10 dark:text-white/5" />}
            {/* Tail */}
            <path
              d="M135 155 C165 150 185 130 185 105 C185 80 165 85 150 100 C140 110 135 135 135 155 Z"
              fill="#F4F4F5"
              stroke="#D4D4D8"
              strokeWidth="2"
            />
            {/* Body */}
            <path
              d="M80 160 C70 140 75 110 90 95 C105 85 125 90 130 115 C135 140 120 165 95 165 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            {/* Ears */}
            <path d="M78 65 L60 25 L88 45 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M75 58 L65 32 L83 47 Z" fill="#18181B" />
            <path d="M112 65 L130 25 L102 45 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M115 58 L125 32 L107 47 Z" fill="#18181B" />
            {/* Head */}
            <path
              d="M65 75 C60 85 75 100 95 102 C115 100 130 85 125 75 C120 62 70 62 65 75 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            {/* Focused Eyes (narrow/reading) */}
            <path d="M80 82 Q87 86 92 83" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M108 83 Q113 86 120 82" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="93" r="2.5" fill="#18181B" />
            {/* Book held in paws */}
            <path
              d="M75 125 L100 135 L125 125 L125 150 L100 160 L75 150 Z"
              fill="#2563EB"
              stroke="#1D4ED8"
              strokeWidth="2"
            />
            <path d="M100 135 L100 160" stroke="#FFFFFF" strokeWidth="1.5" />
            {/* Book text lines */}
            <path d="M82 136 L94 141 M82 143 L94 148" stroke="#DBEAFE" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M106 141 L118 136 M106 148 L118 143" stroke="#DBEAFE" strokeWidth="1.5" strokeLinecap="round" />
            {/* Dark paws holding book */}
            <ellipse cx="80" cy="130" rx="6" ry="5" fill="#18181B" />
            <ellipse cx="120" cy="130" rx="6" ry="5" fill="#18181B" />
          </svg>
        );

      case "thinking":
        // Fox in deep thought with question mark
        return (
          <svg
            viewBox="0 0 200 200"
            width={dimension}
            height={dimension}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-sm select-none"
          >
            {showShadow && <ellipse cx="100" cy="180" rx="60" ry="12" fill="currentColor" className="text-black/10 dark:text-white/5" />}
            {/* Big bushy tail wrapped around */}
            <path
              d="M110 165 C145 165 175 150 175 125 C175 100 150 105 135 125 C125 140 115 155 90 165 Z"
              fill="#F4F4F5"
              stroke="#D4D4D8"
              strokeWidth="2"
            />
            {/* Body */}
            <path
              d="M75 165 C65 145 70 120 85 105 C100 95 120 100 125 125 C130 150 115 168 90 168 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            {/* Ears */}
            <path d="M72 65 L52 25 L82 45 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M69 58 L57 32 L77 47 Z" fill="#18181B" />
            <path d="M106 65 L126 25 L96 45 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M109 58 L121 32 L101 47 Z" fill="#18181B" />
            {/* Head (tilted cutely) */}
            <path
              d="M60 75 C55 87 70 102 90 104 C110 102 125 87 120 75 C115 62 65 62 60 75 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            {/* Curious Eyes */}
            <circle cx="78" cy="82" r="4.5" fill="#18181B" />
            <circle cx="80" cy="80" r="1.5" fill="#FFFFFF" />
            <circle cx="102" cy="82" r="4.5" fill="#18181B" />
            <circle cx="104" cy="80" r="1.5" fill="#FFFFFF" />
            <circle cx="90" cy="94" r="2.5" fill="#18181B" />
            {/* Paw touching chin */}
            <ellipse cx="96" cy="105" rx="6" ry="8" fill="#18181B" />
            {/* Floating question mark */}
            <g className="animate-bounce">
              <text x="135" y="60" fontSize="32" fontWeight="bold" fill="#2563EB" fontFamily="sans-serif">
                ?
              </text>
            </g>
          </svg>
        );

      case "success":
        // Fox cheering with paws up and sparkle
        return (
          <svg
            viewBox="0 0 200 200"
            width={dimension}
            height={dimension}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-sm select-none"
          >
            {showShadow && <ellipse cx="100" cy="180" rx="65" ry="12" fill="currentColor" className="text-black/10 dark:text-white/5" />}
            {/* Waving tail */}
            <path
              d="M125 155 C160 145 185 120 175 90 C165 75 145 85 140 105 C135 125 125 145 110 155 Z"
              fill="#F4F4F5"
              stroke="#D4D4D8"
              strokeWidth="2"
            />
            {/* Body */}
            <path
              d="M80 165 C70 140 75 115 90 100 C105 90 125 95 130 120 C135 145 120 168 95 168 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            {/* Ears */}
            <path d="M78 62 L58 20 L88 42 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M75 55 L63 27 L83 44 Z" fill="#18181B" />
            <path d="M112 62 L132 20 L102 42 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M115 55 L127 27 L107 44 Z" fill="#18181B" />
            {/* Head */}
            <path
              d="M65 72 C60 85 75 98 95 100 C115 98 130 85 125 72 C120 60 70 60 65 72 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            {/* Happy squinting eyes (curved arcs) */}
            <path d="M75 80 Q82 74 89 80" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
            <path d="M101 80 Q108 74 115 80" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
            {/* Happy open smile */}
            <path d="M90 92 Q95 98 100 92" stroke="#18181B" strokeWidth="2.5" fill="#EF4444" strokeLinecap="round" />
            {/* Cheering paws */}
            <ellipse cx="65" cy="115" rx="7" ry="6" fill="#18181B" />
            <ellipse cx="125" cy="115" rx="7" ry="6" fill="#18181B" />
            {/* Golden Sparkles */}
            <path d="M145 45 L149 35 L153 45 L163 49 L153 53 L149 63 L145 53 L135 49 Z" fill="#EAB308" />
            <path d="M50 55 L52 48 L54 55 L61 57 L54 59 L52 66 L50 59 L43 57 Z" fill="#EAB308" />
          </svg>
        );

      case "sleep":
        // Fox curled up asleep with "z z z"
        return (
          <svg
            viewBox="0 0 200 200"
            width={dimension}
            height={dimension}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-sm select-none"
          >
            {showShadow && <ellipse cx="100" cy="165" rx="75" ry="12" fill="currentColor" className="text-black/10 dark:text-white/5" />}
            {/* Big fluffy curled tail covering body */}
            <path
              d="M45 145 C35 110 70 85 110 85 C155 85 175 115 165 145 C155 165 120 165 95 162 C70 160 48 158 45 145 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            <path
              d="M110 85 C145 85 170 105 165 135 C160 155 135 155 110 150 C80 145 85 100 110 85 Z"
              fill="#F4F4F5"
              stroke="#D4D4D8"
              strokeWidth="2"
            />
            {/* Head resting peacefully */}
            <ellipse cx="75" cy="140" rx="22" ry="16" fill="#FFFFFF" stroke="#E4E4E7" strokeWidth="2" />
            {/* Sleeping eye */}
            <path d="M68 142 Q75 147 82 142" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="60" cy="142" r="2.5" fill="#18181B" />
            {/* Cute Ear pinned down */}
            <path d="M78 128 L88 112 L94 126 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M81 125 L88 116 L91 125 Z" fill="#18181B" />
            {/* Soft sleeping zzz */}
            <text x="135" y="70" fontSize="18" fontWeight="bold" fill="#3B82F6" opacity="0.9" fontFamily="sans-serif">
              z
            </text>
            <text x="148" y="55" fontSize="22" fontWeight="bold" fill="#2563EB" opacity="0.8" fontFamily="sans-serif">
              z
            </text>
            <text x="163" y="40" fontSize="26" fontWeight="bold" fill="#1D4ED8" opacity="0.7" fontFamily="sans-serif">
              z
            </text>
          </svg>
        );

      case "error":
        // Fox with supportive, sympathetic gesture: "Ayo coba lagi!"
        return (
          <svg
            viewBox="0 0 200 200"
            width={dimension}
            height={dimension}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-sm select-none"
          >
            {showShadow && <ellipse cx="100" cy="180" rx="60" ry="12" fill="currentColor" className="text-black/10 dark:text-white/5" />}
            {/* Tail */}
            <path
              d="M125 160 C155 155 175 135 170 115 C165 95 145 105 135 125 C128 140 120 152 105 160 Z"
              fill="#F4F4F5"
              stroke="#D4D4D8"
              strokeWidth="2"
            />
            {/* Body */}
            <path
              d="M75 165 C65 145 70 120 85 105 C100 95 120 100 125 125 C130 150 115 168 90 168 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            {/* Ears (one drooped slightly in sympathy) */}
            <path d="M72 65 L50 30 L80 48 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M69 58 L55 35 L76 49 Z" fill="#18181B" />
            <path d="M106 65 L130 35 L98 50 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M109 58 L124 40 L102 51 Z" fill="#18181B" />
            {/* Head */}
            <path
              d="M62 75 C57 88 72 103 92 104 C112 103 127 88 122 75 C117 62 67 62 62 75 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            {/* Kind, reassuring eyes */}
            <ellipse cx="80" cy="82" rx="4" ry="5" fill="#18181B" />
            <circle cx="82" cy="80" r="1.5" fill="#FFFFFF" />
            <ellipse cx="104" cy="82" rx="4" ry="5" fill="#18181B" />
            <circle cx="106" cy="80" r="1.5" fill="#FFFFFF" />
            <circle cx="92" cy="92" r="2.5" fill="#18181B" />
            {/* Small comforting smile */}
            <path d="M88 98 Q92 101 96 98" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
            {/* Encouraging fist/paw */}
            <ellipse cx="118" cy="120" rx="7" ry="6" fill="#18181B" />
            {/* Sweat drop / badge */}
            <path d="M125 70 C125 70 120 78 123 81 C126 84 130 82 129 78 Z" fill="#60A5FA" />
          </svg>
        );

      case "idle":
      default:
        // Elegant white fox sitting calmly looking forward
        return (
          <svg
            viewBox="0 0 200 200"
            width={dimension}
            height={dimension}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-sm select-none"
          >
            {/* Shadow */}
            {showShadow && <ellipse cx="100" cy="180" rx="65" ry="12" fill="currentColor" className="text-black/10 dark:text-white/5" />}
            {/* Tail */}
            <path
              d="M115 160 C155 155 185 130 180 100 C175 75 150 85 140 110 C130 135 120 155 105 162 Z"
              fill="#F4F4F5"
              stroke="#D4D4D8"
              strokeWidth="2"
            />
            {/* Body */}
            <path
              d="M75 165 C65 140 70 110 85 95 C100 85 120 90 125 115 C130 145 115 168 90 168 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            {/* Distinctive Dark Front Paws */}
            <path d="M78 140 L76 172 C76 175 80 176 83 174 L86 140 Z" fill="#18181B" />
            <path d="M96 140 L94 172 C94 175 98 176 101 174 L104 140 Z" fill="#18181B" />
            {/* Ears with black tips */}
            <path d="M75 62 L55 20 L85 42 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M72 55 L60 27 L80 44 Z" fill="#18181B" />
            <path d="M109 62 L129 20 L99 42 Z" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
            <path d="M112 55 L124 27 L104 44 Z" fill="#18181B" />
            {/* Head */}
            <path
              d="M62 72 C57 85 72 100 92 102 C112 100 127 85 122 72 C117 60 67 60 62 72 Z"
              fill="#FFFFFF"
              stroke="#E4E4E7"
              strokeWidth="2"
            />
            {/* Intelligent, Calm Eyes */}
            <ellipse cx="80" cy="80" rx="4.5" ry="5.5" fill="#18181B" />
            <circle cx="82" cy="78" r="1.5" fill="#FFFFFF" />
            <ellipse cx="104" cy="80" rx="4.5" ry="5.5" fill="#18181B" />
            <circle cx="106" cy="78" r="1.5" fill="#FFFFFF" />
            {/* Nose */}
            <circle cx="92" cy="91" r="2.5" fill="#18181B" />
            {/* Subtle smile */}
            <path d="M89 96 Q92 98 95 96" stroke="#18181B" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`inline-flex flex-col items-center justify-center relative transition-transform duration-200 ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      {!imgError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/mascot/${pose}.png`}
          alt={alt || defaultAlt}
          width={dimension}
          height={dimension}
          className="object-contain select-none"
          onError={() => setImgError(true)}
        />
      ) : (
        renderFallbackSvg()
      )}
    </div>
  );
};

export default NaraMascot;
