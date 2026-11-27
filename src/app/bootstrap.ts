import { createAudio } from '../infrastructure/audio';
import { vibrate } from '../infrastructure/haptics';
import { createRepository } from '../infrastructure/persistence/repository';
import { createGameController } from './game-controller';

export function bootstrap() {
  const audio = createAudio();
  const repository = createRepository({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  });
  const controller = createGameController(
    repository,
    Math.random,
    () =>
      `sess_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`,
    (effect, sound) => {
      if (sound) audio[effect]();
      if (effect === 'hold') vibrate(20);
      if (effect === 'eliminate') vibrate([80, 40, 80]);
      if (effect === 'win') vibrate([80, 50, 80, 50, 120]);
    },
  );
  return {
    controller,
    flip() {
      if (controller.snapshot().sound) audio.flip();
    },
    tick(remaining: number) {
      if (controller.snapshot().sound) {
        if (remaining) audio.beep();
        else audio.alarm();
      }
      if (!remaining) vibrate([120, 70, 120]);
    },
  };
}
