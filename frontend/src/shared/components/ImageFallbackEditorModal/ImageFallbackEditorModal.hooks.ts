import { useEffect, useMemo, useState } from 'react';
import placeholderImage from '@/shared/images/placeholder.svg';
import { useImageFallbackByName, useUpsertImageFallback } from '@/shared/hooks/useImageFallback';

type UseImageFallbackEditorModalArgs = {
  open: boolean;
  resource: string;
  itemName: string;
  onClose: () => void;
};

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function useImageFallbackEditorModal({ open, resource, itemName, onClose }: UseImageFallbackEditorModalArgs) {
  const [imageUrl, setImageUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const existingQuery = useImageFallbackByName(resource, itemName, open);
  const upsertMutation = useUpsertImageFallback(resource);

  const resolvedPreviewUrl = useMemo(() => {
    const candidate = imageUrl.trim();
    if (candidate && isValidHttpUrl(candidate)) return candidate;
    if (existingQuery.data?.image_url) return existingQuery.data.image_url;
    return placeholderImage;
  }, [existingQuery.data?.image_url, imageUrl]);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setImageUrl(existingQuery.data?.image_url ?? '');
  }, [existingQuery.data?.image_url, open]);

  const close = () => {
    setFormError(null);
    setImageUrl('');
    onClose();
  };

  const save = async () => {
    setFormError(null);
    const name = itemName.trim();
    const url = imageUrl.trim();

    if (!name) {
      setFormError('Nome inválido.');
      return;
    }
    if (!url) {
      setFormError('Cole uma URL de imagem.');
      return;
    }
    if (!isValidHttpUrl(url)) {
      setFormError('A URL precisa começar com http:// ou https://');
      return;
    }

    try {
      await upsertMutation.mutateAsync({ item_name: name, image_url: url });
      close();
    } catch (e) {
      const message = (e as { message?: unknown } | null)?.message;
      setFormError(typeof message === 'string' && message.trim() ? message : 'Falha ao salvar fallback.');
    }
  };

  return {
    state: {
      imageUrl,
      formError,
      existingFallback: existingQuery.data,
      isLoadingExisting: existingQuery.isLoading,
      isSaving: upsertMutation.isPending,
      previewUrl: resolvedPreviewUrl,
    },
    handlers: {
      setImageUrl,
      close,
      save,
    },
  };
}

