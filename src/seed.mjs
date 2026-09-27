import {iso,addDays,firstMonday} from './domain.mjs';
export const VERSES=[
 ['Let us run with patience the race that is set before us.','Hebrews 12:1'],
 ['Commit thy works unto the LORD, and thy thoughts shall be established.','Proverbs 16:3'],
 ['The LORD is my shepherd; I shall not want.','Psalm 23:1'],
 ['Thy word is a lamp unto my feet, and a light unto my path.','Psalm 119:105'],
 ['Trust in the LORD with all thine heart; and lean not unto thine own understanding.','Proverbs 3:5'],
 ['In all thy ways acknowledge him, and he shall direct thy paths.','Proverbs 3:6'],
 ['I can do all things through Christ which strengtheneth me.','Philippians 4:13'],
 ['Be still, and know that I am God.','Psalm 46:10'],
 ['The joy of the LORD is your strength.','Nehemiah 8:10'],
 ['For we walk by faith, not by sight.','2 Corinthians 5:7'],
 ['My grace is sufficient for thee: for my strength is made perfect in weakness.','2 Corinthians 12:9'],
 ['Casting all your care upon him; for he careth for you.','1 Peter 5:7'],
 ['The LORD shall fight for you, and ye shall hold your peace.','Exodus 14:14'],
 ['The LORD is my light and my salvation; whom shall I fear?','Psalm 27:1'],
 ['What time I am afraid, I will trust in thee.','Psalm 56:3'],
 ['Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.','Isaiah 26:3'],
 ['They that wait upon the LORD shall renew their strength.','Isaiah 40:31'],
 ['Fear thou not; for I am with thee: be not dismayed; for I am thy God.','Isaiah 41:10'],
 ['Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.','Jeremiah 33:3'],
 ['The LORD is good, a strong hold in the day of trouble; and he knoweth them that trust in him.','Nahum 1:7'],
 ['Come unto me, all ye that labour and are heavy laden, and I will give you rest.','Matthew 11:28'],
 ['But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.','Matthew 6:33'],
 ['With God all things are possible.','Matthew 19:26'],
 ['Lo, I am with you alway, even unto the end of the world.','Matthew 28:20'],
 ['Let not your heart be troubled: ye believe in God, believe also in me.','John 14:1'],
 ['I am the way, the truth, and the life: no man cometh unto the Father, but by me.','John 14:6'],
 ['Peace I leave with you, my peace I give unto you.','John 14:27'],
 ['Without me ye can do nothing.','John 15:5'],
 ['And ye shall know the truth, and the truth shall make you free.','John 8:32'],
 ['Rejoicing in hope; patient in tribulation; continuing instant in prayer.','Romans 12:12'],
 ['Be not overcome of evil, but overcome evil with good.','Romans 12:21'],
 ['If God be for us, who can be against us?','Romans 8:31'],
 ['And we know that all things work together for good to them that love God.','Romans 8:28'],
 ['Be ye stedfast, unmoveable, always abounding in the work of the Lord.','1 Corinthians 15:58'],
 ['Let all your things be done with charity.','1 Corinthians 16:14'],
 ['And let us not be weary in well doing: for in due season we shall reap, if we faint not.','Galatians 6:9'],
 ['And be ye kind one to another, tenderhearted, forgiving one another.','Ephesians 4:32'],
 ['Finally, my brethren, be strong in the Lord, and in the power of his might.','Ephesians 6:10'],
 ['Rejoice in the Lord alway: and again I say, Rejoice.','Philippians 4:4'],
 ['And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.','Philippians 4:7'],
 ['But my God shall supply all your need according to his riches in glory by Christ Jesus.','Philippians 4:19'],
 ['Set your affection on things above, not on things on the earth.','Colossians 3:2'],
 ['And whatsoever ye do, do it heartily, as to the Lord, and not unto men.','Colossians 3:23'],
 ['Rejoice evermore.','1 Thessalonians 5:16'],
 ['Pray without ceasing.','1 Thessalonians 5:17'],
 ['In every thing give thanks: for this is the will of God in Christ Jesus concerning you.','1 Thessalonians 5:18'],
 ['Faithful is he that calleth you, who also will do it.','1 Thessalonians 5:24'],
 ['For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.','2 Timothy 1:7'],
 ['Study to shew thyself approved unto God, a workman that needeth not to be ashamed.','2 Timothy 2:15'],
 ['Jesus Christ the same yesterday, and to day, and for ever.','Hebrews 13:8'],
 ['Let us therefore come boldly unto the throne of grace.','Hebrews 4:16'],
 ['If any of you lack wisdom, let him ask of God.','James 1:5'],
 ['Draw nigh to God, and he will draw nigh to you.','James 4:8'],
 ['Humble yourselves therefore under the mighty hand of God, that he may exalt you in due time.','1 Peter 5:6'],
 ['We love him, because he first loved us.','1 John 4:19'],
 ['The LORD is on my side; I will not fear: what can man do unto me?','Psalm 118:6'],
 ['This is the day which the LORD hath made; we will rejoice and be glad in it.','Psalm 118:24'],
 ['O taste and see that the LORD is good: blessed is the man that trusteth in him.','Psalm 34:8'],
 ['The steps of a good man are ordered by the LORD: and he delighteth in his way.','Psalm 37:23'],
 ['The LORD shall preserve thy going out and thy coming in from this time forth, and even for evermore.','Psalm 121:8']
];
export function seed(now=new Date()){
 const today=iso(now),ago=n=>iso(addDays(now,-n)),later=n=>iso(addDays(now,n));
 const first=firstMonday(now.getFullYear(),now.getMonth());
 const relaySince=iso(new Date(now.getFullYear(),now.getMonth()-3,7,12));
 const rows=[
 ['m-aaron','Aaron Harris','Grace Baptist Church','Nashville','TN','manifest',1,150,36.16,-86.78],
 ['m-larry','Larry Lewis','Ruidoso Baptist Church','Ruidoso','NM','manifest',2,450,33.33,-105.67],
 ['m-matt','Matt Hudson','Bella Vista Baptist Church','Kankakee','IL','manifest',3,2650,41.12,-87.86],
 ['m-john','John McDaniel','Naschitti Baptist Church','Gallup','NM','manifest',4,0,35.53,-108.74],
 ['m-daniel','Daniel Moore','Harbor Light Baptist Church','Kenosha','WI','manifest',1,0,42.58,-87.82],
 ['m-mark','Mark Stevens','First Baptist Church','Rockford','IL','manifest',2,0,42.27,-89.09],
 ['v-charles','A. Charles Miller','Faith Baptist Church','Bourbonnais','IL','voyage',null,0,41.15,-87.89],
 ['v-harold','A. J. Harold','Solid Rock Baptist Church','Bradley','IL','voyage',null,0,41.14,-87.86],
 ['v-aaron','Aaron Barrett','Heartland Baptist Church','Manteno','IL','voyage',null,0,41.25,-87.83],
 ['v-ben','Benjamin Walker','Grace Bible Church','Peoria','IL','voyage',null,0,40.69,-89.59],
 ['v-chad','Chad Duncan','Temple Baptist Church','Wilmington','IL','voyage',null,0,41.31,-88.14],
 ['v-roger','Roger Harrison','Open Bible Baptist Church','Manitowoc','WI','voyage',null,0,44.09,-87.66],
 ['v-thomas','Thomas Shepherd','Good News Baptist Church','Joliet','IL','voyage',null,0,41.53,-88.08],
 ['v-no-phone','William Parker','Calvary Baptist Church','Kankakee','IL','voyage',null,0,41.11,-87.87]
 ];
 const contacts=rows.map(([id,pastor,church,city,state,wing,relayGroup,supportAmount,lat,lng],i)=>({id,pastor,church,city,state,wing,relayGroup,relaySince,phone:id==='v-no-phone'?[]:[`(555) 010-${String(1000+i).slice(-4)}`],email:[`${pastor.toLowerCase().split(' ')[0].replace(/[^a-z]/g,'')}@example.org`],address:'',lat,lng,starred:i===0||i===7,groups:wing==='manifest'?['Supporting','Visited']:[],supportStatus:supportAmount?'Supporting':'Non-supporting',supportAmount,supportCadence:supportAmount?'Monthly':'',supportStart:`${now.getFullYear()}-01-01`,lodging:i===0?'Available':'Unknown',rv:'Unknown',handouts:i===0?'Available':'Unknown',notes:'',createdAt:ago(100)}));
 contacts[0].phone.push('(555) 010-2000');
 const logs=[
  {id:'log1',contactId:'m-aaron',date:ago(3),type:'call',result:'pastor',details:'Discussed the upcoming meeting and confirmed lodging.',duration:'12 min'},
  {id:'log2',contactId:'m-aaron',date:ago(11),type:'text',result:'sent',details:'Bible handouts requested for Sunday morning.'},
  {id:'log3',contactId:'m-aaron',date:ago(35),type:'visit',result:'completed',details:'Preached Sunday morning and presented the ministry.'},
  {id:'log4',contactId:'m-aaron',date:ago(45),type:'note',result:'note',details:'Pastor mentioned their missions conference is held each October.'},
  {id:'log5',contactId:'v-harold',date:ago(14),type:'call',result:'voicemail',details:'Left a brief introduction.'},
  {id:'log6',contactId:'v-chad',date:ago(7),type:'call',result:'secretary',details:'Pastor is usually available after lunch.'},
  {id:'log7',contactId:'m-larry',date:ago(20),type:'email',result:'sent',details:'Sent ministry information.'}
 ];
 const meetings=[
  {id:'meeting1',contactId:'m-aaron',date:later(9),end:later(11),roles:['mic','manifest'],lodgingVerified:true,notes:'Bring Bible handouts for Sunday morning.',kind:'meeting'},
  {id:'meeting2',contactId:'m-matt',date:later(19),end:later(19),roles:['mic'],lodgingVerified:false,notes:'Morning service.',kind:'meeting'},
  {id:'meeting3',contactId:'m-daniel',date:later(28),end:later(29),roles:['manifest'],lodgingVerified:true,notes:'Ministry presentation.',kind:'meeting'},
  {id:'meeting4',contactId:'m-john',date:later(36),end:later(36),roles:['mic','manifest'],kind:'meeting'}
 ];
 const holidays=[{id:'christmas',date:'2026-12-25',annual:true,title:'Christmas Day',kind:'holiday'},{id:'new-year',date:'2026-01-01',annual:true,title:'New Year’s Day',kind:'holiday'},{id:'demo-vacation',date:later(23),end:later(25),title:'Vacation',kind:'vacation'}];
 const gifts=[];
 for(let m=0;m<now.getMonth();m++)for(const c of contacts.filter(c=>c.supportAmount))gifts.push({id:`gift-${m}-${c.id}`,contactId:c.id,date:iso(new Date(now.getFullYear(),m,5,12)),amount:c.supportAmount,type:'support'});
 gifts.push({id:'gift-love',contactId:'m-aaron',date:ago(19),amount:350,type:'love_gift'});
 return {version:1,mode:'demo',contacts,logs,meetings,events:[...meetings,...holidays],gifts,tides:[
  {id:'tide1',contactId:'m-aaron',action:'call',title:'Discuss the upcoming meeting',due:ago(3),time:'',note:'Check in before the visit.',completed:false},
  {id:'tide2',contactId:'v-chad',action:'email',title:'Send ministry information',due:today,time:'',note:'Pastor asked for a short ministry overview.',completed:false},
  {id:'tide3',contactId:'m-larry',action:'text',title:'Check arrival details',due:later(2),time:'',note:'',completed:false}
 ],settings:{yearlyGoal:70000,showNoNumbers:false,name:'Andrew',notifications:false,familyDates:[]},course:null,recents:['v-harold','v-chad','v-charles'],createdAt:today};
}
