export const IMAGE_FALLBACK_EDITOR_EMAIL = 'wcacorreia1995@gmail.com';

type CanEditImageFallbacksArgs = {
  userEmail?: string | null;
  isEditModeEnabled: boolean;
};

export function canEditImageFallbacks({ userEmail, isEditModeEnabled }: CanEditImageFallbacksArgs): boolean {
  if (!isEditModeEnabled) return false;
  const email = (userEmail ?? '').trim().toLowerCase();
  return email === IMAGE_FALLBACK_EDITOR_EMAIL;
}

