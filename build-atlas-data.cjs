const fs=require('node:fs'),P=require('./dist/physics.js'),A=require('./dist/presets.js');
const out={version:1,method:{turns:1024,steps:256,fluxPoints:21,tauStep:.05},scans:{},profiles:[]};
for(const f of A.figures.filter(f=>f.type==='scan'))out.scans[f.id]=f.eps.map(eps=>({eps,points:Array.from({length:f.n},(_,i)=>{const tau=-f.range+2*f.range*i/(f.n-1),p={...f.cases[0].p,eps,tau};return {tau,valid:P.valid(p),...(P.valid(p)?P.stats(p,80):{volume:null,beta:null})};})}));
// Both signs are independently integrated; no symmetry is imposed on the data.
for(let i=-10;i<=10;i++){
 const tau=i/20,p={...P.defaults.shear,tau},profile=[];
 for(let j=0;j<=20;j++){const x=j/20,y=P.iota(p,p.delta*x,1024,256),coarse=P.iota(p,p.delta*x,512,256);profile.push({x,y,error:Math.abs(y-coarse)});}
 for(let j=0;j<=20;j++){const a=profile[Math.max(0,j-1)],b=profile[Math.min(20,j+1)],dx=b.x-a.x;profile[j].shear=(b.y-a.y)/dx;profile[j].shearError=(b.error+a.error)/dx;}
 out.profiles.push({tau,profile});console.log('Figure 6: tau='+tau+' complete');
}
fs.writeFileSync('dist/atlas-data.js','globalThis.AtlasData='+JSON.stringify(out)+';\n');
console.log('Saved figure curves.');
