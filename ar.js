var arStream = null;
var arAnimFrame = null;
var arTarget = null;
var arHeading = 0;

function startAR(evt) {
  arTarget = evt;
  var overlay = document.getElementById('ar-overlay');
  var video = document.getElementById('ar-video');

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(function(stream) {
      arStream = stream;
      video.srcObject = stream;
      overlay.classList.remove('hidden');
      window.addEventListener('deviceorientation', onOrientation, true);
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().catch(function() {});
      }
      document.getElementById('ar-close').onclick = stopAR;
      arLoop();
    })
    .catch(function() {
      alert('Cal permís de càmera per usar AR. Pots usar Google Maps per navegar.');
    });
}

function onOrientation(e) {
  if (e.webkitCompassHeading !== undefined) arHeading = e.webkitCompassHeading;
  else if (e.alpha !== null) arHeading = (360 - e.alpha) % 360;
}

function arLoop() {
  var canvas = document.getElementById('ar-canvas');
  var ctx = canvas.getContext('2d');
  var info = document.getElementById('ar-info');
  var compass = document.getElementById('ar-compass');

  function tick() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!window.userLat || !arTarget) {
      info.textContent = 'Localitzant…';
      arAnimFrame = requestAnimationFrame(tick);
      return;
    }

    var bearing = getBearing(window.userLat, window.userLng, arTarget.lat, arTarget.lng);
    var distance = getDistance(window.userLat, window.userLng, arTarget.lat, arTarget.lng);
    var rel = ((bearing - arHeading + 360) % 360);
    var diff = rel > 180 ? rel - 360 : rel;
    var inView = Math.abs(diff) < 30;

    if (inView) {
      var cx = canvas.width / 2 + (diff / 30) * (canvas.width / 2);
      var cy = canvas.height * 0.35;
      var pulse = 0.7 + 0.3 * Math.sin(Date.now() / 300);
      ctx.beginPath(); ctx.arc(cx, cy, 50 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(233,69,96,0.5)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(233,69,96,0.9)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('📍', cx, cy);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      roundRect(ctx, cx - 120, cy + 46, 240, 56, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px -apple-system,sans-serif';
      ctx.fillText(trunc(arTarget.title, 30), cx, cy + 63);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '12px -apple-system,sans-serif';
      ctx.fillText(fmtDist(distance), cx, cy + 82);
    } else {
      var a = (diff * Math.PI / 180) - Math.PI / 2;
      var ax = canvas.width / 2 + 90 * Math.cos(a);
      var ay = canvas.height / 2 + 90 * Math.sin(a);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0,-22); ctx.lineTo(13,10); ctx.lineTo(-13,10); ctx.closePath();
      ctx.fillStyle = 'rgba(233,69,96,0.9)'; ctx.fill(); ctx.restore();
    }

    compass.textContent = hArrow(arHeading);
    info.textContent = trunc(arTarget.title, 24) + ' · ' + fmtDist(distance);
    arAnimFrame = requestAnimationFrame(tick);
  }
  arAnimFrame = requestAnimationFrame(tick);
}

function stopAR() {
  if (arAnimFrame) cancelAnimationFrame(arAnimFrame);
  if (arStream) arStream.getTracks().forEach(function(t) { t.stop(); });
  window.removeEventListener('deviceorientation', onOrientation, true);
  document.getElementById('ar-overlay').classList.add('hidden');
  arStream = null; arTarget = null;
}

function getBearing(lat1,lng1,lat2,lng2) {
  var r=function(d){return d*Math.PI/180;};
  var y=Math.sin(r(lng2-lng1))*Math.cos(r(lat2));
  var x=Math.cos(r(lat1))*Math.sin(r(lat2))-Math.sin(r(lat1))*Math.cos(r(lat2))*Math.cos(r(lng2-lng1));
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function getDistance(lat1,lng1,lat2,lng2) {
  var r=function(d){return d*Math.PI/180;};
  var a=Math.sin(r(lat2-lat1)/2)*Math.sin(r(lat2-lat1)/2)+Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(r(lng2-lng1)/2)*Math.sin(r(lng2-lng1)/2);
  return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmtDist(m) { return m<1000?Math.round(m)+'m':(m/1000).toFixed(1)+'km'; }
function hArrow(h) {
  if(h<22.5||h>=337.5)return'↑N';if(h<67.5)return'↗NE';if(h<112.5)return'→E';
  if(h<157.5)return'↘SE';if(h<202.5)return'↓S';if(h<247.5)return'↙SO';
  if(h<292.5)return'←O';return'↖NO';
}
function trunc(s,n) { return String(s||'').length>n?String(s).substring(0,n)+'…':String(s||''); }
function roundRect(ctx,x,y,w,h,r) {
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

window.startAR = startAR;
