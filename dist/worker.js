importScripts('physics.js');
self.onmessage=e=>{const {type,p,id}=e.data;try{
 if(type==='details'){self.postMessage({type,id,...Physics.detailedProfile(p)});}
 else if(type==='diagnostics'){
 const steps=Math.max(160,Math.ceil(32*(Math.hypot(2*p.S,p.eps)+p.eps))),stats=Physics.stats(p),residual=Physics.residual(p,e.data.h||1e-4),profile=Array.from({length:11},(_,i)=>({x:i/10,y:Physics.iota(p,p.delta*i/10,48,steps)}));
 const section=p.family==='constant'?Array.from({length:101},()=>Physics.section(p,p.delta*.8,.3,0)):Physics.trace(p,p.delta*.8,100,steps,.3).section;
 self.postMessage({type,id,stats,residual,profile,section,steps});
 }else if(type==='scan'){
 const n=25,rows=[],emax=p.family==='constant'?.85:Math.max(2.4,p.eps),tmax=p.family==='constant'?.75:1.2;
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
 const q={...p,eps:.05+(emax-.05)*i/(n-1),tau:-tmax+2*tmax*j/(n-1)},ok=Physics.valid(q),s=ok?Physics.stats(q,20):null;
 rows.push({eps:q.eps,tau:q.tau,valid:ok,beta:s?.beta??null,volume:s?.volume??null});
 }
 self.postMessage({type,id,rows,n,emax,tmax,p});
 }
 }catch(err){self.postMessage({type:'error',id,message:err.message});}};
