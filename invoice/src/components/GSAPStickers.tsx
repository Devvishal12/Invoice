import React, { useRef, useLayoutEffect } from "react";
import gsap from "gsap";

/**
 * GSAPStickers: Animated shapes for visual accents.
 * Used in hero/preview.
 */
const stickers = [
  {
    key: "star",
    className:
      "w-8 h-8 absolute left-0 top-0 rotate-[-12deg] drop-shadow-lg",
    color: "#ffd53b",
    svg: (
      <svg viewBox="0 0 48 48" fill="none">
        <path
          d="M24 4l6.9 14.4 15.6 2.1-11.2 11 2.7 15.5L24 37l-14 7.9 2.7-15.5-11.2-11L17.1 18.4z"
          fill="#ffd53b"
          stroke="#cb60b6"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    key: "note",
    className:
      "w-10 h-10 absolute right-2 bottom-0 rotate-3 mix-blend-normal shadow-md",
    color: "#bae7ff",
    svg: (
      <svg viewBox="0 0 40 40" fill="none">
        <rect
          x="8"
          y="8"
          width="24"
          height="24"
          rx="5"
          fill="#bae7ff"
          stroke="#351c75"
          strokeWidth="2"
        />
        <rect
          x="12"
          y="13"
          width="16"
          height="3"
          rx="1.5"
          fill="#351c75"
        />
        <rect
          x="12"
          y="19"
          width="10"
          height="2"
          rx="1"
          fill="#351c75"
        />
      </svg>
    ),
  },
  {
    key: "spark",
    className:
      "w-8 h-8 absolute left-8 bottom-7 rotate-12 opacity-90",
    color: "#cb60b6",
    svg: (
      <svg viewBox="0 0 32 32" fill="none">
        <path
          d="M16 3V29M3 16H29"
          stroke="#cb60b6"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "plus",
    className:
      "w-6 h-6 absolute right-10 top-2 rotate-[-10deg] opacity-80",
    color: "#8565f1",
    svg: (
      <svg width="24" height="24" fill="none">
        <path d="M12 4v16M4 12h16" stroke="#8565f1" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function GSAPStickers() {
  const refs = useRef([]);
  useLayoutEffect(() => {
    refs.current.forEach((el, i) => {
      if (!el) return;
      gsap.fromTo(
        el,
        { y: -20 * i, opacity: 0, rotate: -10 + 10 * i },
        {
          y: `+=${8 + 6 * i}`,
          opacity: 1,
          rotate: `+=${4 - 3 * i}`,
          duration: 0.9 + 0.4 * i,
          delay: 0.05 * i,
          ease: "back.out(2)",
          onComplete: () => {
            gsap.to(el, {
              y: `+=${Math.random() > .5 ? 4 : -6}`,
              repeat: -1,
              yoyo: true,
              duration: 2.3 + i,
              ease: "sine.inOut",
            });
          },
        }
      );
    });
  }, []);
  return (
    <div className="relative w-28 h-28">
      {stickers.map((s, i) => (
        <span
          key={s.key}
          ref={el => (refs.current[i] = el)}
          className={s.className}
          style={{ zIndex: 2 }}
        >
          {s.svg}
        </span>
      ))}
    </div>
  );
}
