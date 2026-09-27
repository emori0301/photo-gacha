const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 日本時間での「今日 0:00」を UTC の Date で返す */
export function startOfJstDay(now: Date) {
  const shifted = new Date(now.getTime() + JST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - JST_OFFSET_MS);
}

export function nextJstDay(now: Date) {
  return new Date(startOfJstDay(now).getTime() + 24 * 60 * 60 * 1000);
}
