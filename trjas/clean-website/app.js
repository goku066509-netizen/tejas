// Interactive birthday story — WAAPI tween engine + state machine (no dependencies)
(function(){
"use strict";
var POP = 'cubic-bezier(0.34,1.56,0.64,1)';
var SOFT = 'cubic-bezier(0.22,1,0.36,1)';

function tf(f){ return 'translate(' + (f.x||0) + 'px,' + (f.y||0) + 'px) scale(' + (f.s==null?1:f.s) + ') rotate(' + (f.r||0) + 'deg)'; }

/* one entrance step: {a, from:{x,y,s,r,o}, toR, dur, delay, ease} */
function enterIn(scene, steps){
  var jobs = steps.map(function(st){
    var el = scene.querySelector('[data-a="' + st.a + '"]');
    if(!el) return null;
    var f = st.from || {}, toR = st.toR || 0;
    var anim;
    try{
      anim = el.animate(
        [{opacity:(f.o==null?0:f.o), transform:tf(f)},
         {opacity:1, transform:'translate(0px,0px) scale(1) rotate(' + toR + 'deg)'}],
        {duration:st.dur||550, delay:st.delay||0, easing:st.ease||POP, fill:'both'});
    }catch(e){ el.style.opacity=1; return null; }
    return anim.finished.then(function(){
      if(toR===0){ el.style.opacity=''; el.style.transform=''; }
      else{ el.style.opacity=1; el.style.transform='translate(0px,0px) scale(1) rotate('+toR+'deg)'; }
      try{anim.cancel();}catch(e){}
    }).catch(function(){});
  }).filter(Boolean);
  return Promise.all(jobs);
}

/* exit: every layer drifts up + fades with a stagger, then scene hides */
function exitOut(scene){
  var els = Array.prototype.slice.call(scene.querySelectorAll('.lyr'));
  var jobs = els.map(function(el,i){
    if(el.style.opacity==='0') return null;
    var anim;
    try{
      anim = el.animate(
        [{opacity:1},{opacity:0, transform:'translate(0px,-36px) scale(0.92)'}],
        {duration:320, delay:i*26, easing:SOFT, fill:'both'});
    }catch(e){ return null; }
    return anim.finished.catch(function(){}).then(function(){ try{anim.cancel();}catch(e){} });
  }).filter(Boolean);
  return Promise.all(jobs).then(function(){
    els.forEach(function(el){ el.style.opacity=0; });
    scene.classList.remove('active');
  });
}

/* ---------------- state machine ---------------- */
var ORDER = ['intro','birthday','cake','blown','question','reveal','memories','final'];
var scenes = {}, cur = '', busy = false;
ORDER.forEach(function(n){ scenes[n] = document.querySelector('[data-scene="' + n + '"]'); });

var dotsBox = document.getElementById('dots');
ORDER.forEach(function(n,i){
  var d = document.createElement('button');
  d.setAttribute('aria-label', n);
  d.addEventListener('click', function(){ go(ORDER[i]); });
  dotsBox.appendChild(d);
});
var dots = Array.prototype.slice.call(dotsBox.children);

function fit(){
  var s = Math.min(window.innerWidth/1280, window.innerHeight/720);
  document.getElementById('stage').style.transform = 'scale(' + s + ')';
}
window.addEventListener('resize', fit); fit();

function mark(name){
  var i = ORDER.indexOf(name);
  dots.forEach(function(d,k){ d.classList.toggle('on', k===i); });
  if(location.hash !== '#page-' + i) history.replaceState(null,'','#page-' + i);
}

function go(name){
  if(busy || !scenes[name] || name===cur) return Promise.resolve();
  busy = true;
  var out = cur ? exitOut(scenes[cur]) : Promise.resolve();
  return out.then(function(){
    cur = name;
    var sc = scenes[name];
    sc.classList.add('active');
    if(name==='question') resetQuestion(sc);
    if(name==='cake'){
      cakeBlowing = false;
      Array.prototype.forEach.call(sc.querySelectorAll('#flames .flame'), function(f){ f.classList.remove('out'); });
    }
    mark(name);
    return enterIn(sc, CHOR[name] || []);
  }).then(function(){
    if(name==='blown') burst(150);
    if(name==='reveal') burst(120);
    if(name==='final') burst(160);
    busy = false;
  });
}

/* ---------------- choreography per scene ---------------- */
var DOWN = {y:160,s:.7,o:0}, UP = {y:-160,s:.7,o:0}, LEFT = {x:-200,s:.7,o:0},
    RIGHT = {x:200,s:.7,o:0}, POP0 = {s:0,o:0}, FADE = {o:0};
var CHOR = {
  intro: [
    {a:'streamL', from:{y:-220,o:0}, dur:600, ease:SOFT},
    {a:'streamR', from:{y:-220,o:0}, dur:600, delay:80, ease:SOFT},
    {a:'introT1', from:DOWN, delay:250},
    {a:'envBtn', from:{s:0,r:-14,o:0}, delay:450, dur:650},
    {a:'introT2', from:FADE, delay:800, dur:400, ease:SOFT},
    {a:'introKit', from:RIGHT, delay:700, toR:0},
    {a:'introSpark', from:POP0, delay:950, dur:500}
  ],
  birthday: [
    {a:'hbMain', from:{s:0,r:-6,o:0}, dur:650},
    {a:'hbFw1', from:POP0, delay:300},
    {a:'hbFw2', from:POP0, delay:380},
    {a:'hbBoy', from:LEFT, delay:450, toR:-4},
    {a:'hbMy', from:RIGHT, delay:550, toR:5},
    {a:'hbDogs', from:{y:200,o:0}, delay:650, ease:SOFT},
    {a:'hbRac', from:{y:200,o:0}, delay:750, ease:SOFT},
    {a:'hbNext', from:UP, delay:950, dur:450, ease:SOFT}
  ],
  cake: [
    {a:'ckStreamL', from:{y:-220,o:0}, dur:600, ease:SOFT},
    {a:'ckStreamR', from:{y:-220,o:0}, dur:600, delay:80, ease:SOFT},
    {a:'ckTitle', from:DOWN, delay:200},
    {a:'ckCake', from:{s:.4,y:120,o:0}, delay:400, dur:700},
    {a:'ckDogL', from:LEFT, delay:650, ease:SOFT},
    {a:'ckDogR', from:RIGHT, delay:650, ease:SOFT},
    {a:'ckHint', from:FADE, delay:1000, dur:400, ease:SOFT}
  ],
  blown: [
    {a:'blStreamL', from:{y:-220,o:0}, dur:600, ease:SOFT},
    {a:'blStreamR', from:{y:-220,o:0}, dur:600, delay:80, ease:SOFT},
    {a:'blTitle', from:{s:.5,o:0}, delay:200, dur:650},
    {a:'blCake', from:{s:.6,y:80,o:0}, delay:350, dur:650},
    {a:'blFw', from:POP0, delay:550},
    {a:'blDogL', from:LEFT, delay:600, ease:SOFT},
    {a:'blDogR', from:RIGHT, delay:600, ease:SOFT},
    {a:'blNext', from:UP, delay:900, dur:450, ease:SOFT}
  ],
  question: [
    {a:'qDisco1', from:{y:-200,o:0}, delay:0, dur:600, ease:SOFT},
    {a:'qDisco2', from:{y:-200,o:0}, delay:100, dur:600, ease:SOFT},
    {a:'qRibL', from:LEFT, delay:150, ease:SOFT},
    {a:'qRibR', from:RIGHT, delay:150, ease:SOFT},
    {a:'qTitle', from:DOWN, delay:300},
    {a:'qKit', from:{s:0,o:0}, delay:500, dur:650},
    {a:'qYes', from:POP0, delay:750},
    {a:'qNo', from:POP0, delay:850}
  ],
  reveal: [
    {a:'rvTitle', from:DOWN, delay:50},
    {a:'rvBoxes', from:{y:-260,s:.8,o:0}, delay:250, dur:650},
    {a:'rvEnv', from:LEFT, delay:550, toR:-6},
    {a:'rvBouq', from:RIGHT, delay:650, toR:6},
    {a:'rvCake', from:{y:200,s:.6,o:0}, delay:750},
    {a:'rvPol1', from:{x:-260,y:120,r:-30,o:0}, delay:850, toR:-6, ease:SOFT},
    {a:'rvPol2', from:{x:260,y:120,r:30,o:0}, delay:950, toR:5, ease:SOFT},
    {a:'rvKiss', from:POP0, delay:1050},
    {a:'rvCheers', from:POP0, delay:1120},
    {a:'rvNext', from:UP, delay:1250, dur:450, ease:SOFT}
  ],
  memories: [
    {a:'mmTitle', from:DOWN, delay:50},
    {a:'mmHat', from:{y:-180,r:-20,o:0}, delay:250},
    {a:'mmStars', from:LEFT, delay:350},
    {a:'mmFilm', from:{y:-260,r:8,o:0}, delay:400, dur:700, toR:-14, ease:SOFT},
    {a:'mmBun', from:POP0, delay:800},
    {a:'mmLily', from:POP0, delay:850},
    {a:'mmKit', from:{s:.5,y:120,o:0}, delay:700, dur:650},
    {a:'mmHeart', from:POP0, delay:1000},
    {a:'mmSwirl', from:RIGHT, delay:900, ease:SOFT},
    {a:'mmPearl', from:{y:160,o:0}, delay:950, ease:SOFT},
    {a:'mmNext', from:UP, delay:1200, dur:450, ease:SOFT}
  ],
  final: [
    {a:'fnClip', from:{y:-160,o:0}, delay:0, dur:500, ease:SOFT},
    {a:'fnCard', from:{s:.7,y:60,o:0}, delay:200, dur:650},
    {a:'fnKiss', from:POP0, delay:550},
    {a:'fnDisco', from:{y:-180,o:0}, delay:600, ease:SOFT},
    {a:'fnTamaB', from:LEFT, delay:650, ease:SOFT},
    {a:'fnTamaP', from:RIGHT, delay:650, ease:SOFT},
    {a:'fnBears', from:{y:160,o:0}, delay:800, ease:SOFT},
    {a:'fnRac', from:{y:200,o:0}, delay:880, ease:SOFT},
    {a:'fnReplay', from:UP, delay:1050, dur:450, ease:SOFT}
  ]
};

/* ---------------- interactions ---------------- */
function next(){ var i = ORDER.indexOf(cur); go(ORDER[Math.min(i+1, ORDER.length-1)]); }
document.querySelectorAll('[data-next]').forEach(function(b){ b.addEventListener('click', next); });
document.getElementById('prev').addEventListener('click', function(){
  var i = ORDER.indexOf(cur); go(ORDER[Math.max(i-1, 0)]);
});
document.getElementById('next').addEventListener('click', next);
window.addEventListener('keydown', function(e){
  if(e.key==='ArrowRight') next();
  if(e.key==='ArrowLeft'){ var i=ORDER.indexOf(cur); go(ORDER[Math.max(i-1,0)]); }
});
var tx = null;
window.addEventListener('touchstart', function(e){ tx = e.touches[0].clientX; }, {passive:true});
window.addEventListener('touchend', function(e){
  if(tx===null) return;
  var dx = e.changedTouches[0].clientX - tx;
  if(Math.abs(dx) > 70){ if(dx<0) next(); else { var i=ORDER.indexOf(cur); go(ORDER[Math.max(i-1,0)]); } }
  tx = null;
}, {passive:true});
document.getElementById('replayBtn').addEventListener('click', function(){ go('intro'); });

/* envelope starts the story */
var env = document.getElementById('envBtn');
function openEnv(){ if(cur==='intro' && !busy) go('birthday'); }
env.addEventListener('click', openEnv);
env.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openEnv(); } });

