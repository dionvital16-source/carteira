import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted faces: the design system asks for Barlow Condensed headings over Barlow.
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/600.css';

import './styles/industry.css';
import './styles/app.css';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
