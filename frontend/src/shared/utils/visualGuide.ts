export type VisualGuideCategory = 'characters' | 'starships' | 'planets' | 'films' | 'vehicles' | 'species';

const VISUAL_GUIDE_BASE_URL = 'https://starwars-visualguide.com/assets/img';

/**
 * Monta a URL da imagem usando um identificador estável (id do recurso).
 *
 * Importante: NÃO usar índice do array/lista, para evitar imagens trocadas.
 */
export function getVisualGuideImageUrl(category: VisualGuideCategory, id: string): string {
    const safeId = String(id).trim();
    return `${VISUAL_GUIDE_BASE_URL}/${category}/${encodeURIComponent(safeId)}.jpg`;
}

