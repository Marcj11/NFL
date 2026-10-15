import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Game={game_id:string;home_team_id:string;away_team_id:string;kickoff_utc:string};
type Result={game_id:string;home_score:number|null;away_score:number|null};
type Story={id:string;team:string;opponent:string;game_id:string;headline:string;body:string;punchline:string;metric:string;kind:string;kickoff_utc:string;home_score:number;away_score:number;source:string};
const labels:Record<string,string>={ARI:'Cardinals',ATL:'Falcons',BAL:'Ravens',BUF:'Bills',CAR:'Panthers',CHI:'Bears',CIN:'Bengals',CLE:'Browns',DAL:'Cowboys',DEN:'Broncos',DET:'Lions',GB:'Packers',HOU:'Texans',IND:'Colts',JAX:'Jaguars',KC:'Chiefs',LV:'Raiders',LAC:'Chargers',LA:'Rams',MIA:'Dolphins',MIN:'Vikings',NE:'Patriots',NO:'Saints',NYG:'Giants',NYJ:'Jets',PHI:'Eagles',PIT:'Steelers',SF:'49ers',SEA:'Seahawks',TB:'Buccaneers',TEN:'Titans',WAS:'Commanders'};
const teamName=(id:string)=>labels[id]||id;
function story(game:Game,result:Result,index:number):Story{
 const h=Number(result.home_score),a=Number(result.away_score),homeWins=h>a;
 const winner=homeWins?game.home_team_id:game.away_team_id;
 const loser=homeWins?game.away_team_id:game.home_team_id;
 const margin=Math.abs(h-a),total=h+a,high=Math.max(h,a),low=Math.min(h,a);
 const tie=h===a;
 const topic=tie?'ÉGALITÉ':margin>=21?'DÉMOLITION':margin<=3?'CHAUD CHAUD':total>=65?'FEU D’ARTIFICE':low<=10?'DÉFENSE EN BÉTON':'BILAN DU VESTIAIRE';
 const variations=[
  'Les boys, on a checké le tableau final, pas les rumeurs de vestiaire.',
  'Ça, c’est pas une prédiction sortie du cul : le pointage est confirmé dans notre banque.',
  'On se conte pas de bullshit : voici exactement ce que la feuille de match raconte.',
  'On sort les chiffres avant de faire les grandes gueules, tabarnak.'
 ];
 let headline='',body='',punchline='';
 if(tie){
  headline='PERSONNE A FINI LA JOB : '+teamName(game.away_team_id)+' VS '+teamName(game.home_team_id);
  body='Les deux gangs ont fini à '+h+'–'+a+'. Pas de vainqueur à inventer. '+variations[index%variations.length];
  punchline='Deux gangs, même pointage. Les boys, personne peut fanfaronner ici, esti.';
 }else if(margin>=21){
  headline=teamName(winner).toUpperCase()+' A PASSÉ LE ROULEAU COMPRESSEUR';
  body=teamName(winner)+' a sacré une volée de '+margin+' points à '+teamName(loser)+', avec un score final de '+a+' à '+h+' (visiteur–domicile). '+variations[index%variations.length];
  punchline='Ça, c’est pas gagner sur la pointe des pieds : c’est débarquer avec les bottes pleines de bouette, tabarnak !';
 }else if(margin<=3){
  headline='LES CORONES ONT TREMBLÉ JUSQU’À LA FIN';
  body=teamName(winner)+' s’en est tiré avec une avance de seulement '+margin+' point'+(margin>1?'s':'')+'. Score final : '+a+' à '+h+' (visiteur–domicile). Une game serrée en maudit, mais on n’invente pas comment les derniers jeux se sont déroulés.';
  punchline='Si t’avais misé sur le gagnant, ton divan doit encore avoir les marques de tes corones.';
 }else if(total>=65){
  headline='LES TABLEAUX DE POINTS ONT PRIS EN FEU';
  body=total+' points combinés dans '+teamName(game.away_team_id)+' contre '+teamName(game.home_team_id)+'. '+teamName(winner)+' finit avec '+high+' points, '+teamName(loser)+' avec '+low+'. On parle d’une production offensive au pointage, pas d’un diagnostic sur les QB.';
  punchline='Osti, le marqueur devait avoir des crampes à force de peser sur son piton !';
 }else if(low<=10){
  headline=teamName(loser).toUpperCase()+' : L’ATTAQUE A FAIT DUR EN MAUDIT';
  body=teamName(loser)+' a inscrit seulement '+low+' points contre '+teamName(winner)+'. Le résultat final est de '+a+' à '+h+' (visiteur–domicile). Sans les stats individuelles, on ne met pas ça sur le dos du QB.';
  punchline='Avec '+low+' points au tableau, ça prend pas un doctorat pour voir que ça scorait pas fort, sacrament.';
 }else{
  headline=teamName(winner).toUpperCase()+' A FAIT SA JOB';
  body=teamName(winner)+' a battu '+teamName(loser)+' par '+margin+' points ('+a+'–'+h+', visiteur–domicile). '+variations[index%variations.length];
  punchline='Le score ment pas, les boys. Le reste, c’est du jasage de taverne.';
 }
 return {id:game.game_id,team:winner,opponent:loser,game_id:game.game_id,headline,body,punchline,metric:tie?'ÉGALITÉ':margin+' PTS D’ÉCART',kind:topic,kickoff_utc:game.kickoff_utc,home_score:h,away_score:a,source:'NFL Studio · games + game_results (résultat enregistré)'};
}
export async function GET(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({stories:[],status:'not_configured'},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key};
 try{
  const gamesResponse=await fetch(base+'/rest/v1/games?'+new URLSearchParams({select:'game_id,home_team_id,away_team_id,kickoff_utc',kickoff_utc:'lt.'+new Date().toISOString(),order:'kickoff_utc.desc',limit:'75'}),{headers,cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!gamesResponse.ok)throw Error('games_'+gamesResponse.status);
  const games=await gamesResponse.json() as Game[];
  if(!games.length)return NextResponse.json({stories:[],status:'no_games'});
  const ids=games.map(g=>g.game_id).join(',');
  const resultsResponse=await fetch(base+'/rest/v1/game_results?'+new URLSearchParams({select:'game_id,home_score,away_score',game_id:'in.('+ids+')',limit:'75'}),{headers,cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!resultsResponse.ok)throw Error('results_'+resultsResponse.status);
  const results=await resultsResponse.json() as Result[];
  const byId=new Map(results.filter(r=>r.home_score!==null&&r.away_score!==null).map(r=>[r.game_id,r]));
  const verified=games.filter(g=>byId.has(g.game_id)).slice(0,12);
  return NextResponse.json({status:'ok',stories:verified.map((g,i)=>story(g,byId.get(g.game_id)!,i)),verified_games:verified.length,updated_at:new Date().toISOString(),basis:'Scores de matchs enregistrés; aucune supposition sur les blessures ou statistiques individuelles'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({status:'unavailable',stories:[],error:e instanceof Error?e.message:'unknown'},{status:503})}
}
