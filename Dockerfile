FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite inlines VITE_* at build time, so the trivia API URL has to be a build
# arg: fly deploy --build-arg VITE_TRIVIA_API_URL=https://your-api-host
ARG VITE_TRIVIA_API_URL
ENV VITE_TRIVIA_API_URL=$VITE_TRIVIA_API_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/build ./build

EXPOSE 3000
CMD ["npm", "run", "start"]
