FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

ENV CACHE_URL=redis-13150.c232.us-east-1-2.ec2.redns.redis-cloud.com
ENV CACHE_PORT=13150
ENV CACHE_USERNAME=default
ENV CACHE_PASSWORD=NZGSPfK6KWsAejKLkmVykwQc2bNyZIdX
ENV PORT=3000
ENV STAGE=DEV
ENV SESSION_SECRET=topSecret
ENV DB_URL=mongodb+srv://mkg:mkg98@be.9olnr.mongodb.net/?retryWrites=true&w=majority&appName=BE

COPY . .

ENTRYPOINT [ "npm", "run", "dev" ]
