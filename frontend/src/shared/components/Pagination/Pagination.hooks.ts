export function usePagination(page: number, totalPages: number) {
    const canGoBack = page > 1;
    const canGoForward = page < totalPages;

    return {
        canGoBack,
        canGoForward,
    };
}
