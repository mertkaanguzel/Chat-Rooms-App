FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

ENV CACHE_URL=redis-12958.c246.us-east-1-4.ec2.redns.redis-cloud.com
ENV CACHE_PORT=12958
ENV CACHE_USERNAME=default
ENV CACHE_PASSWORD=WcbVi33u7PukdITz2X5O8c9JTmaARDQG
ENV PORT=3000
ENV STAGE=DEV
ENV SESSION_SECRET=topSecret
ENV DB_URL=mongodb+srv://mkg:mkg98@be.9olnr.mongodb.net/?retryWrites=true&w=majority&appName=BE

COPY . .

ENTRYPOINT [ "npm", "run", "dev" ]