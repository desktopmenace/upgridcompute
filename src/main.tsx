import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode intentionally omitted: this is a live, interval-driven demo and we want a single,
// predictable simulation loop (no double-mounted interval in dev). Cleanup is handled in the hook.
const container = document.getElementById('root');
if (!container) throw new Error('root element missing');
createRoot(container).render(<App />);
