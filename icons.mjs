const paths={
 // Official Lucide Pencil icon, ISC license (lucide-LICENSE.txt).
 edit:'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
 helm:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v9m0 4v9M1 12h9m4 0h9M4.2 4.2l6.4 6.4m2.8 2.8 6.4 6.4M4.2 19.8l6.4-6.4m2.8-2.8 6.4-6.4"/>',
 manifest:'<path d="M3 3h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v17h-6a4 4 0 0 0-3 1 4 4 0 0 0-3-1H3zM12 5v16M6 7h3m-3 4h3m6-4h3m-3 4h3"/>',
 voyage:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
 tides:'<path d="M2 7c3-4 5-4 8 0s5 4 8 0 3-2 4 0M2 12c3-4 5-4 8 0s5 4 8 0 3-2 4 0M2 17c3-4 5-4 8 0s5 4 8 0 3-2 4 0"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 call:'<path d="m6 3 3 4-2 3c2 3 4 5 7 7l3-2 4 3-1 3c-7 2-19-10-17-17z"/>',
 text:'<path d="M3 4h18v13H8l-5 4z"/>',email:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 5 10 8L22 5"/>',
 direction:'<path d="m3 10 18-7-7 18-3-8z"/>', pin:'<path d="M19 9c0 6-7 13-7 13S5 15 5 9a7 7 0 1 1 14 0z"/><circle cx="12" cy="9" r="2"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/>',
 person:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3z"/>',
 support:'<circle cx="9" cy="7" r="3"/><path d="M2 20v-3a7 7 0 0 1 14 0v3zM17 4a3 3 0 0 1 0 6m2 3a6 6 0 0 1 3 7"/>',
 gift:'<rect x="3" y="9" width="18" height="4"/><path d="M5 13v8h14v-8M12 9v12M12 9C4 9 4 1 8 3c3 0 4 6 4 6Zm0 0s1-6 4-6c4-2 4 6-4 6Z"/>',
 bed:'<path d="M2 21V6m0 11h20v4M2 9h7v8m0-6h10a3 3 0 0 1 3 3v3"/><path d="M4 11h3v3H4z"/>',
 rv:'<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M5 7h5v5H5zm9 0h5v5h-5z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
 mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M6 11v2a6 6 0 0 0 12 0v-2M12 19v3m-4 0h8"/>',
 anchor:'<circle cx="12" cy="4" r="2"/><path d="M12 6v15M7 9h10M3 14v4m18-4v4M3 16c0 7 18 7 18 0"/>',
 search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/>',chevron:'<path d="m9 5 7 7-7 7"/>',back:'<path d="m15 5-7 7 7 7"/>',plus:'<path d="M12 3v18M3 12h18"/>',close:'<path d="m5 5 14 14M5 19 19 5"/>',check:'<path d="m4 12 5 5L20 6"/>',
 // Lucide Settings icon (ISC license): https://lucide.dev/icons/settings
 settings:'<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
 filter:'<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',refresh:'<path d="M20 8a8 8 0 1 0 1 8M20 3v5h-5"/>',
 star:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 cake:'<path d="M4 13h16v8H4zm-1 0c2 3 4-3 6 0s4-3 6 0 4-3 6 0M7 13V8m5 5V8m5 5V8M7 3v2m5-2v2m5-2v2"/>',
 rings:'<circle cx="8" cy="14" r="6"/><circle cx="16" cy="14" r="6"/><path d="m5 3 3-2 3 2-3 4zM13 3l3-2 3 2-3 4"/>',
 flag:'<path d="M5 22V2c6-3 8 4 14 1v11c-6 3-8-4-14-1"/>',note:'<path d="M5 2h14v20H5zM8 7h8m-8 4h8m-8 4h5"/>',download:'<path d="M12 2v13m-5-5 5 5 5-5M3 16v5h18v-5"/>',moon:'<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12z"/>',
 church:'<path d="M12 2v5m-2-3h4M6 13l6-6 6 6v9H6zM2 16l4-3m12 0 4 3v6H2v-6M10 22v-6h4v6"/>',
 voicemail:'<circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><path d="M6 16h12"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m12 12 9-9m-4 0h4v4"/>'
};
export function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.note}</svg>`;}
