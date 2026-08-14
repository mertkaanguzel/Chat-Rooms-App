FROM node:20

WORKDIR /app

# Install workspace dependencies first (layer cache friendly).
COPY package.json package-lock.json tsconfig.base.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY shared/package.json ./shared/
RUN npm install

# Copy sources and build the client (Vite -> client/dist).
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV CACHE_URL=redis://redis:6379
ENV DB_URL=mongodb://mongo:27017/chatroomsdb
ENV SESSION_SECRET=topSecret
ENV PORT=3000

EXPOSE 3000

# Single-origin prod: Express serves client/dist on the same origin as the API.
CMD ["npm", "start"]