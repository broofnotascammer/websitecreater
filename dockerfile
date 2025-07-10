# Dockerfile.backend

# Use an official Node.js runtime as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker's caching.
# This step only re-runs if package.json or package-lock.json changes.
COPY package*.json ./

# Install application dependencies
# The --omit=dev flag ensures devDependencies are not installed in production
RUN npm install --omit=dev

# Copy the rest of the application source code
COPY . .

# Expose the port your Express app runs on (matching your server.js PORT)
EXPOSE 3000

# Command to run the application
# Using 'npm start' as defined in package.json
CMD [ "npm", "start" ]