FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=2000

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p backups logs && chown -R node:node /app

USER node
EXPOSE 2000

CMD ["node", "server.js"]
