/* Flux Atlas. Equations: Landreman 2609.26742v2; Issan et al. 2610.07304v1.
   Normalization mu0=1; pressure at the chosen boundary is zero. */
(function(root){
'use strict';
const T=2*Math.PI, sq=x=>x*x;
const defaults={constant:{family:'constant',eps:.5,tau:.35,S:1.4,lam:1.6,delta:1/64},shear:{family:'shear',eps:1.2,tau:.4,S:1.4,lam:1.6,delta:.14}};
function limit(p){return p.family==='constant'?sq(1-(1-p.tau*p.tau)*p.eps)/4:.5*sq(Math.sin(Math.min(p.S,Math.PI/2)));}
function valid(p){return p.eps>=0&&p.delta>0&&p.delta<limit(p)&&(p.family==='constant'?p.eps<1&&Math.abs(p.tau)<1:p.S>0&&p.lam>0);}
function sigma(p,psi,chi,zeta){const k=Math.sqrt(2*psi),X=-k*Math.cos(chi),Y=k*Math.sin(chi),nu=p.eps/2*Math.sin(2*zeta)+p.tau;
return p.S+Math.atan(Math.tanh(nu)*Y/Math.sqrt(1-Y*Y))-Math.asin(X/Math.sqrt(sq(Math.cosh(nu))-Y*Y));}
function surface(p,psi,chi,zeta){
 if(p.family==='constant'){
  const o2=1-p.tau*p.tau,o=Math.sqrt(o2),u=-o2*p.eps/2+Math.sqrt(psi)*Math.cos(chi),v=Math.sqrt(psi)*Math.sin(chi),L=Math.sqrt((1+Math.sqrt(1-4*(u*u+v*v)))/2),c=Math.cos(zeta),s=Math.sin(zeta),g=Math.asin(p.tau);
  return [Math.sqrt(1+p.eps)/o*(L*c+(u*c+v*s)/L),Math.sqrt(1-p.eps)/o*(L*s+(v*c-u*s)/L),-p.tau/(2*o2)+(v*Math.cos(2*zeta+g)-u*Math.sin(2*zeta+g))/o2];
 }
 const sg=sigma(p,psi,chi,zeta),h=Math.hypot(2*sg,p.eps),a=Math.sqrt((h-p.eps)/2),b=Math.sqrt((h+p.eps)/2);
 return [a*Math.cos(zeta),b*Math.sin(zeta),-Math.asin(Math.sqrt(2*psi)*Math.sin(chi))/p.lam];
}
function mul(a,b){return [a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];}
function div(a,b){const d=b[0]*b[0]+b[1]*b[1];return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d];}
function csqrt(z){const r=Math.hypot(...z);if(r===0)return [0,0];if(z[0]>=0){const re=Math.sqrt((r+z[0])/2);return [re,z[1]/(2*re)];}const im=(z[1]<0?-1:1)*Math.sqrt((r-z[0])/2);return [Math.abs(z[1]/(2*im)),im];}
function field(p,r){
 const [x,y,z]=r;
 if(p.family==='constant'){
  const a=Math.sqrt(1+p.eps),b=Math.sqrt(1-p.eps),s=x*x/(a*a)+y*y/(b*b),F=Math.sqrt(1-sq(1-s)-4*z*z-4*p.tau*s*z);
  const B=[((2*z+p.tau*s)*x-a/b*F*y)/s,((2*z+p.tau*s)*y+b/a*F*x)/s,1-s-2*p.tau*z],o2=1-p.tau*p.tau,Q=o2/2*(x*x+y*y+4*z*z)+2*p.tau*z;
  const psi=o2/2*(Q+dot(B,B)/2-1+p.tau*p.tau/(2*o2)+o2*p.eps*p.eps/2);
  return {B,psi,p:2*(p.delta-psi)/o2};
 }
 const wb=[x,-y],ratio=div([p.eps,0],mul(wb,wb)),K=mul(wb,csqrt([1+ratio[0],ratio[1]])),wK=mul([x,y],K),re=wK[0]+Math.PI/2-p.S,im=wK[1]+p.tau;
 const sin=[Math.sin(re)*Math.cosh(im),Math.cos(re)*Math.sinh(im)],cos=[Math.cos(re)*Math.cosh(im),-Math.sin(re)*Math.sinh(im)],W=div([-sin[1],sin[0]],[2*K[0],2*K[1]]),phase=[Math.cos(p.lam*z),-Math.sin(p.lam*z)],xy=mul(phase,W),bz=mul(phase,cos)[0]/p.lam;
 const B=[...xy,bz],psi=(sq(Math.sin(p.lam*z))+sq(p.lam*bz))/2;
 return {B,psi,p:(p.delta-psi)/sq(p.lam)};
}
function dot(a,b){return a.reduce((s,v,i)=>s+v*b[i],0);}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function rate(p,psi,c,z){const sg=sigma(p,psi,c,z),nu=p.eps/2*Math.sin(2*z)+p.tau;return (Math.hypot(2*sg,p.eps)+p.eps*Math.cos(2*z))*Math.sqrt((1-2*psi*sq(Math.sin(c)))/(sq(Math.cosh(nu))-2*psi));}
function step(p,psi,c,z,h){const a=rate(p,psi,c,z),b=rate(p,psi,c+h*a/2,z+h/2),d=rate(p,psi,c+h*b/2,z+h/2),e=rate(p,psi,c+h*d,z+h);return c+h*(a+2*b+2*d+e)/6;}
function trace(p,psi,turns=3,steps=240,c0=.2){const pts=[],section=[],h=T/steps;let c=c0;for(let i=0;i<=turns*steps;i++){const z=i*h;pts.push(surface(p,psi,c,z));if(i%steps===0)section.push(pts[pts.length-1]);if(p.family==='shear'&&i<turns*steps)c=step(p,psi,c,z,h);}return {pts,section,iota:p.family==='constant'?2:(c-c0)/(turns*T)};}
function iota(p,psi,turns=48,steps=160){if(p.family==='constant')return 2;let c=0;const h=T/steps;for(let i=0;i<turns*steps;i++)c=step(p,psi,c,i*h,h);return c/(turns*T);}
function stats(p,n=40){
 if(p.family==='constant'){const o2=1-p.tau*p.tau;return {volume:2*Math.PI*Math.PI*Math.sqrt(1-p.eps*p.eps)*p.delta/Math.pow(o2,1.5),beta:2*(p.delta/o2)/(1-o2*p.eps*p.eps/2+p.delta/o2),pAxis:2*p.delta/o2,meanP:p.delta/o2,meanB2:1-o2*p.eps*p.eps/2+p.delta/o2,M:p.delta/2,method:'解析'};}
 // Eq. (64) of 2609.26742 with nu -> nu+tau1; xi=d sin(t) removes endpoint sqrt.
 const d=Math.asin(Math.sqrt(2*p.delta)),nz=2*n;let IU=0,IM=0,IC=0,IA=0;
 for(let j=0;j<nz;j++){const z=T*(j+.5)/nz,nu=p.eps/2*Math.sin(2*z)+p.tau,ch=Math.cosh(nu),sh=Math.sinh(nu);
  for(let i=0;i<n;i++){const t=-Math.PI/2+Math.PI*(i+.5)/n,xi=d*Math.sin(t),s=Math.sin(xi),cs=Math.cos(xi),F=ch*ch-s*s,U=Math.asin(Math.sqrt(Math.max(0,(2*p.delta-s*s)/F))),DU=U-Math.sin(2*U)/2,c0=-s*cs/Math.sqrt(F),c1=ch*sh/Math.sqrt(F),w=d*Math.cos(t)*Math.PI/n*T/nz;
   IU+=U*w;IM+=(2*s*s*U+F*DU)*w;IC+=(c0*c0*(2*U-DU)+c1*c1*DU)*w;IA+=F*U/Math.hypot(2*(p.S+xi),p.eps)*w;
  }
 }
 const M=IM/(4*IU),C=IC/(2*IU),A=IA/(2*IU);
 return {volume:IU/p.lam,beta:2*(p.delta-M)/(p.lam*p.lam*A+C),pAxis:p.delta/(p.lam*p.lam),M,C,A,meanP:(p.delta-M)/(p.lam*p.lam),meanB2:A+C/(p.lam*p.lam),method:'数值积分'};
}
// dℓ/|B| per closed toroidal loop (constant family), or per poloidal turn (shear).
function hamada(p,psi){if(p.family==='constant')return T/Math.sqrt(1-p.tau*p.tau);let s=0;const n=512;for(let i=0;i<n;i++)s+=1/Math.sqrt(1-2*psi*Math.sin(T*(i+.5)/n)**2);return T*s/n;}
function detailedProfile(p,turns=512){
 const steps=Math.max(256,Math.ceil(32*(Math.hypot(2*p.S,p.eps)+p.eps))),profile=[];
 for(let i=0;i<=20;i++){const x=i/20,psi=p.delta*x,y=iota(p,psi,turns,steps),coarse=iota(p,psi,turns/2,steps);profile.push({x,y,error:Math.abs(y-coarse),hamada:hamada(p,psi)});}
 for(let i=0;i<profile.length;i++){const a=profile[Math.max(0,i-1)],b=profile[Math.min(20,i+1)],dx=b.x-a.x;profile[i].shear=(b.y-a.y)/dx;profile[i].shearError=(b.error+a.error)/dx;}
 return {profile,turns,steps};
}
function residual(p,h=1e-4,n=36){let ds=0,fs=0,ts=0,bds=0,forceScale=0,tScale=0,fluxError=0;
 for(let i=0;i<n;i++){const psi=p.delta*(.12+.76*((i*.61803398875)%1)),r=surface(p,psi,T*((i*.41421356237)%1),T*((i*.73205080757)%1)),f=field(p,r),D=[],gp=[],gpsi=[];
  for(let j=0;j<3;j++){const a=r.slice(),b=r.slice();a[j]+=h;b[j]-=h;const fa=field(p,a),fb=field(p,b);D.push(fa.B.map((v,k)=>(v-fb.B[k])/(2*h)));gp.push((fa.p-fb.p)/(2*h));gpsi.push((fa.psi-fb.psi)/(2*h));}
  const dv=D[0][0]+D[1][1]+D[2][2],curl=[D[1][2]-D[2][1],D[2][0]-D[0][2],D[0][1]-D[1][0]],jxb=cross(curl,f.B),df=jxb.map((v,j)=>v-gp[j]);
  ds+=dv*dv;fs+=dot(df,df);ts+=sq(dot(f.B,gpsi));bds+=D.flat().reduce((s,v)=>s+v*v,0);forceScale+=dot(jxb,jxb)+dot(gp,gp);tScale+=dot(f.B,f.B)*dot(gpsi,gpsi);fluxError=Math.max(fluxError,Math.abs(f.psi-psi)/p.delta);
 }
 return {div:Math.sqrt(ds/Math.max(bds,1e-30)),force:Math.sqrt(fs/Math.max(forceScale,1e-30)),tangent:Math.sqrt(ts/Math.max(tScale,1e-30)),fluxError,h,n};
}
function section(p,psi,chi,phi){
 if(p.family==='constant'){
  // For a fixed field-line label, phi(zeta=0) need not be zero.
  // Solve the horizontal harmonic oscillator intersection with the phi half-plane.
  const a=surface(p,psi,chi,0),b=surface(p,psi,chi,Math.PI/2),cp=Math.cos(phi),sp=Math.sin(phi),M=a[1]*cp-a[0]*sp,N=b[1]*cp-b[0]*sp;
  let z=Math.atan2(-M,N),r=surface(p,psi,chi,z);if(r[0]*cp+r[1]*sp<0)r=surface(p,psi,chi,z+Math.PI);return r;
 }
 let lo=0,hi=T;for(let i=0;i<38;i++){const z=(lo+hi)/2,r=surface(p,psi,chi,z);let ang=Math.atan2(r[1],r[0]);if(ang<0)ang+=T;if(ang<phi)lo=z;else hi=z;}return surface(p,psi,chi,(lo+hi)/2);
}
const api={T,defaults,limit,valid,surface,field,rate,step,trace,iota,stats,residual,section,cross,dot,hamada,detailedProfile};root.Physics=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
