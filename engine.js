// AURON ENGINE — extraído de auron-studio-v9.html (cópia; o desktop continua independente)
// Requer globals definidos pela app: el(), canvas, uid, layers. Gerado 2026-06-12.
// Detecção de suporte a canvas filter (Safari iOS < 18 não suporta)
var _fSupp=(()=>{try{const c=document.createElement('canvas');c.width=c.height=7;const x=c.getContext('2d');x.filter='blur(2px)';x.fillStyle='red';x.fillRect(3,3,1,1);return x.getImageData(1,3,1,1).data[0]>5;}catch(e){return false;}})();
// Box blur por software (3 passes ≈ gaussiano) — fallback para iOS < 18
function _swBlur(ctx,w,h,r){if(r<1)return;const k=1/(r*2+1);for(let p=0;p<3;p++){const id=ctx.getImageData(0,0,w,h),s=new Uint8ClampedArray(id.data),d=id.data;for(let y=0;y<h;y++)for(let c=0;c<4;c++){let sm=s[y*w*4+c]*(r+1);for(let x=0;x<r;x++)sm+=s[(y*w+x)*4+c];for(let x=0;x<w;x++){sm+=s[(y*w+Math.min(x+r,w-1))*4+c]-s[(y*w+Math.max(x-r-1,0))*4+c];d[(y*w+x)*4+c]=sm*k;}}ctx.putImageData(id,0,0);const id2=ctx.getImageData(0,0,w,h),s2=new Uint8ClampedArray(id2.data),d2=id2.data;for(let x=0;x<w;x++)for(let c=0;c<4;c++){let sm=s2[x*4+c]*(r+1);for(let y=0;y<r;y++)sm+=s2[(y*w+x)*4+c];for(let y=0;y<h;y++){sm+=s2[(Math.min(y+r,h-1)*w+x)*4+c]-s2[(Math.max(y-r-1,0)*w+x)*4+c];d2[(y*w+x)*4+c]=sm*k;}}ctx.putImageData(id2,0,0);}}

const hexRGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const hexA=(h,a)=>{if(!h||h.length<7)return`rgba(128,128,128,${a})`;const[r,g,b]=hexRGB(h);return`rgba(${r},${g},${b},${a})`;};
const cl=v=>Math.max(0,Math.min(255,Math.round(v)));
const lerp=(a,b,t)=>a+(b-a)*t;
const rgbHex=(r,g,b)=>'#'+[r,g,b].map(v=>cl(v).toString(16).padStart(2,'0')).join('');

// ═══ STATE ════════════════════════════════════════════════════════════════════
// largura de referência fixa p/ escalar grids/halftone/displacement de forma
// independente do tamanho real da preview (que varia com painéis/zoom). Assim o
// resultado no export 300dpi é proporcionalmente idêntico ao que se vê no editor.
const DESIGN_W=600;
// ═══ PERLIN ENGINE ════════════════════════════════════════════════════════════
const _perm=(()=>{
  const p=new Uint8Array(256);for(let i=0;i<256;i++)p[i]=i;
  for(let i=255;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}
  const pm=new Uint8Array(512);for(let i=0;i<512;i++)pm[i]=p[i&255];return pm;
})();
function _pn(x,y){
  const fade=t=>t*t*t*(t*(t*6-15)+10);
  const g=(h,x,y)=>{const v=h&3;const u=v<2?x:y,w=v<2?y:x;return((h&1)?-u:u)+((h&2)?-w:w);};
  const X=Math.floor(x)&255,Y=Math.floor(y)&255;
  x-=Math.floor(x);y-=Math.floor(y);
  const u=fade(x),v=fade(y);
  const a=_perm[X]+Y,b=_perm[X+1]+Y;
  return lerp(lerp(g(_perm[a],x,y),g(_perm[b],x-1,y),u),lerp(g(_perm[a+1],x,y-1),g(_perm[b+1],x-1,y-1),u),v);
}
function fbm(x,y,oct,persist){
  let v=0,a=1,f=1,mx=0;
  for(let i=0;i<oct;i++){v+=_pn(x*f,y*f)*a;mx+=a;a*=persist;f*=2;}
  return v/mx;
}

// ═══ SHAPES ══════════════════════════════════════════════════════════════════
const SHAPES={
  circle:  t=>({x:Math.cos(t),y:Math.sin(t)}),
  ellipse: t=>({x:Math.cos(t)*.65,y:Math.sin(t)}),
  squircle:t=>{const p=4;return{x:Math.sign(Math.cos(t))*Math.pow(Math.abs(Math.cos(t)),2/p),y:Math.sign(Math.sin(t))*Math.pow(Math.abs(Math.sin(t)),2/p)};},
  heart:   t=>({x:Math.sin(t)**3,y:-(Math.cos(t)-.3*Math.cos(2*t)-.1*Math.cos(3*t)-.05*Math.cos(4*t))*.9+.08}),
  drop:    t=>{const r=1-.4*Math.cos(t);return{x:r*Math.sin(t),y:r*Math.cos(t)-.15};},
  diamond: t=>{const p=1.3;return{x:Math.sign(Math.cos(t))*Math.pow(Math.abs(Math.cos(t)),2/p)*.85,y:Math.sign(Math.sin(t))*Math.pow(Math.abs(Math.sin(t)),2/p)*1.1};},
  blob1:   t=>{const r=1+.25*Math.cos(3*t)+.15*Math.cos(2*t);return{x:r*Math.cos(t),y:r*Math.sin(t)};},
  blob2:   t=>{const r=1+.3*Math.sin(4*t);return{x:r*Math.cos(t),y:r*Math.sin(t)};},
  rect:    t=>{const c=Math.cos(t),s=Math.sin(t);const sc=Math.abs(c)>Math.abs(s)?1/Math.abs(c):1/Math.abs(s);return{x:c*sc*.9,y:s*sc*.9};},
  rectr:   t=>{const p=8;return{x:Math.sign(Math.cos(t))*Math.pow(Math.abs(Math.cos(t)),2/p)*.9,y:Math.sign(Math.sin(t))*Math.pow(Math.abs(Math.sin(t)),2/p)*.9};},
  tri:     t=>{const N=3,a=(t%(Math.PI*2)+Math.PI*2)%(Math.PI*2);const seg=Math.floor(a/(Math.PI*2/N));const a0=seg*Math.PI*2/N-Math.PI/2,a1=(seg+1)*Math.PI*2/N-Math.PI/2;const f=(a%(Math.PI*2/N))/(Math.PI*2/N);return{x:lerp(Math.cos(a0),Math.cos(a1),f)*.9,y:lerp(Math.sin(a0),Math.sin(a1),f)*.9};},
  trir:    t=>{const vx=[Math.cos(-Math.PI/2),Math.cos(-Math.PI/2+Math.PI*2/3),Math.cos(-Math.PI/2+Math.PI*4/3)];const vy=[Math.sin(-Math.PI/2),Math.sin(-Math.PI/2+Math.PI*2/3),Math.sin(-Math.PI/2+Math.PI*4/3)];const a=(t%(Math.PI*2)+Math.PI*2)%(Math.PI*2);const seg=Math.floor(a/(Math.PI*2/3));const ni=(seg+1)%3;const f=(a%(Math.PI*2/3))/(Math.PI*2/3);const s=f*f*(3-2*f);const r=.75;return{x:lerp(vx[seg]*(1-r)+vx[ni]*r,vx[ni]*(1-r)+vx[seg]*r,s)*.88,y:lerp(vy[seg]*(1-r)+vy[ni]*r,vy[ni]*(1-r)+vy[seg]*r,s)*.88};},
  arch:    t=>{const a=(t%(Math.PI*2)+Math.PI*2)%(Math.PI*2);const w=.65,bot=.85,cy=-.2;if(a<=Math.PI){return{x:Math.cos(a)*w,y:cy-Math.sin(a)*.65};}const f=(a-Math.PI)/Math.PI;if(f<1/3)return{x:w,y:lerp(cy,bot,f*3)};if(f<2/3)return{x:lerp(w,-w,(f-1/3)*3),y:bot};return{x:-w,y:lerp(bot,cy,(f-2/3)*3)};},
};
const SH_NAMES={circle:'Círculo',ellipse:'Elipse',squircle:'Squircle',heart:'Coração',drop:'Gota',diamond:'Losango',blob1:'Orgân.1',blob2:'Orgân.2',rect:'Rect',rectr:'Rect R.',tri:'Triâng.',trir:'Tri R.',arch:'Arco'};
function getShapePts(fs){
  const gen=SHAPES[fs]||SHAPES.circle,N=240,pts=[];
  for(let i=0;i<=N;i++){const t=i/N*Math.PI*2;pts.push(gen(t));}
  let mx=0,my=0;pts.forEach(p=>{mx=Math.max(mx,Math.abs(p.x));my=Math.max(my,Math.abs(p.y));});
  return{pts,sN:1/Math.max(mx,my,.001)};
}
function drawSP(c,pts){c.beginPath();pts.forEach((p,i)=>{if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);});c.closePath();}
function interpColor(colors,t){
  const idx=t*(colors.length-1),ci=Math.floor(idx),cn=Math.min(ci+1,colors.length-1),cf=idx-ci;
  const a=hexRGB(colors[ci]),b=hexRGB(colors[cn]);
  return[lerp(a[0],b[0],cf),lerp(a[1],b[1],cf),lerp(a[2],b[2],cf)];
}

