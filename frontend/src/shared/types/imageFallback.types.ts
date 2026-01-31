export type ImageFallback = {
  id: string;
  resource: string;
  item_name: string;
  image_url: string;
  created_at: string;
  updated_at: string;
};

export type ImageFallbackUpsertRequest = {
  item_name: string;
  image_url: string;
};

