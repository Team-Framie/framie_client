export type Frame = {
  id: string;
  title: string;
  shot_count: number;
};

export type SessionPhoto = {
  id?: string;
  shot_order: number;
  original_path: string | null;
  processed_path: string | null;
};

export type Session = {
  id: string;
  created_at: string;
  source_type: string | null;
  photographer_id: string | null;
  frame_owner_id: string | null;
  result_thumbnail_path: string | null;
  result_image_path: string | null;
  frame: { title: string; shot_count: number } | null;
  photos: SessionPhoto[];
  share_code: { code: string } | null;
};

export type ResultPayload = {
  frameId: string;
  shotCount: number;
  frameTitle: string;
  photos: string[];
  originals: string[];
  sourceType?: string;
  frameOwnerId?: string;
  overlayPhotos?: string[];
};

export type Custom2State = {
  frameId: string;
  shotCount: number;
  frameTitle: string;
  overlayPhotos: string[];
  sourceType: string;
  frameOwnerId?: string;
  displayUserId?: string | null;
  userMessage?: string | null;
  resultImageUrl?: string | null;
};
