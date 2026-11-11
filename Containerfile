# Dockerfile
FROM nginx:alpine

# Remove default nginx index if present
RUN rm -f /usr/share/nginx/html/*

# Copy your single-page app
COPY public/. /usr/share/nginx/html/

# nginx listens on port 80 by default
EXPOSE 80
