/** EXPERT NFL independent plugin: price evaluation only. No probability model here. */
export type OutcomeProbabilities={win:number;push:number;lose:number};
export type Evaluation={decimal_odds:number;break_even_probability:number;expected_profit_per_unit:number;decision:'PASSER';status:'experimental_unvalidated';};
export function evaluateQuotedMarket(odds:number,probabilities:OutcomeProbabilities):Evaluation{
 const {win,push,lose}=probabilities;
 if(!Number.isFinite(odds)||odds<=1)throw new Error('Invalid decimal odds');
 if([win,push,lose].some(p=>!Number.isFinite(p)||p<0||p>1)||Math.abs(win+push+lose-1)>1e-8)throw new Error('Invalid probability distribution');
 return {decimal_odds:odds,break_even_probability:1/odds,expected_profit_per_unit:win*(odds-1)-lose,decision:'PASSER',status:'experimental_unvalidated'};
}
