/** Valid Dart identifier from token or color names */
export function sanitizeDartIdentifier(raw: string): string {
  let id = raw
    .replace(/^color[-_]?/i, 'color')
    .replace(/^spacing[-_]?/i, 'spacing')
    .replace(/^radius[-_]?/i, 'radius')
    .replace(/^text[-_]?/i, 'text')
    .replace(/[^a-zA-Z0-9_]/g, '');

  if (!id) return 'unnamed';
  if (/^[0-9]/.test(id)) id = `c${id}`;
  if (/^[A-Z]/.test(id)) id = id.charAt(0).toLowerCase() + id.slice(1);

  return id;
}

export function colorTokenName(hex: string, styleName?: string): string {
  if (styleName) {
    const fromStyle = sanitizeDartIdentifier(styleName);
    if (fromStyle && fromStyle !== 'unnamed') return fromStyle;
  }
  const clean = hex.replace('#', '').toLowerCase();
  return sanitizeDartIdentifier(`color${clean}`);
}
