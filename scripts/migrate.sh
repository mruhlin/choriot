#!/bin/bash
# Database migration script for Choriot
# This script helps manage Prisma migrations in production environments

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
  echo "Please set it using: export DATABASE_URL='your-database-url'"
  echo "Or create a .env file with DATABASE_URL defined"
  exit 1
fi

# Function to deploy migrations
deploy_migrations() {
  echo -e "${GREEN}Deploying migrations to database...${NC}"
  npx prisma migrate deploy
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations deployed successfully!${NC}"
  else
    echo -e "${RED}✗ Migration deployment failed${NC}"
    exit 1
  fi
}

# Function to check migration status
check_status() {
  echo -e "${YELLOW}Checking migration status...${NC}"
  npx prisma migrate status
}

# Function to generate Prisma Client
generate_client() {
  echo -e "${GREEN}Generating Prisma Client...${NC}"
  npx prisma generate
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Prisma Client generated successfully!${NC}"
  else
    echo -e "${RED}✗ Prisma Client generation failed${NC}"
    exit 1
  fi
}

# Function to reset database (DANGEROUS!)
reset_database() {
  echo -e "${RED}⚠️  WARNING: This will DELETE ALL DATA in your database!${NC}"
  echo -e "${YELLOW}Are you sure you want to continue? (type 'yes' to confirm)${NC}"
  read -r confirmation
  
  if [ "$confirmation" = "yes" ]; then
    echo -e "${YELLOW}Resetting database...${NC}"
    npx prisma migrate reset --force
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Database reset successfully!${NC}"
    else
      echo -e "${RED}✗ Database reset failed${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}Reset cancelled.${NC}"
    exit 0
  fi
}

# Main script logic
case "$1" in
  deploy)
    deploy_migrations
    ;;
  status)
    check_status
    ;;
  generate)
    generate_client
    ;;
  reset)
    reset_database
    ;;
  *)
    echo "Choriot Database Migration Script"
    echo ""
    echo "Usage: $0 {deploy|status|generate|reset}"
    echo ""
    echo "Commands:"
    echo "  deploy    - Deploy pending migrations to the database"
    echo "  status    - Check the status of migrations"
    echo "  generate  - Generate Prisma Client"
    echo "  reset     - Reset database (⚠️  DELETES ALL DATA)"
    echo ""
    echo "Examples:"
    echo "  $0 deploy         # Deploy migrations to production"
    echo "  $0 status         # Check migration status"
    echo "  $0 generate       # Generate Prisma Client"
    exit 1
    ;;
esac
