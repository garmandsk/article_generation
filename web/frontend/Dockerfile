# =========================================
# Stage 1: Build the Next.js application
# =========================================
ARG NODE_VERSION=24.12.0-alpine

FROM node:${NODE_VERSION} AS builder
WORKDIR /frontend

RUN corepack enable pnpm

ENV CI=true

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile --fetch-timeout=600000

COPY . .

# Saat dibuild dengan output: 'standalone', Next.js akan menaruh
# hasil akhirnya di folder .next/standalone
RUN pnpm build

# =========================================
# Stage 2: Node.js Production Server
# =========================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /frontend

ENV NODE_ENV=production

# Menurunkan pangkat akses sistem ke user biasa bawaan Node.js demi keamanan
USER node

# Menyalin folder statis publik (gambar, font, dll)
COPY --from=builder --chown=node:node /frontend/public ./public

# Menyalin kerangka server standalone buatan Next.js
COPY --from=builder --chown=node:node /frontend/.next/standalone ./

# Menyalin aset JS/CSS hasil kompilasi
COPY --from=builder --chown=node:node /frontend/.next/static ./.next/static

EXPOSE 8080
ENV PORT=8080

# Menyalakan server mini bawaan Next.js
CMD ["node", "server.js"]