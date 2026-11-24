"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  hasStory?: boolean;
  onClick?: () => void;
}

export default function Avatar({
  src,
  alt,
  size = 77,
  className = "",
  hasStory = false,
  onClick,
}: AvatarProps) {
  const [error, setError] = useState(false);
  const initial = alt?.[0]?.toUpperCase() ?? "?";

  const avatar = (
    <div
      className={
        "relative flex-shrink-0 overflow-hidden rounded-full p-[2px] " +
        (hasStory
          ? "bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600"
          : "bg-[#dbdbdb]") +
        " " +
        className
      }
      style={{ width: size + 4, height: size + 4 }}
    >
      <div className="h-full w-full overflow-hidden rounded-full bg-white p-[2px]">
        {!error && src ? (
          <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            className="h-full w-full rounded-full bg-white object-contain"
            onError={() => setError(true)}
            unoptimized
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-500"
            style={{ fontSize: size * 0.4 }}
          >
            {initial}
          </div>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Ver stories publicados"
        className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0095f6]"
      >
        {avatar}
      </button>
    );
  }

  return avatar;
}
