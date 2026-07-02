FROM node:20-alpine

RUN apk add --no-cache mpd mpc

WORKDIR /app

COPY manager.js /app/manager.js

CMD ["node", "/app/manager.js"]
