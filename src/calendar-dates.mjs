export const FAMILY_DATES=[
 ['andrew','2026-12-12','Andrew’s birthday','birthday'],
 ['abby','2026-08-29','Abby’s birthday','birthday'],
 ['alexis','2021-02-23','Alexis’s birthday','birthday'],
 ['haddon','2024-12-12','Haddon’s birthday','birthday'],
 ['joslyn','2026-04-10','Joslyn’s birthday','birthday'],
 ['anniversary','2019-06-21','Andrew & Abby’s anniversary','anniversary']
].map(([id,date,title,kind])=>({id:`family-${id}`,date,title,kind,family:true,annual:true}));
export function holidayDates(year){
 const nth=(month,weekday,n)=>{const d=new Date(year,month,1,12);return `${year}-${String(month+1).padStart(2,'0')}-${String(1+(weekday-d.getDay()+7)%7+7*(n-1)).padStart(2,'0')}`;};
 const lastMonday=month=>{const d=new Date(year,month+1,0,12);d.setDate(d.getDate()-(d.getDay()+6)%7);return `${year}-${String(month+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 return [['01-01','New Year’s Day'],[nth(0,1,3).slice(5),'Martin Luther King Jr. Day'],[nth(1,1,3).slice(5),'Presidents’ Day'],[lastMonday(4).slice(5),'Memorial Day'],['06-19','Juneteenth'],['07-04','Independence Day'],[nth(8,1,1).slice(5),'Labor Day'],[nth(9,1,2).slice(5),'Columbus Day'],['11-11','Veterans Day'],[nth(10,4,4).slice(5),'Thanksgiving Day'],['12-25','Christmas Day']].map(([md,title])=>({id:`holiday-${year}-${md}`,date:`${year}-${md}`,title,kind:'holiday'}));
}
