FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /root/automaton

COPY package.json package-lock.json ./
RUN npm install --include=dev

COPY . .

EXPOSE 8080

CMD ["npx", "tsx", "src/index.ts", "--run"]