// ═══ LAYER FACTORY ════════════════════════════════════════════════════════════
function mkLayer(type,over){
  return Object.assign({
    id:uid++,name:{blob:'Foco',ring:'Anel',noise:'Ruído',veil:'Véu',image:'Imagem',caustic:'Cáusticas',grid:'Grid',perlin:'Perlin',vector:'Vector'}[type]||type,
    visible:true,locked:false,collapsed:false,type,
    blend:'source-over',opacity:100,fillOpacity:100,
    colors:['#ffffff'],gradDir:'in-out',gradAngle:0,
    sizeX:55,sizeY:55,posX:50,posY:50,
    core:60,blur:0,noise:0,vignette:0,ringWidth:14,
    fshape:'circle',scaleX:100,scaleY:100,rotate:0,skewX:0,skewY:0,
    ringsMode:false,ringsCount:5,ringsSoft:6,solidFill:false,
    warpData:null,meshPts:null,imageSrc:null,
    causticScale:40,causticComplexity:4,causticContrast:70,causticFlow:0,causticColor:'#ffffff',causticTurbulence:0,
    gridSize:20,gridThickness:1,gridType:'cross',gridColor:'#ffffff',gridAngle:0,
    perlinScale:60,perlinOctaves:4,perlinPersist:50,perlinDomain:0,perlinDomainScale:50,
    perlinType:'normal',perlinScaleX:100,perlinScaleY:100,perlinRotate:0,
    perlinColor1:'#000020',perlinColor2:'#80d8f8',
    veilShape:'radial',veilHardness:0,veilColor2:'#000000',veilTwoColor:false,
    displaceEnabled:false,displaceTargets:[],displaceStrength:20,
    clipBelow:false,
    // isolated: preserva gradiente+blur mas pinta um matte por trás (cor de fundo do canvas
    // ou cor configurada), de forma a que as camadas debaixo NÃO bleed através do alpha.
    isolated:false, isolatedColor:'', // '' = usar bgCol do canvas; caso contrário hex fixo
    // image adjustments (aplicáveis a qualquer camada, especialmente image)
    imgBrightness:100, imgContrast:100, imgSaturation:100,
    imgHueRotate:0, imgInvert:0, imgThreshold:0, imgDesaturate:false,
    // per-layer fx
    fxMotionBlur:0, fxMotionAngle:0,     // motion blur direcional
    fxHalftone:0, fxHalftoneAngle:90,    // halftone
    fxHalftoneMode:'dots',               // 'dots' | 'lines'
    fxHalftoneColor:'',                  // '' = cor original, ou hex fixo
    fxHalftoneBg:'#000000',             // cor de fundo do halftone
    fxHalftoneBgAlpha:0,                // 0=transparente (compor sobre imagem), 1=substituir
    fxGlitch:0,                           // deslocamento de bandas
    fxChroma:0,                           // aberração cromática
    // extrusão 3D — camadas atrás da forma com cores configuráveis
    fxExtrude:0,                          // nº de camadas de extrusão
    fxExtrudeOffset:8,                    // deslocamento entre camadas (px)
    fxExtrudeAngle:225,                   // ângulo da extrusão (225=baixo/direita)
    fxExtrudeColors:[],                   // vazio = derivar das cores originais
    fxExtrudeShadow:40,                   // intensidade da sombra entre camadas (0-100)
    fxExtrudeTransparency:0,              // transparência de cada camada (0=sólido, 100=invisível)
    // mask — imagem que define onde esta camada é visível
    maskSrc:null, maskInvert:false,       // PNG preto/branco como máscara
    // vector
    vectorPts:[],vectorClosed:false,vectorFill:false,
    vectorStroke:'#ffffff',vectorFillColor:'rgba(255,255,255,0.3)',
    vectorStrokeWidth:2,vectorSmooth:false,vectorEditMode:false,
  },over);
}

// ═══ DRAW HELPERS ════════════════════════════════════════════════════════════
function getLinearEndpoints(L,w,h,cx,cy){
  const angle=(L.gradAngle||0)*Math.PI/180;
  const diag=Math.sqrt(w*w+h*h)/2;
  return{x0:cx-Math.cos(angle)*diag,y0:cy-Math.sin(angle)*diag,x1:cx+Math.cos(angle)*diag,y1:cy+Math.sin(angle)*diag};
}

// ═══ DRAW VECTOR ═════════════════════════════════════════════════════════════
function drawVector(oc,L,cw,ch){
  if(!L.vectorPts||L.vectorPts.length<2)return;
  const pts=L.vectorPts.map(p=>({x:p.x/100*cw,y:p.y/100*ch}));
  oc.save();
  oc.lineWidth=L.vectorStrokeWidth||2;
  oc.strokeStyle=L.vectorStroke||'#ffffff';
  oc.fillStyle=L.vectorFillColor||'rgba(255,255,255,0.3)';
  oc.lineCap='round';oc.lineJoin='round';
  oc.beginPath();
  if(L.vectorSmooth&&pts.length>2){
    oc.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length-1;i++){
      const mx=(pts[i].x+pts[i+1].x)/2,my=(pts[i].y+pts[i+1].y)/2;
      oc.quadraticCurveTo(pts[i].x,pts[i].y,mx,my);
    }
    if(L.vectorClosed){oc.quadraticCurveTo(pts[pts.length-1].x,pts[pts.length-1].y,pts[0].x,pts[0].y);}
    else oc.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);
  } else {
    oc.moveTo(pts[0].x,pts[0].y);
    pts.slice(1).forEach(p=>oc.lineTo(p.x,p.y));
    if(L.vectorClosed)oc.closePath();
  }
  if(L.vectorFill)oc.fill();
  if((L.vectorStrokeWidth||2)>0)oc.stroke();
  oc.restore();
}

// Vector edit overlay — pontos arrastáveis no canvas

