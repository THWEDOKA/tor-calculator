import { callDesktop, isDesktop } from "@/lib/desktop-api"

export const LS_GOAL = "tor-goal"
export const SETTING_GOAL = "goal"

export type GoalContribution = {
  id: number
  amount: number
  comment: string
  createdAt: string
  transactionId?: number
}

export type StoredGoal = {
  title: string
  imageDataUrl: string
  targetAmount: number
  currentAmount: number
  deadline: string
  createdAt: string
  contributions?: GoalContribution[]
}

export function loadGoal(): StoredGoal | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(LS_GOAL)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredGoal
    if (parsed?.title && Number(parsed.targetAmount) > 0) return parsed
  } catch {
  }
  return null
}

function parseGoal(raw: string | null): StoredGoal | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredGoal
    if (parsed?.title && Number(parsed.targetAmount) > 0) return parsed
  } catch {
  }
  return null
}

export async function loadGoalAsync(): Promise<StoredGoal | null> {
  if (typeof window === "undefined") return null
  if (isDesktop()) {
    try {
      const res = await callDesktop<{ ok: boolean; value?: string | null }>("setting_get", SETTING_GOAL)
      if ((res as any).ok) {
        const fromDesktop = parseGoal((res as any).value ?? null)
        if (fromDesktop) {
          localStorage.setItem(LS_GOAL, JSON.stringify(fromDesktop))
          return fromDesktop
        }
        const local = loadGoal()
        if (local) {
          await saveGoalAsync(local)
          return local
        }
        return null
      }
    } catch {
      // fallback ниже
    }
  }
  return loadGoal()
}

export function saveGoal(goal: StoredGoal | null) {
  if (!goal) {
    localStorage.removeItem(LS_GOAL)
    return
  }
  localStorage.setItem(LS_GOAL, JSON.stringify(goal))
}

export async function saveGoalAsync(goal: StoredGoal | null): Promise<void> {
  saveGoal(goal)
  if (!isDesktop()) return
  try {
    if (!goal) {
      await callDesktop("setting_delete", SETTING_GOAL)
      return
    }
    await callDesktop("setting_set", SETTING_GOAL, JSON.stringify(goal))
  } catch {
    // local copy remains as a fallback
  }
}

export function addGoalProgress(
  amount: number,
  meta: { comment?: string; createdAt?: string | Date; transactionId?: number } = {}
): StoredGoal | null {
  const goal = loadGoal()
  if (!goal || amount <= 0) return null
  const nextAmount = Math.min(goal.targetAmount, Math.max(0, goal.currentAmount + amount))
  const appliedAmount = Math.max(0, nextAmount - goal.currentAmount)
  if (appliedAmount <= 0) return goal
  const createdAt =
    meta.createdAt instanceof Date
      ? meta.createdAt.toISOString()
      : meta.createdAt || new Date().toISOString()
  const next = {
    ...goal,
    currentAmount: nextAmount,
    contributions: [
      {
        id: Date.now(),
        amount: appliedAmount,
        comment: meta.comment?.trim() || "Пополнение цели",
        createdAt,
        transactionId: meta.transactionId,
      },
      ...(goal.contributions ?? []),
    ].slice(0, 80),
  }
  saveGoal(next)
  return next
}

export async function addGoalProgressAsync(
  amount: number,
  meta: { comment?: string; createdAt?: string | Date; transactionId?: number } = {}
): Promise<StoredGoal | null> {
  const goal = await loadGoalAsync()
  if (!goal || amount <= 0) return null
  const nextAmount = Math.min(goal.targetAmount, Math.max(0, goal.currentAmount + amount))
  const appliedAmount = Math.max(0, nextAmount - goal.currentAmount)
  if (appliedAmount <= 0) return goal
  const createdAt =
    meta.createdAt instanceof Date
      ? meta.createdAt.toISOString()
      : meta.createdAt || new Date().toISOString()
  const next = {
    ...goal,
    currentAmount: nextAmount,
    contributions: [
      {
        id: Date.now(),
        amount: appliedAmount,
        comment: meta.comment?.trim() || "Пополнение цели",
        createdAt,
        transactionId: meta.transactionId,
      },
      ...(goal.contributions ?? []),
    ].slice(0, 80),
  }
  await saveGoalAsync(next)
  return next
}

export async function removeGoalContributionsByTransactionIds(transactionIds: number[]): Promise<StoredGoal | null> {
  const ids = new Set(transactionIds.filter((id) => Number.isFinite(id)))
  if (ids.size === 0) return await loadGoalAsync()
  const goal = await loadGoalAsync()
  if (!goal) return null
  const contributions = goal.contributions ?? []
  const removedTotal = contributions
    .filter((item) => item.transactionId !== undefined && ids.has(item.transactionId))
    .reduce((sum, item) => sum + item.amount, 0)
  if (removedTotal <= 0) return goal
  const next = {
    ...goal,
    currentAmount: Math.max(0, goal.currentAmount - removedTotal),
    contributions: contributions.filter((item) => item.transactionId === undefined || !ids.has(item.transactionId)),
  }
  await saveGoalAsync(next)
  return next
}
