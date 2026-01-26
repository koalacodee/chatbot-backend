
// Generate opaque token holding cursor data passed
export function encodeCursor<T = any>(data: T): string {
  return btoa(JSON.stringify(data));
}

// Decode opaque token holding cursor data passed
export function decodeCursor<T = any>(cursor: string): T {
  return JSON.parse(atob(cursor)) as T;
}