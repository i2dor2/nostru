import { useEffect, useState } from 'react';
import { Shell } from '../../src/ui/Shell';
import { getNewTabOverride } from '../../src/core/store/settings';

export default function App() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    getNewTabOverride().then(setEnabled);
  }, []);

  if (enabled === null) return null;

  if (!enabled) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888', fontSize: '14px', fontFamily: 'sans-serif' }}>
        Enable Nostru new tab in Settings &rarr; Appearance.
      </div>
    );
  }

  return <Shell narrow={false} />;
}
