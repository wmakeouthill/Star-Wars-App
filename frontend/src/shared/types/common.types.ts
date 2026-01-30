export interface PageMeta {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    meta: PageMeta;
}
