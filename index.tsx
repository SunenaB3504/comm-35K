console.log('DEBUG: index.tsx: Script start. Babel has loaded and is executing this file.');

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log('DEBUG: index.tsx: Imported React, ReactDOM, and App component.');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('DEBUG: index.tsx: Fatal Error! Could not find root element to mount to.');
  throw new Error("Could not find root element to mount to");
}

console.log('DEBUG: index.tsx: Found root element. Creating React root.');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log('DEBUG: index.tsx: App component has been rendered into the root.');