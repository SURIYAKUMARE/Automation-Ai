"use client";

import * as React from "react";
import { SocialPlatform } from "@/types";
import { cn } from "@/lib/utils";

export interface PlatformIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  platform: SocialPlatform | string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  useJpg?: boolean;
}

const SIZE_MAP: Record<string, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
};

const PLATFORM_NAMES: Record<string, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  instagram: "Instagram",
};

export function PlatformIcon({
  platform,
  size,
  className,
  useJpg = false,
  alt,
  ...props
}: PlatformIconProps) {
  const normPlatform = (platform || "").toLowerCase().trim();
  const [src, setSrc] = React.useState(`/platforms/${normPlatform}.${useJpg ? "jpg" : "png"}`);
  const label = PLATFORM_NAMES[normPlatform] || normPlatform;

  React.useEffect(() => {
    setSrc(`/platforms/${normPlatform}.${useJpg ? "jpg" : "png"}`);
  }, [normPlatform, useJpg]);

  return (
    <img
      src={src}
      alt={alt || `${label} logo`}
      className={cn(
        "object-contain shrink-0 select-none inline-block rounded-md",
        size ? SIZE_MAP[size] : "",
        className
      )}
      loading="lazy"
      onError={() => {
        if (!src.endsWith(".jpg")) {
          setSrc(`/platforms/${normPlatform}.jpg`);
        }
      }}
      {...props}
    />
  );
}