function drawBlob(oc,L,cw,ch){
  const cx=(L.posX/100)*cw,cy=(L.posY/100)*ch;
  const baseR=Math.min(cw,ch)*.5*(Math.max(L.sizeX,L.sizeY)/100);
  const ax=(L.sizeX/Math.max(L.sizeX,L.sizeY))*(L.scaleX/100);
  const ay=(L.sizeY/Math.max(L.sizeX,L.sizeY))*(L.scaleY/100);
  const tS=Math.ceil(baseR*3.6);if(tS<2)return;
  const tmp=document.createElement('canvas');tmp.width=tS;tmp.height=tS;
  const tc=tmp.getContext('2d');const hc=tS/2;
  const{pts,sN}=getShapePts(L.fshape);
  const invert=L.gradDir==='out-in';const isLin=L.gradDir==='linear';

  if(isLin){
    const msk=document.createElement('canvas');msk.width=tS;msk.height=tS;const mc=msk.getContext('2d');
    mc.save();mc.translate(hc,hc);mc.rotate(L.rotate*Math.PI/180);mc.transform(1,L.skewY/100,L.skewX/100,1,0,0);
    mc.scale(baseR*sN*ax,baseR*sN*ay);drawSP(mc,pts);mc.restore();mc.fillStyle='#fff';mc.fill();
    const ep=getLinearEndpoints(L,tS,tS,hc,hc);
    const g=tc.createLinearGradient(ep.x0,ep.y0,ep.x1,ep.y1);
    L.colors.forEach((c,i)=>g.addColorStop(i/Math.max(1,L.colors.length-1),c));
    tc.fillStyle=g;tc.fillRect(0,0,tS,tS);
    tc.globalCompositeOperation='destination-in';tc.drawImage(msk,0,0);tc.globalCompositeOperation='source-over';
  } else if(L.solidFill){
    // preenchimento sólido — forma completamente plana com cor única
    tc.save();tc.translate(hc,hc);tc.rotate(L.rotate*Math.PI/180);
    tc.transform(1,L.skewY/100,L.skewX/100,1,0,0);
    tc.scale(baseR*sN*ax,baseR*sN*ay);drawSP(tc,pts);tc.restore();
    tc.fillStyle=L.colors[L.colors.length-1]||L.colors[0]||'#ffffff';tc.fill();
  } else if(L.ringsMode){
    const n=Math.max(2,L.ringsCount||5);
    const softPx=Math.max(1,(L.ringsSoft||6)*Math.min(cw,ch)/600);
    for(let i=n;i>=0;i--){
      const t=i/n;const ringR=baseR*(.08+.92*t);if(ringR<1)continue;
      const ct=invert?t:1-t;const[r,g,b]=interpColor(L.colors,ct);
      const rC=document.createElement('canvas');rC.width=tS;rC.height=tS;const rc=rC.getContext('2d');
      rc.save();rc.translate(hc,hc);rc.rotate(L.rotate*Math.PI/180);rc.transform(1,L.skewY/100,L.skewX/100,1,0,0);
      rc.scale(ringR*sN*ax,ringR*sN*ay);drawSP(rc,pts);rc.restore();rc.fillStyle=`rgb(${cl(r)},${cl(g)},${cl(b)})`;rc.fill();
      const bC=document.createElement('canvas');bC.width=tS;bC.height=tS;const bCtx=bC.getContext('2d');
      if(_fSupp){bCtx.filter=`blur(${softPx}px)`;bCtx.drawImage(rC,0,0);}
      else{bCtx.drawImage(rC,0,0);_swBlur(bCtx,tS,tS,Math.max(1,Math.round(softPx)));}
      tc.globalAlpha=(L.core/100)*.85*(1-t*.2);tc.drawImage(bC,0,0);
    }
    tc.globalAlpha=1;
  } else {
    const P=7;
    for(let pass=P;pass>=1;pass--){
      const tr=pass/P;const ct=invert?tr:1-tr;
      tc.save();tc.translate(hc,hc);tc.rotate(L.rotate*Math.PI/180);tc.transform(1,L.skewY/100,L.skewX/100,1,0,0);
      const sc=baseR*tr*sN;tc.scale(sc*ax,sc*ay);drawSP(tc,pts);
      const[r,g,b]=interpColor(L.colors,ct);
      const cA=(L.core/100)*.92;
      const a=pass===1?cA:cA*(1-(pass-1)/(P-1)*.72);
      tc.fillStyle=`rgba(${cl(r)},${cl(g)},${cl(b)},${a/P*2.8})`;tc.fill();tc.restore();
    }
  }
  tc.globalAlpha=1;
  const blurPx=Math.max(0,L.blur*Math.min(cw,ch)/300);
  if(blurPx>.5){
    const pad=Math.ceil(blurPx*2);const bw=tS+pad*2;
    const bf=document.createElement('canvas');bf.width=bw;bf.height=bw;const bctx=bf.getContext('2d');
    bctx.drawImage(tmp,pad,pad);
    if(_fSupp){const t=document.createElement('canvas');t.width=bw;t.height=bw;const tc=t.getContext('2d');tc.filter=`blur(${blurPx}px)`;tc.drawImage(bf,0,0);bctx.clearRect(0,0,bw,bw);bctx.drawImage(t,0,0);}
    else{_swBlur(bctx,bw,bw,Math.max(1,Math.round(blurPx)));}
    oc.drawImage(bf,cx-tS/2-pad,cy-tS/2-pad,bw,bw);
  } else oc.drawImage(tmp,cx-tS/2,cy-tS/2,tS,tS);
}

// ═══ DRAW RING ════════════════════════════════════════════════════════════════
function drawRing(oc,L,cw,ch){
  const cx=(L.posX/100)*cw,cy=(L.posY/100)*ch;
  const baseR=Math.min(cw,ch)*.5*(Math.max(L.sizeX,L.sizeY)/100);
  const ax=(L.sizeX/Math.max(L.sizeX,L.sizeY))*(L.scaleX/100);
  const ay=(L.sizeY/Math.max(L.sizeX,L.sizeY))*(L.scaleY/100);
  const tS=Math.ceil(baseR*3.4);if(tS<2)return;const hc=tS/2;
  const{pts,sN}=getShapePts(L.fshape||'circle');
  const blurPx=Math.max(1,L.blur*Math.min(cw,ch)/300);
  const wFrac=Math.max(.02,L.ringWidth/100);
  const invert=L.gradDir==='out-in',isLin=L.gradDir==='linear';
  const oC=document.createElement('canvas');oC.width=tS;oC.height=tS;const oc2=oC.getContext('2d');
  oc2.save();oc2.translate(hc,hc);oc2.rotate(L.rotate*Math.PI/180);oc2.transform(1,L.skewY/100,L.skewX/100,1,0,0);
  oc2.scale(baseR*sN*ax,baseR*sN*ay);drawSP(oc2,pts);oc2.restore();oc2.fillStyle=hexA(L.colors[0],1);oc2.fill();
  const innerR=baseR*(1-wFrac);
  const iC=document.createElement('canvas');iC.width=tS;iC.height=tS;const ic=iC.getContext('2d');
  ic.save();ic.translate(hc,hc);ic.rotate(L.rotate*Math.PI/180);ic.transform(1,L.skewY/100,L.skewX/100,1,0,0);
  ic.scale(innerR*sN*ax,innerR*sN*ay);drawSP(ic,pts);ic.restore();ic.fillStyle='#000';ic.fill();
  oc2.globalCompositeOperation='destination-out';oc2.drawImage(iC,0,0);oc2.globalCompositeOperation='source-over';
  const rf=document.createElement('canvas');rf.width=tS;rf.height=tS;const rc=rf.getContext('2d');
  let grad;
  if(isLin){const ep=getLinearEndpoints(L,tS,tS,hc,hc);grad=rc.createLinearGradient(ep.x0,ep.y0,ep.x1,ep.y1);L.colors.forEach((c,i)=>grad.addColorStop(i/Math.max(1,L.colors.length-1),c));}
  else{grad=rc.createRadialGradient(hc,hc,innerR*.85,hc,hc,baseR);const cs=invert?[...L.colors].reverse():L.colors;cs.forEach((c,i)=>grad.addColorStop(i/(cs.length-1),c));}
  rc.fillStyle=grad;rc.fillRect(0,0,tS,tS);rc.globalCompositeOperation='destination-in';rc.drawImage(oC,0,0);
  const pad=Math.ceil(blurPx*2);const bw=tS+pad*2;const bf=document.createElement('canvas');bf.width=bw;bf.height=bw;const bctxR=bf.getContext('2d');bctxR.drawImage(rf,pad,pad);
  if(_fSupp){const t=document.createElement('canvas');t.width=bw;t.height=bw;const tc=t.getContext('2d');tc.filter=`blur(${blurPx}px)`;tc.drawImage(bf,0,0);bctxR.clearRect(0,0,bw,bw);bctxR.drawImage(t,0,0);}
  else{_swBlur(bctxR,bw,bw,Math.max(1,Math.round(blurPx)));}
  oc.drawImage(bf,cx-tS/2-pad,cy-tS/2-pad,bw,bw);
}

