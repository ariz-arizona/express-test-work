import type { Item, ItemsResponse } from './types'
import type { Response, Request } from 'express'

const express = require('express')
const app = express()
const port = 8000

// --- Настройки ---
const TOTAL_ITEMS = 1_000_000;
const PAGE_SIZE = 20;

// Случайный seed от 10 до 50 при старте сервера
const SEED = Math.floor(Math.random() * 41) + 10; // от 10 до 50
console.log(`🎲 Случайный SEED для генерации: ${SEED}`);

// Русские данные
const NAMES = [
    'Алексей', 'Мария', 'Дмитрий', 'Елена', 'Сергей',
    'Ольга', 'Иван', 'Наталья', 'Андрей', 'Татьяна',
    'Кирилл', 'Юлия', 'Виктор', 'Анна', 'Роман'
];

const CATEGORIES = [
    'Техника', 'Дизайн', 'Администрирование', 'Поддержка', 'Продажи',
    'Маркетинг', 'Разработка', 'HR', 'Финансы', 'Аналитика'
];

function generateItem(id: number): Item {
    return {
        id,
        name: `${NAMES[id % NAMES.length]} ${id}`,
        category: CATEGORIES[(id * SEED) % CATEGORIES.length],
    };
}

// --- Генерация элемента с кэшированием ---
function getCachedItem(id: number): Item {
    if (appState.itemsCache.has(id)) {
        return appState.itemsCache.get(id)!;
    }

    const item = generateItem(id);
    appState.itemsCache.set(id, item);
    return item;
}
// --- Сравнение массивов ---
function arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
// --- Хранение состояния (на время жизни приложения) ---
let appState = {
    selectedItems: new Set<number>(),
    order: Array.from({ length: TOTAL_ITEMS }, (_, i) => i + 1),
    itemsCache: new Map<number, Item>(), // Кэш: id → Item
    search: '',           // текущий поисковый запрос
    currentPage: 1,       // текущая страница (для пагинации)
};

app.get('/', (req: any, res: any) => {
    res.send('Hello World!')
})

app.get('/items', (req: Request, res: Response<ItemsResponse>) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const search = (req.query.search as string) || '';

    const offset = (page - 1) * PAGE_SIZE;
    const limit = PAGE_SIZE;
    const end = offset + limit; // элементы [offset, end)

    appState.search = search

    // Формируем список ID в нужном порядке и с фильтром
    const idsInOrder = search
        ? appState.order.filter(id => id.toString().includes(search.toLowerCase()))
        : appState.order;
    const total = idsInOrder.length;

    const pageIds = idsInOrder.slice(offset, end);
    const items = pageIds.map(id => getCachedItem(id));

    return res.json({
        items,
        total,
        page,
        pageSize: PAGE_SIZE,
        hasMore: total > end,
        search: search || undefined,
    });
})

app.patch('/state', (req: Request, res: Response) => {
    const { currentPage, oldPageOrder, newPageOrder } = req.body;

    // --- Валидация входных данных ---
    if (
        typeof currentPage !== 'number' ||
        currentPage < 1
    ) {
        return res.status(400).json({ error: 'Invalid or missing currentPage' });
    }

    if (!Array.isArray(oldPageOrder) || !Array.isArray(newPageOrder)) {
        return res.status(400).json({ error: 'oldPageOrder and newPageOrder must be arrays' });
    }

    if (oldPageOrder.length !== newPageOrder.length) {
        return res.status(400).json({ error: 'oldPageOrder and newPageOrder must have the same length' });
    }

    // --- Вычисляем диапазон ---
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + oldPageOrder.length;

    // Проверяем, не выходит ли за пределы
    if (startIndex >= appState.order.length) {
        return res.status(400).json({ error: 'Page out of range' });
    }

    // --- Получаем текущий порядок на сервере ---
    const currentPageOrder = appState.order.slice(startIndex, endIndex);

    // --- Сравниваем с ожидаемым (oldPageOrder) ---
    if (!arraysEqual(currentPageOrder, oldPageOrder)) {
        return res.status(409).json({
            error: 'Conflict: current page order on server does not match client state',
            expected: currentPageOrder,
            received: oldPageOrder,
        });
    }

    // --- Применяем изменения ---
    for (let i = 0; i < newPageOrder.length; i++) {
        const globalIndex = startIndex + i;
        // Защита от выхода за пределы (на всякий случай)
        if (globalIndex < appState.order.length) {
            appState.order[globalIndex] = newPageOrder[i];
        }
    }

    // --- Ответ ---
    res.status(200).json({
        success: true,
        message: `Order updated for page ${currentPage}`,
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})