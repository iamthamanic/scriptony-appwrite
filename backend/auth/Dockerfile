FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN bun install

# Copy source
COPY . .

# Expose port
EXPOSE 3001

# Start command
CMD ["bun", "run", "src/index.ts"]
