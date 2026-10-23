const P=require('./dist/physics.js'),assert=require('node:assert/strict'),fs=require('node:fs');
const report={checks:[],results:[]};
function check(name,ok,details){assert.ok(ok,name+': '+JSON.stringify(details));report.checks.push({name,passed:true,details});}
const rel=(a,b)=>Math.abs(a-b)/Math.max(Math.abs(b),1e-30);
const c={...P.defaults.constant,tau:0},s={...P.defaults.shear,tau:0};
check('Paper 1 beta = 2/57',rel(P.stats(c).beta,2/57)<1e-14,P.stats(c).beta);
const bench={...s,eps:2,S:1,delta:.005};
check('Paper 1 on-axis iota benchmark 2.28690',Math.abs(P.iota(bench,0)-2.28690)<.000006,P.iota(bench,0));
const states=[c,{...c,tau:-.5},{...c,tau:.5},s,P.defaults.shear,{...s,tau:-.4},{...s,eps:2.4,tau:1.2,S:.5,delta:.05},{...c,eps:.85,tau:.75,delta:.02}];
for(const p of states){
 check('Valid domain '+JSON.stringify(p),P.valid(p),P.limit(p));
 const r=P.residual(p),fine=P.residual(p,5e-5),st=P.stats(p),stFine=P.stats(p,80),mirror=P.stats({...p,tau:-p.tau});
 const resolved=r.force<2e-5?r:P.residual(p,1e-6);
 check('Cartesian equilibrium residual (refined h for strong gradients)',resolved.force<2e-5&&resolved.div<2e-5&&resolved.tangent<2e-5&&resolved.fluxError<1e-10,resolved);
 check('Second order difference convergence',fine.force<r.force*.32,{coarse:r.force,fine:fine.force});
 check('Even beta and V in tau',rel(st.beta,mirror.beta)<1e-10&&rel(st.volume,mirror.volume)<1e-10,{st,mirror});
 check('Quadrature refinement',rel(st.beta,stFine.beta)<.0003&&rel(st.volume,stFine.volume)<.0003,{betaRel:rel(st.beta,stFine.beta),volumeRel:rel(st.volume,stFine.volume)});
 // Check a numerical field-line tangent against the independently evaluated Cartesian B.
 const psi=p.delta*.7,z=.93,chi=.2,h=1e-5,dc=p.family==='shear'?P.rate(p,psi,chi,z):0;
 const a=P.surface(p,psi,chi-h*dc,z-h),b=P.surface(p,psi,chi+h*dc,z+h),der=b.map((v,i)=>(v-a[i])/(2*h)),B=P.field(p,P.surface(p,psi,chi,z)).B,tan=Math.hypot(...P.cross(der,B))/(Math.hypot(...der)*Math.hypot(...B));
 check('Field-line mapping tangent',tan<1e-6,tan);
 for(const phi of [.01,.9,2.8,4.1,6.1]){const r=P.section(p,psi,.7,phi);let a=Math.atan2(r[1],r[0]);if(a<0)a+=P.T;check('Geometric section phi',Math.abs(a-phi)<1e-8,Math.abs(a-phi));}
 report.results.push({p,stats:st,residual:r});
}
const trace=P.trace(c,c.delta*.8,1,240,.2);check('Constant-family closed field line',Math.hypot(...trace.pts[0].map((v,i)=>v-trace.pts.at(-1)[i]))<1e-12,null);
const coarse=P.iota(s,s.delta,48,160),fine=P.iota(s,s.delta,48,320),long=P.iota(s,s.delta,96,320);
check('RK4 step refinement',Math.abs(coarse-fine)<2e-5,{coarse,fine,long,finiteTurnDifference:Math.abs(fine-long)});
check('Iota independent of lambda',P.iota({...s,lam:.7},s.delta)===P.iota({...s,lam:3},s.delta),null);
check('Out of domain rejected',!P.valid({...c,delta:P.limit(c)*1.01}),null);
// Independent volume-weighted quadrature in (psi,chi,zeta), using the coordinate Jacobian.
const q=P.defaults.shear;let sum=0,press=0,b2=0;const nr=24,nc=48,nz=72;
for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)for(let k=0;k<nz;k++){
 const psi=q.delta*(i+.5)/nr,chi=P.T*(j+.5)/nc,z=P.T*(k+.5)/nz,r=P.surface(q,psi,chi,z),f=P.field(q,r),rr=r[0]*r[0]+r[1]*r[1],hh=rr+Math.sqrt(rr*rr+q.eps*q.eps+2*q.eps*(r[0]*r[0]-r[1]*r[1])),G=(hh+q.eps*Math.cos(2*z))/2,Y=Math.sqrt(2*psi)*Math.sin(chi),nu=q.eps/2*Math.sin(2*z)+q.tau,J=G/(q.lam*hh*Math.sqrt((Math.cosh(nu)**2-2*psi)*(1-Y*Y))),weight=J*q.delta/nr*P.T/nc*P.T/nz;
 sum+=weight;press+=f.p*weight;b2+=P.dot(f.B,f.B)*weight;
}
const formula=P.stats(q,80);check('Independent volume and beta quadrature',rel(sum,formula.volume)<.001&&rel(2*press/b2,formula.beta)<.001,{volume:sum,beta:2*press/b2,formula});
fs.writeFileSync('verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.checks.length,referenceBeta:P.stats(c).beta,iotaBenchmark:P.iota(bench,0),rk4:{coarse,fine,long},defaultResiduals:report.results.slice(0,5).map(v=>({p:v.p,force:v.residual.force})),independentQuadrature:{volume:sum,beta:2*press/b2}},null,2));

