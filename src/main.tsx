import { render } from 'preact';
import { App } from './app/App';
import { bootstrap } from './app/bootstrap';
import './css/tokens.css';
import './css/layout.css';
import './css/components.css';
import './css/phases.css';

const root = document.getElementById('root');
if (root) render(<App {...bootstrap()} />, root);
