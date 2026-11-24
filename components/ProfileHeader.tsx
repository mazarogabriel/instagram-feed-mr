"use client";

import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";

interface ProfileHeaderProps {
  profile: Profile;
  postCount: number;
  storyCount: number;
  onOpenStories: () => void;
}

export default function ProfileHeader({
  profile,
  postCount,
  storyCount,
  onOpenStories,
}: ProfileHeaderProps) {
  return (
    <div className="px-4 pb-2 pt-4">
      <div className="mb-4 flex items-center gap-6">
        <div className="relative">
          <Avatar
            src={profile.avatarUrl}
            alt={profile.displayName}
            size={77}
            hasStory={storyCount > 0}
            onClick={storyCount > 0 ? onOpenStories : undefined}
          />
          {storyCount > 0 && (
            <span className="sr-only">
              {storyCount} stories publicados disponíveis
            </span>
          )}
        </div>

        <div className="flex flex-1 gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-semibold leading-none text-[#262626]">
              {postCount}
            </span>
            <span className="mt-0.5 text-[14px] text-[#262626]">publicações</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-semibold leading-none text-[#262626]">—</span>
            <span className="mt-0.5 text-[14px] text-[#262626]">seguidores</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-semibold leading-none text-[#262626]">—</span>
            <span className="mt-0.5 text-[14px] text-[#262626]">seguindo</span>
          </div>
        </div>
      </div>

      <div className="space-y-0.5">
        <p className="text-[14px] font-semibold text-[#262626]">
          {profile.displayName}
        </p>
        {profile.bio && (
          <p className="whitespace-pre-wrap text-[14px] leading-[18px] text-[#262626]">
            {profile.bio}
          </p>
        )}
        {profile.website && (
          <a
            href={profile.website}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[14px] font-semibold text-[#00376b] hover:underline"
          >
            {profile.website.replace(/^https?:\/\//, "")}
          </a>
        )}
      </div>
    </div>
  );
}
