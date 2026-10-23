const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'dist');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8'),physics=fs.readFileSync(path.join(root,'physics.js'),'utf8'),worker=fs.readFileSync(path.join(root,'worker.js'),'utf8').replace("importScripts('physics.js');",''),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
app=app.replaceAll("new Worker('worker.js')","makeOfflineWorker()");
const factory="function makeOfflineWorker(){const url=URL.createObjectURL(new Blob([document.getElementById('offline-worker').textContent],{type:'text/javascript'}));const w=new Worker(url);URL.revokeObjectURL(url);return w;}\n";
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>');
html=html.replace('<link rel="stylesheet" href="atlas.css">',()=>'<style>'+fs.readFileSync(path.join(root,'atlas.css'),'utf8')+'</style>');
for(const name of ['physics','presets','atlas-data','app','atlas']){
 const code=name==='app'?factory+app:fs.readFileSync(path.join(root,name+'.js'),'utf8');
 html=html.replace('<script src="'+name+'.js"></script>',()=>'<script>'+code+'</script>');
}
html=html.replace('</body>',()=>'<script id="offline-worker" type="text/plain">'+physics+'\n'+worker+'</script></body>');
fs.writeFileSync(path.join(root,'flux-atlas-offline.html'),html);
console.log('Offline build: '+Buffer.byteLength(html)+' bytes');
