// Display-only cleanup. Original titles and notes remain unchanged.
export function tideContext(tide) {
 const text = tide.note || tide.title || '';
 if (!tide.legacyId) return text;
 return text.replace(/^(?:Call|Text|Email|Other) reminder\s*·\s*[A-Za-z]{3,9}\s+\d{1,2}(?:\s+at\s+\d{1,2}:\d{2}\s*[AP]M)?\s*/i, '').trim();
}
