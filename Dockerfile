# 校味 · 单进程生产镜像（Express 同时提供 API 与前端静态资源）
# 监听 $PORT（默认 80），适配 CloudBase 云托管等容器平台
FROM node:22-slim

WORKDIR /app

# 依赖层：先复制清单以复用缓存；走腾讯云 npm 镜像，better-sqlite3 使用官方预编译包
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
# 锁文件在 Windows 生成，npm ci 不会安装 linux 平台可选依赖，需显式补 rollup/esbuild 原生包
RUN npm ci --registry=https://mirrors.cloud.tencent.com/npm/ --no-audit --no-fund \
  && npm i --no-save --no-audit --no-fund --registry=https://mirrors.cloud.tencent.com/npm/ \
       @rollup/rollup-linux-x64-gnu@4.68.0 @esbuild/linux-x64@0.28.2

# 源码与前端构建产物
COPY . .
RUN npm run build

ENV NODE_ENV=production \
    PORT=80 \
    DB_PATH=./data/app.db \
    UPLOAD_DIR=./uploads

# SQLite 数据文件与上传图片的落盘目录（与上面 DB_PATH / UPLOAD_DIR 保持一致），需可写
RUN mkdir -p ./data ./uploads

EXPOSE 80

# 空库时自动建表并灌入演示数据，库非空则保留线上数据
CMD ["npm", "run", "start"]
