import { expect, test, type Page } from '@playwright/test';
import type { Game } from '../../src/game/model';

const secret = (page: Page) => page.getByTestId('secret-word');

async function start(page: Page, secretVoting = false) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Giảm Tổng người chơi' }).click();
  await page.getByRole('button', { name: 'Giảm Tổng người chơi' }).click();
  if (secretVoting)
    await page.getByRole('button', { name: '🔒 Bỏ phiếu kín' }).click();
  await page.getByRole('button', { name: /Bắt đầu ván chơi/ }).click();
}

async function revealPlayer(page: Page, seat: number) {
  await expect(
    page.getByRole('heading', { name: `Phát từ bí mật • ${seat} / 3` }),
  ).toBeVisible();
  await expect(secret(page)).toHaveCount(0);
  await page.getByRole('button', { name: /Sẵn sàng/ }).click();
  const hold = page.getByRole('button', { name: 'Nhấn giữ để xem từ bí mật' });
  await expect(page.getByRole('button', { name: /Đã nhớ/ })).toBeDisabled();
  await hold.scrollIntoViewIfNeeded();
  await hold.hover();
  await page.mouse.down();
  await expect(secret(page)).toBeVisible();
  await page.mouse.up();
  await expect(secret(page)).toHaveCount(0);
  await page.getByRole('button', { name: /Đã nhớ/ }).click();
  await expect(secret(page)).toHaveCount(0);
}

async function savedGame(page: Page): Promise<Game> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('undercover_vn_session_v2');
    if (!raw) throw new Error('Missing test session');
    return JSON.parse(raw).data;
  });
}

async function finishPublicGame(page: Page) {
  const game = await savedGame(page);
  const undercover = game.players.find(({ role }) => role === 'UNDERCOVER');
  if (!undercover) throw new Error('Expected an Undercover');
  await page.getByRole('button', { name: /Bắt đầu bỏ phiếu/ }).click();
  await page
    .getByRole('button', {
      name: new RegExp(`${undercover.name}.*Chạm để chọn`),
    })
    .click();
  await page.getByRole('button', { name: /Loại người này/ }).click();
  await page.getByRole('button', { name: /Loại ngay/ }).click();
  await expect(page.getByText('VAI TRÒ THẬT')).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục →' }).click();
  await expect(
    page.getByRole('heading', { name: /PHE DÂN THƯỜNG CHIẾN THẮNG/ }),
  ).toBeVisible();
}

async function waitForOffline(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
}

test('reveals each player, resumes an interrupted game, then finishes a public vote', async ({
  page,
}) => {
  await start(page);
  await revealPlayer(page, 1);
  await page.reload();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await revealPlayer(page, 2);
  await revealPlayer(page, 3);
  await finishPublicGame(page);
});

test('hands off private ballots, resolves the tally and finishes the game', async ({
  page,
}) => {
  await start(page, true);
  for (const seat of [1, 2, 3]) await revealPlayer(page, seat);
  const game = await savedGame(page);
  const undercover = game.players.find(({ role }) => role === 'UNDERCOVER');
  const civilian = game.players.find(({ role }) => role === 'CIVILIAN');
  if (!undercover || !civilian) throw new Error('Expected a valid roster');
  await page.getByRole('button', { name: /Bắt đầu bỏ phiếu/ }).click();
  for (const voter of game.players) {
    const target = voter.id === undercover.id ? civilian : undercover;
    await expect(
      page.getByRole('heading', { name: `🔒 Bỏ phiếu kín • ${voter.seat}/3` }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Bỏ phiếu loại/ }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: /Mở phiếu bầu của tôi/ }).click();
    await expect(
      page.getByRole('button', {
        name: new RegExp(`${voter.name}.*Bỏ phiếu loại`),
      }),
    ).toHaveCount(0);
    await page
      .getByRole('button', {
        name: new RegExp(`${target.name}.*Bỏ phiếu loại`),
      })
      .click();
  }
  await expect(page.getByText('2 phiếu')).toBeVisible();
  await page.getByRole('button', { name: /Lật vai trò & Loại/ }).click();
  await page.getByRole('button', { name: 'Tiếp tục →' }).click();
  await expect(
    page.getByRole('heading', { name: /PHE DÂN THƯỜNG CHIẾN THẮNG/ }),
  ).toBeVisible();
});

test('precaches the hosted application and completes a game offline', async ({
  page,
  context,
}) => {
  await page.goto('./');
  await waitForOffline(page);
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel=manifest]');
    if (!link) throw new Error('Missing PWA manifest');
    return (await fetch(link.href)).json();
  });
  expect(manifest).toMatchObject({
    display: 'standalone',
    orientation: 'portrait',
    scope: './',
  });
  await context.setOffline(true);
  await start(page);
  for (const seat of [1, 2, 3]) await revealPlayer(page, seat);
  await finishPublicGame(page);
});

test('defers an update while a game is active and resumes the saved handoff after updating', async ({
  page,
  request,
}) => {
  await page.goto('./');
  await waitForOffline(page);
  await start(page);
  await revealPlayer(page, 1);
  expect((await request.post('./__publish-test-update')).status()).toBe(204);
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.ready).update();
  });
  const update = page.getByRole('button', { name: 'Cập nhật', exact: true });
  await expect(update).toBeDisabled();
  await expect(
    page.getByRole('heading', { name: 'Phát từ bí mật • 2 / 3' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Về thiết lập', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Về thiết lập', exact: true })
    .click();
  await expect(update).toBeEnabled();
  await Promise.all([page.waitForEvent('domcontentloaded'), update.click()]);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Phát từ bí mật • 2 / 3' }),
  ).toBeVisible();
  await expect(secret(page)).toHaveCount(0);
});
