import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApprovalScreen } from '../../src/ui/screens/ApprovalScreen';
import '../../src/assets/tailwind.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApprovalScreen />
  </React.StrictMode>,
);