// ═══ DRAW VEIL ════════════════════════════════════════════════════════════════
function drawVeil(oc,L,cw,ch){
  const cx=(L.posX/100)*cw,cy=(L.posY/100)*ch;
  const rx=(L.sizeX/100)*cw,ry=(L.sizeY/100)*ch;
  const col1=L.colors[0]||'#ffffff';const col2=L.veilTwoColor?(L.veilColor2||'#000000'):col1;
  const hard=Math.max(0,Math.min(1,(L.veilHardness||0)/100));
  const iStop=hard*.85;const shape=L.veilShape||'radial';
  oc.save();
  if(shape==='linear'){
    const angle=((L.gradAngle||0)-90)*Math.PI/180,r=Math.max(cw,ch);
    const g=oc.createLinearGradient(cx-Math.cos(angle)*r,cy-Math.sin(angle)*r,cx+Math.cos(angle)*r,cy+Math.sin(angle)*r);
    if(L.veilTwoColor){g.addColorStop(0,hexA(col1,1));g.addColorStop(.5,hexA(col2,1));g.addColorStop(1,hexA(col1,0));}
    else{g.addColorStop(0,hexA(col1,0));g.addColorStop(Math.max(0,iStop-.01),hexA(col1,0));g.addColorStop(Math.min(1,iStop+.01),hexA(col1,.8));g.addColorStop(1,hexA(col1,.8));}
    oc.fillStyle=g;oc.fillRect(0,0,cw,ch);
  } else {
    const maxR=Math.max(rx,ry);
    const g=oc.createRadialGradient(cx,cy,maxR*iStop,cx,cy,maxR);
    if(L.veilTwoColor){g.addColorStop(0,hexA(col1,1));g.addColorStop(.5,hexA(col2,.6));g.addColorStop(1,'rgba(0,0,0,0)');}
    else{g.addColorStop(0,hexA(col1,.85));g.addColorStop(1-hard*.3,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0)');}
    oc.translate(cx,cy);oc.rotate(L.rotate*Math.PI/180);oc.scale(rx/maxR,ry/maxR);
    oc.fillStyle=g;oc.beginPath();oc.arc(0,0,maxR,0,Math.PI*2);oc.fill();
  }
  oc.restore();
}

// ═══ DRAW IMAGE ══════════════════════════════════════════════════════════════
function drawImage(oc,L,cw,ch){
  if(!L._img)return;
  const cx=(L.posX/100)*cw,cy=(L.posY/100)*ch;
  // fórmula: w = (sizeX/100)*cw*(scaleX/100)*2
  // para sizeX=50, scaleX=100 → w = 0.5*cw*1*2 = cw ✓
  const w=(L.sizeX/100)*cw*(L.scaleX/100)*2;
  const h=(L.sizeY/100)*ch*(L.scaleY/100)*2;
  oc.save();oc.translate(cx,cy);oc.rotate((L.rotate||0)*Math.PI/180);
  oc.drawImage(L._img,-w/2,-h/2,w,h);
  oc.restore();
}

// ═══ FX PIPELINE — aplicado após desenho base de cada camada ════════════════
function applyExtrude(oc,L,cw,ch,drawFn){
  const n=Math.round(L.fxExtrude||0);if(n<1)return;
  const offset=L.fxExtrudeOffset||8;
  const angle=((L.fxExtrudeAngle||225)*Math.PI)/180;
  const dx=Math.cos(angle)*offset;
  const dy=Math.sin(angle)*offset;
  const userColors=L.fxExtrudeColors||[];
  const shadowStr=(L.fxExtrudeShadow||40)/100;       // 0-1
  const transpStr=(L.fxExtrudeTransparency||0)/100;  // 0=sólido, 1=invisível
  const layerAlpha=1-transpStr*0.85;                 // cada camada tem este alpha

  // canvas acumulador — todas as camadas de extrusão juntas
  const extCanvas=document.createElement('canvas');extCanvas.width=cw;extCanvas.height=ch;
  const ec=extCanvas.getContext('2d');

  // desenhar de trás para a frente
  for(let i=n;i>=1;i--){
    const depth=i/n; // 1=mais longe, 0=mais perto

    // ── CORES ──────────────────────────────────────────────────────────────
    let layerColors;
    if(userColors[i-1]){
      layerColors=[userColors[i-1]];
    } else {
      // derivar das cores originais: escurecer + aumentar saturação com profundidade
      layerColors=(L.colors||['#ffffff']).map(c=>{
        const[r,g,b]=hexRGB(c);
        const avg=(r+g+b)/3;
        const darken=1-depth*0.6;      // escurece até 40% do brilho original
        const saturate=1+depth*0.25;   // satura ligeiramente
        return rgbHex(
          cl(avg+(r-avg)*saturate*darken),
          cl(avg+(g-avg)*saturate*darken),
          cl(avg+(b-avg)*saturate*darken)
        );
      });
    }

    // ── DESENHAR CAMADA ─────────────────────────────────────────────────────
    const offC=document.createElement('canvas');offC.width=cw;offC.height=ch;
    const oc2=offC.getContext('2d');
    const Lshifted={...L,
      posX:L.posX+(dx*i/cw*100),
      posY:L.posY+(dy*i/ch*100),
      colors:layerColors,
      solidFill:true,ringsMode:false,
      fxExtrude:0,fxGlitch:0,fxChroma:0,fxMotionBlur:0,fxHalftone:0,
      blur:L.blur,opacity:100,fillOpacity:100,
    };
    drawFn(oc2,Lshifted,cw,ch);

    // ── SOMBRA NA BORDA ─────────────────────────────────────────────────────
    // sombra escura no lado que recebe menos luz (lado oposto ao ângulo)
    if(shadowStr>0.02){
      const sCanvas=document.createElement('canvas');sCanvas.width=cw;sCanvas.height=ch;
      const sc=sCanvas.getContext('2d');
      // desenhar a forma em preto ligeiramente deslocada para criar borda de sombra
      const shadowOffset=Math.max(2,offset*0.5);
      const Lshadow={...Lshifted,
        posX:Lshifted.posX-dx*0.5/cw*100,
        posY:Lshifted.posY-dy*0.5/ch*100,
        colors:['#000000'],
      };
      drawFn(sc,Lshadow,cw,ch);
      // aplicar sombra só na borda (source-atop = só onde a camada existe)
      oc2.globalCompositeOperation='source-atop';
      oc2.globalAlpha=shadowStr*(0.4+depth*0.4); // mais sombra nas camadas mais afastadas
      oc2.drawImage(sCanvas,0,0);
      oc2.globalAlpha=1;oc2.globalCompositeOperation='source-over';
    }

    // ── BLUR HERDADO ────────────────────────────────────────────────────────
    if(L.blur>0){
      const blurPx=L.blur*Math.min(cw,ch)/300;
      const bf=document.createElement('canvas');bf.width=cw;bf.height=ch;const bfc=bf.getContext('2d');
      if(_fSupp){bfc.filter=`blur(${blurPx}px)`;bfc.drawImage(offC,0,0);}
      else{bfc.drawImage(offC,0,0);_swBlur(bfc,cw,ch,Math.max(1,Math.round(blurPx)));}
      ec.globalAlpha=layerAlpha;ec.drawImage(bf,0,0);
    } else {
      ec.globalAlpha=layerAlpha;ec.drawImage(offC,0,0);
    }
    ec.globalAlpha=1;
  }

  // compositar tudo atrás da forma principal
  oc.globalCompositeOperation='destination-over';
  oc.drawImage(extCanvas,0,0);
  oc.globalCompositeOperation='source-over';
}
function applyImageAdjustments(oc,L,cw,ch){
  const bri=(L.imgBrightness||100)/100;
  const con=(L.imgContrast||100)/100;
  const sat=(L.imgSaturation||100)/100;
  const hue=(L.imgHueRotate||0);
  const inv=(L.imgInvert||0)/100;
  const thr=(L.imgThreshold||0);
  const desat=L.imgDesaturate||false;
  const hasAdj=bri!==1||con!==1||sat!==1||hue!==0||inv>0||thr>0||desat;
  if(!hasAdj)return;
  const id=oc.getImageData(0,0,cw,ch);const d=id.data;
  for(let i=0;i<d.length;i+=4){
    let r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;
    // desaturate
    if(desat){const l=r*.299+g*.587+b*.114;r=g=b=l;}
    // hue rotate
    if(hue!==0){
      const h2=hue*Math.PI/180;
      const cos=Math.cos(h2),sin=Math.sin(h2);
      const nr=r*(0.213+cos*0.787-sin*0.213)+g*(0.715-cos*0.715-sin*0.715)+b*(0.072-cos*0.072+sin*0.928);
      const ng=r*(0.213-cos*0.213+sin*0.143)+g*(0.715+cos*0.285+sin*0.140)+b*(0.072-cos*0.072-sin*0.283);
      const nb=r*(0.213-cos*0.213-sin*0.787)+g*(0.715-cos*0.715+sin*0.715)+b*(0.072+cos*0.928+sin*0.072);
      r=Math.max(0,Math.min(1,nr));g=Math.max(0,Math.min(1,ng));b=Math.max(0,Math.min(1,nb));
    }
    // saturation
    if(sat!==1){const l2=r*.299+g*.587+b*.114;r=l2+(r-l2)*sat;g=l2+(g-l2)*sat;b=l2+(b-l2)*sat;}
    // brightness
    r*=bri;g*=bri;b*=bri;
    // contrast
    r=(r-.5)*con+.5;g=(g-.5)*con+.5;b=(b-.5)*con+.5;
    // invert
    if(inv>0){r=r*(1-inv)+(1-r)*inv;g=g*(1-inv)+(1-g)*inv;b=b*(1-inv)+(1-b)*inv;}
    // threshold (converte para preto/branco puro — silhoueta)
    if(thr>0){const l3=(r*.299+g*.587+b*.114);const v=l3>(thr/100)?1:0;r=g=b=v;}
    d[i]=cl(r*255);d[i+1]=cl(g*255);d[i+2]=cl(b*255);
  }
  oc.putImageData(id,0,0);
}

function applyMotionBlur(oc,L,cw,ch){
  const str=L.fxMotionBlur||0;if(str<1)return;
  const angle=(L.fxMotionAngle||0)*Math.PI/180;
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const passes=Math.min(64,Math.round(str));
  const step=str/passes;
  const src=oc.getImageData(0,0,cw,ch);
  const dst=new ImageData(cw,ch);
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    let r=0,g=0,b=0,a=0,cnt=0;
    for(let p=-passes/2;p<=passes/2;p++){
      const sx=Math.round(x+dx*p*step),sy=Math.round(y+dy*p*step);
      if(sx<0||sx>=cw||sy<0||sy>=ch)continue;
      const si=(sy*cw+sx)*4;r+=src.data[si];g+=src.data[si+1];b+=src.data[si+2];a+=src.data[si+3];cnt++;
    }
    const di=(y*cw+x)*4;if(cnt>0){dst.data[di]=r/cnt;dst.data[di+1]=g/cnt;dst.data[di+2]=b/cnt;dst.data[di+3]=a/cnt;}
  }
  oc.putImageData(dst,0,0);
}

