export function formatNumber(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return 'Desconhecido';
    }
    return new Intl.NumberFormat('pt-BR').format(value);
}

type SwapiQuantity = {
    value?: number | null;
    raw?: string | null;
    min?: number | null;
    max?: number | null;
    unit?: string; // ex.: "cm", "kg"
};

function isUnknownToken(raw: string) {
    const t = raw.trim().toLowerCase();
    return t === '' || t === 'unknown' || t === 'n/a' || t === 'na' || t === 'none' || t === 'null';
}

function formatRange(min: number, max: number) {
    const nf = new Intl.NumberFormat('pt-BR');
    return `${nf.format(min)}–${nf.format(max)}`;
}

/**
 * Formata valores da SWAPI preservando o "raw" quando necessário (faixa/unidade),
 * para evitar que valores válidos virem "Desconhecido".
 */
export function formatSwapiQuantity({ value, raw, min, max, unit }: SwapiQuantity) {
    const nf = new Intl.NumberFormat('pt-BR');

    // 1) Se vier faixa normalizada, mostramos como faixa (e só então aplicamos unidade).
    if (typeof min === 'number' && typeof max === 'number') {
        const label = formatRange(min, max);
        return unit ? `${label} ${unit}` : label;
    }

    // 2) Se vier raw e não for unknown/n-a, preferimos raw quando aparenta conter
    // unidades/faixas/texto (ex.: "30-165", "1000km", "1 standard").
    if (raw && !isUnknownToken(raw)) {
        const trimmed = raw.trim();
        const looksLikePlainNumber = /^-?\d[\d,\.]*$/.test(trimmed);
        if (!looksLikePlainNumber) {
            return trimmed; // já pode conter unidade, então não concatena unit
        }
        // Se for só número em string, tratamos como número abaixo.
    }

    // 3) Número normalizado.
    if (typeof value === 'number') {
        const label = nf.format(value);
        return unit ? `${label} ${unit}` : label;
    }

    // 4) raw existente mas era unknown/n-a (ou vazio) e não temos número.
    return 'Desconhecido';
}
