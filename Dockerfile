FROM node:24-bookworm-slim AS development

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .

EXPOSE 5173
CMD ["./node_modules/.bin/vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

FROM development AS build
RUN npm run build

FROM nginx/nginx-unprivileged:stable-alpine AS production
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 8080
