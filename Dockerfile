FROM node:20-slim
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/mcp/package*.json ./packages/mcp/

RUN npm install --workspaces --ignore-scripts

COPY packages/core ./packages/core
COPY packages/mcp ./packages/mcp

RUN npm run build -w packages/core && npm run build -w packages/mcp

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "packages/mcp/dist/index.js"]
