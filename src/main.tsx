import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // <--- Quita el .tsx de aquí
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
