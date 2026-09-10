"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Wrapper за снимкови контейнери: снимката леко "се приближава" (scale
// 1.08 -> 1) едновременно с fade-in при влизане в изгледа. Ползва само
// transform/opacity (GPU-compositing, без layout reflow), за да не влияе
// на позицията на останалото съдържание и да не чупи скрола на страницата.
export function ImageReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.08 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
