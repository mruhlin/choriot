#!/bin/bash

echo "🏛️  Setting up Choriot..."
echo ""

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
  echo "❌ Error: Node.js 18 or higher is required"
  exit 1
fi
echo "✅ Node.js version OK"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
echo ""

# Set up database
echo "Setting up database..."
npx prisma generate
npx prisma migrate dev --name init
echo ""

echo "✅ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "Happy chore tracking! 🎉"
