export interface StoryMedia {
  url: string;
  kind: "image" | "video";
}

export interface NotionPost {
  id: string;
  title: string;
  thumbnail: string | null;
  caption: string | null;
  pageUrl: string;
  publishDate: string | null;
  status: string | null;
  format: string | null;
  storyMedia: StoryMedia[];
}

export interface Profile {
  username: string;
  displayName: string;
  bio: string;
  website: string;
  avatarUrl: string;
}

export interface Highlight {
  label: string;
  emoji: string;
}

export type SortMode = "date";

export interface WidgetSettings {
  showBio: boolean;
  showHighlights: boolean;
  showContentMap: boolean;
  sortMode: SortMode;
}
