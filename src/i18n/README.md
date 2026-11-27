# Application text and locale

Edit `locales/vi.ts` to configure application-owned text, including screen copy,
accessibility labels, generated player names, notifications, category/role labels,
and browser/PWA metadata. Keep interpolation names such as `{{name}}` and `{{count}}`
intact. Translation values are plain text; keep presentation markup, icons, emoji,
and decorative arrows in components. Add these around the translated message at
the display site, keeping complete sentences and interpolation in the resource.

`config.ts` selects `vi`. `index.ts` registers Vietnamese as the default, fallback,
and only supported language. Resources are bundled and initialized once without
a backend or language detector, so translations also work offline. The browser
entrypoint waits for initialization before rendering. TypeScript checks translation
keys and interpolation parameters.

Organize the dictionary by meaning using `domain.context.message` paths:

- `common.dialog` contains shared dialog controls.
- `app` contains metadata, help, branding, navigation, updates, dialogs, and storage notices.
- `game` contains category and role labels, player defaults, custom-word UI, setup,
  and the reveal, description, voting, elimination, and results screens.

Use English camelCase for each path segment, for example
`t('game.setup.startGame')` and `t('game.players.defaultName', { value1: 1 })`.
Each node is either a branch object or a plain string leaf. Keep sibling keys
unique, use consistent depth for related messages, and keep separate keys for
different meanings even when their translations match. Additional locales must
match this tree and its value types, apart from locale-specific plural forms.
These groups are nested keys in the existing single translation resource;
they do not require namespace configuration.
Category label keys are separate from persisted category IDs.
Use `t('domain.context.message', { name: value })` for UI text. Put complete dynamic sentences
in the resource rather than joining translated fragments. Preact escapes text and
attribute values; HTML template replacements use `escapeHtml` instead.

`html.ts` supplies the HTML title, description, language, and noscript message
through Vite's `transformIndexHtml` hook. The PWA manifest reads the same metadata
resource in `vite.config.ts`. Rebuild to apply metadata changes.

Built-in word pairs/synonyms, custom words, and player-entered names are gameplay
data and remain outside the UI resource. Existing saved names retain their values.

Official references:

- [i18next configuration](https://www.i18next.com/overview/configuration-options)
- [Bundled translation resources](https://www.i18next.com/how-to/add-or-load-translations)
- [TypeScript resource typing](https://www.i18next.com/overview/typescript)
- [Interpolation and escaping](https://www.i18next.com/translation-function/interpolation)
- [Vite HTML transformation](https://vite.dev/guide/api-plugin.html#transformindexhtml)
