import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Game={game_id:string;home_team_id:string;away_team_id:string;kickoff_utc:string};
type Result={game_id:string;home_score:number|null;away_score:number|null};
type Story={id:string;team:string;opponent:string;game_id:string;headline:string;body:string;punchline:string;metric:string;kind:string;kickoff_utc:string;home_score:number;away_score:number;source:string};
const labels:Record<string,string>={ARI:'Cardinals',ATL:'Falcons',BAL:'Ravens',BUF:'Bills',CAR:'Panthers',CHI:'Bears',CIN:'Bengals',CLE:'Browns',DAL:'Cowboys',DEN:'Broncos',DET:'Lions',GB:'Packers',HOU:'Texans',IND:'Colts',JAX:'Jaguars',KC:'Chiefs',LV:'Raiders',LAC:'Chargers',LA:'Rams',MIA:'Dolphins',MIN:'Vikings',NE:'Patriots',NO:'Saints',NYG:'Giants',NYJ:'Jets',PHI:'Eagles',PIT:'Steelers',SF:'49ers',SEA:'Seahawks',TB:'Buccaneers',TEN:'Titans',WAS:'Commanders'};
const teamName=(id:string)=>'les '+(labels[id]||id);
const endings=[
 'Les boys, ce score-là parle tout seul. On garde les pieds sur terre pis on regarde la prochaine game.',
 'Ça, c’est le genre de résultat qui part une bonne discussion autour d’une table de chums.',
 'Pas besoin de jouer aux devins : les chiffres sont là, pis le prochain défi s’en vient.',
 'Une game de même, ça se jase longtemps après le coup de sifflet.',
 'Les partisans vont avoir du stock à débattre; nous autres, on commence par le tableau final.',
 'On peut avoir nos favoris, mais le pointage s’en fout pas mal de nos chandails.',
 'Les boys, on ressort la calculatrice avant de partir en grandes théories.',
 'Le terrain a donné sa réponse. Reste à voir ce que les deux gangs vont faire à leur prochaine sortie.',
 'Pas une légende de vestiaire : une vraie différence au tableau, noir sur blanc.',
 'Le popcorn était peut-être prêt, mais le résultat, lui, ne se négocie pas.',
 'Un autre chapitre dans la saison. On prend des notes avant de prédire la suite.',
 'Les chums peuvent argumenter toute la soirée : le score final ne changera pas.'
];
function story(game:Game,result:Result,index:number):Story{
 const h=Number(result.home_score),a=Number(result.away_score),tie=h===a;
 const winner=h>a?game.home_team_id:game.away_team_id;
 const loser=h>a?game.away_team_id:game.home_team_id;
 const margin=Math.abs(h-a),total=h+a,low=Math.min(h,a);
 const away=teamName(game.away_team_id),home=teamName(game.home_team_id);
 const champs=teamName(winner),defaits=teamName(loser);
 const score=away+' '+a+' – '+home+' '+h;
 const kind=tie?'ÉGALITÉ':margin>=21?'DÉMOLITION':margin<=3?'CHAUD CHAUD':total>=65?'FEU D’ARTIFICE':low<=10?'DÉFENSE EN BÉTON':'BILAN DU VESTIAIRE';
 const where=game.home_team_id===winner?'à domicile':'sur la route';
 let headline='',reading='';
 if(tie){
  headline='LES DEUX GANGS SE QUITTENT ÉGALES';
  reading='Personne ne s’est sauvé avec la victoire. Les deux clubs ont terminé avec '+h+' points chacun. Même après tout ce football-là, impossible de départager les deux équipes au tableau.';
 }else if(margin>=21){
  headline=champs.toUpperCase()+' ONT PASSÉ LE ROULEAU COMPRESSEUR';
  reading=champs+' ont battu '+defaits+' par '+margin+' points '+where+'. Une différence aussi large, ça saute aux yeux dès qu’on regarde le tableau. '+defaits+' devront trouver une réponse après cette lourde défaite.';
 }else if(margin<=3){
  headline=champs.toUpperCase()+' S’EN SONT TIRÉS DE JUSTESSE';
  reading=champs+' ont gagné par seulement '+margin+' point'+(margin>1?'s':'')+' '+where+'. Un coussin aussi mince, les boys, ça donne pas beaucoup de marge de manœuvre. '+defaits+' sont passés bien près au pointage, sans qu’on puisse prétendre savoir quels jeux ont fait basculer la rencontre.';
 }else if(total>=65){
  headline='LES DEUX GANGS ONT FAIT EXPLOSER LE TABLEAU';
  reading='Les deux équipes ont combiné '+total+' points. '+champs+' ont fini devant '+defaits+', dans une rencontre qui a produit beaucoup de points. Attention : le pointage ne nous dit pas à lui seul quels joueurs ont dominé ni si les points sont venus de l’attaque, de la défense ou des unités spéciales.';
 }else if(low<=10){
  headline=defaits.toUpperCase()+' ONT EU DE LA MISÈRE À SCORER';
  reading=defaits+' ont récolté seulement '+low+' points, pendant que '+champs+' en ont mis '+Math.max(h,a)+'. Côté résultat, ça fait une soirée compliquée pour les perdants. On ne blâme pas un QB ni un entraîneur en particulier sans les statistiques détaillées.';
 }else{
  headline=champs.toUpperCase()+' ONT FAIT LA JOB';
  reading=champs+' ont pris le dessus sur '+defaits+' par '+margin+' points '+where+'. L’écart est assez net pour trancher la rencontre, sans être une démolition. Les deux équipes ont maintenant un résultat concret à analyser avant leur prochaine sortie.';
 }
 const lead='Score final : '+score+'. Les visiteurs ont inscrit '+a+' points, contre '+h+' pour les locaux, pour un total de '+total+' points.';
 const finish=tie?'Cette égalité laisse les deux clubs au même niveau au tableau final.':margin>=21?'Avec '+margin+' points d’écart, on parle d’une victoire très convaincante au pointage.':margin<=3?'Avec seulement '+margin+' point'+(margin>1?'s':'')+' entre les deux gangs, ça s’est joué serré au tableau.':'Le différentiel de '+margin+' points donne une bonne idée de l’ampleur du résultat.';
 const body=lead+' '+reading+' '+finish+' Les chiffres ci-dessus sont tirés du résultat enregistré; les séquences de jeu, blessures et performances individuelles ne sont pas déduites du score.';
 const punchline=endings[index%endings.length];
 return {id:game.game_id,team:winner,opponent:loser,game_id:game.game_id,headline,body,punchline,metric:tie?'ÉGALITÉ':margin+' PTS D’ÉCART',kind,kickoff_utc:game.kickoff_utc,home_score:h,away_score:a,source:'NFL Studio · games + game_results (résultat enregistré)'};
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
