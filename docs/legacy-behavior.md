# Undercover behavior reference

The original app booted from `index.html` and `src/js/main.js`. Its router redrew the active phase from a mutable singleton in `core/state.js`. The setup and reveal modules edited configuration and players directly. `engine/gameInit.js` assigned words and roles, while the voting, elimination, and endgame modules resolved votes, role effects, wins, and scoring. Their DOM rendering also drove state transitions, localStorage writes, timers, audio, vibration, and confetti.

| Phase       | Behavior to preserve                                                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup       | 3–20 players, a civilian majority, per-size role defaults, optional Justice, Lovers and Avenger, selectable word categories, custom words, 0/30/45-second description timers, and public or secret voting |
| Reveal      | Each player gets a privacy screen, can edit their profile and hold to show their word, then locks the card before passing the device                                                                      |
| Description | Living players speak in seating order from a random starting player, excluding Mr. White as the first speaker in round one when possible. The timer is optional and advancing is manual.                  |
| Public vote | Choose a living player after an in-person vote, confirm elimination, or return to the current speaker                                                                                                     |
| Secret vote | Living players vote one at a time. They cannot select themselves when another target is available. Ties go to a living Justice or offer a runoff among tied targets and the option to skip the round.     |
| Elimination | Reveal the role, resolve a Mr. White guess first, then Lovers and Avenger effects in order. Resolve queued eliminations before checking victory.                                                          |
| Results     | The civilians win once all impostors are eliminated. Impostors win when at most one civilian remains. A correct Mr. White guess ends the game immediately.                                                |

Civilians earn 2 points each on a civilian win. A successful Mr. White earns 8 points. Only living impostors score on an impostor win. A lone surviving Undercover earns 10 points, and other eligible impostors each earn 6 points. Replaying keeps the roster and totals.

The original localStorage keys are `undercover_vn_{session,profiles,custom_words,used_words,sound}_v1`. Saves contain the active phase, player assignments, speaker position, aggregate secret votes, and elimination queue. Timer handles, the temporarily visible word, and unconfirmed selections were runtime state. Word history resets only for the selected pool when it is exhausted. The finalizer saves player scores before clearing the session.

The UI uses the shared color, spacing, radius and motion tokens from `tokens.css`, common controls and modals, and phase-specific cards, grids, timers, tally bars and role flips. Audio is synthesized locally and the results animation draws on a canvas. The original manifest used a relative scope and entry point and standalone portrait display. The handwritten service worker precached source files, activated immediately, and removed unrelated caches in the same origin.
