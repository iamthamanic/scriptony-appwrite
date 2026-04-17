FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts
COPY tsconfig.json ./
COPY src/ src/
COPY workflows/ workflows/
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/dist/index.js ./dist/index.js
COPY --from=builder /app/workflows/ ./workflows/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/package.json ./

EXPOSE 9877

CMD ["node", "dist/index.js"]