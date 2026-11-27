import { render } from 'preact';
import { App } from './app/App';
import { bootstrap } from './app/bootstrap';
import { i18nReady, locale } from './i18n';
import './css/tokens.css';
import './css/layout.css';
import './css/components.css';
import './css/phases.css';

const root = document.getElementById('root');
void i18nReady.then(() => {
  document.documentElement.lang = locale;
  if (root) render(<App {...bootstrap()} />, root);
});