function applyHalftone(oc,L,cw,ch){
  const str=L.fxHalftone||0;if(str<1)return;
  const w=oc.canvas.width,h=oc.canvas.height;
  const src=oc.getImageData(0,0,w,h);const d=src.data;
  const mode=L.fxHalftoneMode||'dots';
  const exportScale=w/DESIGN_W;
  const spacing=Math.max(3,Math.round(lerp(4,24,str/100)*exportScale));
  const maxR=spacing*.55;
  const dotColor=L.fxHalftoneColor||'';
  const bg=L.fxHalftoneBg||'#000000';
  // default 0 = transparente (compor pontos sobre imagem, não substituir)
  const bgAlpha=L.fxHalftoneBgAlpha!==undefined?L.fxHalftoneBgAlpha:0;

  // canvas dos pontos — transparente por defeito
  const tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;
  const tc=tmp.getContext('2d');

  // fundo (só se bgAlpha>0)
  if(bgAlpha>0){tc.fillStyle=bg;tc.globalAlpha=bgAlpha;tc.fillRect(0,0,w,h);tc.globalAlpha=1;}

  if(mode==='dots'){
    for(let gy=spacing/2;gy<h+spacing;gy+=spacing){
      for(let gx=spacing/2;gx<w+spacing;gx+=spacing){
        let lumSum=0,lumCnt=0,rSum=0,gSum=0,bSum=0;
        const half=Math.floor(spacing/2);
        for(let dy2=-half;dy2<=half;dy2++)for(let dx2=-half;dx2<=half;dx2++){
          const px=Math.round(gx+dx2),py=Math.round(gy+dy2);
          if(px<0||px>=w||py<0||py>=h)continue;
          const si=(py*w+px)*4;
          const l=d[si]*.299+d[si+1]*.587+d[si+2]*.114;
          lumSum+=l;rSum+=d[si];gSum+=d[si+1];bSum+=d[si+2];lumCnt++;
        }
        if(!lumCnt)continue;
        const lum=lumSum/lumCnt/255;
        const r=lum*maxR;if(r<.4)continue;
        if(dotColor){tc.fillStyle=dotColor;}
        else{tc.fillStyle=`rgb(${Math.round(rSum/lumCnt)},${Math.round(gSum/lumCnt)},${Math.round(bSum/lumCnt)})`;}
        tc.beginPath();tc.arc(gx,gy,r,0,Math.PI*2);tc.fill();
      }
    }
  } else {
    const angle=(L.fxHalftoneAngle||90)*Math.PI/180;
    const cos=Math.cos(angle),sin=Math.sin(angle);
    const diag=Math.sqrt(w*w+h*h);
    tc.strokeStyle=dotColor||'#ffffff';
    for(let offset=-diag;offset<diag;offset+=spacing){
      tc.beginPath();let drawing=false;
      for(let t=0;t<diag*2;t+=2){
        const wx=cos*t+sin*offset-diag/2+w/2;
        const wy=sin*t-cos*offset-diag/2+h/2;
        const px=Math.round(wx),py=Math.round(wy);
        if(px<0||px>=w||py<0||py>=h){drawing=false;continue;}
        const si=(py*w+px)*4;
        const lum=(d[si]*.299+d[si+1]*.587+d[si+2]*.114)/255;
        const thick=lum*(spacing*.9);
        if(thick<.4){drawing=false;continue;}
        tc.lineWidth=thick;
        if(!drawing){tc.moveTo(wx,wy);drawing=true;}else tc.lineTo(wx,wy);
      }
      tc.stroke();tc.beginPath();drawing=false;
    }
  }

  // compor os pontos sobre a imagem original (não substituir)
  // se bgAlpha=0: pontos visíveis sobre a imagem original
  // se bgAlpha=1: substitui completamente (modo "só pontos")
  if(bgAlpha>=1){
    // substituição completa
    oc.clearRect(0,0,w,h);
    oc.drawImage(tmp,0,0);
  } else {
    // compor por cima — pontos sobre imagem
    oc.drawImage(tmp,0,0);
  }
}

function applyGlitch(oc,L,cw,ch){
  const str=L.fxGlitch||0;if(str<1)return;
  const src=oc.getImageData(0,0,cw,ch);const dst=new ImageData(cw,ch);const d=src.data;
  // copiar base
  dst.data.set(d);
  // deslocar bandas horizontais aleatoriamente
  const bands=Math.round(str*.3)+2;
  const bandH=Math.round(ch/bands);
  for(let b=0;b<bands;b++){
    if(Math.random()>.4)continue;
    const shift=Math.round((Math.random()-.5)*str*2);
    const y0=b*bandH,y1=Math.min(ch,y0+bandH);
    for(let y=y0;y<y1;y++){
      for(let x=0;x<cw;x++){
        const sx=Math.max(0,Math.min(cw-1,x+shift));
        const si=(y*cw+sx)*4,di=(y*cw+x)*4;
        dst.data[di]=d[si];dst.data[di+1]=d[si+1];dst.data[di+2]=d[si+2];dst.data[di+3]=d[si+3];
      }
    }
  }
  oc.putImageData(dst,0,0);
}

function applyChroma(oc,L,cw,ch){
  const str=L.fxChroma||0;if(str<1)return;
  const src=oc.getImageData(0,0,cw,ch);const dst=new ImageData(cw,ch);const d=src.data;
  const shift=Math.round(str*.5);
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    const di=(y*cw+x)*4;
    // R deslocado para a direita
    const rx=Math.max(0,Math.min(cw-1,x+shift));const ri=(y*cw+rx)*4;
    // B deslocado para a esquerda
    const bx=Math.max(0,Math.min(cw-1,x-shift));const bi=(y*cw+bx)*4;
    dst.data[di]  =d[ri];  // R canal deslocado
    dst.data[di+1]=d[(y*cw+x)*4+1]; // G original
    dst.data[di+2]=d[bi+2]; // B canal deslocado
    dst.data[di+3]=d[(y*cw+x)*4+3];
  }
  oc.putImageData(dst,0,0);
}

function applyLayerMask(offCanvas,L,cw,ch){
  if(!L._mask)return;
  const oc=offCanvas.getContext('2d');
  // criar mask canvas
  const msk=document.createElement('canvas');msk.width=cw;msk.height=ch;
  const mc=msk.getContext('2d');mc.drawImage(L._mask,0,0,cw,ch);
  const md=mc.getImageData(0,0,cw,ch).data;
  const id=oc.getImageData(0,0,cw,ch);const d=id.data;
  const inv=L.maskInvert||false;
  for(let i=0;i<d.length;i+=4){
    // luminosidade da máscara controla alpha da camada
    let lum=(md[i]*.299+md[i+1]*.587+md[i+2]*.114)/255;
    if(inv)lum=1-lum;
    d[i+3]=cl(d[i+3]*lum);
  }
  oc.putImageData(id,0,0);
}

// ═══ DRAW CAUSTIC ════════════════════════════════════════════════════════════
function drawCaustic(oc,L,cw,ch){
  const sc=L.causticScale/100,oct=Math.max(1,Math.round(L.causticComplexity));
  const cont=L.causticContrast/100,flow=L.causticFlow/360*Math.PI*2,turb=(L.causticTurbulence||0)/100;
  const col=hexRGB(L.causticColor||'#ffffff');
  const imgd=oc.createImageData(cw,ch);const d=imgd.data;
  const sx=cw*sc/200,sy=ch*sc/200,pers=.55;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    let nx=x/cw/sx+Math.cos(flow)*.1,ny=y/ch/sy+Math.sin(flow)*.1;
    if(turb>0){const wx=fbm(nx*1.3+3.1,ny*1.3+7.4,Math.max(2,oct-1),pers);const wy=fbm(nx*1.3+8.6,ny*1.3+1.9,Math.max(2,oct-1),pers);nx+=wx*turb*2;ny+=wy*turb*2;}
    const n1=fbm(nx,ny,oct,pers),n2=fbm(nx+.5,ny+.5,oct,pers);
    let v=Math.abs(n1-n2);v=Math.pow(1-v,2+cont*6);v=Math.max(0,Math.min(1,v));
    const i=(y*cw+x)*4;d[i]=cl(col[0]*v);d[i+1]=cl(col[1]*v);d[i+2]=cl(col[2]*v);d[i+3]=255;
  }
  oc.putImageData(imgd,0,0);
}
function getCausticDispMap(L,cw,ch){
  const sc=L.causticScale/100,oct=Math.max(1,Math.round(L.causticComplexity)),flow=L.causticFlow/360*Math.PI*2,turb=(L.causticTurbulence||0)/100,pers=.55;
  const sx=cw*sc/200,sy=ch*sc/200;const d=new Uint8ClampedArray(cw*ch*4);
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    let nx=x/cw/sx+Math.cos(flow)*.1,ny=y/ch/sy+Math.sin(flow)*.1;
    if(turb>0){const wx=fbm(nx*1.3+3.1,ny*1.3+7.4,Math.max(2,oct-1),pers);const wy=fbm(nx*1.3+8.6,ny*1.3+1.9,Math.max(2,oct-1),pers);nx+=wx*turb*2;ny+=wy*turb*2;}
    const n1=fbm(nx,ny,oct,pers),n2=fbm(nx+2.3,ny+7.1,oct,pers);
    const i=(y*cw+x)*4;d[i]=cl(((n1+1)/2)*255);d[i+1]=cl(((n2+1)/2)*255);d[i+2]=128;d[i+3]=255;
  }
  return d;
}

