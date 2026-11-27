export function startConfetti(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context || matchMedia('(prefers-reduced-motion: reduce)').matches)
    return;
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  canvas.style.display = 'block';
  window.addEventListener('resize', resize);
  const colors = ['#63a9ff', '#91bfff', '#b5d6ff', '#ff8c9d', '#f4f8ff'];
  const particles = Array.from({ length: 110 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    size: Math.random() < 0.5 ? 8 : 12,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 2.5,
    vy: 2.2 + Math.random() * 3.5,
  }));
  let frame = 0;
  let animation: number;
  function stop() {
    cancelAnimationFrame(animation);
    window.removeEventListener('resize', resize);
    canvas.style.display = 'none';
  }
  function draw() {
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.y > canvas.height + 20 && frame < 220) {
        particle.y = -15;
        particle.x = Math.random() * canvas.width;
      }
      context.fillStyle = particle.color;
      context.fillRect(
        Math.round(particle.x / 4) * 4,
        Math.round(particle.y / 4) * 4,
        particle.size,
        particle.size,
      );
    }
    frame++;
    if (frame < 360) animation = requestAnimationFrame(draw);
    else stop();
  }
  animation = requestAnimationFrame(draw);
  return stop;
}
