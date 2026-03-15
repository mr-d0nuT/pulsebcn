var arStream = null;
var arAnimFrame = null;
var arTargetLat, arTargetLng, arTargetTitle;
var arHeading = 0;

function startAR(eventId) {
  var events = window.allEvents || [];
  var evt = null;
  for (var i = 0; i < events.length; i++) {
    if (events[i].id === eventId) { evt = events[i]; break; }
  }
  if (!evt) { alert('Esdeveniment no trobat'); return; }
  arTargetLat = evt.lat;
  arTargetLng = evt.lng;
  arTargetTitle = evt.title;

  var overlay = document.getElementById('ar-overlay');
  var video = document.getElementById('ar-video');

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(function(stream) {
      arStream = stream;
      video.srcObject = stream;
      overlay.classList.remove('hidden');
      window.addEventListener('deviceorientation', function(e) {
        if (e.webkitCompassHeading !== undefined) arHeading = e.webkitCompassHeading;
        else if (e.alpha !== null) arHeading = (360 - e.alpha) % 360;
      }, true);
      document.getElementById('ar-close').onclick = stopAR;
      arLoop();
    })
    .catch(function() {
      alert('Cal permís de càmera. Usa Google Maps per navegar!');
    });
}

function arLoop() {
  var canvas = document.getElementById('ar-canvas');
  var ctx = canvas.getContext('2d');
  var info = document.getElementById('ar-info');
  var compass = document.getElementById('ar-compass');

  function loop() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!window.userLat) {
      info.textContent = 'Localitzant...';
      arAnimFrame = requestAnimationFrame(loop);
      return;
    }

    var bearing = arGetBearing(window.userLat, window.userLng, arTargetLat, arTargetLng);
    var distance = arGetDistance(window.userLat, window.userLng, arTargetLat, arTargetLng);
    var relAngle = ((bearing - arHeading + 360) % 360);
    var angleDiff = relAngle > 180 ? relAngle - 360 : relAngle;
    var inView = Math.abs(angleDiff) < 30;

    if (inView) {
      var cx = canvas.width / 2 + (angleDiff / 30) * (canvas.width / 2);
      var cy = canvas.height * 0.35;
      var pulse = 0.7 + 0.3 * Math.sin(Date.now() / 300);
      ctx.beginPath(); ctx.arc(cx, cy, 48 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(233,69,96,0.6)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(233,69,96,0.85)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('📍', cx, cy);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath(); ctx.roundRect(cx - 110, cy + 50, 220, 52, 10); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui';
      ctx.fillText(arTargetTitle.length > 26 ? arTargetTitle.substring(0,26)+'…' : arTargetTitle, cx, cy + 66);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '11px system-ui';
      ctx.fillText(arFormatDist(distance), cx, cy + 84);
    } else {
      var angle = (angleDiff * Math.PI / 180) - Math.PI / 2;
      var ax = canvas.width/2 + 80 * Math.cos(angle);
      var ay = canvas.height/2 + 80 * Math.sin(angle);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(angle + Math.PI/2);
      ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(12,10); ctx.lineTo(-12,10); ctx.closePath();
      ctx.fillStyle = 'rgba(233,69,96,0.9)'; ctx.fill(); ctx.restore();
    }

    compass.textContent = arH2arrow(arHeading);
    info.textContent = arTargetTitle.substring(0,20) + ' · ' + arFormatDist(distance);
    arAnimFrame = requestAnimationFrame(loop);
  }
  arAnimFrame = requestAnimationFrame(loop);
}

function stopAR() {
  if (arAnimFrame) cancelAnimationFrame(arAnimFrame);
  if (arStream) arStream.getTracks().forEach(function(t) { t.stop(); });
  document.getElementById('ar-overlay').classList.add('hidden');
  arStream = null;
}

function arGetBearing(lat1,lng1,lat2,lng2) {
  var r=function(d){return d*Math.PI/180;};
  var dL=r(lng2-lng1);
  var y=Math.sin(dL)*Math.cos(r(lat2));
  var x=Math.cos(r(lat1))*Math.sin(r(lat2))-Math.sin(r(lat1))*Math.cos(r(lat2))*Math.cos(dL);
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function arGetDistance(lat1,lng1,lat2,lng2) {
  var r=function(d){return d*Math.PI/180;};
  var dLat=r(lat2-lat1),dLng=r(lng2-lng1);
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(dLng/2)*Math.sin(dLng/2);
  return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function arFormatDist(m) { return m < 1000 ? Math.round(m)+'m' : (m/1000).toFixed(1)+'km'; }
function arH2arrow(h) {
  if(h<22.5||h>=337.5)return'↑N'; if(h<67.5)return'↗NE'; if(h<112.5)return'→E';
  if(h<157.5)return'↘SE'; if(h<202.5)return'↓S'; if(h<247.5)return'↙SO';
  if(h<292.5)return'←O'; return'↖NO';
}

window._startAR = startAR;
