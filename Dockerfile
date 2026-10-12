# Stage 1: Build static export
FROM node:20-alpine AS builder

WORKDIR /app

# Accept API URL build argument
ARG NEXT_PUBLIC_API_URL=https://apidhstudio.devhouse.vn
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
