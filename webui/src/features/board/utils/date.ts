// utils/formatDistanceToNow.ts
export function formatDistanceToNow(
  isoDate?: string | null
): { text: string | undefined; tooltip: string | undefined } {
  if (!isoDate) {
    return { text: undefined, tooltip: undefined }
  }

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) {
    // Invalid date string
    return { text: undefined, tooltip: undefined }
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  let text: string;
  if (seconds < 60) {
    text = `${seconds}s ago`
  } else if (minutes < 60) {
    text = `${minutes}m ago`
  } else if (hours < 24) {
    text = `${hours}h ago`
  } else if (days < 7) {
    text = `${days}d ago`
  } else if (weeks < 5) {
    text = `${weeks}w ago`
  } else if (months < 12) {
    text = `${months}mo ago`
  } else {
    text = `${years}y ago`
  }

  // Tooltip full date (localized, human-friendly)
  const tooltip = date.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return { text, tooltip }
}