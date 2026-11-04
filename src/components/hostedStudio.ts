export type HostedSelection = 'temple' | 'music' | 'people' | 'companion' | 'scenery';
export type HostedStudio = { mode: 'view' | 'edit'; read: () => string | null; write: (raw: string) => void; select: (kind: HostedSelection, id: string) => void };
declare global { interface Window { EchoesHostedStudio?: HostedStudio } }
export const getHostedStudio = (): HostedStudio | null => typeof window === 'undefined' ? null : window.EchoesHostedStudio || null;
export const readStudioDraft = () => { const hosted=getHostedStudio(); return hosted?hosted.read():window.localStorage.getItem('echoes-temple-builder-v1'); };
export function writeStudioDraft(raw: string) { const hosted = getHostedStudio(); if (hosted) hosted.write(raw); else window.localStorage.setItem('echoes-temple-builder-v1', raw); }
