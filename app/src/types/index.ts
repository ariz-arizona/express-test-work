// Тип одного элемента
export interface Item {
    id: number;
    name: string;
    category: string;
}

// Тип ответа API
export interface ItemsResponse {
    items: Item[];
    total: number;
    page: number;
    search?: string;
    pageSize: number;
    hasMore: boolean
}