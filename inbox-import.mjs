const object = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, label, max = 200) => {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} 형식을 확인해 주세요`);
  return value;
};
const id = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error('기록 ID 형식을 확인해 주세요');
  return value;
};
function visits(values) {
  if (!Array.isArray(values) || !values.length || values.length > 1000) throw new Error('방문 기록은 1~1000개여야 합니다');
  return values.map(value => {
    if (!object(value)) throw new Error('방문 기록 형식을 확인해 주세요');
    const d = text(value.date, '방문 날짜', 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) !== d) throw new Error('방문 날짜는 YYYY-MM-DD 형식이어야 합니다');
    return {d, m: text(value.memo ?? '', '한줄평', 80), b: value.by ? `name:${text(value.by, '작성자', 80)}` : null};
  });
}
export function parseInbox(input, catalog) {
  if (!object(input) || input.format !== 'gomjji-matjip-inbox' || input.version !== 1 || !Array.isArray(input.stamps) || !Array.isArray(input.log)) throw new Error('지원하는 inbox JSON 형식(version 1)이 아닙니다');
  if (input.stamps.length + input.log.length > 1000) throw new Error('한 번에 최대 1000곳까지 가져올 수 있습니다');
  const records = [], seen = new Set();
  const add = record => {
    const key = `${record.collection}/${record.id}`;
    if (seen.has(key)) throw new Error(`파일에 중복된 기록 ID가 있습니다: ${record.id}`);
    seen.add(key); records.push(record);
  };
  for (const item of input.stamps) {
    if (!object(item) || !Object.hasOwn(catalog, item.page) || !catalog[item.page].includes(item.shopId)) throw new Error(`앱에 없는 가게입니다: ${item?.shopId ?? ''}`);
    const [first, ...r] = visits(item.visits);
    add({collection: `stamps-${item.page}`, id: id(item.shopId), data: {...first, ...(r.length ? {r} : {})}});
  }
  for (const item of input.log) {
    if (!object(item)) throw new Error('내 기록 형식을 확인해 주세요');
    const [first, ...r] = visits(item.visits);
    const n = text(item.name, '가게 이름');
    if (!n.trim()) throw new Error('가게 이름이 비어 있습니다');
    const star = item.star ?? 0;
    if (!Number.isInteger(star) || star < 0 || star > 5) throw new Error('별점은 0~5 정수여야 합니다');
    add({collection: 'mylog', id: id(item.id), data: {n, cat: text(item.category ?? '기타', '분류'), loc: text(item.location ?? '', '위치'), star, ...first, ...(r.length ? {r} : {})}});
  }
  return records;
}
// Preserve existing metadata and the largest occurrence count of each visit.
export function mergeRecord(existing, incoming) {
  if (!existing) return incoming;
  const key = value => JSON.stringify([value.d, value.m || '', value.b || null]);
  const all = value => [{d: value.d, m: value.m || '', b: value.b || null}, ...(value.r || [])];
  const result = all(existing), counts = new Map(), used = new Map();
  for (const visit of result) counts.set(key(visit), (counts.get(key(visit)) || 0) + 1);
  for (const visit of all(incoming)) {
    const k = key(visit), count = (used.get(k) || 0) + 1;
    used.set(k, count);
    if (count > (counts.get(k) || 0)) result.push(visit);
  }
  const [first, ...r] = result;
  const merged = {...incoming, ...existing, ...first};
  if (r.length) merged.r = r; else delete merged.r;
  return merged;
}
