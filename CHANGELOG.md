# Changelog

This file tracks notable changes to Undercover.

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
with version numbers formatted according to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Project changelog.
- A Vietnamese README and a contributor guide.
- Docker and Compose configurations for local development and production deployment.
- The game now remembers setup preferences, including player count, role settings, word categories, clue timer, and voting mode.

### Changed

- Rebuilt Undercover in Preact and TypeScript, with a dedicated engine for game rules.
- Updated local storage to migrate in-progress games and preserve the previous sound setting.
- Updated offline caching for the installable app and added a prompt when a new version is available.
- Introduced a Vite-based development workflow with commands for building, type checking, linting, formatting, and testing.
- Expanded the English README with game rules, scoring, setup, deployment, and offline verification instructions.
