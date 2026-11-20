/**
 * Confetti Canvas Celebration Engine (with clean resize listener teardown)
 */

let confettiAnimId = null;
let confettiParticles = [];
let activeResizeHandler = null;

export function startConfetti() {
  stopConfetti();
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');

  activeResizeHandler = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  activeResizeHandler();
  window.addEventListener('resize', activeResizeHandler);

  const colors = ['#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#10b981', '#fbbf24'];
  confettiParticles = Array.from({ length: 110 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: 7 + Math.random() * 6,
    h: 4 + Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 2.5,
    vy: 2.2 + Math.random() * 3.5,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.16
  }));

  let frames = 0;
  const loop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (p.y > canvas.height + 20 && frames < 220) {
        p.y = -15;
        p.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    frames++;
    if (frames < 360) {
      confettiAnimId = requestAnimationFrame(loop);
    } else {
      stopConfetti();
    }
  };
  confettiAnimId = requestAnimationFrame(loop);
}

export function stopConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  if (activeResizeHandler) {
    window.removeEventListener('resize', activeResizeHandler);
    activeResizeHandler = null;
  }
  const canvas = document.getElementById('confettiCanvas');
  if (canvas) canvas.style.display = 'none';
}
