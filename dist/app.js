(()=>{'use strict';
const P=Physics,$=id=>document.getElementById(id),T=P.T;
let p={...P.defaults.constant},playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,flux=.8,speed=1,profileMode='iota',scanMode='beta',diagnostics=null,scanData=null,scanIndex=null,sweepTimer=null,diagId=0,scanId=0,diagTimer=null,worker=null,scanWorker=null,phase=0;
let camera={yaw:-.52,tilt:.57,zoom:1},geometry=null,sectionData=[],dirty=true,lastTime=0,drag=null;
const colors={teal:'#85e3c4',gold:'#f7cc7c',pink:'#e89eb0',muted:'#93adb4',grid:'#2b424a',text:'#d7e5e7',blue:'#7fbbd9'};
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function fmt(v,n=4){return Number.isFinite(v)?v.toFixed(n):'—';}
function sci(v){return Number.isFinite(v)?v.toExponential(2):'—';}
function save(name,data,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function setupCanvas(id){const c=$(id),r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.max(100,r.width),h=Math.max(100,r.height);if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=Math.round(w*d);c.height=Math.round(h*d);}const ctx=c.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);return {c,ctx,w,h};}
function toggleFamily(f){stopSweep();p={...P.defaults[f]};$('preset').value='custom';camera={yaw:-.52,tilt:.57,zoom:1};sync();update();}
function sync(adjusted=false){
 const c=p.family==='constant';$('family-constant').setAttribute('aria-pressed',c);$('family-shear').setAttribute('aria-pressed',!c);$('shear-controls').hidden=c;
 $('eps').max=c?.85:6;$('tau').min=c?-.75:-1.2;$('tau').max=c?.75:1.2;$('tau-symbol').textContent=c?'τ₀':'τ₁';
 $('delta').max=(P.limit(p)*.9999).toFixed(6);$('delta').step=.000001;
 for(const k of ['eps','tau','delta','S','lam']){$(k).value=p[k];$(k+'-value').textContent=fmt(p[k],k==='delta'?5:2);}
 $('model-description').innerHTML=c?'拉伸 Solov’ev 平衡 <span>ι = 2</span>':'复相位椭圆平衡 <span>ι = ι(ψ)</span>';
 $('scene-model').textContent=c?'SOLOV’EV / CONSTANT TRANSFORM':'ELLIPTIC / MAGNETIC SHEAR';
 $('symmetry-label').textContent=Math.abs(p.tau)<1e-10?'仿星器对称':'非仿星器对称';
 $('validity').textContent=(adjusted?'δ 已缩小以保留有效磁面。':'定义域有效。')+' δ < '+fmt(P.limit(p),5);$('validity').classList.toggle('adjusted',adjusted);
 if(scanData){$('scan-status').textContent=scanData.p.family===p.family?'已完成 · 点击网格载入扫描快照':'显示另一平衡族的扫描快照';}
}
function update(){buildGeometry();buildSection();drawSection();scheduleDiagnostics();dirty=true;window.dispatchEvent(new CustomEvent("flux-state",{detail:{...p}}));}
function buildGeometry(){
 const nz=80,nc=28,verts=[],faces=[],wires=[],axis=[],lines=[];
 for(let j=0;j<=nz;j++)for(let i=0;i<=nc;i++)verts.push(P.surface(p,p.delta,T*i/nc,T*j/nz));
 for(let j=0;j<nz;j++)for(let i=0;i<nc;i++){const a=j*(nc+1)+i;faces.push([a,a+1,a+nc+2,a+nc+1]);}
 for(const f of [1/9,4/9,1]){
  for(let j=0;j<16;j++){const arr=[];for(let i=0;i<=nc;i++)arr.push(P.surface(p,p.delta*f,T*i/nc,T*j/16));wires.push({pts:arr,alpha:f===1?.29:.12});}
  for(let i=0;i<6;i++){const arr=[];for(let j=0;j<=nz;j++)arr.push(P.surface(p,p.delta*f,T*i/6,T*j/nz));wires.push({pts:arr,alpha:f===1?.2:.10});}
 }
 for(let j=0;j<=160;j++)axis.push(P.surface(p,0,0,T*j/160));
 for(let i=0;i<($('preset').value==='custom'?3:$('preset').value.startsWith('L1')?2:1);i++)lines.push(P.trace(p,p.delta*flux,p.family==='constant'?1:3,Math.max(320,Math.ceil(32*(2*p.S+p.eps))),i*T/3+.2).pts);
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];for(const v of verts)for(let k=0;k<3;k++){low[k]=Math.min(low[k],v[k]);high[k]=Math.max(high[k],v[k]);}
 const center=low.map((v,k)=>(v+high[k])/2),radius=Math.max(...high.map((v,k)=>(v-low[k])/2));geometry={verts,faces,wires,axis,lines,center,radius};
}
function drawScene(dt){const {ctx,w,h}=setupCanvas('scene');if(!geometry)return;
 if(playing)phase+=dt*.18*speed;if($('auto-rotate').checked&&playing)camera.yaw+=dt*.13;
 const {center,radius}=geometry,scale=Math.min(w*.42/radius,h*.66/radius)*camera.zoom,c=Math.cos(camera.yaw),s=Math.sin(camera.yaw),ct=Math.cos(camera.tilt),st=Math.sin(camera.tilt);
 const project=v=>{const x=v[0]-center[0],y=v[1]-center[1],z=v[2]-center[2],xx=x*c-y*s,yy=x*s+y*c;return [w/2+xx*scale,h*.49-(z*ct-yy*st)*scale,yy*ct+z*st];};
 function path(pts,color,width=1,alpha=1){ctx.beginPath();pts.forEach((v,i)=>{const a=project(v);i?ctx.lineTo(a[0],a[1]):ctx.moveTo(a[0],a[1]);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.stroke();ctx.globalAlpha=1;}
 // A subtle world grid lies beneath the torus, in normalized Cartesian coordinates.
 const base=center[2]-radius*.65;
 for(let i=-4;i<=4;i++){const q=i*radius/3;path([[q,-radius*1.35,base],[q,radius*1.35,base]],'#29434a',.6,.3);path([[-radius*1.35,q,base],[radius*1.35,q,base]],'#29434a',.6,.3);}
 if($('show-surface').checked){const pv=geometry.verts.map(project);const fs=geometry.faces.map(f=>({f,z:f.reduce((sum,i)=>sum+pv[i][2],0)/4})).sort((a,b)=>a.z-b.z);
  for(const {f,z} of fs){ctx.beginPath();f.forEach((id,i)=>{const v=pv[id];i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]);});ctx.closePath();const shade=(z/radius+1)/2;ctx.fillStyle=`rgba(${45+Math.round(shade*30)},${140+Math.round(shade*50)},${140+Math.round(shade*30)},0.095)`;ctx.fill();}
  for(const wire of geometry.wires)path(wire.pts,colors.teal,.7,wire.alpha);
 }
 if($('show-axis').checked)path(geometry.axis,colors.pink,1.8,.92);
 if($('show-lines').checked)geometry.lines.forEach((line,j)=>{
  path(line,colors.gold,j===0?1.7:1.1,j===0?.95:.47);
  const count=line.length-1;
  for(let k=0;k<4;k++){const pos=((phase+k/4+j*.08)%1)*count,idx=Math.floor(pos),t=pos-idx,raw=line[idx].map((v,l)=>v*(1-t)+line[Math.min(idx+1,count)][l]*t),v=project(raw);ctx.beginPath();ctx.arc(v[0],v[1],2.6,0,T);ctx.fillStyle='#fff1c2';ctx.shadowBlur=11;ctx.shadowColor=colors.gold;ctx.fill();ctx.shadowBlur=0;}
 });
 // Orientation triad follows the same rotation as the geometry.
 const origin=[55,h-61],axes=[[1,0,0],[0,1,0],[0,0,1]],labels=['x','y','z'];ctx.font='11px Consolas';axes.forEach((v,i)=>{const xx=v[0]*c-v[1]*s,yy=v[0]*s+v[1]*c,end=[origin[0]+xx*22,origin[1]-(v[2]*ct-yy*st)*22];ctx.beginPath();ctx.moveTo(...origin);ctx.lineTo(...end);ctx.strokeStyle=[colors.teal,colors.blue,colors.pink][i];ctx.stroke();ctx.fillStyle=colors.muted;ctx.fillText(labels[i],end[0]+3,end[1]-3);});
}
function axes(id,xmin,xmax,ymin,ymax,xlabel,ylabel,equal=false){const {ctx,w,h}=setupCanvas(id),pad={l:58,r:18,t:28,b:42},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
 if(xmax-xmin<1e-8){xmin-=.1;xmax+=.1;}if(ymax-ymin<1e-8){ymin-=.1;ymax+=.1;}
 if(equal){const sx=(xmax-xmin)/pw,sy=(ymax-ymin)/ph,v=Math.max(sx,sy),xm=(xmin+xmax)/2,ym=(ymin+ymax)/2;xmin=xm-v*pw/2;xmax=xm+v*pw/2;ymin=ym-v*ph/2;ymax=ym+v*ph/2;}
 const X=v=>pad.l+(v-xmin)/(xmax-xmin)*pw,Y=v=>pad.t+(ymax-v)/(ymax-ymin)*ph;ctx.font='10px Consolas';ctx.lineWidth=.7;
 for(let i=0;i<=4;i++){let v=xmin+(xmax-xmin)*i/4,x=X(v);ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,h-pad.b);ctx.strokeStyle=colors.grid;ctx.stroke();ctx.fillStyle=colors.muted;ctx.textAlign='center';ctx.fillText(fmt(v,Math.abs(xmax-xmin)<.1?3:2),x,h-pad.b+17);v=ymin+(ymax-ymin)*i/4;const y=Y(v);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.textAlign='right';ctx.fillText(fmt(v,Math.abs(ymax-ymin)<.1?3:2),pad.l-9,y+3);}
 ctx.fillStyle=colors.text;ctx.font='11px Segoe UI';ctx.textAlign='left';ctx.fillText(ylabel,7,13);ctx.textAlign='center';ctx.fillText(xlabel,pad.l+pw/2,h-6);ctx.strokeStyle='#4a626b';ctx.strokeRect(pad.l,pad.t,pw,ph);return {ctx,w,h,X,Y,pad,pw,ph};}
