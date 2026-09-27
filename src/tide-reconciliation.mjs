import {iso} from './domain.mjs';
const completed = c => c.completed === true || c.completed === 'true';
export function reconcileTides(state, snapshot) {
 if (!snapshot.checkedAt || !Array.isArray(snapshot.calls) || !Array.isArray(snapshot.contactIds) || !Array.isArray(snapshot.baseline)) throw new Error('Choose a verified Tide reconciliation snapshot.');
 if (state.tideReconciliation?.checkedAt === snapshot.checkedAt) return structuredClone(state);
 const contacts = new Set(snapshot.contactIds.map(String));
 const live = new Map(snapshot.calls.map(c => [String(c.id), c]));
 const baseline = new Map(snapshot.baseline.map(c => [String(c.id), c]));
 const next = structuredClone(state), changes = [], conflicts = [];
 for (const t of next.tides) {
  const id = t.legacyId;
  if (!id || !baseline.has(id)) continue; // Never replace newly created Tides.
  const old = baseline.get(id), c = live.get(id);
  if (t.completed !== completed(old) || t.due !== iso(old.remDate) || t.time !== (old.remTime || '') || t.contactId !== String(old.contactId) || t.note !== (old.details || '') || t.title !== (old.details || 'Follow up')) {
   conflicts.push(t.id); continue; // Preserve edits made in the new app.
  }
  t.legacyReconciliation = {checkedAt:snapshot.checkedAt,previous:structuredClone(t),reason:''};
  if (c) {
   t.completed = completed(c);
   t.due = c.remDate ? String(c.remDate).split('T')[0] : '';
   t.time = c.remTime || '';
   t.note = c.details || '';
   t.title = c.details || 'Follow up';
   t.contactId = String(c.contactId);
   t.action = ['call','text','email'].includes(c.remType) ? c.remType : 'other';
  }
  const reason = !c ? 'Not returned by the old app’s current call-history window' : !contacts.has(String(c.contactId)) ? 'Contact not present in the old app’s loaded contact list' : c.outcome !== 'reminder' && !completed(c) ? 'Record is not an active reminder in the old app' : '';
  t.legacyHidden = Boolean(reason);
  t.legacyReconciliation.reason = reason;
  changes.push({id:t.id,reason,completed:t.completed});
 }
 for (const c of snapshot.calls) {
  if (c.outcome !== 'reminder' || completed(c) || !contacts.has(String(c.contactId))) continue;
  if (next.tides.some(t => t.legacyId === String(c.id))) continue;
  if (!next.contacts.some(t => t.id === String(c.contactId))) {conflicts.push(String(c.id));continue;}
  next.tides.push({id:`tide-${c.id}`,legacyId:String(c.id),contactId:String(c.contactId),title:c.details||'Follow up',note:c.details||'',action:['call','text','email'].includes(c.remType)?c.remType:'other',due:String(c.remDate||'').split('T')[0],time:c.remTime||'',completed:false});
 }
 next.tideReconciliation = {checkedAt:snapshot.checkedAt,changes,conflicts,expectedActive:snapshot.calls.filter(c=>c.outcome==='reminder'&&!completed(c)&&contacts.has(String(c.contactId))).length};
 return next;
}
