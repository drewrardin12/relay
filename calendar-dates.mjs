export const FAMILY_DATES=[];
export function holidayDates(year){
 const nth=(month,weekday,n)=>{const d=new Date(year,month,1,12);return `${year}-${String(month+1).padStart(2,'0')}-${String(1+(weekday-d.getDay()+7)%7+7*(n-1)).padStart(2,'0')}`;};
 const lastMonday=month=>{const d=new Date(year,month+1,0,12);d.setDate(d.getDate()-(d.getDay()+6)%7);return `${year}-${String(month+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 return [['01-01','New Year’s Day'],[nth(0,1,3).slice(5),'Martin Luther King Jr. Day'],[nth(1,1,3).slice(5),'Presidents’ Day'],[lastMonday(4).slice(5),'Memorial Day'],['06-19','Juneteenth'],['07-04','Independence Day'],[nth(8,1,1).slice(5),'Labor Day'],[nth(9,1,2).slice(5),'Columbus Day'],['11-11','Veterans Day'],[nth(10,4,4).slice(5),'Thanksgiving Day'],['12-25','Christmas Day']].map(([md,title])=>({id:`holiday-${year}-${md}`,date:`${year}-${md}`,title,kind:'holiday'}));
}
