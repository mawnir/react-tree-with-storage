"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, AlertCircle, FolderTree, File, Folder } from "lucide-react"
import { DraggableTreeList } from "./components/draggable-tree-list"
import { db, type TreeItem } from "./lib/database"
import { toast } from "@/hooks/use-toast"

export default function HomePage() {
  const [items, setItems] = useState<TreeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newItemText, setNewItemText] = useState("")
  const [newItemType, setNewItemType] = useState<"file" | "folder">("file")
  const [isAddingItem, setIsAddingItem] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const dbItems = await db.items.orderBy("order").toArray()
      setItems(dbItems)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load items"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReorder = async (reorderedItems: TreeItem[]) => {
    try {
      setItems(reorderedItems)

      await db.transaction("rw", db.items, async () => {
        for (const item of reorderedItems) {
          await db.items.update(item.id, {
            order: item.order,
            parentId: item.parentId,
          })
        }
      })

      toast({
        title: "Success",
        description: "Items reordered successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reorder items"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      loadItems()
    }
  }

  const handleRename = async (id: number, newName: string) => {
    try {
      await db.items.update(id, { text: newName })
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, text: newName } : item)))

      toast({
        title: "Success",
        description: "Item renamed successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to rename item"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const addNewItem = async () => {
    if (!newItemText.trim()) return

    try {
      setIsAddingItem(true)
      const newItem: Omit<TreeItem, "id"> = {
        text: newItemText.trim(),
        order: items.filter((item) => item.parentId === null).length,
        parentId: null,
        isFolder: newItemType === "folder",
        isExpanded: true,
        createdAt: new Date(),
      }

      const id = await db.items.add(newItem)
      const createdItem: TreeItem = { ...newItem, id }

      setItems((prev) => [...prev, createdItem])
      setNewItemText("")

      toast({
        title: "Success",
        description: `${newItemType === "folder" ? "Folder" : "File"} added successfully`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add item"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsAddingItem(false)
    }
  }

  const createFolder = async () => {
    try {
      const newFolder: Omit<TreeItem, "id"> = {
        text: "New Folder",
        order: items.filter((item) => item.parentId === null).length,
        parentId: null,
        isFolder: true,
        isExpanded: true,
        createdAt: new Date(),
      }

      const id = await db.items.add(newFolder)
      const createdFolder: TreeItem = { ...newFolder, id }

      setItems((prev) => [...prev, createdFolder])

      toast({
        title: "Success",
        description: "Folder created successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create folder"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const toggleFolder = async (id: number) => {
    try {
      const item = items.find((item) => item.id === id)
      if (!item || !item.isFolder) return

      const updatedItem = { ...item, isExpanded: !item.isExpanded }
      await db.items.update(id, { isExpanded: updatedItem.isExpanded })

      setItems((prev) => prev.map((item) => (item.id === id ? updatedItem : item)))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to toggle folder"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const deleteItem = async (id: number) => {
    try {
      // Get all descendants
      const getDescendants = (parentId: number): number[] => {
        const children = items.filter((item) => item.parentId === parentId)
        const descendants = children.map((child) => child.id)
        children.forEach((child) => {
          descendants.push(...getDescendants(child.id))
        })
        return descendants
      }

      const toDelete = [id, ...getDescendants(id)]

      await db.transaction("rw", db.items, async () => {
        for (const itemId of toDelete) {
          await db.items.delete(itemId)
        }
      })

      setItems((prev) => prev.filter((item) => !toDelete.includes(item.id)))

      toast({
        title: "Success",
        description: `Item${toDelete.length > 1 ? "s" : ""} deleted successfully`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete item"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const resetItems = async () => {
    try {
      await db.items.clear()

      const defaultItems: Omit<TreeItem, "id">[] = [
        { text: "📁 Projects", order: 0, parentId: null, isFolder: true, isExpanded: true, createdAt: new Date() },
        { text: "Next.js App", order: 0, parentId: 1, isFolder: false, isExpanded: false, createdAt: new Date() },
        { text: "React Components", order: 1, parentId: 1, isFolder: false, isExpanded: false, createdAt: new Date() },
        { text: "📁 Learning", order: 1, parentId: null, isFolder: true, isExpanded: true, createdAt: new Date() },
        { text: "TypeScript Basics", order: 0, parentId: 4, isFolder: false, isExpanded: false, createdAt: new Date() },
        { text: "Database Design", order: 1, parentId: 4, isFolder: false, isExpanded: false, createdAt: new Date() },
        {
          text: "📄 Standalone Task",
          order: 2,
          parentId: null,
          isFolder: false,
          isExpanded: false,
          createdAt: new Date(),
        },
      ]

      const ids = await db.items.bulkAdd(defaultItems, { allKeys: true })

      // Update items with correct parentId references
      const itemsWithIds = defaultItems.map((item, index) => ({
        ...item,
        id: ids[index] as number,
        parentId: item.parentId ? (ids[item.parentId - 1] as number) : null,
      }))

      await db.transaction("rw", db.items, async () => {
        for (const item of itemsWithIds) {
          if (item.parentId !== null) {
            await db.items.update(item.id, { parentId: item.parentId })
          }
        }
      })

      await loadItems()

      toast({
        title: "Success",
        description: "Items reset to default hierarchy",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reset items"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <Card>
            <CardContent className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading your tree...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Hierarchical Task Tree</h1>
          <p className="text-gray-600">
            Drag items into folders, rename with double-click, and create nested structures. Changes are saved
            automatically.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select value={newItemType} onValueChange={(value: "file" | "folder") => setNewItemType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      File
                    </div>
                  </SelectItem>
                  <SelectItem value="folder">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      Folder
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={`Enter a new ${newItemType}...`}
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addNewItem()}
                disabled={isAddingItem}
                className="flex-1"
              />
              <Button onClick={addNewItem} disabled={!newItemText.trim() || isAddingItem}>
                {isAddingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                Your Tree ({items.length} items)
              </span>
              <Button variant="outline" size="sm" onClick={resetItems}>
                Reset to Default
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No items yet</p>
                <Button onClick={resetItems} variant="outline">
                  Add Sample Tree
                </Button>
              </div>
            ) : (
              <DraggableTreeList
                items={items}
                onReorder={handleReorder}
                onDelete={deleteItem}
                onToggleFolder={toggleFolder}
                onCreateFolder={createFolder}
                onRename={handleRename}
              />
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Built with Next.js, Custom Headless Tree, and Dexie.js</p>
        </div>
      </div>
    </div>
  )
}
