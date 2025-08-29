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

// --- Хранение состояния (на время жизни приложения) ---
let appState = {
    selectedItems: new Set<number>(),
    order: Array.from({ length: TOTAL_ITEMS }, (_, i) => i + 1),
    itemsCache: new Map<number, Item>(), // Кэш: id → Item
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
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})