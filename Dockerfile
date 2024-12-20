FROM node:16

WORKDIR /usr/src/app

COPY package* ./
COPY tsconfig.json ./
COPY .eslintrc.json ./
COPY jest.config.js ./

ENV CACHE_URL=redis://redis:6379
ENV CACHE_PORT=12958
ENV CACHE_USERNAME=default
ENV CACHE_PASSWORD=WcbVi33u7PukdITz2X5O8c9JTmaARDQG
ENV PORT=3000
ENV STAGE=DEV
ENV SESSION_SECRET=topSecret
ENV DB_URL=mongodb+srv://mertkaan1998:<BCqRCJu8PUHB39kh>@be.9olnr.mongodb.net/?retryWrites=true&w=majority&appName=BE

RUN npm install