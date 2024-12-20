FROM node:16

WORKDIR /usr/src/app

COPY package* ./
COPY tsconfig.json ./
COPY .eslintrc.json ./
COPY jest.config.js ./
COPY .env ./

ENV CACHE_URL=redis://redis:6379
ENV PORT=3000
ENV STAGE=DEV
ENV SESSION_SECRET=topSecret
ENV DB_URL=mongodb://mongo:27017/chatroomsdb

RUN npm install