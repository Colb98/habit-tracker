import Dexie, { type Table } from 'dexie'
import type { Entry, Habit, Photo } from './types'

class HabitDB extends Dexie {
  habits!: Table<Habit, string>
  entries!: Table<Entry, string>
  photos!: Table<Photo, string>

  constructor() {
    super('habit-tracker')
    this.version(1).stores({
      habits: 'id, order',
      entries: 'id, habitId, date',
      photos: 'id, habitId, date, takenAt, createdAt',
    })
  }
}

export const db = new HabitDB()

type Listener = () => void
const listeners = new Set<Listener>()

/** Được gọi sau mọi thay đổi dữ liệu ảnh hưởng tới lịch nhắc (để đồng bộ server). */
export function onDataChange(fn: Listener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const changed = () => listeners.forEach((fn) => fn())

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export async function saveHabit(h: Habit) {
  await db.habits.put(h)
  changed()
}

export async function createHabit(data: Omit<Habit, 'id' | 'order' | 'createdAt'>): Promise<Habit> {
  const last = await db.habits.orderBy('order').last()
  const habit: Habit = { ...data, id: uid(), order: (last?.order ?? 0) + 1, createdAt: Date.now() }
  await saveHabit(habit)
  return habit
}

export async function deleteHabit(id: string) {
  await db.transaction('rw', db.habits, db.entries, db.photos, async () => {
    await db.habits.delete(id)
    await db.entries.where('habitId').equals(id).delete()
    await db.photos.where('habitId').equals(id).delete()
  })
  changed()
}

export async function setEntryValue(habitId: string, date: string, value: number) {
  const id = `${habitId}_${date}`
  if (value <= 0) await db.entries.delete(id)
  else await db.entries.put({ id, habitId, date, value, updatedAt: Date.now() })
  changed()
}

export async function addPhoto(p: Omit<Photo, 'id' | 'createdAt'>): Promise<Photo> {
  const photo: Photo = { ...p, id: uid(), createdAt: Date.now() }
  await db.photos.put(photo)
  return photo
}

export async function deletePhoto(id: string) {
  await db.photos.delete(id)
}

export async function updateCaption(id: string, caption: string) {
  await db.photos.update(id, { caption })
}

export async function wipeAll() {
  await db.transaction('rw', db.habits, db.entries, db.photos, async () => {
    await Promise.all([db.habits.clear(), db.entries.clear(), db.photos.clear()])
  })
  changed()
}

// ---------- Sao lưu / khôi phục ----------

interface Backup {
  app: 'habit-tracker'
  version: 1
  exportedAt: number
  habits: Habit[]
  entries: Entry[]
  photos: (Omit<Photo, 'blob'> & { data: string })[]
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

export async function exportBackup(): Promise<Blob> {
  const [habits, entries, photos] = await Promise.all([
    db.habits.toArray(),
    db.entries.toArray(),
    db.photos.toArray(),
  ])
  const data: Backup = {
    app: 'habit-tracker',
    version: 1,
    exportedAt: Date.now(),
    habits,
    entries,
    photos: await Promise.all(
      photos.map(async ({ blob, ...rest }) => ({ ...rest, data: await blobToDataUrl(blob) })),
    ),
  }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

export async function importBackup(file: File): Promise<{ habits: number; photos: number }> {
  const data = JSON.parse(await file.text()) as Backup
  if (data.app !== 'habit-tracker') throw new Error('File không phải bản sao lưu của app này')
  const photos: Photo[] = await Promise.all(
    data.photos.map(async ({ data: url, ...rest }) => ({ ...rest, blob: await (await fetch(url)).blob() })),
  )
  await db.transaction('rw', db.habits, db.entries, db.photos, async () => {
    await db.habits.bulkPut(data.habits)
    await db.entries.bulkPut(data.entries)
    await db.photos.bulkPut(photos)
  })
  changed()
  return { habits: data.habits.length, photos: photos.length }
}
