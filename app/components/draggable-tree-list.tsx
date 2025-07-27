"use client"

import type React from "react"

import { useState, useRef, useEffect, type DragEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  GripVertical,
  Trash2,
  CheckCircle2,
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Edit3,
  Check,
  X,
} from "lucide-react"
import type { TreeItem } from "../lib/database"

interface DraggableTreeListProps {
  items: TreeItem[]
  onReorder: (items: TreeItem[]) => void
  onDelete: (id: number) => void
  onToggleFolder: (id: number) => void
  onCreateFolder: () => void
  onRename: (id: number, newName: string) => void
}

interface DragState {
  draggedId: number | null
  dragOverId: number | null
  dragPosition: "above" | "below" | "inside" | null
}

export function DraggableTreeList({
  items,
  onReorder,
  onDelete,
  onToggleFolder,
  onCreateFolder,
  onRename,
}: DraggableTreeListProps) {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [focusedItem, setFocusedItem] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<number | null>(null)
  const [editingText, setEditingText] = useState("")
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    dragOverId: null,
    dragPosition: null,
  })

  const dragCounter = useRef(0)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Focus the input when editing starts
  useEffect(() => {
    if (editingItem !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingItem])

  // Build tree structure from flat array
  const buildTree = (items: TreeItem[]): TreeItem[] => {
    const itemMap = new Map<number, TreeItem & { children: TreeItem[] }>()
    const rootItems: (TreeItem & { children: TreeItem[] })[] = []

    // First pass: create map of all items with children arrays
    items.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    // Second pass: build parent-child relationships
    items.forEach((item) => {
      const itemWithChildren = itemMap.get(item.id)!
      if (item.parentId === null) {
        rootItems.push(itemWithChildren)
      } else {
        const parent = itemMap.get(item.parentId)
        if (parent) {
          parent.children.push(itemWithChildren)
        }
      }
    })

    // Sort by order at each level
    const sortByOrder = (items: (TreeItem & { children: TreeItem[] })[]) => {
      items.sort((a, b) => a.order - b.order)
      items.forEach((item) => {
        if (item.children.length > 0) {
          sortByOrder(item.children)
        }
      })
    }

    sortByOrder(rootItems)
    return rootItems
  }

  const treeItems = buildTree(items)

  const startEditing = (item: TreeItem) => {
    setEditingItem(item.id)
    setEditingText(item.text)
  }

  const cancelEditing = () => {
    setEditingItem(null)
    setEditingText("")
  }

  const saveEdit = () => {
    if (editingItem !== null && editingText.trim()) {
      onRename(editingItem, editingText.trim())
      setEditingItem(null)
      setEditingText("")
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEditing()
    }
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, item: TreeItem) => {
    // Don't allow dragging while editing
    if (editingItem !== null) {
      e.preventDefault()
      return
    }

    setDragState((prev) => ({ ...prev, draggedId: item.id }))
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", item.id.toString())

    // Add visual feedback
    const target = e.currentTarget
    target.style.opacity = "0.5"
    dragCounter.current = 0
  }

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    // Reset visual feedback
    const target = e.currentTarget
    target.style.opacity = "1"

    // Reset drag state
    setDragState({
      draggedId: null,
      dragOverId: null,
      dragPosition: null,
    })
    dragCounter.current = 0
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>, item: TreeItem) => {
    e.preventDefault()
    dragCounter.current++

    if (dragState.draggedId === null || dragState.draggedId === item.id) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    let position: "above" | "below" | "inside"

    if (item.isFolder) {
      // For folders, divide into three zones
      if (y < height * 0.25) {
        position = "above"
      } else if (y > height * 0.75) {
        position = "below"
      } else {
        position = "inside"
      }
    } else {
      // For files, only above/below
      position = y < height * 0.5 ? "above" : "below"
    }

    setDragState((prev) => ({
      ...prev,
      dragOverId: item.id,
      dragPosition: position,
    }))
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    dragCounter.current--

    if (dragCounter.current === 0) {
      setDragState((prev) => ({
        ...prev,
        dragOverId: null,
        dragPosition: null,
      }))
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>, item: TreeItem) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    if (dragState.draggedId === null || dragState.draggedId === item.id) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    let position: "above" | "below" | "inside"

    if (item.isFolder) {
      if (y < height * 0.25) {
        position = "above"
      } else if (y > height * 0.75) {
        position = "below"
      } else {
        position = "inside"
      }
    } else {
      position = y < height * 0.5 ? "above" : "below"
    }

    setDragState((prev) => ({
      ...prev,
      dragOverId: item.id,
      dragPosition: position,
    }))
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropItem: TreeItem) => {
    e.preventDefault()

    const { draggedId, dragPosition } = dragState

    if (draggedId === null || draggedId === dropItem.id || !dragPosition) {
      setDragState({
        draggedId: null,
        dragOverId: null,
        dragPosition: null,
      })
      return
    }

    const draggedItem = items.find((item) => item.id === draggedId)
    if (!draggedItem) return

    // Prevent dropping a folder into its own descendant
    const isDescendant = (parentId: number, childId: number): boolean => {
      const child = items.find((item) => item.id === childId)
      if (!child || child.parentId === null) return false
      if (child.parentId === parentId) return true
      return isDescendant(parentId, child.parentId)
    }

    if (draggedItem.isFolder && isDescendant(draggedId, dropItem.id)) {
      setDragState({
        draggedId: null,
        dragOverId: null,
        dragPosition: null,
      })
      return
    }

    const newItems = [...items]
    const draggedIndex = newItems.findIndex((item) => item.id === draggedId)
    const updatedDraggedItem = { ...newItems[draggedIndex] }

    if (dragPosition === "inside" && dropItem.isFolder) {
      // Move inside folder
      updatedDraggedItem.parentId = dropItem.id
      updatedDraggedItem.order = 0 // Place at beginning of folder

      // Update orders of other items in the same folder
      newItems.forEach((item, index) => {
        if (item.parentId === dropItem.id && item.id !== draggedId) {
          newItems[index] = { ...item, order: item.order + 1 }
        }
      })
    } else {
      // Move above or below
      updatedDraggedItem.parentId = dropItem.parentId

      const siblings = newItems.filter((item) => item.parentId === dropItem.parentId && item.id !== draggedId)
      const dropIndex = siblings.findIndex((item) => item.id === dropItem.id)
      const newOrder = dragPosition === "above" ? dropItem.order : dropItem.order + 1

      updatedDraggedItem.order = newOrder

      // Update orders of affected siblings
      siblings.forEach((sibling, index) => {
        const siblingIndex = newItems.findIndex((item) => item.id === sibling.id)
        if (dragPosition === "above" && sibling.order >= dropItem.order) {
          newItems[siblingIndex] = { ...sibling, order: sibling.order + 1 }
        } else if (dragPosition === "below" && sibling.order > dropItem.order) {
          newItems[siblingIndex] = { ...sibling, order: sibling.order + 1 }
        }
      })
    }

    newItems[draggedIndex] = updatedDraggedItem
    onReorder(newItems)

    setDragState({
      draggedId: null,
      dragOverId: null,
      dragPosition: null,
    })
  }

  const handleItemClick = (e: React.MouseEvent, item: TreeItem) => {
    // Don't handle selection if we're editing
    if (editingItem !== null) return

    if (e.ctrlKey || e.metaKey) {
      setSelectedItems((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(item.id)) {
          newSet.delete(item.id)
        } else {
          newSet.add(item.id)
        }
        return newSet
      })
    } else {
      setSelectedItems(new Set([item.id]))
      setFocusedItem(item.id)
    }
  }

  const handleItemDoubleClick = (e: React.MouseEvent, item: TreeItem) => {
    e.preventDefault()
    e.stopPropagation()
    startEditing(item)
  }

  const handleKeyDown = (e: React.KeyboardEvent, item: TreeItem) => {
    if (editingItem !== null) return

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleItemClick(e as any, item)
    } else if (e.key === "F2") {
      e.preventDefault()
      startEditing(item)
    }
  }

  const renderTreeItem = (item: TreeItem & { children: TreeItem[] }, depth = 0): React.ReactNode => {
    const isSelected = selectedItems.has(item.id)
    const isFocused = focusedItem === item.id
    const isEditing = editingItem === item.id
    const isDragging = dragState.draggedId === item.id
    const isDragOver = dragState.dragOverId === item.id
    const showDropIndicator = isDragOver && dragState.dragPosition !== null

    return (
      <div key={item.id} className="relative">
        {/* Drop indicator above */}
        {showDropIndicator && dragState.dragPosition === "above" && (
          <div
            className="absolute -top-1 h-0.5 bg-blue-500 rounded-full z-10"
            style={{ left: `${depth * 24 + 16}px`, right: "16px" }}
          />
        )}

        <Card
          draggable={!isEditing}
          role="treeitem"
          tabIndex={0}
          aria-selected={isSelected}
          aria-expanded={item.isFolder ? item.isExpanded : undefined}
          onDragStart={(e) => handleDragStart(e, item)}
          onDragEnd={handleDragEnd}
          onDragEnter={(e) => handleDragEnter(e, item)}
          onDragLeave={handleDragLeave}
          onDragOver={(e) => handleDragOver(e, item)}
          onDrop={(e) => handleDrop(e, item)}
          onClick={(e) => handleItemClick(e, item)}
          onDoubleClick={(e) => handleItemDoubleClick(e, item)}
          onKeyDown={(e) => handleKeyDown(e, item)}
          className={`
            transition-all duration-200 cursor-pointer select-none mb-2
            ${isDragging ? "opacity-50 scale-95 rotate-1" : "opacity-100 scale-100"}
            ${isSelected ? "ring-2 ring-blue-500 bg-blue-50 border-blue-300" : "border-gray-200"}
            ${isFocused ? "ring-2 ring-blue-300" : ""}
            ${isDragOver && dragState.dragPosition === "inside" ? "bg-blue-100 border-blue-400 shadow-lg" : ""}
            ${isDragOver && dragState.dragPosition !== "inside" ? "shadow-lg border-blue-400" : ""}
            ${isEditing ? "ring-2 ring-green-500 bg-green-50" : ""}
            hover:shadow-md hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500
          `}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-3 p-4">
            {item.isFolder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isEditing) {
                    onToggleFolder(item.id)
                  }
                }}
                className="p-0 h-auto hover:bg-transparent"
                disabled={isEditing}
              >
                {item.isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            )}

            <div
              className={`flex-shrink-0 ${isEditing ? "cursor-default" : "cursor-grab active:cursor-grabbing"} touch-none`}
            >
              <GripVertical
                className={`h-5 w-5 ${isEditing ? "text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
              />
            </div>

            <div className="flex-shrink-0">
              {item.isFolder ? (
                item.isExpanded ? (
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                ) : (
                  <Folder className="h-5 w-5 text-blue-600" />
                )
              ) : (
                <File className="h-5 w-5 text-gray-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-1">
                  <Input
                    ref={editInputRef}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={saveEdit}
                    className="text-sm font-medium h-8"
                    placeholder="Enter name..."
                  />
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-900 truncate">{item.text}</p>
                  <p className="text-xs text-gray-500">
                    {item.isFolder ? `Folder • ${item.children.length} items` : "File"} • Created{" "}
                    {item.createdAt.toLocaleDateString()}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isSelected && !isEditing && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
              {showDropIndicator && dragState.dragPosition === "inside" && (
                <div className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Drop inside</div>
              )}

              {isEditing ? (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      saveEdit()
                    }}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      cancelEditing()
                    }}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing(item)
                    }}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                    title="Rename (F2)"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(item.id)
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    disabled={isEditing}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Drop indicator below */}
        {showDropIndicator && dragState.dragPosition === "below" && (
          <div
            className="absolute -bottom-1 h-0.5 bg-blue-500 rounded-full z-10"
            style={{ left: `${depth * 24 + 16}px`, right: "16px" }}
          />
        )}

        {/* Render children if folder is expanded */}
        {item.isFolder && item.isExpanded && item.children.length > 0 && (
          <div className="mt-2">{item.children.map((child) => renderTreeItem(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full" role="tree" aria-label="Hierarchical Task List">
      <div className="mb-4 flex items-center gap-2">
        <Button onClick={onCreateFolder} variant="outline" size="sm">
          <Folder className="h-4 w-4 mr-2" />
          Create Folder
        </Button>
        <div className="text-xs text-gray-500 ml-4">💡 Double-click to rename • F2 to rename • Drag to reorder</div>
      </div>

      {treeItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No items to display</p>
        </div>
      ) : (
        <div className="space-y-0">{treeItems.map((item) => renderTreeItem(item, 0))}</div>
      )}
    </div>
  )
}