function plotLine(a,pts,color,width=1.7){a.ctx.beginPath();pts.forEach((v,i)=>i?a.ctx.lineTo(a.X(v[0]),a.Y(v[1])):a.ctx.moveTo(a.X(v[0]),a.Y(v[1])));a.ctx.strokeStyle=color;a.ctx.lineWidth=width;a.ctx.stroke();}
function bounds(arr){const xs=arr.map(v=>v[0]),ys=arr.map(v=>v[1]);let xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);const dx=Math.max(1e-4,(xmax-xmin)*.1),dy=Math.max(1e-4,(ymax-ymin)*.13);return [xmin-dx,xmax+dx,ymin-dy,ymax+dy];}
function buildSection(){const phi=Number($('phi').value)/180*Math.PI;sectionData=[1/9,4/9,1].map(f=>Array.from({length:121},(_,i)=>{const v=P.section(p,p.delta*f,T*i/120,phi);return [Math.hypot(v[0],v[1]),v[2]];}));}
function drawSection(){if(!sectionData.length)return;const b=bounds(sectionData.flat()),a=axes('section',...b,'R / 归一化','Z / 归一化',true);sectionData.forEach((d,i)=>plotLine(a,d,[colors.blue,colors.teal,colors.gold][i],i===2?1.7:1.1));}
function drawProfile(){
 if(!diagnostics){const {ctx,w,h}=setupCanvas('profile');ctx.fillStyle=colors.muted;ctx.font='12px Segoe UI';ctx.textAlign='center';ctx.fillText('正在计算平衡剖面…',w/2,h/2);return;}
 if(profileMode==='poincare'){const pts=diagnostics.section.map(v=>[Math.hypot(v[0],v[1]),v[2]]),reference=Array.from({length:121},(_,i)=>{const v=P.section(p,p.delta*.8,T*i/120,0);return [Math.hypot(v[0],v[1]),v[2]];}),a=axes('profile',...bounds(reference),'R / 归一化','Z / 归一化',true);plotLine(a,reference,'#44656c',1);for(const v of pts){a.ctx.fillStyle=colors.gold;a.ctx.beginPath();a.ctx.arc(a.X(v[0]),a.Y(v[1]),2,0,T);a.ctx.fill();}$('profile-note').textContent=p.family==='constant'?'ψ/δ = 0.8 · 100 周回 · 闭合线截点重合':'ψ/δ = 0.8 · 100 周回 · ζ = 0 mod 2π';return;}
 const pressure=profileMode==='pressure',pts=pressure?[[0,diagnostics.stats.pAxis],[1,0]]:diagnostics.profile.map(v=>[v.x,v.y]),ys=pts.map(v=>v[1]);let lo=Math.min(...ys),hi=Math.max(...ys),pad=Math.max(.015,(hi-lo)*.2);if(pressure){lo=0;hi*=1.15;}else {lo-=pad;hi+=pad;}
 const a=axes('profile',0,1,lo,hi,'归一化磁通 ψ / δ',pressure?'p / 归一化':'旋转变换 ι');plotLine(a,pts,pressure?colors.gold:colors.teal,2);
 if(!pressure)pts.forEach(v=>{a.ctx.fillStyle=colors.teal;a.ctx.beginPath();a.ctx.arc(a.X(v[0]),a.Y(v[1]),2,0,T);a.ctx.fill();});
 $('profile-note').textContent=pressure?'压力从磁轴向边界线性下降；边界压力为零。':p.family==='constant'?'解析值 ι = 2；每个环向周回对应两个极向周回。':`RK4 · 48 周回 × ${diagnostics.steps} 步 / 周回 · 有限周回估计`;
}
function scheduleDiagnostics(){clearTimeout(diagTimer);worker?.terminate();diagId++;diagnostics=null;$('profile-status').textContent='计算中';for(const id of ['beta-stat','volume-stat','iota-stat','div-res','force-res','tangent-res'])$(id).textContent='…';drawProfile();const id=diagId;diagTimer=setTimeout(()=>{
 try{worker=new Worker('worker.js');worker.onmessage=e=>{const d=e.data;if(d.id!==diagId)return;if(d.type==='error'){toast('计算失败：'+d.message);return;}diagnostics=d;renderDiagnostics();worker.terminate();worker=null;};worker.onerror=()=>{toast('后台计算未能启动，请通过本地服务器或网站打开。');$('profile-status').textContent='后台计算不可用';};worker.postMessage({type:'diagnostics',p:{...p},id,h:Number($('diff-step').value)});}catch(e){toast(e.message);}
 },90);}
