export function formatNumber(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return 'Desconhecido';
    }
    return new Intl.NumberFormat('pt-BR').format(value);
}
