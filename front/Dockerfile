# Стадия 1: Сборка приложения
FROM node:23-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости через npm
RUN npm install

# Копируем остальной код приложения
COPY . .

# Генерируем статический сайт
RUN npm run build

# Стадия 2: Запуск приложения через Node.js
FROM node:23-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем зависимости из стадии сборки
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.output ./.output

# Открываем порт 3000 для подключения
EXPOSE 3000

# Запускаем сервер SSR
CMD ["npx", "dotenv", "-e", ".env", "--", "node", ".output/server/index.mjs"]