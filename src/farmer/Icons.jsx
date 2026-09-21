// Lucide-style icons, stroke-width 2.75 as the design system asks.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.75, strokeLinecap: 'round', strokeLinejoin: 'round' };
export const Leaf = ({ s = 18, c = '#f5ead8' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...P} stroke={c}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
);
export const Home = ({ s = 20 }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></svg>);
export const Camera = ({ s = 20 }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>);
export const Chart = ({ s = 20 }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>);
export const Sprout = ({ s = 20 }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M7 20h10" /><path d="M10 20c5.5-2.5.8-6.4 3-10" /><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" /><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" /></svg>);
export const Alert = ({ s = 22 }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>);
export const Pin = ({ s = 16 }) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>);
