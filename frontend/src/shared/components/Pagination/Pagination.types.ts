export interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}
