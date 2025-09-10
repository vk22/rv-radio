FROM node:20-alpine

# Рабочая директория внутри контейнера
WORKDIR /app

# Установим зависимости
COPY package*.json ./
RUN npm install

# Копируем исходный код
COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
