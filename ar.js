let arStream = null;
let arAnimFrame = null;
let targetLat, targetLng, targetTitle, targetEventId;
let currentHeading = 0;

export async function startAR(eventId) {
  const events = window.allEvents || [];
  const evt = events.find(e => e.id === eventId);
  if (!evt) { alert('Esdeveniment no trobat'); return; }
  targetLat = evt.lat; targetLng = evt.lng;
  targetTitle = evt.title; targetEventId = eventId;
  const overlay = document.getElementById('ar-overlay');
  const video = document.getElementById('ar-video');
  try {
    arStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width:{ideal:1280}, height:{ideal:720} }
    });
    video.srcObject = arStream;
    overlay.classList.remove('hidden');
  } catch {
    alert('Cal permís de càmera. Alternativa: usa el botó Google Maps!');
    return;
  }
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const p = await DeviceOrientationEvent.requestPermission();
      if (p !== 'granted') throw new Error('denied');
    } catch { stopAR(); alert("Cal permís d'orientació per usar AR."); return; }
  }
  window.addEventListener('deviceorientation', handleOrientation, true);
  document.getElementById('ar-close').addEventListener('click', stopAR, { once: true });
  startARLoop();
}

function handleOrientation(e) {
  if (e.webkitCompassHeading !== undefined) currentHeading = e.webkitCompassHeading;
  else if (e.alpha !== null) currentHeading = (360 - e.alpha) % 360;
}

function startARLoop() {
  const canvas = document.getElementById('ar-canvas');
  const ctx = canvas.getContext('2d');
  const info = document.getElementById('ar-info');
  const compass = document.getElementById('ar-compass');
  function loop() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!window.userLat || !window.userLng) {
      info.textContent = 'Localitzant...';
      arAnimFrame = requestAnimationFrame(loop); return;
    }
    const bearing = getBearing(window.userLat, window.userLng, targetLat, targetLng);
    const distance = getDistance(window.userLat, window.userLng, targetLat, targetLng);
    const relAngle = ((bearing - currentHeading + 360) % 360);
    const angleDiff = relAngle > 180 ? relAngle - 360 : relAngle;
    const fov = 60;
    const screenX = canvas.width/2 + (angleDiff / (fov/2)) * (canvas.width/2);
    const inView = Math.abs(angleDiff) < fov/2;
    if (inView) {
      const cx = screenX, cy = canvas.height * 0.35;
      const pulse = 0.7 + 0.3 * Math.sin(Date.now()/300);
      ctx.beginPath(); ctx.arc(cx, cy, 48*pulse, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(233,69,96,0.6)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(233,69,96,0.85)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('📍', cx, cy);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      roundRect(ctx, cx-110, cy+50, 220, 52, 10); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '600 13px system-ui';
      ctx.fillText(truncate(targetTitle,28), cx, cy+66);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '11px system-ui';
      ctx.fillText(`${formatDist(distance)} · ${b2compass(bearing)}`, cx, cy+84);
    } else {
      drawOffscreenArrow(ctx, canvas, angleDiff);
    }
    compass.textContent = h2arrow(currentHeading);
    info.textContent = `${truncate(targetTitle,22)} · ${formatDist(distance)}`;
    arAnimFrame = requestAnimationFrame(loop);
  }
  arAnimFrame = requestAnimationFrame(loop);
}

function stopAR() {
  if (arAnimFrame) cancelAnimationFrame(arAnimFrame);
  if (arStream) arStream.getTracks().forEach(t => t.stop());
  window.removeEventListener('deviceorientation', handleOrientation, true);
  document.getElementById('ar-overlay').classList.add('hidden');
  arStream = null;
}

function getBearing(lat1,lng1,lat2,lng2) {
  const r=d=>d*Math.PI/180, dL=r(lng2-lng1);
  const y=Math.sin(dL)*Math.cos(r(lat2));
  const x=Math.cos(r(lat1))*Math.sin(r(lat2))-Math.sin(r(lat1))*Math.cos(r(lat2))*Math.cos(dL);
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function getDistance(lat1,lng1,lat2,lng2) {
  const r=d=>d*Math.PI/180,R=6371000;
  const dLat=r(lat2-lat1),dLng=r(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function formatDist(m) { return m<1000?`${Math.round(m)}m`:`${(m/1000).toFixed(1)}km`; }
function b2compass(b) { return ['N','NE','E','SE','S','SO','O','NO'][Math.round(b/45)%8]; }
function h2arrow(h) {
  if(h<22.5||h>=337.5)return'↑N'; if(h<67.5)return'↗NE'; if(h<112.5)return'→E';
  if(h<157.5)return'↘SE'; if(h<202.5)return'↓S'; if(h<247.5)return'↙SO';
  if(h<292.5)return'←O'; return'↖NO';
}
function truncate(s,n) { return s.length>n?s.substring(0,n)+'…':s; }
function roundRect(ctx,x,y,w,h,r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
function drawOffscreenArrow(ctx,canvas,angleDiff) {
  const cx=canvas.width/2, cy=canvas.height/2, r=80;
  const angle=(angleDiff*Math.PI/180)-Math.PI/2;
  ctx.save(); ctx.translate(cx+r*Math.cos(angle), cy+r*Math.sin(angle));
  ctx.rotate(angle+Math.PI/2); ctx.beginPath();
  ctx.moveTo(0,-20); ctx.lineTo(12,10); ctx.lineTo(-12,10); ctx.closePath();
  ctx.fillStyle='rgba(233,69,96,0.9)'; ctx.fill(); ctx.restore();
}
