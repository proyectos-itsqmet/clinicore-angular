# Etapa 1: Construcción
FROM node:22-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./
RUN npm ci

# Copiar el resto del código
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa 2: Servidor Nginx
FROM nginx:alpine
# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos construidos desde la etapa anterior (Angular genera los estáticos en 'browser')
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
