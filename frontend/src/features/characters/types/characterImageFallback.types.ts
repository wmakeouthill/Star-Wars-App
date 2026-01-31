export type CharacterImageFallback = {
  id: string;
  character_name: string;
  image_url: string;
  created_at: string;
  updated_at: string;
};

export type CharacterImageFallbackUpsertRequest = {
  character_name: string;
  image_url: string;
};

