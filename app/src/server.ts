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
    customOrder: [] as number[], // если пуст — значит, порядок по умолчанию
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

    let items: Item[] = [];

    if (search) {
        let foundIndex = 0
        const searchNormalized = search.toLowerCase();
        for (let id = 1; id <= TOTAL_ITEMS; id++) {
            if (id.toString().indexOf(searchNormalized) !== -1) {
                if (foundIndex >= offset && foundIndex < end) {
                    items.push(getCachedItem(id))
                }
                foundIndex++
            }
        }

        return res.json({
            items,
            search: search,
            total: foundIndex,
            page,
            pageSize: PAGE_SIZE,
            hasMore: foundIndex > end
        });
    }


    if (!search) {
        const fromIndex = offset;
        const toIndex = Math.min(end, TOTAL_ITEMS);
        for (let index = fromIndex; index < toIndex; index++) {
            const id = index + 1; // ID = index + 1
            items.push(getCachedItem(id));
        }

        return res.json({
            items,
            total: TOTAL_ITEMS,
            page,
            pageSize: PAGE_SIZE,
            hasMore: end < TOTAL_ITEMS
        });
    }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})