import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDefaultSupplies, seedDefaultFamily } from './db/db'

// Register PWA Service Worker (only in production)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('SAFE-ZONE Service Worker registered successfully:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    });
  } else {
    // Unregister any active service worker during development to avoid freezing cached JS assets
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Successfully unregistered active service worker for local development.');
            window.location.reload();
          }
        });
      }
    });
  }
}

// Seed Dexie database
seedDefaultSupplies().catch(console.error);
seedDefaultFamily().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

