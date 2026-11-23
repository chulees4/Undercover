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
  const colors = [
    '#8b5cf6',
    '#06b6d4',
    '#f97316',
    '#ec4899',
    '#10b981',
    '#fbbf24',
  ];
  const particles = Array.from({ length: 110 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    width: 7 + Math.random() * 6,
    height: 4 + Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 2.5,
    vy: 2.2 + Math.random() * 3.5,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.16,
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
      particle.angle += particle.spin;
      if (particle.y > canvas.height + 20 && frame < 220) {
        particle.y = -15;
        particle.x = Math.random() * canvas.width;
      }
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.angle);
      context.fillStyle = particle.color;
      context.fillRect(
        -particle.width / 2,
        -particle.height / 2,
        particle.width,
        particle.height,
      );
      context.restore();
    }
    frame++;
    if (frame < 360) animation = requestAnimationFrame(draw);
    else stop();
  }
  animation = requestAnimationFrame(draw);
  return stop;
}
