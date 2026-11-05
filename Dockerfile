FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
LABEL io.modelcontextprotocol.server.name="io.github.nero-zng/solana-alpha-x402-mcp"
ENTRYPOINT ["node", "src/index.mjs"]