/* candle blowing */
var flames = Array.prototype.slice.call(document.querySelectorAll('#flames .flame'));
var cakeBlowing = false;
function smokeAt(f){
  var host = document.getElementById('flames');
  var s = document.createElement('span');
  s.className = 'smoke'; s.textContent = '💨';
  s.style.left = f.style.left; s.style.bottom = '60%';
  host.appendChild(s);
  setTimeout(function(){ s.remove(); }, 1500);
}
function puff(f){
  if(!f || f.classList.contains('out')) return;
  f.classList.add('out'); smokeAt(f);
  if(flames.every(function(x){ return x.classList.contains('out'); })) allOut();
}
function allOut(){
  if(cakeBlowing) return; cakeBlowing = true;
  burst(90);
  setTimeout(function(){ go('blown'); }, 900);
}
flames.forEach(function(f){ f.addEventListener('pointerdown', function(e){ e.stopPropagation(); puff(f); }); });
var cakeWrap = document.getElementById('cakeWrap');
cakeWrap.addEventListener('click', function(){
  if(cur!=='cake' || busy || cakeBlowing) return;
  cakeBlowing = true;
  var lit = flames.filter(function(f){ return !f.classList.contains('out'); });
  lit.forEach(function(f,i){ setTimeout(function(){ puff(f); }, i*160); });
  setTimeout(function(){ if(!flames.every(function(x){return x.classList.contains('out');})){ cakeBlowing=false; } }, lit.length*160+300);
});
/* NO button → retry loop (never stuck: YES always available) */
var dodges = 0;
var noBtn = document.getElementById('noBtn');
var retryMsg = document.getElementById('retryMsg');
function resetQuestion(sc){
  dodges = 0;
  noBtn.textContent = 'NO';
  noBtn.style.left = ''; noBtn.style.top = '';
  retryMsg.textContent = 'Please try again 🥺';
}
noBtn.addEventListener('click', function(){
  if(cur!=='question' || busy) return;
  dodges++;
  busy = true;
  var sc = scenes.question;
  var wob = noBtn.animate(
    [{transform:'translate(0,0)'},{transform:'translate(-14px,0)'},{transform:'translate(12px,-8px)'},{transform:'translate(0,0) scale(.85)'}],
    {duration:450, easing:'ease-out'});
  wob.finished.catch(function(){}).then(function(){
    try{wob.cancel();}catch(e){}
    retryMsg.textContent = dodges > 1 ? 'nope — try YES 😌' : 'Please try again 🥺';
    enterIn(sc, [{a:'qRetry', from:{s:0,r:-6,o:0}, dur:450}]).then(function(){
      setTimeout(function(){
        var out = retryMsg.animate([{opacity:1},{opacity:0, transform:'translate(0px,-20px) scale(.9)'}],
          {duration:350, easing:SOFT, fill:'both'});
        out.finished.catch(function(){}).then(function(){
          try{out.cancel();}catch(e){}
          retryMsg.style.opacity = 0;
          busy = false;
        });
      }, 1400);
    });
  });
});
document.getElementById('yesBtn').addEventListener('click', function(){
  if(cur!=='question' || busy) return;
  burst(130);
  setTimeout(function(){ go('reveal'); }, 350);
});

