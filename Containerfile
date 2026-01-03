# ---- Build stage ----------------------------------------------------
FROM node:20-alpine AS build

# Workdir inside the builder image
WORKDIR /app

# Install dependencies
COPY package*.json ./
# Or: pnpm-lock.yaml / yarn.lock, if you use those
RUN npm install

# Copy the rest of the source
COPY . .

# Build for production (outputs to /app/dist)
RUN npm run build


# ---- Runtime stage (nginx) ------------------------------------------
FROM nginx:alpine

# Remove default nginx index if present
RUN rm -rf /usr/share/nginx/html/*

# Copy built SPA from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Optional: custom nginx config for SPA routing (see below)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx base image already has the default CMD to start nginx

