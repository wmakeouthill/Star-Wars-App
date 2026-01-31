import { DetailsModal } from '@/shared/components/DetailsModal';
import styles from './ImageFallbackEditorModal.module.css';
import { ImageFallbackEditorModalProps } from './ImageFallbackEditorModal.types';
import { useImageFallbackEditorModal } from './ImageFallbackEditorModal.hooks';

export function ImageFallbackEditorModal({
  open,
  resource,
  resourceLabel,
  itemName,
  onClose,
}: Readonly<ImageFallbackEditorModalProps>) {
  const { state, handlers } = useImageFallbackEditorModal({ open, resource, itemName, onClose });

  let existingHelpNode: React.ReactNode = 'Nenhum fallback cadastrado ainda. Cole uma URL e salve.';
  if (state.isLoadingExisting) {
    existingHelpNode = 'Carregando fallback existente…';
  } else if (state.existingFallback) {
    existingHelpNode = (
      <>
        Existe um fallback salvo para <strong>{state.existingFallback.item_name}</strong>. Você pode colar uma nova URL e
        sobrescrever.
      </>
    );
  }

  return (
    <DetailsModal open={open} title={`Fallback de imagem (${resourceLabel}): ${itemName}`} onClose={handlers.close}>
      <div className={styles.container}>
        <div className={styles.preview}>
          <div className={styles.label}>Prévia</div>
          <img
            className={styles.previewImage}
            src={state.previewUrl}
            alt={`Prévia de fallback para ${itemName}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <div className={styles.help}>{existingHelpNode}</div>
        </div>

        <div className={styles.row}>
          <label className={styles.label} htmlFor="resource">
            Recurso
          </label>
          <input id="resource" className={styles.input} value={resource} readOnly aria-readonly="true" />
          <div className={styles.help}>Campo técnico usado para lookup (Databank/SWAPI).</div>
        </div>

        <div className={styles.row}>
          <label className={styles.label} htmlFor="item-name">
            {resourceLabel}
          </label>
          <input id="item-name" className={styles.input} value={itemName} readOnly aria-readonly="true" />
          <div className={styles.help}>Este campo é preenchido automaticamente a partir do card.</div>
        </div>

        <div className={styles.row}>
          <label className={styles.label} htmlFor="image-url">
            URL da imagem (cole aqui)
          </label>
          <input
            id="image-url"
            className={styles.input}
            value={state.imageUrl}
            onChange={(event) => handlers.setImageUrl(event.target.value)}
            placeholder="https://…"
            inputMode="url"
            autoComplete="off"
          />
          <div className={styles.help}>Dica: use uma URL direta de imagem (ex.: termina com .jpg/.png).</div>
        </div>

        {state.formError && <div className={styles.error}>{state.formError}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${state.isSaving ? styles.buttonDisabled : ''}`}
            onClick={handlers.close}
            disabled={state.isSaving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary} ${state.isSaving ? styles.buttonDisabled : ''}`}
            onClick={() => void handlers.save()}
            disabled={state.isSaving}
          >
            {state.isSaving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </DetailsModal>
  );
}

