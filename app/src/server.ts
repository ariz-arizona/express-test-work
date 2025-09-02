import type { Item, ItemsResponse } from './types'
import type { Response, Request } from 'express'

const express = require('express')
const cors = require('cors')
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
    search: '',           // текущий поисковый запрос
    currentPage: 1,       // текущая страница (для пагинации)
};
app.use(cors());
app.use(express.json());
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
        selected: Array.from(appState.selectedItems),
    });
})

app.patch('/state', (req: Request, res: Response) => {
    const { oldPageOrder, newPageOrder } = req.body;

    // --- Валидация входных данных ---
    if (!Array.isArray(oldPageOrder) || !Array.isArray(newPageOrder)) {
        return res.status(400).json({ error: 'oldPageOrder and newPageOrder must be arrays' });
    }

    if (oldPageOrder.length === 0) {
        return res.status(400).json({ error: 'oldPageOrder cannot be empty' });
    }

    if (oldPageOrder.length !== newPageOrder.length) {
        return res.status(400).json({ error: 'oldPageOrder and newPageOrder must have the same length' });
    }

    // --- Поиск индекса, где oldPageOrder встречается как подмассив в appState.order ---
    const order = appState.order;
    let matchIndex = -1;

    for (let i = 0; i <= order.length - oldPageOrder.length; i++) {
        let found = true;
        for (let j = 0; j < oldPageOrder.length; j++) {
            if (order[i + j] !== oldPageOrder[j]) {
                found = false;
                break;
            }
        }
        if (found) {
            matchIndex = i;
            break;
        }
    }

    // --- Если не найдено совпадение ---
    if (matchIndex === -1) {
        return res.status(409).json({
            error: 'Conflict: The provided oldPageOrder was not found in the current state',
            currentState: order,
            received: oldPageOrder,
        });
    }

    // --- Применяем изменения ---
    for (let i = 0; i < newPageOrder.length; i++) {
        order[matchIndex + i] = newPageOrder[i];
    }

    // --- Ответ ---
    res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        updatedRange: {
            start: matchIndex,
            end: matchIndex + newPageOrder.length - 1,
        },
    });
});
app.post('/selected', (req: Request, res: Response) => {
    const { selectedIds } = req.body;

    // --- Валидация ---
    if (!Array.isArray(selectedIds)) {
        return res.status(400).json({
            error: 'selectedIds must be an array of numbers'
        });
    }

    // Преобразуем и фильтруем валидные числа
    const validIds = selectedIds
        .map(id => Number(id))
        .filter(id => !isNaN(id) && id >= 1 && id <= TOTAL_ITEMS);

    // --- Обновляем состояние ---
    appState.selectedItems = new Set(validIds);

    // --- Ответ ---
    res.status(200).json({
        success: true,
        message: 'Selected items updated successfully',
        count: validIds.length,
        selectedIds: validIds // можно убрать, если много
    });
});
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})