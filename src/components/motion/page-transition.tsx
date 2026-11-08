"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.28, ease: [0.05, 0.7, 0.1, 1.0] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
