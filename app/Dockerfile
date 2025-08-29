FROM node:23-alpine

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install --only=production

# Копируем исходники
COPY . .

# Убедись, что Express слушает 0.0.0.0, а не localhost
EXPOSE 3000

# Запускаем Express
CMD ["npx", "dotenv", "-e", ".env", "--", "node", "server.js"]