// ═══ DRAW PERLIN ═════════════════════════════════════════════════════════════
function drawPerlin(oc,L,cw,ch){
  const sc=L.perlinScale/100,oct=Math.max(1,Math.round(L.perlinOctaves)),pers=(L.perlinPersist||50)/100;
  const domStr=(L.perlinDomain||0)/100,domSc=(L.perlinDomainScale||50)/100;
  const rot=((L.perlinRotate||0)*Math.PI)/180,sxM=(L.perlinScaleX||100)/100,syM=(L.perlinScaleY||100)/100;
  const type=L.perlinType||'normal';const sx=cw*sc/200,sy=ch*sc/200;const cx2=cw/2,cy2=ch/2;
  const c1=hexRGB(L.perlinColor1||'#000000'),c2=hexRGB(L.perlinColor2||'#ffffff');
  const imgd=oc.createImageData(cw,ch);const d=imgd.data;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    const rx=(x-cx2)*Math.cos(rot)-(y-cy2)*Math.sin(rot),ry=(x-cx2)*Math.sin(rot)+(y-cy2)*Math.cos(rot);
    let nx=rx/(cw*sx*sxM),ny=ry/(ch*sy*syM);
    if(domStr>0){const wsc=domSc*.5;const wx=fbm(nx*wsc+1.7,ny*wsc+9.2,Math.max(2,oct-1),pers);const wy=fbm(nx*wsc+8.3,ny*wsc+2.8,Math.max(2,oct-1),pers);nx+=wx*domStr*2;ny+=wy*domStr*2;}
    let v=fbm(nx,ny,oct,pers);
    if(type==='turbulence')v=Math.abs(v);
    else if(type==='ridged')v=1-Math.abs(v);
    else if(type==='marble')v=Math.sin(nx*4+v*6)*.5+.5;
    else if(type==='wood')v=(v*10)%1;
    else v=(v+1)/2;
    v=Math.max(0,Math.min(1,v));
    const i=(y*cw+x)*4;
    d[i]=cl(lerp(c1[0],c2[0],v));d[i+1]=cl(lerp(c1[1],c2[1],v));d[i+2]=cl(lerp(c1[2],c2[2],v));d[i+3]=255;
  }
  oc.putImageData(imgd,0,0);
}
function getPerlinDispMap(L,cw,ch){
  const sc=L.perlinScale/100,oct=Math.max(1,Math.round(L.perlinOctaves)),pers=(L.perlinPersist||50)/100;
  const domStr=(L.perlinDomain||0)/100,domSc=(L.perlinDomainScale||50)/100;
  const rot=((L.perlinRotate||0)*Math.PI)/180,sxM=(L.perlinScaleX||100)/100,syM=(L.perlinScaleY||100)/100;
  const sx=cw*sc/200,sy=ch*sc/200;const cx2=cw/2,cy2=ch/2;const d=new Uint8ClampedArray(cw*ch*4);
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    const rx=(x-cx2)*Math.cos(rot)-(y-cy2)*Math.sin(rot),ry=(x-cx2)*Math.sin(rot)+(y-cy2)*Math.cos(rot);
    let nx=rx/(cw*sx*sxM),ny=ry/(ch*sy*syM);
    if(domStr>0){const wsc=domSc*.5;const wx=fbm(nx*wsc+1.7,ny*wsc+9.2,Math.max(2,oct-1),pers);const wy=fbm(nx*wsc+8.3,ny*wsc+2.8,Math.max(2,oct-1),pers);nx+=wx*domStr*2;ny+=wy*domStr*2;}
    const nR=fbm(nx,ny,oct,pers),nG=fbm(nx+3.7,ny+5.1,oct,pers);
    const i=(y*cw+x)*4;d[i]=cl(((nR+1)/2)*255);d[i+1]=cl(((nG+1)/2)*255);d[i+2]=128;d[i+3]=255;
  }
  return d;
}

// ═══ DRAW GRID ═══════════════════════════════════════════════════════════════
function drawGrid(oc,L,cw,ch){
  const exportScale=cw/DESIGN_W;
  const sz=Math.max(2,(L.gridSize||20)*exportScale),thick=Math.max(.5,(L.gridThickness||1)*exportScale);
  const col=L.gridColor||'#ffffff',type=L.gridType||'cross',angle=(L.gridAngle||0)*Math.PI/180;
  oc.save();
  if(type==='concentric'){
    // concentric circles / ellipses — hipnotic effect
    const cx=(L.posX/100)*cw,cy=(L.posY/100)*ch;
    const maxR=Math.sqrt(cw*cw+ch*ch);
    oc.strokeStyle=col;oc.lineWidth=thick;
    for(let r=sz;r<maxR;r+=sz){oc.beginPath();oc.arc(cx,cy,r,0,Math.PI*2);oc.stroke();}
  } else if(type==='spiral'){
    const cx=(L.posX/100)*cw,cy=(L.posY/100)*ch;
    const turns=Math.round(Math.sqrt(cw*cw+ch*ch)/sz)*1.5;
    oc.strokeStyle=col;oc.lineWidth=thick;oc.beginPath();
    for(let i=0;i<=turns*360;i++){
      const a=i*Math.PI/180,r=sz*i/360;
      const px=cx+r*Math.cos(a),py=cy+r*Math.sin(a);
      if(i===0)oc.moveTo(px,py);else oc.lineTo(px,py);
    }
    oc.stroke();
  } else if(type==='radial'){
    const cx=(L.posX/100)*cw,cy=(L.posY/100)*ch;
    const spokes=Math.max(2,Math.round(360/sz));const maxR=Math.sqrt(cw*cw+ch*ch);
    oc.strokeStyle=col;oc.lineWidth=thick;
    for(let i=0;i<spokes;i++){const a=i/spokes*Math.PI*2;oc.beginPath();oc.moveTo(cx,cy);oc.lineTo(cx+Math.cos(a)*maxR,cy+Math.sin(a)*maxR);oc.stroke();}
  } else {
    if(angle!==0){oc.translate(cw/2,ch/2);oc.rotate(angle);oc.translate(-cw/2,-ch/2);}
    oc.strokeStyle=col;oc.lineWidth=thick;
    const ext=Math.max(cw,ch)*1.5,s=-ext,e=Math.max(cw,ch)+ext;
    if(type==='cross'||type==='vertical')for(let x=s;x<e;x+=sz){oc.beginPath();oc.moveTo(x,s);oc.lineTo(x,e);oc.stroke();}
    if(type==='cross'||type==='horizontal')for(let y=s;y<e;y+=sz){oc.beginPath();oc.moveTo(s,y);oc.lineTo(e,y);oc.stroke();}
    if(type==='dots'){oc.fillStyle=col;for(let x=0;x<cw+sz;x+=sz)for(let y=0;y<ch+sz;y+=sz){oc.beginPath();oc.arc(x,y,thick,0,Math.PI*2);oc.fill();}}
    if(type==='diagonal'){for(let x=s;x<e;x+=sz){oc.beginPath();oc.moveTo(x,s);oc.lineTo(x+ext,e);oc.stroke();oc.beginPath();oc.moveTo(x,s);oc.lineTo(x-ext,e);oc.stroke();}}
  }
  oc.restore();
}
function getGridDispMap(L,cw,ch){
  const exportScale=cw/DESIGN_W;
  const sz=Math.max(2,(L.gridSize||20)*exportScale);
  const angle=(L.gridAngle||0)*Math.PI/180;
  const type=L.gridType||'cross';
  const cx=(L.posX/100)*cw, cy=(L.posY/100)*ch;
  const d=new Uint8ClampedArray(cw*ch*4);

  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    let wx=0.5,wy=0.5; // neutro = sem deslocamento

    if(type==='cross'||type==='horizontal'||type==='vertical'){
      // ondas ortogonais — distorção em grade
      const rx=x*Math.cos(angle)+y*Math.sin(angle);
      const ry=-x*Math.sin(angle)+y*Math.cos(angle);
      if(type==='cross'){wx=Math.sin(rx/sz*Math.PI*2)*.5+.5;wy=Math.sin(ry/sz*Math.PI*2)*.5+.5;}
      else if(type==='horizontal'){wx=0.5;wy=Math.sin(ry/sz*Math.PI*2)*.5+.5;}
      else if(type==='vertical'){wx=Math.sin(rx/sz*Math.PI*2)*.5+.5;wy=0.5;}

    } else if(type==='diagonal'){
      // ondas diagonais — distorção em ziguezague
      const diag=(x+y)/sz*Math.PI*2;
      const diag2=(x-y)/sz*Math.PI*2;
      wx=Math.sin(diag)*.5+.5;
      wy=Math.sin(diag2)*.5+.5;

    } else if(type==='dots'){
      // distorção radial em cada ponto da grelha — empurra para o centro mais próximo
      const gx=Math.round(x/sz)*sz, gy2=Math.round(y/sz)*sz;
      const ddx=x-gx, ddy=y-gy2;
      const dist=Math.sqrt(ddx*ddx+ddy*ddy);
      const pull=Math.exp(-dist*dist/(sz*sz*0.25)); // gaussiana
      wx=(ddx/Math.max(1,dist)*pull+1)*.5;
      wy=(ddy/Math.max(1,dist)*pull+1)*.5;

    } else if(type==='concentric'){
      // distorção radial a partir do centro — ondas circulares
      const ddx=x-cx, ddy=y-cy;
      const dist=Math.sqrt(ddx*ddx+ddy*ddy);
      const wave=Math.sin(dist/sz*Math.PI*2);
      const norm=dist>0?dist:1;
      wx=(ddx/norm*wave*.5)+.5;
      wy=(ddy/norm*wave*.5)+.5;

    } else if(type==='spiral'){
      // distorção em espiral — rotação progressiva com a distância
      const ddx=x-cx, ddy=y-cy;
      const dist=Math.sqrt(ddx*ddx+ddy*ddy);
      const spiralAngle=dist/sz*Math.PI*2;
      const cos=Math.cos(spiralAngle), sin2=Math.sin(spiralAngle);
      wx=(cos*ddx-sin2*ddy)/(dist*2+1)+.5;
      wy=(sin2*ddx+cos*ddy)/(dist*2+1)+.5;

    } else if(type==='radial'){
      // distorção angular — cada raia empurra em direcção perpendicular
      const ddx=x-cx, ddy=y-cy;
      const a=Math.atan2(ddy,ddx);
      const spokes=Math.max(2,Math.round(360/sz));
      const snapAngle=Math.round(a/(Math.PI*2/spokes))*(Math.PI*2/spokes);
      wx=Math.cos(snapAngle+Math.PI/2)*.5+.5;
      wy=Math.sin(snapAngle+Math.PI/2)*.5+.5;
    }

    const i=(y*cw+x)*4;
    d[i]=cl(wx*255);d[i+1]=cl(wy*255);d[i+2]=128;d[i+3]=255;
  }
  return d;
}

