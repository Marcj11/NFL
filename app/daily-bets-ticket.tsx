'use client';
import {useEffect,useState} from 'react';
type Bet={id:string;game:string;market:string;selection:string;player?:string;stake?:number;chosenOdds?:number;placedAt?:string;resultConfirmedAt?:string;status:string};
const day=(s?:string)=>s&&Number.isFinite(Date.parse(s))?new Date(s).toLocaleDateString('en-CA',{timeZone:'America/Toronto'}):'';
const money=(n:number)=>n.toLocaleString('fr-CA',{minimumFractionDigits:2,maximumFractionDigits:2});
const pnl=(b:Bet)=>b.status==='won'?(Number(b.stake)||0)*((Number(b.chosenOdds)||1)-1):b.status==='lost'?-(Number(b.stake)||0):0;
export default function DailyBetsTicket({bets}:{bets:Bet[]}){
 const [index,setIndex]=useState(0),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const id=setInterval(()=>setIndex(x=>x+1),30000);return()=>clearInterval(id)},[]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(id)},[]);
 const today=new Date(now).toLocaleDateString('en-CA',{timeZone:'America/Toronto'});
 const daily=bets.filter(b=>day(b.placedAt)===today||day(b.resultConfirmedAt)===today).sort((a,b)=>Date.parse(b.resultConfirmedAt||b.placedAt||'')-Date.parse(a.resultConfirmedAt||a.placedAt||''));
 const finished=daily.filter(b=>(b.status==='won'||b.status==='lost')&&day(b.resultConfirmedAt)===today);
 const total=finished.reduce((sum,b)=>sum+pnl(b),0);
 const pending=daily.filter(b=>b.status==='open');
 const stake=pending.reduce((sum,b)=>sum+(Number(b.stake)||0),0);
 const win=finished.filter(b=>b.status==='won').length,loss=finished.filter(b=>b.status==='lost').length;
 const slides=[{id:'total',title:'BILAN DE LA JOURNÉE',subject:total>0?'🟢 ON EST UP':total<0?'🔴 ON EST DOWN':'🟠 ON EST NEUTRE',detail:(total>0?'+':'')+money(total)+' $ CAD',note:win+' gagnés · '+loss+' perdus · '+pending.length+' en cours'},...daily.map(b=>({id:b.id,title:b.status==='won'?'✅ PARI GAGNÉ':b.status==='lost'?'❌ PARI PERDU':b.status==='void'?'↩️ PARI ANNULÉ':'⏳ PARI EN COURS',subject:b.player||b.selection||b.game,detail:b.player?b.selection:b.game,note:b.status==='won'||b.status==='lost'?(pnl(b)>0?'+':'')+money(pnl(b))+' $ CAD réalisés':money(Number(b.stake)||0)+' $ CAD misés · '+(b.status==='open'?'en cours':'annulé')}))];
 const slide=slides[index%slides.length];const accent=total>0?'#65eac0':total<0?'#ff849a':'#ffc878';
 return <article className="studio-live-ticket" style={{position:'relative',overflow:'hidden',minHeight:340,borderRadius:22,border:'1px solid '+accent,background:'linear-gradient(140deg,'+(total>0?'#16463d':total<0?'#45243a':'#3e3324')+',#101c36 66%,#0c172a)',boxShadow:'inset 0 0 35px #22486a44,0 0 24px #14324b99',padding:'22px 19px',display:'flex',flexDirection:'column',gap:12}}>
 <div style={{position:'absolute',inset:'0 0 auto',height:4,background:'linear-gradient(90deg,'+accent+',transparent)'}}/>
 <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong style={{letterSpacing:1,fontSize:13,color:'#fff'}}>💰 LES BETS DES BOYS AUJOURD’HUI</strong><span style={{fontSize:11,color:accent,fontWeight:900}}>30 SEC / BILAN</span></div>
 <div style={{fontSize:12,color:accent,fontWeight:900}}>{slide.title}</div>
 <h3 style={{fontSize:23,margin:0,color:'#fff',lineHeight:1.2}}>{slide.subject}</h3><p style={{color:'#d8eafa',margin:0,fontSize:15}}>{slide.detail}</p>
 <div style={{background:'#081b2cab',border:'1px solid '+accent+'70',borderRadius:13,padding:13}}>
 <strong style={{fontSize:11,color:accent}}>📊 AU COMPTEUR DEPUIS MINUIT · QUÉBEC</strong>
 <div style={{fontSize:27,color:accent,fontWeight:950,marginTop:8}}>{total>0?'+':''}{money(total)} $ CAD</div>
 <div style={{fontSize:12,color:'#d8e9f8',marginTop:5}}>{win} gagnés · {loss} perdus · {pending.length} ouverts</div>
 <div style={{fontSize:12,color:'#abc8d9',marginTop:5}}>{money(stake)} $ CAD encore en jeu (non comptés dans le profit)</div></div>
 <div style={{fontSize:12,color:'#b6cfe0'}}>{slide.note}</div>
 <div style={{marginTop:'auto',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}><span style={{fontSize:12,color:'#b6cce0'}}>Carte {(index%slides.length)+1} / {slides.length}</span><button type="button" onClick={()=>setIndex(x=>x+1)} style={{border:'1px solid #77cbed',borderRadius:9,padding:'9px 12px',color:'#fff',background:'#214366',fontWeight:850,cursor:'pointer'}}>Suivant ›</button></div>
 <small style={{color:'#8aaac0'}}>Profit réalisé selon les résultats confirmés dans ton coffre. Les paris ouverts sont séparés.</small></article>;
}
