import styles from './UserMenu.module.css';
import { useAuth } from '../../context/AuthContext';
import { useImageEditModeStore } from '@/shared/stores/imageEditMode.store';

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'U';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

const IMAGE_FALLBACK_EDITOR_EMAIL = 'wcacorreia1995@gmail.com';

export function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const displayName = (user.name ?? '').trim() || (user.email ?? '').trim() || 'Usuário';
  const displayEmail = (user.email ?? '').trim() || null;
  const picture = (user.picture ?? '').trim() || null;
  const canEditImages = (displayEmail ?? '').toLowerCase() === IMAGE_FALLBACK_EDITOR_EMAIL;
  const { isEnabled: isImageEditModeEnabled, toggle: toggleImageEditMode } = useImageEditModeStore();

  return (
    <div className={styles.menu} title={displayEmail ?? displayName}>
      {picture ? (
        <img className={styles.avatar} src={picture} alt={displayName} referrerPolicy="no-referrer" />
      ) : (
        <div className={styles.avatarFallback} aria-label={displayName}>
          {initials(displayName)}
        </div>
      )}

      {canEditImages && (
        <button
          type="button"
          className={`${styles.imageEditToggle} ${isImageEditModeEnabled ? styles.imageEditToggleActive : ''}`}
          onClick={toggleImageEditMode}
          aria-pressed={isImageEditModeEnabled}
          title={isImageEditModeEnabled ? 'Desativar modo de edição de imagens' : 'Ativar modo de edição de imagens'}
        >
          {isImageEditModeEnabled ? 'Edição: ON' : 'Edição: OFF'}
        </button>
      )}

      <div className={styles.meta}>
        <div className={styles.name}>{displayName}</div>
        {displayEmail && <div className={styles.email}>{displayEmail}</div>}
      </div>

      <button type="button" className={styles.logout} onClick={() => void logout()}>
        Sair
      </button>
    </div>
  );
}

