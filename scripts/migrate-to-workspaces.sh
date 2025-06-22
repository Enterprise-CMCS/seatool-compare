#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting migration to workspace commands...${NC}"

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
yarn install

# Build all services
echo -e "${GREEN}Building all services...${NC}"
yarn build:all

# Test all services
echo -e "${GREEN}Running tests...${NC}"
yarn test:all

echo -e "${YELLOW}Migration complete!${NC}"
echo -e "${GREEN}You can now use the following commands:${NC}"
echo "  yarn install:all    # Install all dependencies"
echo "  yarn build:all      # Build all services"
echo "  yarn deploy:all     # Deploy all services"
echo "  yarn test:all       # Run all tests"
echo ""
echo "For individual services:"
echo "  yarn workspace <service-name> <command>"
echo "  Example: yarn workspace alerts deploy"
echo ""
echo "Available services:"
echo "  - alerts"
echo "  - appian"
echo "  - compare-appian"
echo "  - compare-mmdl"
echo "  - connector"
echo "  - dashboard"
echo "  - mmdl"
echo "  - seatool" 