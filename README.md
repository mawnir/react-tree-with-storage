# Draggable Tree View Application

## Overview
Interactive hierarchical tree management system built with Next.js and TypeScript.

## Features
- 🗂 Hierarchical tree structure
- 🔄 Drag-and-drop reordering
- 📝 Inline item editing
- 📂 Folder creation and management
- 💾 Persistent changes are stored in a DexieDB
- 🎨 Modern UI with shadcn/ui
- ♿️ Accessibility support
- ⌨️ Keyboard navigation

## Quick Start
```bash
git clone https://github.com/yourusername/draggable-list-app.git
cd draggable-list-app
npm install
npm run dev
```

## Project Structure
```bash
draggable-list-app/
├── app/
│   ├── page.tsx              # Main demo page
│   └── layout.tsx            # Root layout
├── components/
│   ├── draggable-tree-list.tsx
│   └── ui/                   # shadcn/ui components
├── lib/
│   └── database.ts          # Types & interfaces
└── public/
```

## Dependencies
    Next.js 15+
    React 19+
    TypeScript 5+
    TailwindCSS
    shadcn/ui
    Lucide React
 
## License
MIT License  