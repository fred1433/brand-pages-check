import meta from '../assets.json';
const files = import.meta.glob('../assets/*.{webp,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export function asset(key: string) {
  const a = (meta as Record<string, { file: string; alt: string; credit: string }>)[key];
  if (!a) throw new Error(`Unknown image "${key}"`);
  return { src: files[`../assets/${a.file}`], alt: a.alt, credit: a.credit };
}
export const logo = files['../assets/logo.svg'];
