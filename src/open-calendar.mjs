// Read-only ABM calendar snapshot, September 17, 2026. Yellow (color 5)
// two-letter state events are explicit availability, not meetings or attendance.
export const OPEN_CALENDAR={checkedAt:'2026-09-17',markers:[
 ['2026-10-07','WI'],['2026-10-11','WI'],['2026-11-22','IL'],
 ['2026-11-29','IL'],['2026-12-06','IL'],['2026-12-09','IL'],
 ['2026-12-16','IL'],['2026-12-20','IL']
].map(([date,state])=>({id:`calendar-open-${date}`,date,kind:'open-date',title:`Open · ${state}`,state}))};
