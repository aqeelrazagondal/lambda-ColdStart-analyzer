import { Card, Stat } from '@lca/ui-components';

export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Lambda Cold-Start Analyzer</h1>
      <p>Welcome! This is the Next.js dashboard placeholder.</p>
      <Card title="Quick Links">
        <ul>
          <li>
            API health: <a href="http://localhost:3001/health">http://localhost:3001/health</a>
          </li>
        </ul>
      </Card>
      <Card title="Status">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Stat label="Apps" value="API + Web" />
          <Stat label="Libs" value="4" />
          <Stat label="Workspace" value="pnpm + turbo" />
        </div>
      </Card>
    </main>
  );
}
