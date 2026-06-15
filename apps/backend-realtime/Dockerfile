# Use a lightweight and secure Node.js LTS base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install production-only dependencies
RUN npm install --only=production

# Copy the application source code
COPY . .

# Expose port 4000 for WebSocket connections
EXPOSE 4000

# Set environment to production
ENV NODE_ENV=production

# Command to execute the entrypoint script
CMD ["node", "src/index.js"]
