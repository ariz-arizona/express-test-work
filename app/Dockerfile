FROM node:lts-trixie-slim

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install --omit=dev

# Копируем исходники
COPY . .
RUN npm run build

# Запускаем Express
CMD ["node", ".output/server.js"]