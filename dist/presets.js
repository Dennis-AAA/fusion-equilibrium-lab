/* Figure parameters transcribed from the versioned PDFs, 2026-10-23. */
(function(root){
const papers={L:{id:'2609.26742v2',name:'Landreman',url:'https://arxiv.org/html/2609.26742v2'},I:{id:'2610.07304v1',name:'Issan 等',url:'https://arxiv.org/html/2610.07304v1'}};
const base={constant:{family:'constant',eps:.5,tau:0,S:1.4,lam:1.6,delta:1/64},shear:{family:'shear',eps:1.2,tau:0,S:1.4,lam:1.6,delta:.14}};
const figures=[],cases=[];
function add(id,paper,number,title,type,family,variants,extra={}){
 const f={id,paper,number,title,type,family,...extra,cases:[]};
 for(const [label,params] of variants){const c={id:id+'-'+f.cases.length,label,figure:id,paper,number,p:{...base[family],...params}};f.cases.push(c);cases.push(c);}figures.push(f);
}
add('L1','L',1,'恒定 ι：三维磁面与三种形变','sections','constant',[
 ['左上三维 / ε = 0.5',{eps:.5}],['右上截面 / ε = 0.25',{eps:.25}],['左下截面 / ε = 0.5',{eps:.5}],['右下截面 / ε = 0.7',{eps:.7}]],{phis:[0,45,90],note:'δ = 1/64；截面 ψ/δ = 1/9、4/9、1。左上三维显示两条边界场线；其起始位置由本页选择。'});
add('L2','L',2,'磁剪切：A、B、C 三组几何','sections','shear',[
 ['左上三维 / B',{eps:4,S:3.5,delta:.245,lam:3.5}],['截面 A',{eps:1.08,S:3,delta:.245,lam:3.5}],['截面 B',{eps:4,S:3.5,delta:.245,lam:3.5}],['截面 C',{eps:5.6,S:4,delta:.32,lam:2}]],{phis:[0,45,90],note:'外边界与 A/B/C 参数来自图内标签。图注未列内层磁通值，本页选 ψ/δ = 1/9、4/9；场线起点和长度为展示选择。'});
add('I1','I',1,'磁轴：三维、水平投影与垂向相位','axis','constant',[-.5,-.25,0,.25,.5].map(tau=>['τ₀ = '+tau,{tau}]),{note:'(a) 三维磁轴与 (c) 垂向曲线使用 z − zc；(b) 水平投影。ε = 0.5。此图只规定磁轴，工作区边界 δ = 1/64 为展示选择。'});
add('I2','I',2,'恒定 ι：负向、零、正向破缺','geometry','constant',[['(a) τ₀ = −0.5',{tau:-.5}],['(b) τ₀ = 0',{tau:0}],['(c) τ₀ = +0.5',{tau:.5}]],{note:'ε = 0.5，δ = 1/64；每条边界场线一环向周回闭合。原图垂向坐标为 z − zc，图册使用同样坐标，工作区自动居中显示，截面保留实际 z。场线起点由本页选择。'});
add('I3','I',3,'恒定 ι：体积与 β 随 τ₀ 变化','scan','constant',[.25,.5,.75].map(eps=>['ε = '+eps,{eps,tau:eps===.75?.1:0}]),{eps:[.25,.5,.75],range:.75,n:151,note:'(a) V(δ)；(b) βV（比例值）。δ = 1/64，pb = 0。扫描区间 [−0.75, 0.75]、151 点为本页采样。ε = 0.75、τ₀ = 0 恰在严格定义域边界：曲线留空，该预设载入 τ₀ = 0.1。'});
add('I4','I',4,'恒定 ι：四个环向角的截面','sections','constant',[['(a) τ₀ = 0',{tau:0}],['(b) τ₀ = −0.5',{tau:-.5}],['(c) τ₀ = +0.5',{tau:.5}]],{phis:[0,45,90,135],note:'ε = 0.5，δ = 1/64；ψ/δ = 1/9、4/9、1，另标磁轴点。坐标使用实际 z，不扣除磁轴偏移。'});
add('I5','I',5,'磁剪切：三种破缺下的边界场线','geometry','shear',[['(a) τ₁ = −0.4',{tau:-.4}],['(b) τ₁ = 0',{tau:0}],['(c) τ₁ = +0.4',{tau:.4}]],{note:'ε = 1.2，S = 1.4，λ = 1.6，δ = 0.14；边界场线追踪三环向周回。场线起点由本页选择。'});
add('I6','I',6,'磁剪切：正负 τ₁ 的旋转变换族','profiles','shear',[-.5,-.4,-.3,-.2,-.1,0,.1,.2,.3,.4,.5].map(tau=>['τ₁ = '+tau,{tau}]),{note:'(a) τ₁ ≤ 0；(b) τ₁ ≥ 0。ε = 1.2，S = 1.4，δ = 0.14；ι 与 λ 无关，工作区取 λ = 1.6。图中色标范围为 ±0.5；本页以 Δτ₁ = 0.05、21 个磁面采样，密度为本页选择。'});
add('I7','I',7,'磁剪切：体积与 β 随 τ₁ 变化','scan','shear',[.6,1.2,1.8].map(eps=>['ε = '+eps,{eps}]),{eps:[.6,1.2,1.8],range:.5,n:101,note:'(a) V(δ)；(b) βV（比例值）。δ = 0.14，S = 1.4，λ = 1.6，pb = 0；[−0.5, 0.5] 取 101 点。'});
add('I8','I',8,'磁剪切：四个环向角的截面','sections','shear',[['(a) τ₁ = 0',{tau:0}],['(b) τ₁ = −0.4',{tau:-.4}],['(c) τ₁ = +0.4',{tau:.4}]],{phis:[0,45,90,135],note:'ε = 1.2，S = 1.4，λ = 1.6，δ = 0.14；ψ/δ = 1/9、4/9、1，另标磁轴点。'});
const api={papers,figures,cases};root.PaperPresets=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
