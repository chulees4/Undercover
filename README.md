# 🕵️ Undercover – Hidden Spy

[Tiếng Việt](README.vi.md)

Undercover is a Vietnamese-language social deduction game for **3–20 players** sharing one device. Players give clues, listen for differences, and vote out suspects. The game supports in-person or secret voting, built-in and custom word sets, cumulative scores, and automatic saving.

## Game rules

### Objective and roles

Civilians try to eliminate everyone on the Undercover side. Undercover players and Mr. White try to blend in and survive. Mr. White can also win immediately by guessing the Civilians' secret word after being eliminated.

| Role                     | What you receive                            | How to play                                                                      |
| ------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------- |
| Civilian (_Dân thường_)  | The same secret word as the other Civilians | Compare clues to spot players who may have a different word or who are guessing. |
| Undercover (_Gián điệp_) | A word related to the Civilians' word       | Give a clue for your own word that fits what others have said.                   |
| Mr. White (_Mũ Trắng_)   | No secret word                              | Infer the topic from other players' clues and give a description that fits.      |

### Set up and reveal words

1. Enter names for **3–20 players** on the shared device. The app suggests how many Undercover and Mr. White players to include. You can change the counts as long as the Undercover side has at least one player and is smaller than the Civilian side.
2. Choose word categories, a voting mode, an optional clue timer, and any special roles. Use the built-in Vietnamese word sets or add your own.
3. Start the game and pass the device to the player named on screen. Each player presses and holds their card to view it in private, then releases it before passing the device. Civilian and Undercover cards show the assigned word. Mr. White sees their role name. Any special role also appears on its holder's card.

### Play a round

1. **Give clues and discuss.** Players still in the game take turns describing their secret word without saying or spelling it. For example, if the words were _rain_ and _snow_ (_mưa_ and _tuyết_), “falls from the sky” could fit either, while “forms puddles” points more strongly to rain. The app chooses a random starting player for each round. Mr. White cannot start the first round. If the timer is enabled, each speaker has 30 or 45 seconds. Use the next-speaker button to advance and start voting when the group is ready.
2. **Vote.** Choose the player you suspect most. The voting mode determines how votes are cast and how ties are resolved.
   - **In-person voting (_Bỏ phiếu ngoài đời_).** Vote as a group, for example by raising hands. The person holding the device selects the player with the most votes and confirms the elimination. The group decides how to break an in-person tie.
   - **Secret voting (_Bỏ phiếu kín_).** Pass the device so each remaining player can open their ballot and vote privately. Players can vote for themselves only if no other candidate is available. The app shows the tally after everyone votes. If several players tie for the most votes, a surviving Justice chooses one of them. Otherwise, the group can vote again among the tied players or skip the elimination and continue.
3. **Eliminate a player and reveal their role.** Eliminated players sit out subsequent clue and voting rounds. An eliminated Mr. White has **20 seconds** to guess the Civilians' word. A correct guess wins immediately. An incorrect guess or a timeout continues the elimination.
4. **Check for a winner.** The app resolves any additional eliminations triggered by special roles, then checks the win conditions. If nobody has won, the remaining players start a new clue round.

### Special roles

| Role                  | Effect                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Justice (_Công lý_)   | One Civilian gains the ability to break a tie for first place in secret voting while still in the game.                                              |
| Lovers (_Người tình_) | Available with at least four players. Two players are paired and may belong to different sides. When one is eliminated, the other is eliminated too. |
| Avenger (_Báo thù_)   | When eliminated, this player can choose a remaining player to be eliminated with them.                                                               |

### Winning and scoring

| Result                     | Condition                                                                            | Points                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Civilians win              | Everyone left in the game is a Civilian.                                             | Each Civilian gains 2 points, including eliminated Civilians.                                                                               |
| Undercover side wins       | The Undercover side still has a player in the game and at most one Civilian remains. | Each surviving Undercover or Mr. White gains 6 points. A lone survivor on the Undercover side gains 10 instead if their role is Undercover. |
| Mr. White wins by guessing | An eliminated Mr. White correctly guesses the Civilians' word.                       | The player who guessed correctly gains 8 points.                                                                                            |

The results screen summarizes the game and updates cumulative scores.

## Run and develop

Use Node.js 22.13 or later in the 22 release line, Node.js 24, or Node.js 26 or later.

```sh
npm ci
npm run dev
```

On Windows, run `start-game.bat` to install dependencies if needed and open the game on port 5173.

| Command                                   | Purpose                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `npm run dev`                             | Start the Vite development server.                  |
| `npm run build`                           | Build the static app and service worker in `dist/`. |
| `npm run preview`                         | Preview the production build locally.               |
| `npm run typecheck`                       | Run TypeScript type checking.                       |
| `npm run lint`                            | Run ESLint.                                         |
| `npm run format` / `npm run format:check` | Apply or check Prettier formatting.                 |
| `npm test` / `npm run test:unit`          | Run the Vitest unit tests.                          |
| `npm run test:e2e`                        | Run the Playwright end-to-end suite when requested. |

Before running Playwright for the first time, use `npx playwright install chromium`. The suite serves a production build at `/Undercover/` and simulates a service worker update.

## Deploy and verify offline play

1. Run `npm ci` and `npm run build`. Serve `dist/` over HTTPS with `index.html` and `sw.js` at the app root. The default relative base works for GitHub Pages at `/Undercover/`. To set an absolute base, run `npm run build -- --base=/Undercover/`.
2. Run `npm run preview` to verify the production build locally. Open the app online, let the service worker install, and reload so it controls the tab. Use the browser menu to install the app or add it to your home screen.
3. Go offline using airplane mode or the browser's developer tools. Reopen the app and play through a game, including revealing words and voting. Reload during a game and select **Continue** (_Tiếp tục_) to verify that the saved game resumes.
4. Deploy a new build to the same origin and path. When the app reports a new version, the **Update** (_Cập nhật_) button is available after you finish the game or return to setup. Update and select **Continue** to verify that the game resumes at the saved phase.

Local storage holds the game in progress, player profiles and scores, custom words, word history, and preferences. Data is scoped to the browser profile and origin. Upgrades read valid version 1 data and preserve the old keys. The app reports malformed data and preserves the original record.

## Docker

Use Docker with the Compose plugin. Development with file watch requires Docker Compose 2.39.4 or later.

### Development

```sh
docker compose up --build --watch dev
```

Open <http://localhost:5173>. Compose syncs source edits for Vite hot reload and rebuilds the development image when `package.json` or `package-lock.json` changes.

### Deployment

```sh
docker compose up --build -d app
```

Open <http://localhost:8080> on the Docker host. The production image serves the built PWA with unprivileged NGINX. For a public deployment, configure an HTTPS reverse proxy on the host to forward to `127.0.0.1:8080` so browsers can enable PWA installation and offline play. Set `UNDERCOVER_BIND_ADDRESS` or `UNDERCOVER_HTTP_PORT` to change the published address or port.

## Project structure

- `src/game/` contains the pure TypeScript model, rules, and reducer, along with the built-in word sets.
- `src/app/` coordinates state transitions, effects, and saving.
- `src/features/` contains the Preact screens. CSS Modules add screen-specific styles on top of shared styles and design tokens.
- `src/infrastructure/` handles local storage, audio, vibration, confetti, and PWA integration.
- `tests/unit/` contains unit tests. `tests/e2e/` contains the Playwright flows.

See [legacy behavior notes (Vietnamese)](docs/legacy-behavior.md) for details about the original implementation.

## Contributing

See the [contribution guide](CONTRIBUTING.md) for local setup, bug reports, and pull requests.
