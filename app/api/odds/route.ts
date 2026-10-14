import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
// PUBLIC DEMO: No upstream odds calls until authenticated administrator + durable monthly quota ledger exist.
export async function GET(){
 return NextResponse.json({
  provider:'The Odds API',
  sourceBookmaker:'Non sélectionné',
  configured:Boolean(process.env.THE_ODDS_API_KEY),
  enabled:false,
  monthlyCreditBudget:500,
  creditsSpent:null,
  status:'locked',
  message:'Connexion préparée. Actualisation désactivée tant que l’authentification et le plafond mensuel serveur ne sont pas vérifiés.'
 },{headers:{'Cache-Control':'no-store'}});
}
export async function POST(){
 return NextResponse.json({error:'Actualisation désactivée sur la démo publique. Aucun crédit consommé.'},{status:403,headers:{'Cache-Control':'no-store'}});
}