/* photos: user art from photos/ (appends <img> only on successful load — never broken) */
document.querySelectorAll('.ph[data-src]').forEach(function(box){
  var img = new Image();
  img.className = 'fit';
  img.alt = '';
  img.onload = function(){ box.appendChild(img); box.classList.add('has-photo'); };
  img.src = box.getAttribute('data-src');
});

/* confetti (short-lived, no loops) */
var c = document.getElementById('confetti'), ctx = c.getContext('2d'), parts = [], on = false;
var colors = ['#7aa9d6','#f2a9c4','#ffd23e','#2f4a68','#ffffff','#e2548b'];
function size(){ c.width = window.innerWidth; c.height = window.innerHeight; }
size(); window.addEventListener('resize', size);
function burst(n){
  for(var i=0;i<n;i++) parts.push({
    x: window.innerWidth/2 + (Math.random()-.5)*320, y: window.innerHeight*0.35,
    vx:(Math.random()-.5)*9, vy:Math.random()*-7-2, s:Math.random()*7+3,
    col:colors[i%colors.length], rot:Math.random()*6, vr:(Math.random()-.5)*.3, life:90+Math.random()*40});
  if(!on){ on = true; requestAnimationFrame(tick); }
}
function tick(){
  ctx.clearRect(0,0,c.width,c.height);
  parts = parts.filter(function(p){ return p.life>0; });
  parts.forEach(function(p){
    p.x+=p.vx; p.y+=p.vy; p.vy+=.28; p.rot+=p.vr; p.life--;
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.col;
    ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6); ctx.restore();
  });
  if(parts.length) requestAnimationFrame(tick);
  else { on = false; ctx.clearRect(0,0,c.width,c.height); }
}

/* boot from hash */
(function boot(){
  var m = location.hash.match(/page-(\d+)/);
  var start = (m && ORDER[+m[1]]) ? ORDER[+m[1]] : 'intro';
  /* reset flame state for fresh story runs */
  document.querySelectorAll('#flames .flame').forEach(function(f){ f.classList.remove('out'); });
  cakeBlowing = false;
  go(start);
})();
})();
