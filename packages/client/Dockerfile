FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock* ./
COPY packages/client/package.json ./packages/client/
RUN yarn install --frozen-lockfile
COPY packages/client ./packages/client
WORKDIR /app/packages/client
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
