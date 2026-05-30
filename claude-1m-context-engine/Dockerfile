FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY packages/core/package.json packages/core/tsconfig.json packages/core/
COPY packages/server/package.json packages/server/tsconfig.json packages/server/
COPY packages/cli/package.json packages/cli/tsconfig.json packages/cli/

RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build:core && npm run build:server && npm run build:cli

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json /app/
COPY --from=builder /app/packages/core/package.json /app/packages/core/
COPY --from=builder /app/packages/core/dist /app/packages/core/dist
COPY --from=builder /app/packages/server/package.json /app/packages/server/
COPY --from=builder /app/packages/server/dist /app/packages/server/dist
COPY --from=builder /app/packages/cli/package.json /app/packages/cli/
COPY --from=builder /app/packages/cli/dist /app/packages/cli/dist

RUN npm install --production --legacy-peer-deps

RUN mkdir -p /app/data/cache /app/data/vector-cache /app/data/uploads

EXPOSE 3721

ENV HOST=0.0.0.0
ENV PORT=3721

CMD ["node", "packages/server/dist/index.js"]
