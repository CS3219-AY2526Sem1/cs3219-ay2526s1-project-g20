# React + Vite dev container (port 3000), per course tutorial style
FROM node:20-alpine

WORKDIR /app

# Install deps first for better caching
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Vite will listen on 0.0.0.0:3000
EXPOSE 3000

# Start dev server inside container
CMD ["npm", "start"]
