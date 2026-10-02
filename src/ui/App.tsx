import { Viewport } from '@/ui/game/Viewport';

export function App() {
  return (
    <Viewport>
      {() => (
        <main className="title" data-testid="title">
          <div className="title-mark" aria-hidden>
            <span className="title-tile">條</span>
          </div>
          <h1 className="title-name">Bone &amp; Bamboo</h1>
          <p className="title-sub">Four winds. Four hosts. One wall.</p>
        </main>
      )}
    </Viewport>
  );
}
