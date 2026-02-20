/**
 * GlassCardPro Component
 * Premium glassmorphic card with blur effects
 * Supports light/dark modes with multiple blur levels
 */

import { motion } from "framer-motion";
import type { MotionProps } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

type BlurLevel = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
type OpacityLevel = "sm" | "md" | "lg";
type SurfaceStyle = "primary" | "secondary" | "accent" | "input";

interface GlassCardProProps extends MotionProps {
  children: ReactNode;
  blur?: BlurLevel;
  opacity?: OpacityLevel;
  surface?: SurfaceStyle;
  border?: boolean;
  shadow?: "sm" | "md" | "lg" | "xl";
  hover?: "lift" | "glow" | "scale" | "none";
  className?: string;
  style?: CSSProperties;
}

const BLUR_MAP: Record<BlurLevel, string> = {
  xs: "backdrop-blur-xs",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
  "2xl": "backdrop-blur-2xl",
  "3xl": "backdrop-blur-3xl",
};

const OPACITY_MAP: Record<OpacityLevel, string> = {
  sm: "dark:bg-opacity-50 light:bg-opacity-70",
  md: "dark:bg-opacity-70 light:bg-opacity-80",
  lg: "dark:bg-opacity-90 light:bg-opacity-90",
};

const SURFACE_MAP: Record<SurfaceStyle, string> = {
  primary: "dark:bg-slate-900 light:bg-white",
  secondary: "dark:bg-slate-800 light:bg-slate-50",
  accent: "dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900",
  input: "dark:bg-slate-900/60 light:bg-white/60",
};

const SHADOW_MAP: Record<string, string> = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};

interface HoverEffect {
  y?: number;
  scale?: number;
  boxShadow?: string;
}

const HOVER_EFFECTS: Record<string, HoverEffect> = {
  lift: {
    y: -8,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
  },
  glow: {
    boxShadow: "0 0 30px rgba(59, 130, 246, 0.3)",
  },
  scale: {
    scale: 1.02,
  },
  none: {},
};

export function GlassCardPro({
  children,
  blur = "lg",
  opacity = "md",
  surface = "primary",
  border = true,
  shadow = "md",
  hover = "lift",
  className = "",
  ...motionProps
}: GlassCardProProps) {
  const blurClass = BLUR_MAP[blur];
  const opacityClass = OPACITY_MAP[opacity];
  const surfaceClass = SURFACE_MAP[surface];
  const shadowClass = SHADOW_MAP[shadow];
  const borderClass = border ? "border border-white/10 dark:border-white/5" : "";
  const hoverEffect = HOVER_EFFECTS[hover];

  return (
    <motion.div
      whileHover={hover !== "none" ? hoverEffect : {}}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      className={`
        ${blurClass}
        ${opacityClass}
        ${surfaceClass}
        ${borderClass}
        ${shadowClass}
        rounded-2xl
        backdrop-filter
        will-change-transform
        transition-all duration-300
        ${className}
      `}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
