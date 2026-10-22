// Display only recognized status values; legacy dates are not availability evidence.
export function amenityStatus(value){
 const text=String(value??'').trim();
 return ['Available','Unavailable','Unknown','Yes','No'].includes(text)?text:'Unknown';
}
