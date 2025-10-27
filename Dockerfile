# Use the official Node.js 20 image as the base image with a specific digest for security and reproducibility
FROM node:24.10.0-alpine3.22 AS builder

# Set the working directory
WORKDIR /app

# install pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

# copy and install
COPY package.json pnpm-lock.yaml* ./
# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN pnpm run build

# Expose the port the app runs on
EXPOSE 3000

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

# Command to run the application
CMD ["pnpm", "start"]
