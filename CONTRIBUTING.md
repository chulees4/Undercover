# Contributing to Undercover

Bug reports, documentation improvements, Vietnamese word pairs, and code fixes are welcome. Read the [game rules](README.md#game-rules) for context before changing how the game works.

## Set up locally

Install Git and Node.js. The project supports Node.js 22.13 or later in the 22 release line, Node.js 24, and Node.js 26 or later.

1. Fork the repository on GitHub if you need a copy you can push to, then clone your fork or the repository you have write access to.
2. From the project directory, create a branch, install dependencies, and start the development server.

   ```sh
   git switch -c fix/short-description
   npm ci
   npm run dev
   ```

3. Open the local address printed by Vite. On Windows, you can also use `start-game.bat` to start the game.

## Make a change

| Area                                              | Location                       |
| ------------------------------------------------- | ------------------------------ |
| Roles, game rules, scoring, and state transitions | [src/game](src/game)           |
| Built-in Vietnamese words and avatars             | [src/game/data](src/game/data) |
| Screens for each phase of the game                | [src/features](src/features)   |
| Unit tests                                        | [tests/unit](tests/unit)       |

- Keep each pull request focused on one change and follow the surrounding code's conventions.
- If gameplay changes, update the relevant rules in both [README.md](README.md) and [README.vi.md](README.vi.md).
- For new word pairs, choose Vietnamese words that can share a clue and still have distinct characteristics. Check spelling, diacritics, and existing pairs.
- For a bug fix or rules change, add or update a focused unit test when it would catch the behavior being changed.

## Check your change

For code changes, run the type, lint, formatting, and unit checks.

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
```

Use `npm run build` when your change affects the production build. If end-to-end testing is requested, install Chromium with `npx playwright install chromium`, then run `npm run test:e2e`.

## Report a bug or suggest an improvement

Search the repository's **Issues** tab on GitHub first. If an issue already covers the same problem, add any new information there.

- **Bug reports.** Include the steps to reproduce, what you expected, and what happened. For gameplay issues, include the player count, voting mode, enabled special roles, and the phase where the issue occurred. Browser and device details or a screenshot can help with UI issues.
- **Suggestions.** Describe the player problem, the proposed behavior, and an example. For a substantial change to rules or the game flow, open an issue to discuss the idea before implementing it.

## Open a pull request

1. Commit the change with a short, descriptive message and push your branch to GitHub.
2. Open a pull request against the target repository's default branch. Summarize what changed and why, and link any related issue.
3. List the checks you ran and their results. For visible UI changes, include screenshots or a short recording of the affected flow.
4. Reply to review feedback in the pull request and push follow-up changes to the same branch.