function renderDiagnostics(){const d=diagnostics;$('beta-stat').textContent=fmt(100*d.stats.beta,2)+'%';$('volume-stat').textContent=fmt(d.stats.volume,4);$('iota-stat').textContent=fmt(d.profile.at(-1).y,4);$('beta-method').textContent=d.stats.method+' · p边界 = 0';$('volume-method').textContent=d.stats.method+' · 归一化';$('iota-method').textContent=p.family==='constant'?'解析值':'有限周回数值估计';$('profile-status').textContent=p.family==='constant'?'ANALYTIC':'RK4 / 48 TURNS';$('div-res').textContent=sci(d.residual.div);$('force-res').textContent=sci(d.residual.force);$('tangent-res').textContent=sci(d.residual.tangent);drawProfile();}
function runScan(){stopSweep();scanWorker?.terminate();$('scan').disabled=true;$('scan').textContent='扫描中…';$('scan-status').textContent='正在计算 625 个参数点…';const id=++scanId;scanWorker=new Worker('worker.js');scanWorker.onmessage=e=>{const d=e.data;if(d.id!==scanId)return;$('scan').disabled=false;$('scan').textContent='重新运行扫描 ↗';if(d.type==='error'){toast(d.message);return;}scanData=d;scanIndex=null;$('scan-empty').hidden=true;$('sweep').disabled=false;$('export-scan').disabled=false;$('scan-status').textContent=`完成 · ${d.rows.filter(r=>r.valid).length} / 625 个有效点`;$('scan-selection').innerHTML=`固定 δ = ${fmt(d.p.delta,5)}<br>${d.p.family==='shear'?`S = ${fmt(d.p.S,2)} · λ = ${fmt(d.p.lam,2)}`:'恒定 ι = 2'}<br>点击网格载入参数`;drawScan();scanWorker.terminate();scanWorker=null;};scanWorker.onerror=()=>{$('scan').disabled=false;$('scan').textContent='重试扫描';toast('扫描计算启动失败');};scanWorker.postMessage({type:'scan',id,p:{...p}});}
function heat(t){const stops=[[33,72,86],[54,140,152],[133,227,196],[247,204,124]],f=Math.max(0,Math.min(.999999,t))*3,i=Math.floor(f),k=f-i;return `rgb(${stops[i].map((v,j)=>Math.round(v+(stops[i+1][j]-v)*k)).join(',')})`;}
let scanLayout=null;
function drawScan(){const {ctx,w,h}=setupCanvas('scan-canvas');if(!scanData)return;const d=scanData,n=d.n,l=58,r=16,t=28,b=44,pw=w-l-r,ph=h-t-b,vals=d.rows.filter(v=>v.valid).map(v=>v[scanMode]),lo=Math.min(...vals),hi=Math.max(...vals),cw=pw/n,ch=ph/n;scanLayout={l,t,pw,ph,cw,ch};
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const v=d.rows[j*n+i];ctx.fillStyle=v.valid?heat((v[scanMode]-lo)/(hi-lo||1)):'#2b3439';ctx.fillRect(l+i*cw,t+(n-1-j)*ch,cw+.4,ch+.4);}
 ctx.font='10px Consolas';ctx.fillStyle=colors.muted;for(let i=0;i<=4;i++){const fraction=i/4;ctx.textAlign='center';ctx.fillText(fmt(.05+(d.emax-.05)*fraction,2),l+cw/2+(pw-cw)*fraction,h-b+18);ctx.textAlign='right';ctx.fillText(fmt(-d.tmax+2*d.tmax*fraction,2),l-8,t+ph-ch/2-(ph-ch)*fraction+3);}
 ctx.fillStyle=colors.text;ctx.textAlign='center';ctx.fillText('横向形变 ε',l+pw/2,h-6);ctx.textAlign='left';ctx.fillText(d.p.family==='constant'?'破缺 τ₀':'破缺 τ₁',8,14);
 if(scanIndex!==null){const i=scanIndex%n,j=Math.floor(scanIndex/n);ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.strokeRect(l+i*cw+1,t+(n-1-j)*ch+1,cw-2,ch-2);}
 $('scan-min').textContent=scanMode==='beta'?fmt(lo*100,2)+'%':fmt(lo,3);$('scan-max').textContent=scanMode==='beta'?fmt(hi*100,2)+'%':fmt(hi,3);
}
function scanAt(e){if(!scanData||!scanLayout)return null;const r=$('scan-canvas').getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,{l,t,pw,ph,cw,ch}=scanLayout;if(x<l||x>=l+pw||y<t||y>=t+ph)return null;return (scanData.n-1-Math.floor((y-t)/ch))*scanData.n+Math.floor((x-l)/cw);}
function selectScan(idx,load=true){scanIndex=idx;const v=scanData.rows[idx];$('scan-selection').innerHTML=`ε = ${fmt(v.eps,3)} · τ = ${fmt(v.tau,3)}<br>${v.valid?`β = ${fmt(v.beta*100,3)}%<br>V = ${fmt(v.volume,4)}`:'磁面定义域无效，未载入'}`;if(v.valid&&load){p={...scanData.p,eps:v.eps,tau:v.tau};$('preset').value='custom';sync();update();}drawScan();}
function stopSweep(){if(sweepTimer)clearInterval(sweepTimer);sweepTimer=null;$('sweep').textContent='▷ 播放 τ 扫描';}
function startSweep(){if(sweepTimer){stopSweep();return;}if(!scanData)return;const n=scanData.n,i=Math.max(0,Math.min(n-1,Math.round((p.eps-.05)/(scanData.emax-.05)*(n-1))));let j=0;$('sweep').textContent='Ⅱ 停止 τ 扫描';const advance=()=>{let idx=j*n+i;selectScan(idx);j++;if(j>=n)stopSweep();};advance();sweepTimer=setInterval(advance,1100);}
for(const k of ['eps','tau','delta','S','lam'])$(k).addEventListener('input',()=>{stopSweep();p[k]=Number($(k).value);const lim=P.limit(p)*.9999,adjusted=p.delta>lim;if(adjusted)p.delta=lim;$('preset').value='custom';sync(adjusted);update();});
$('family-constant').onclick=()=>toggleFamily('constant');$('family-shear').onclick=()=>toggleFamily('shear');
$('preset').onchange=()=>{if($('preset').value==='custom')return;stopSweep();const f=p.family;p={...P.defaults[f],tau:$('preset').value==='landreman'?0:($('preset').value==='issan-neg'?-1:1)*(f==='constant'?.5:.4)};sync();update();};
$('flux').oninput=()=>{flux=Number($('flux').value);$('flux-value').textContent=fmt(flux,2);buildGeometry();dirty=true;};$('speed').oninput=()=>{speed=Number($('speed').value);$('speed-value').textContent=fmt(speed,1)+'×';};
function syncPlay(){$('play').textContent=playing?'Ⅱ 暂停动画':'▷ 播放动画';$('play').setAttribute('aria-pressed',playing);}
$('play').onclick=()=>{playing=!playing;syncPlay();dirty=true;};$('reset-camera').onclick=()=>{camera={yaw:-.52,tilt:.57,zoom:1};dirty=true;};
for(const id of ['show-surface','show-lines','show-axis','auto-rotate'])$(id).onchange=()=>dirty=true;
$('phi').oninput=()=>{$('phi-value').textContent=$('phi').value+'°';buildSection();drawSection();};
for(const mode of ['iota','pressure','poincare'])$('profile-'+mode).onclick=()=>{profileMode=mode;for(const m of ['iota','pressure','poincare'])$('profile-'+m).setAttribute('aria-pressed',m===mode);drawProfile();};
$('scene').onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};$('scene').setPointerCapture(e.pointerId);};$('scene').onpointermove=e=>{if(!drag)return;camera.yaw+=(e.clientX-drag.x)*.008;camera.tilt=Math.max(-1.3,Math.min(1.3,camera.tilt+(e.clientY-drag.y)*.008));drag={x:e.clientX,y:e.clientY};dirty=true;};$('scene').onpointerup=$('scene').onpointercancel=()=>drag=null;
$('scene').addEventListener('wheel',e=>{e.preventDefault();camera.zoom=Math.max(.45,Math.min(2.5,camera.zoom*Math.exp(-e.deltaY*.001)));dirty=true;},{passive:false});
$('scene').onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')camera.yaw-=.1;if(e.key==='ArrowRight')camera.yaw+=.1;if(e.key==='ArrowUp')camera.tilt=Math.min(1.3,camera.tilt+.1);if(e.key==='ArrowDown')camera.tilt=Math.max(-1.3,camera.tilt-.1);if(e.key==='+'||e.key==='=')camera.zoom=Math.min(2.5,camera.zoom*1.1);if(e.key==='-')camera.zoom=Math.max(.45,camera.zoom/1.1);dirty=true;}};
$('recheck').onclick=scheduleDiagnostics;$('diff-step').onchange=scheduleDiagnostics;$('scan').onclick=runScan;$('sweep').onclick=startSweep;
for(const mode of ['beta','volume'])$('scan-'+mode).onclick=()=>{scanMode=mode;for(const m of ['beta','volume'])$('scan-'+m).setAttribute('aria-pressed',m===mode);drawScan();};
$('scan-canvas').onpointermove=e=>{const idx=scanAt(e),tip=$('scan-tooltip');if(idx===null){tip.hidden=true;return;}const v=scanData.rows[idx],r=$('scan-canvas').getBoundingClientRect();tip.hidden=false;tip.textContent=`ε ${fmt(v.eps,3)} · τ ${fmt(v.tau,3)} | ${v.valid?(scanMode==='beta'?'β '+fmt(v.beta*100,2)+'%':'V '+fmt(v.volume,3)):'无效定义域'}`;tip.style.left=Math.max(0,Math.min(r.width-240,e.clientX-r.left+12))+'px';tip.style.top=Math.max(0,e.clientY-r.top-36)+'px';};$('scan-canvas').onpointerleave=()=>$('scan-tooltip').hidden=true;
$('scan-canvas').onclick=e=>{const idx=scanAt(e);if(idx!==null){stopSweep();selectScan(idx);}};
$('scan-canvas').onkeydown=e=>{if(!scanData)return;const n=scanData.n;let idx=scanIndex??Math.floor(n*n/2);if(e.key==='ArrowLeft')idx=Math.max(0,idx-1);else if(e.key==='ArrowRight')idx=Math.min(n*n-1,idx+1);else if(e.key==='ArrowUp')idx=Math.min(n*n-1,idx+n);else if(e.key==='ArrowDown')idx=Math.max(0,idx-n);else if(e.key==='Enter'){selectScan(idx);e.preventDefault();return;}else return;e.preventDefault();selectScan(idx,false);};
$('export-scan').onclick=()=>{if(!scanData)return;const d=scanData,rows=['family,epsilon,tau,delta,S,lambda,valid,beta_fraction,volume_normalized,quadrature_nx,quadrature_nz',...d.rows.map(v=>[d.p.family,v.eps,v.tau,d.p.delta,d.p.S,d.p.lam,v.valid,v.beta??'',v.volume??'',20,40].join(','))];save('flux-atlas-scan.csv',rows.join('\r\n'),'text/csv;charset=utf-8');toast('扫描数据已导出');};
$('export-state').onclick=()=>{save('flux-atlas-state.json',JSON.stringify({model:'static ideal MHD analytic equilibrium',references:['arXiv:2609.26742v2','arXiv:2610.07304v1'],normalization:'mu0=1, boundary pressure=0',preset:PaperPresets.cases.find(c=>c.id===$('preset').value)||null,parameters:p,diagnostics:diagnostics?{stats:diagnostics.stats,residual:diagnostics.residual,iotaProfile:diagnostics.profile}:null,numerics:{iotaTurns:48,iotaStepsPerTurn:diagnostics?.steps??null,quadrature:[40,80]},view:{camera,flux}},null,2),'application/json');toast('当前参数与诊断数据已导出');};
$('screenshot').onclick=()=>{drawScene(0);const source=$('scene'),c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.fillStyle='#101f25';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(source,0,0);ctx.fillStyle='#bcd7d9';ctx.font=`${12*(devicePixelRatio>1?2:1)}px Segoe UI`;ctx.fillText(`FLUX ATLAS | ${p.family} | eps=${p.eps.toFixed(3)} tau=${p.tau.toFixed(3)} delta=${p.delta.toFixed(5)} | normalized`,20,c.height-20);const a=document.createElement('a');a.download='flux-atlas-view.png';a.href=c.toDataURL('image/png');a.click();toast('三维视图已保存');};
$('about').onclick=()=>$('model-dialog').showModal();$('close-dialog').onclick=()=>$('model-dialog').close();$('model-dialog').onclick=e=>{if(e.target===$('model-dialog')){const r=$('model-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('model-dialog').close();}};
const observer=new ResizeObserver(()=>{dirty=true;drawSection();drawProfile();drawScan();});for(const id of ['scene','section','profile','scan-canvas'])observer.observe($(id));
function animate(now){const dt=Math.min(.05,(now-lastTime)/1000||0);lastTime=now;if(!document.hidden&&(playing||dirty)){drawScene(dt);dirty=false;}requestAnimationFrame(animate);}
window.FluxAtlas={worker:()=>new Worker('worker.js'),load:c=>{stopSweep();p={...c.p};$('preset').value=c.id;flux=1;$('flux').value=1;$('flux-value').textContent='1.00';$('show-surface').checked=c.figure!=='I1';$('show-lines').checked=c.figure!=='I1';$('show-axis').checked=true;camera={yaw:-.52,tilt:.57,zoom:1};sync();update();}};
sync();syncPlay();update();requestAnimationFrame(animate);
})();
