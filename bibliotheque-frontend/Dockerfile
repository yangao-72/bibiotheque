# =============================================================================
# Bibliothèque — interface Angular (port 4200)
# =============================================================================
# Angular 18 supporte officiellement Node 18/20/22 : on compile avec Node 22.
# L'interface est ensuite servie par nginx.
# =============================================================================

# ---- Étape 1 : build Angular ------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Le lockfile est versionné : npm ci reproduit l'installation à l'identique.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Étape 2 : serveur statique nginx ---------------------------------------
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/bibliotheque-frontend /usr/share/nginx/html

EXPOSE 80
