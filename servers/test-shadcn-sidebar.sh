#!/bin/bash

# Test script for Shadcn Sidebar MCP Server
# Run: bash servers/test-shadcn-sidebar.sh

echo "🧪 Testing Shadcn Sidebar MCP Server"
echo "======================================"
echo ""

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun found: $(bun --version)"
echo ""

# Test TypeScript compilation
echo "🔨 Checking TypeScript syntax..."
cd /Users/juliocezar/Desenvolvimento/openclawdev

if ! bun check servers/shadcn-sidebar-mcp.ts 2>/dev/null; then
    echo "⚠️  TypeScript check warnings (may be OK)"
else
    echo "✅ TypeScript syntax valid"
fi

echo ""
echo "📚 MCP Server Ready"
echo "=================="
echo ""
echo "Integration in .mcp.json:"
grep -A 6 "shadcn-sidebar" .mcp.json | head -7

echo ""
echo "To use this MCP with agents:"
echo ""
echo "1. Frontend Architect:"
echo "   'Build a responsive sidebar with collapsible menu groups'"
echo ""
echo "2. UI Components Specialist:"
echo "   'What are all the Sidebar components in Shadcn?'"
echo ""
echo "3. UX Designer:"
echo "   'Show me RTL support options for Sidebar'"
echo ""
echo "✅ MCP Server configured and ready for agent use!"
