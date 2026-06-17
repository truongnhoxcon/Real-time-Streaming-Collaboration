# Use a lightweight and secure Node.js LTS base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies to optimize image size
RUN npm install --only=production

# Copy the rest of the application source code
COPY . .

# Expose the application listening port (port 3000 for core backend)
EXPOSE 3000

# Set environment to production by default
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "src/app.js"]
