export interface Naat {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  title: string;
  youtubeId: string;
  audioId: string;
  duration?: number;
  channelName?: string;
  channelId?: string;
  views?: number;
  uploadDate?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  exclude?: boolean;
  radio?: boolean;
  isAiCut?: boolean;
  cutSegments?: string;
  cutAudioId?: string;
  cutAudio?: string;
  cutDuration?: number;
  cutStatus?: string;
  [key: string]: unknown;
}

export interface CutSegment {
  start: number;
  end: number;
}

export interface DetectionResult {
  duration: number;
  speechSegments: {
    start: number;
    end: number;
    confidence: number;
    duration: number;
  }[];
  allSegments: {
    start: number;
    end: number;
    type: string;
    confidence: number;
  }[];
  totalSpeechDuration: number;
  totalSingingDuration: number;
}

export type SortBy = "latest" | "popular" | "oldest" | "random";
export type FilterRadio = "all" | "radio" | "non-radio";
export type FilterDuration = "all" | "<=10min" | ">15min" | ">20min";
export type FilterProcessed = "unprocessed" | "all" | "processed";
export type FilterAiCut = "all" | "ai-cut" | "non-ai-cut";
