(()=>{'use strict';
const P=Physics,A=PaperPresets,$=id=>document.getElementById(id),T=P.T,palette=['#f28c9f','#85e3c4','#82b9ff','#f7cc7c','#c6a3ec'];
let figureCurves=[],collecting=false;
let current=A.figures[0],active=current.cases[0],lastParams=null,lastDetails=null,detailWorker=null,detailId=0;
const fmt=(v,n=5)=>Number.isFinite(v)?v.toFixed(n):'—',esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function chart(title,curves,xlabel,ylabel,{equal=false,zero=false}={}){
 if(collecting)figureCurves.push({title,xlabel,ylabel,curves});
 const pts=curves.flatMap(c=>c.pts).filter(v=>v&&v.every(Number.isFinite));if(!pts.length)return '<p>没有可绘制数据</p>';
 const w=440,h=294,l=62,r=18,t=25,b=43,pw=w-l-r,ph=h-t-b;let x0=Math.min(...pts.map(v=>v[0])),x1=Math.max(...pts.map(v=>v[0])),y0=Math.min(...pts.map(v=>v[1])),y1=Math.max(...pts.map(v=>v[1]));
 if(zero){y0=Math.min(0,y0);y1=Math.max(0,y1);}let dx=x1-x0||1,dy=y1-y0||.02;x0-=dx*.05;x1+=dx*.05;y0-=dy*.1;y1+=dy*.1;
 if(equal){const scale=Math.max((x1-x0)/pw,(y1-y0)/ph),xm=(x1+x0)/2,ym=(y1+y0)/2;x0=xm-scale*pw/2;x1=xm+scale*pw/2;y0=ym-scale*ph/2;y1=ym+scale*ph/2;}
 const X=x=>l+(x-x0)/(x1-x0)*pw,Y=y=>t+(y1-y)/(y1-y0)*ph,number=(v,range)=>Math.abs(v)<1e-10?'0':v.toFixed(range<.1?3:range<1?2:1);
 let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>`;
 for(let i=0;i<=4;i++){const x=x0+(x1-x0)*i/4,y=y0+(y1-y0)*i/4;svg+=`<path d="M${X(x)},${t}V${h-b} M${l},${Y(y)}H${w-r}" stroke="#2b424a" fill="none"/><text x="${X(x)}" y="${h-b+18}" text-anchor="middle">${number(x,x1-x0)}</text><text x="${l-9}" y="${Y(y)+4}" text-anchor="end">${number(y,y1-y0)}</text>`;}
 if(zero&&y0<0&&y1>0)svg+=`<path d="M${l},${Y(0)}H${w-r}" stroke="#81979b" stroke-dasharray="4 4"/>`;
 for(const c of curves){let d='',pen=false;for(const v of c.pts){if(!v||!v.every(Number.isFinite)){pen=false;continue;}d+=(pen?'L':'M')+X(v[0]).toFixed(2)+','+Y(v[1]).toFixed(2);pen=true;}svg+=`<path d="${d}" fill="none" stroke="${c.color||palette[0]}" stroke-width="${c.width||1.6}" ${c.dash?'stroke-dasharray="'+c.dash+'"':''}/>`;if(c.dot)for(const v of c.pts.filter(Boolean))svg+=`<circle cx="${X(v[0])}" cy="${Y(v[1])}" r="3" fill="${c.color}"/>`;}
 svg+=`<text x="12" y="14">${esc(ylabel)}</text><text x="${l+pw/2}" y="${h-5}" text-anchor="middle">${esc(xlabel)}</text></svg>`;
 const labels=curves.filter(c=>c.label).map(c=>`<span><i style="background:${c.color}"></i>${esc(c.label)}</span>`).join('');
 return `<article class="atlas-plot"><h3>${esc(title)}</h3>${svg}<div class="atlas-legend">${labels}</div></article>`;
}
function project(r){return [.84*r[0]-.54*r[1],.38*(.54*r[0]+.84*r[1])+.92*r[2]];}
function geometry(c,centered=false){const p=c.p,curves=[],zc=p.family==='constant'?-p.tau/(2*(1-p.tau*p.tau)):0,proj=r=>project([r[0],r[1],r[2]-(centered?zc:0)]);
 for(let i=0;i<18;i++)curves.push({color:'#4c8c88',width:.7,pts:Array.from({length:81},(_,j)=>proj(P.surface(p,p.delta,T*j/80,T*i/18)))});
 curves.push({label:'磁轴',color:palette[0],pts:Array.from({length:161},(_,j)=>proj(P.surface(p,0,0,T*j/160)))});
 const lines=current.id==='L1'?2:1;for(let i=0;i<lines;i++)curves.push({label:i===0?'边界磁力线':null,color:palette[3],pts:P.trace(p,p.delta,p.family==='constant'?1:3,Math.max(320,Math.ceil(32*(2*p.S+p.eps))),.2+i*Math.PI).pts.map(proj)});
 return chart(c.label,curves,'投影水平坐标',centered?'三维投影 · z − zc':'三维投影 · z',{equal:true});
}
function sections(c,phis){const curves=[];for(let i=0;i<phis.length;i++){const phi=phis[i]*Math.PI/180;for(const [j,f] of [1,4/9,1/9].entries())curves.push({label:j===0?'φ = '+phis[i]+'°':null,color:palette[i],dash:['','6 3','1 3'][j],pts:Array.from({length:121},(_,k)=>{const r=P.section(c.p,c.p.delta*f,T*k/120,phi);return [Math.hypot(r[0],r[1]),r[2]];})});const r=P.section(c.p,0,0,phi);curves.push({color:palette[i],dot:true,pts:[[Math.hypot(r[0],r[1]),r[2]]]});}return chart(c.label,curves,'R','z',{equal:true});}
function render(){figureCurves=[];collecting=true;
 $('atlas-tabs').innerHTML=A.figures.map(f=>`<button data-figure="${f.id}" aria-pressed="${f===current}"><small>${A.papers[f.paper].name}</small>图 ${f.number} · ${f.title.split('：')[0]}</button>`).join('');
 const paper=A.papers[current.paper];$('atlas-title').textContent='图 '+current.number+' · '+current.title;$('atlas-source').href=paper.url+'#'+(current.paper==='L'?(current.number===1?'S2.F1':'S3.F2'):'S'+(current.number<=4?2:3)+'.F'+current.number);$('atlas-source').textContent=paper.name+' · arXiv:'+paper.id+' ↗';
 $('atlas-note').textContent=current.note;$('atlas-cases').innerHTML=current.cases.map(c=>`<button class="secondary" data-case="${c.id}" aria-pressed="${c.id===active.id}">${esc(c.label)} · 载入</button>`).join('');
 let html='';
 if(current.type==='sections'){if(current.paper==='L')html+=geometry(current.cases[0]);html+=current.cases.filter((_,i)=>current.paper!=='L'||i>0).map(c=>sections(c,current.phis)).join('');}
 if(current.type==='geometry')html=current.cases.map(c=>geometry(c,current.id==='I2')).join('');
 if(current.type==='axis'){
 const make=(kind)=>current.cases.map((c,i)=>({label:'τ₀ = '+c.p.tau,color:palette[i],dash:c.p.tau<0?'6 3':c.p.tau===0?'2 3':'',pts:Array.from({length:161},(_,j)=>{const z=T*j/160,r=P.surface(c.p,0,0,z),zc=-c.p.tau/(2*(1-c.p.tau*c.p.tau));return kind===0?project([r[0],r[1],r[2]-zc]):kind===1?[r[0],r[1]]:[z/Math.PI,r[2]-zc];})}));
 html=chart('(a) 三维磁轴（扣除 zc）',make(0),'投影水平坐标','三维投影',{equal:true})+chart('(b) 水平投影',make(1),'xaxis','yaxis',{equal:true})+chart('(c) 垂向相位',make(2),'ζ / π','zaxis − zc');
 }
 if(current.type==='scan')for(const [key,title] of [['volume','(a) 包围体积'],['beta','(b) 体积平均 β']])html+=chart(title,AtlasData.scans[current.id].map((s,i)=>({label:'ε = '+s.eps,color:palette[i],pts:s.points.map(v=>v.valid?[v.tau,v[key]]:null)})),current.family==='constant'?'τ₀':'τ₁',key==='beta'?'βV（比例）':'V(δ)');
 if(current.type==='profiles')for(const sign of [-1,1]){const curves=AtlasData.profiles.filter(s=>s.tau*sign>=0).map(s=>({color:`hsl(${165+Math.abs(s.tau)*220} 65% 68%)`,label:Math.abs(s.tau*10-Math.round(s.tau*10))<1e-8?'τ₁ = '+s.tau:null,pts:s.profile.map(v=>[v.x,v.y])}));html+=chart(sign<0?'(a) τ₁ ≤ 0':'(b) τ₁ ≥ 0',curves,'ψ / δ','旋转变换 ι');}
 collecting=false;$('atlas-plots').innerHTML=html;$('atlas-plots').classList.toggle('three',current.type==='axis'||current.type==='geometry'||(current.type==='sections'&&current.paper==='I'));
 $('atlas-method').textContent=current.type==='profiles'?'曲线预计算：RK4，1024 周回 × 256 步；正负 τ₁ 分别积分。下方磁剪切为 dι/d(ψ/δ)，收敛差可随数据导出。':current.type==='scan'?'恒定族使用解析式；剪切族为 80 × 160 点二维积分。曲线点和采样方法可导出。':'磁面与磁轴由解析映射计算；图为同参数重绘，视角、颜色与场线起点不要求与原图相同。';
 }
 function loadCase(c){active=c;current=A.figures.find(f=>f.id===c.figure);FluxAtlas.load(c);$('preset-source').innerHTML=`<a href="${A.papers[c.paper].url}" target="_blank" rel="noreferrer">${A.papers[c.paper].id} · 图 ${c.number}</a><br>${esc(c.label)}`;render();}
 $('preset').innerHTML='<option value="custom">自定义参数</option>'+A.figures.map(f=>`<optgroup label="${A.papers[f.paper].id} · 图 ${f.number}">${f.cases.map(c=>`<option value="${c.id}">${esc(c.label)}</option>`).join('')}</optgroup>`).join('');
 $('preset').onchange=()=>{const c=A.cases.find(c=>c.id===$('preset').value);if(c)loadCase(c);};
 $('atlas-tabs').onclick=e=>{const b=e.target.closest('[data-figure]');if(b){current=A.figures.find(f=>f.id===b.dataset.figure);loadCase(current.cases[0]);}};
 $('atlas-cases').onclick=e=>{const b=e.target.closest('[data-case]');if(b)loadCase(A.cases.find(c=>c.id===b.dataset.case));};
 function details(p,d){
 lastDetails=d;const st=P.stats(p,80),zc=p.family==='constant'?-p.tau/(2*(1-p.tau*p.tau)):0,axis=P.surface(p,0,0,0),ay=P.surface(p,0,0,Math.PI/2),rows=[['磁轴水平半轴 Ax',Math.abs(axis[0])],['磁轴水平半轴 Ay',Math.abs(ay[1])],['磁轴平均高度 zc',zc],['轴上压力 pa',st.pAxis],['体积平均压力 ⟨p⟩V',st.meanP],['平均磁场平方 ⟨B²⟩V',st.meanB2],['平均磁通 M = ⟨ψ⟩V',st.M]];
 if(p.family==='shear')rows.push(['A = ⟨Bx² + By²⟩V',st.A],['C = ⟨X²⟩V',st.C]);
 $('extra-values').innerHTML=rows.map(([label,v])=>`<div><span>${label}</span><strong>${fmt(v)}</strong></div>`).join('');
 const pr=d.profile,net=pr.at(-1).y-pr[0].y,err=Math.max(...pr.map(v=>v.error));$('extra-status').textContent=`${d.cached?'论文参数缓存':'当前参数'} · ${p.family==='constant'?'解析值':d.turns+' 周回 × '+d.steps+' 步'} · Δι边缘−轴 = ${fmt(net,6)}`;
 $('extra-plots').innerHTML=chart('局部磁剪切', [{label:'dι / dρ',color:palette[1],pts:pr.map(v=>[v.x,v.shear])},{label:'± 周回加倍差传播',color:palette[3],dash:'3 3',pts:pr.map(v=>[v.x,v.shear+v.shearError])},{color:palette[3],dash:'3 3',pts:pr.map(v=>[v.x,v.shear-v.shearError])}],'ρ = ψ / δ','dι / dρ',{zero:true})+chart(p.family==='constant'?'Hamada 闭合线积分':'Hamada 每极向周回积分',[{color:palette[2],pts:pr.map(v=>[v.x,P.hamada(p,p.delta*v.x)])}],'ψ / δ',p.family==='constant'?'∮ dℓ / |B|':'∫₀²π dχ / √(1 − 2ψ sin²χ)');
 $('extra-note').textContent=`磁剪切以 ρ = ψ/δ 定义（不是 √(ψ/δ)）；dι/dψ = (dι/dρ)/δ。相邻磁面中心差分，端点单边差分。ι 的周回加倍差最大 ${err.toExponential(2)}；虚线仅为收敛指示，不是严格误差界，未包含全部离散误差。`+(p.family==='constant'?' 所有闭合线积分均为 2π/Ω。':' 右图为每极向周回值；仅当 ι = m/n 且场线闭合时，完整闭合积分为此值的 m 倍。');
 $('export-diagnostics').disabled=false;
 }
 function startDetails(p){lastParams={...p};lastDetails=null;detailWorker?.terminate();detailId++;$('extra-status').textContent='正在计算当前参数的精细诊断…';$('extra-plots').innerHTML='';$('extra-values').innerHTML='';$('extra-note').textContent='';$('export-diagnostics').disabled=true;const id=detailId;
 const cached=p.family==='shear'&&Math.abs(p.eps-1.2)<1e-12&&Math.abs(p.S-1.4)<1e-12&&Math.abs(p.delta-.14)<1e-12?AtlasData.profiles.find(s=>Math.abs(s.tau-p.tau)<1e-10):null;
 if(cached){details(p,{profile:cached.profile,turns:1024,steps:256,cached:true});return;}
 if(p.family==='constant'){details(p,P.detailedProfile(p));return;}
 detailWorker=FluxAtlas.worker();detailWorker.onmessage=e=>{if(e.data.id!==id)return;if(e.data.type==='error'){$('extra-status').textContent='诊断失败：'+e.data.message;return;}details(p,e.data);detailWorker.terminate();detailWorker=null;};detailWorker.onerror=()=>{$('extra-status').textContent='诊断未能启动；请重新载入预设。';};detailWorker.postMessage({type:'details',id,p});
 }
 let timer;window.addEventListener('flux-state',e=>{clearTimeout(timer);detailWorker?.terminate();detailId++;lastDetails=null;$('extra-status').textContent='正在切换当前参数…';$('extra-values').innerHTML='';$('extra-plots').innerHTML='';$('extra-note').textContent='';$('export-diagnostics').disabled=true;if($('preset').value==='custom')$('preset-source').textContent='自定义参数 · 上方论文图册保留原图参数供对照';timer=setTimeout(()=>startDetails(e.detail),180);});
 function save(name,data){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=name;a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('export-figure').onclick=()=>save('flux-atlas-'+current.id+'.json',{paper:A.papers[current.paper],figure:current,charts:figureCurves,curves:current.type==='profiles'?AtlasData.profiles:current.type==='scan'?AtlasData.scans[current.id]:null,method:current.type==='profiles'?AtlasData.method:current.type==='scan'?{quadrature:[80,160],samples:current.n}:{geometry:'analytic map',sourceNotes:current.note}});
 $('export-diagnostics').onclick=()=>{if(lastDetails)save('flux-atlas-diagnostics.json',{parameters:lastParams,preset:PaperPresets.cases.find(c=>c.id===$('preset').value)||null,statistics:P.stats(lastParams,80),...lastDetails,definitions:{rho:'psi/delta',shear:'d iota / d rho',uncertainty:'difference between N and N/2 turns; not a rigorous error bound'},hamada:lastDetails.profile.map(v=>({rho:v.x,value:P.hamada(lastParams,lastParams.delta*v.x)}))});};
 loadCase(A.figures[0].cases[0]);
})();
