FROM node:26.7.0-bookworm-slim

ENV NODE_ENV=production \
	IDRA_DATA_DIR=/data
WORKDIR /app

RUN apt-get update && apt-get install --yes --no-install-recommends \
	build-essential \
	ca-certificates \
	curl \
	git \
	jq \
	python3 \
	python3-pip \
	python3-venv \
	unzip \
	wget \
	zip \
	&& rm -rf /var/lib/apt/lists/*

RUN npm install --global npm@12.0.2

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY src ./src
COPY resources/templates ./resources/templates

RUN mkdir -p /data/workspace && chown -R node:node /app /data

USER node
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "--import", "tsx", "src/main/index.ts"]
