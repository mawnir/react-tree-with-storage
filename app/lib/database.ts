import Dexie, { type EntityTable } from "dexie"

export interface TreeItem {
  id: number
  text: string
  order: number
  parentId: number | null
  isFolder: boolean
  isExpanded: boolean
  createdAt: Date
  children?: TreeItem[]
}

const db = new Dexie("DraggableTreeDB") as Dexie & {
  items: EntityTable<TreeItem, "id">
}

// Define schemas
db.version(1).stores({
  items: "++id, text, order, parentId, isFolder, isExpanded, createdAt",
})

// Add hooks for data validation
db.items.hook("creating", (primKey, obj, trans) => {
  obj.createdAt = obj.createdAt || new Date()
  obj.isExpanded = obj.isExpanded ?? true
  obj.parentId = obj.parentId ?? null
})

db.items.hook("updating", (modifications, primKey, obj, trans) => {
  if (modifications.hasOwnProperty("order") && typeof (modifications as Partial<TreeItem>).order !== "number") {
    throw new Error("Order must be a number")
  }
})

export { db }
