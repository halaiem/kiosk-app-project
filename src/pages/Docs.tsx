import { useState } from 'react';
import DocsHeader, { type Section } from '@/components/docs/DocsHeader';
import { PromptsSection, TZSection, UISection } from '@/components/docs/DocsKiosk';
import DocsDashboard from '@/components/docs/DocsDashboard';
import DocsAgentOrder from '@/components/docs/DocsAgentOrder';

export default function Docs() {
  const [active, setActive] = useState<Section>('prompts');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocsHeader active={active} onSelect={setActive} />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {active === 'prompts' && <PromptsSection />}
        {active === 'tz' && <TZSection />}
        {active === 'ui' && <UISection />}
        {active === 'dashboard' && <DocsDashboard />}
        {active === 'agent-order' && <DocsAgentOrder />}
      </div>
    </div>
  );
}