// ═══ DISPLACEMENT ════════════════════════════════════════════════════════════
function applyDisplace(targetCanvas,dispData,strength,cw,ch){
  const ctx2=targetCanvas.getContext('2d');
  const src=ctx2.getImageData(0,0,cw,ch);const dst=new ImageData(cw,ch);
  // escalar com a resolução via referência fixa (preview vs export 300dpi → idêntico)
  const str=strength*3*(cw/DESIGN_W);
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    const i=(y*cw+x)*4;
    const dx=Math.round(((dispData[i]/255)-.5)*str*2);
    const dy=Math.round(((dispData[i+1]/255)-.5)*str);
    const sx=Math.max(0,Math.min(cw-1,x+dx)),sy=Math.max(0,Math.min(ch-1,y+dy));
    const si=(sy*cw+sx)*4;
    dst.data[i]=src.data[si];dst.data[i+1]=src.data[si+1];dst.data[i+2]=src.data[si+2];dst.data[i+3]=src.data[si+3];
  }
  ctx2.putImageData(dst,0,0);
}
function getDispMap(L,cw,ch){
  if(L.type==='caustic')return getCausticDispMap(L,cw,ch);
  if(L.type==='perlin')return getPerlinDispMap(L,cw,ch);
  if(L.type==='grid')return getGridDispMap(L,cw,ch);
  const d=new Uint8ClampedArray(cw*ch*4);for(let i=0;i<d.length;i+=4){const v=Math.random()*255*(L.noise/100);d[i]=v;d[i+1]=v;d[i+2]=128;d[i+3]=255;}return d;
}

// ═══ WARP ════════════════════════════════════════════════════════════════════
function getWarp(L){
  const wcw=canvas.width,wch=canvas.height;
  const n=wcw*wch*2;
  if(!L.warpData||L.warpData.length!==n){
    L.warpData=new Float32Array(n);
    L.warpW=wcw;L.warpH=wch;
  }
  return L.warpData;
}
function applyWarp(off,L,cw,ch){
  if(!L.warpData||L.warpData.length===0)return off;
  // usar dimensões guardadas (não as do canvas actual — resistente a zoom/resize)
  const wcw=L.warpW||canvas.width,wch=L.warpH||canvas.height;
  if(L.warpData.length!==wcw*wch*2)return off; // dados corrompidos — ignorar

  // usar dimensões reais do offscreen (podem diferir do canvas de preview no export)
  const ow=off.width,oh=off.height;
  const src=off.getContext('2d').getImageData(0,0,ow,oh);
  const dst=new ImageData(ow,oh);
  const wd=L.warpData;
  const scaleX=ow/wcw, scaleY=oh/wch;

  for(let y=0;y<oh;y++){
    for(let x=0;x<ow;x++){
      // mapear pixel do output para o espaço do warpData (preview)
      const px=Math.min(wcw-1,Math.round(x/scaleX));
      const py=Math.min(wch-1,Math.round(y/scaleY));
      const wi=(py*wcw+px)*2;
      // deslocamento escalado para o espaço do offscreen
      const ox=Math.round(x-wd[wi]*scaleX);
      const oy=Math.round(y-wd[wi+1]*scaleY);
      if(ox<0||ox>=ow||oy<0||oy>=oh)continue;
      const si=(oy*ow+ox)*4;
      const di=(y*ow+x)*4;
      dst.data[di]  =src.data[si];
      dst.data[di+1]=src.data[si+1];
      dst.data[di+2]=src.data[si+2];
      dst.data[di+3]=src.data[si+3];
    }
  }
  const o=document.createElement('canvas');o.width=ow;o.height=oh;
  o.getContext('2d').putImageData(dst,0,0);
  return o;
}

