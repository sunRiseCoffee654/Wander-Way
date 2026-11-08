"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap-setup";

interface ReadinessGaugeProps {
  score?: number;
}

export function ReadinessGauge({ score = 85 }: ReadinessGaugeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: score,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          if (textRef.current) {
            textRef.current.textContent = `${Math.round(obj.val)}%`;
          }
        },
      });

      if (pathRef.current) {
        gsap.fromTo(
          pathRef.current,
          { strokeDasharray: "0, 100" },
          { strokeDasharray: `${score}, 100`, duration: 1.2, ease: "power2.out" }
        );
      }
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="relative size-16 flex items-center justify-center shrink-0">
      <svg className="size-16 transform -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-surface-container-high"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
        />
        <path
          ref={pathRef}
          className="text-tertiary"
          strokeDasharray={`${score}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
      <span ref={textRef} className="absolute text-xs font-bold text-on-surface">
        {score}%
      </span>
    </div>
  );
}
