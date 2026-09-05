"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * The one entrance animation used on this site.
 *
 * Everything moves the same short distance over the same duration, because a
 * page where each section has its own idea about easing reads as unfinished
 * rather than lively. Opacity and transform only — nothing here can reflow, so
 * the animation cannot cost layout work, and honouring `prefers-reduced-motion`
 * is a matter of returning the children as they are.
 *
 * The `data-reveal` marker exists for the case where the animation never gets
 * to run. The server-rendered HTML carries the initial `opacity: 0`, so with
 * JavaScript disabled — a reader who blocks it, a crawler that does not run it,
 * a screenshot taken before hydration — the whole page was blank apart from the
 * nav and the footer. The `<noscript>` rule in the layout keys off this
 * attribute and puts every reveal back at full opacity.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "tr";
}) {
  const still = useReducedMotion();
  const Tag = motion[as];

  if (still) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}