// ═══ DRAW LAYER TO OFFSCREEN ═════════════════════════════════════════════════
function drawLayerToCanvas(L,cw,ch){
  let off=document.createElement('canvas');off.width=cw;off.height=ch;
  const oc=off.getContext('2d');

  // extrusão 3D — camadas atrás (antes do desenho principal)
  if((L.fxExtrude||0)>0&&(L.type==='blob'||L.type==='ring'||L.type==='vector')){
    const drawFn=L.type==='blob'?drawBlob:L.type==='ring'?drawRing:drawVector;
    // desenhar a forma principal primeiro
    drawFn(oc,L,cw,ch);

    // aplicar sombra à forma principal (borda escura no lado oposto ao ângulo)
    const shadowStr=(L.fxExtrudeShadow||40)/100;
    if(shadowStr>0.02){
      const angle=((L.fxExtrudeAngle||225)*Math.PI)/180;
      const dx=Math.cos(angle)*(L.fxExtrudeOffset||8);
      const dy=Math.sin(angle)*(L.fxExtrudeOffset||8);
      const sCanvas=document.createElement('canvas');sCanvas.width=cw;sCanvas.height=ch;
      const sc=sCanvas.getContext('2d');
      const Lshadow={...L,colors:['#000000'],solidFill:true,ringsMode:false,fxExtrude:0,
        posX:L.posX-dx*0.4/cw*100, posY:L.posY-dy*0.4/ch*100};
      drawFn(sc,Lshadow,cw,ch);
      oc.globalCompositeOperation='source-atop';
      oc.globalAlpha=shadowStr*0.3;
      oc.drawImage(sCanvas,0,0);
      oc.globalAlpha=1;oc.globalCompositeOperation='source-over';
    }

    // aplicar transparência à forma principal (mesmo alpha das camadas de extrusão)
    const transpStr=(L.fxExtrudeTransparency||0)/100;
    if(transpStr>0.01){
      const layerAlpha=1-transpStr*0.85;
      const tmp=document.createElement('canvas');tmp.width=cw;tmp.height=ch;
      const tc=tmp.getContext('2d');tc.drawImage(off,0,0);
      oc.clearRect(0,0,cw,ch);
      oc.globalAlpha=layerAlpha;oc.drawImage(tmp,0,0);oc.globalAlpha=1;
    }

    // depois as camadas de extrusão atrás via destination-over
    applyExtrude(oc,L,cw,ch,drawFn);
  } else {
    if(L.type==='blob')drawBlob(oc,L,cw,ch);
    else if(L.type==='ring')drawRing(oc,L,cw,ch);
    else if(L.type==='veil')drawVeil(oc,L,cw,ch);
    else if(L.type==='image')drawImage(oc,L,cw,ch);
    else if(L.type==='caustic')drawCaustic(oc,L,cw,ch);
    else if(L.type==='perlin')drawPerlin(oc,L,cw,ch);
    else if(L.type==='grid')drawGrid(oc,L,cw,ch);
    else if(L.type==='vector')drawVector(oc,L,cw,ch);
    else if(L.type==='noise'){
      const id=oc.createImageData(cw,ch);const d=id.data;
      for(let i=0;i<d.length;i+=4){const v=Math.random()*255*(L.noise/100);d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
      oc.putImageData(id,0,0);
    }
  }
  // per-layer noise overlay
  if(L.noise>0&&L.type!=='noise'&&L.type!=='caustic'&&L.type!=='perlin'){
    const id=oc.getImageData(0,0,cw,ch);const d=id.data;const a=L.noise/100*.06;
    for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*255*a;d[i]=cl(d[i]+n);d[i+1]=cl(d[i+1]+n);d[i+2]=cl(d[i+2]+n);}
    oc.putImageData(id,0,0);
  }
  // ── FX PIPELINE (image adjustments + effects) ──
  applyImageAdjustments(oc,L,cw,ch);
  applyMotionBlur(oc,L,cw,ch);
  applyGlitch(oc,L,cw,ch);
  applyChroma(oc,L,cw,ch);
  applyHalftone(oc,L,cw,ch);
  // per-layer vignette
  if(L.vignette>0){const vg=oc.createRadialGradient(cw/2,ch/2,ch*.1,cw/2,ch/2,ch*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${L.vignette/100})`);oc.globalCompositeOperation='multiply';oc.fillStyle=vg;oc.fillRect(0,0,cw,ch);oc.globalCompositeOperation='source-over';}
  // fillOpacity (affect just the fill, not the compositing)
  if((L.fillOpacity||100)<100){
    const id=oc.getImageData(0,0,cw,ch);const d=id.data;const f=(L.fillOpacity||100)/100;
    for(let i=3;i<d.length;i+=4)d[i]=cl(d[i]*f);oc.putImageData(id,0,0);
  }
  if(L.warpData)off=applyWarp(off,L,cw,ch);
  // blur geral da camada — funciona para todos os tipos excepto blob/ring (que tratam internamente)
  if(L.blur>0&&L.type!=='blob'&&L.type!=='ring'){
    const blurPx=L.blur*Math.min(cw,ch)/300;
    const oc2=off.getContext('2d');
    if(_fSupp){const blurred=document.createElement('canvas');blurred.width=cw;blurred.height=ch;blurred.getContext('2d').filter=`blur(${blurPx}px)`;blurred.getContext('2d').drawImage(off,0,0);oc2.clearRect(0,0,cw,ch);oc2.drawImage(blurred,0,0);}
    else{_swBlur(oc2,cw,ch,Math.max(1,Math.round(blurPx)));}
  }
  // aplicar máscara de luminosidade se existir
  if(L._mask)applyLayerMask(off,L,cw,ch);
  // isolation: knockout — pinta um matte com a cor escolhida onde a camada tem alpha,
  // depois suaviza a borda do matte com blur para que a transição com as camadas debaixo
  // não seja dura/pixelizada. As camadas debaixo continuam invisíveis no interior do matte.
  if(L.isolated){
    const matteCol=L.isolatedColor||el('bgCol').value||'#ffffff';
    const[mR,mG,mB]=hexRGB(matteCol);
    const oc2=off.getContext('2d');
    const layerData=oc2.getImageData(0,0,cw,ch);
    const la=layerData.data;
    // 1. matte binário (alpha 0 ou 255) nos pixels onde a camada tem qualquer alpha
    const matteData=new ImageData(cw,ch);
    const md=matteData.data;
    for(let i=0;i<la.length;i+=4){
      if(la[i+3]>1){md[i]=mR;md[i+1]=mG;md[i+2]=mB;md[i+3]=255;}
    }
    const matteRaw=document.createElement('canvas');matteRaw.width=cw;matteRaw.height=ch;
    matteRaw.getContext('2d').putImageData(matteData,0,0);
    // 2. suavizar a borda — blur proporcional ao do blob (mínimo 2px para nunca ficar pixelizado)
    const matte=document.createElement('canvas');matte.width=cw;matte.height=ch;
    const mc=matte.getContext('2d');
    const matteBlurPx=Math.max(2,(L.blur||0)*Math.min(cw,ch)/300*0.5);
    mc.filter=`blur(${matteBlurPx}px)`;
    mc.drawImage(matteRaw,0,0);
    mc.filter='none';
    // 3. conteúdo original (gradiente+blur intactos) por cima do matte suavizado
    mc.drawImage(off,0,0);
    off=matte;
  }
  return off;
}

// ═══ GLOBAL ADJUSTMENTS — pro-grade pipeline para impressão UV em acrílico ═══
// Apply order: black/white points → contrast → temperature → vibrance → saturation
// All math in 0..1 linear-ish space, applied to ImageData (works in preview AND export).
function _gv(id,def){const e=el(id);return e?(+e.value):def;}
function applyGlobalAdjustments(targetCtx,w,h){
  const con  = _gv('gCon',0)/100;        // -1..+1
  const sat  = _gv('gSat',100)/100;      // 0..2
  const vib  = _gv('gVib',0)/100;        // -1..+1
  const temp = _gv('gTemp',0)/100;       // -1..+1
  const bp   = _gv('gBP',0)/255;         // 0..0.31
  const wp   = _gv('gWP',255)/255;       // 0.69..1
  // Bail early if everything is identity
  if(con===0 && sat===1 && vib===0 && temp===0 && bp===0 && wp===1) return;
  const range=Math.max(.001,wp-bp);
  const conScale=1+con*0.85;             // -1..+1 → 0.15..1.85 contrast multiplier
  const id=targetCtx.getImageData(0,0,w,h);
  const d=id.data;
  for(let i=0;i<d.length;i+=4){
    let r=d[i]/255, g=d[i+1]/255, b=d[i+2]/255;
    // 1. Black/white points (clamp/stretch the tonal range)
    r=(r-bp)/range; g=(g-bp)/range; b=(b-bp)/range;
    // 2. Contrast around 0.5
    if(conScale!==1){
      r=(r-.5)*conScale+.5; g=(g-.5)*conScale+.5; b=(b-.5)*conScale+.5;
    }
    // 3. Temperature: warm/cool R↔B shift (LED color cast compensation)
    if(temp!==0){
      r+=temp*0.18; b-=temp*0.18;
    }
    // clamp before color-axis ops
    if(r<0)r=0;else if(r>1)r=1;
    if(g<0)g=0;else if(g>1)g=1;
    if(b<0)b=0;else if(b>1)b=1;
    // 4. Vibrance — boost low-sat colours more (preserves already-saturated hues)
    if(vib!==0){
      const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
      const curSat=mx===0?0:(mx-mn)/mx;
      const amt=vib*(1-curSat);
      const lum=r*.299+g*.587+b*.114;
      r=lum+(r-lum)*(1+amt); g=lum+(g-lum)*(1+amt); b=lum+(b-lum)*(1+amt);
    }
    // 5. Saturation — uniform around luminance
    if(sat!==1){
      const lum=r*.299+g*.587+b*.114;
      r=lum+(r-lum)*sat; g=lum+(g-lum)*sat; b=lum+(b-lum)*sat;
    }
    // final clamp
    if(r<0)r=0;else if(r>1)r=1;
    if(g<0)g=0;else if(g>1)g=1;
    if(b<0)b=0;else if(b>1)b=1;
    d[i]=cl(r*255); d[i+1]=cl(g*255); d[i+2]=cl(b*255);
  }
  targetCtx.putImageData(id,0,0);
}

// ═══ RENDER ══════════════════════════════════════════════════════════════════
// Coalesce multiple render() calls per frame into one (huge perf win quando se arrasta sliders)
