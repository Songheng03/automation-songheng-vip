FROM node:18-alpine
RUN apk add --no-cache git jq curl
WORKDIR /action
COPY package.json .
RUN npm install --production
COPY entrypoint.sh .
COPY index.js .
RUN chmod +x entrypoint.sh
ENTRYPOINT ["/action/entrypoint.sh"]
