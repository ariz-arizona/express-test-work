# Стадия 1: Сборка приложения
FROM node:lts-trixie-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Копируем остальной код приложения
COPY . .

# Устанавливаем зависимости через npm
RUN npm install
# Билд
RUN npm run build

CMD ["node", ".output/server/index.mjs"]