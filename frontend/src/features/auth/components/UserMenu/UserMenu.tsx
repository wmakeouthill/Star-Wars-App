import styles from './UserMenu.module.css';
import { useAuth } from '../../context/AuthContext';

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'U';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

export function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const displayName = (user.name ?? '').trim() || (user.email ?? '').trim() || 'Usuário';
  const displayEmail = (user.email ?? '').trim() || null;
  const picture = (user.picture ?? '').trim() || null;

  return (
    <div className={styles.menu} title={displayEmail ?? displayName}>
      {picture ? (
        <img className={styles.avatar} src={picture} alt={displayName} referrerPolicy="no-referrer" />
      ) : (
        <div className={styles.avatarFallback} aria-label={displayName}>
          {initials(displayName)}
        </div>
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

