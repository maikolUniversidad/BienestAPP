'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Render profesional del mensaje del asistente: Markdown (tablas, listas, enlaces internos)
 *  + bloques de gráfico ```chart``` renderizados como barras. */
export function ChatMessage({ content }: { content: string }) {
  return (
    <div className="md-content" style={{ fontSize: 14.5, lineHeight: 1.55, whiteSpace: 'normal' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: '0 0 8px', paddingLeft: 18 }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
          h1: ({ children }) => <h3 style={hStyle}>{children}</h3>,
          h2: ({ children }) => <h3 style={hStyle}>{children}</h3>,
          h3: ({ children }) => <h4 style={hStyle}>{children}</h4>,
          strong: ({ children }) => <strong style={{ color: 'var(--tinta)' }}>{children}</strong>,
          a: ({ href, children }) => {
            const url = String(href ?? '');
            if (url.startsWith('/')) {
              return <Link href={url} className="md-link-btn">{children} →</Link>;
            }
            return <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--azul-deep)', textDecoration: 'underline' }}>{children}</a>;
          },
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '4px 0 10px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13.5 }}>{children}</table>
            </div>
          ),
          th: ({ children }) => <th style={{ textAlign: 'left', padding: '7px 10px', background: 'var(--tinta)', color: '#fff', fontWeight: 700 }}>{children}</th>,
          td: ({ children }) => <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--line)' }}>{children}</td>,
          blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--coral)', paddingLeft: 12, margin: '0 0 8px', color: 'var(--muted)' }}>{children}</blockquote>,
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className || '')?.[1];
            if (lang === 'chart') {
              const chart = tryParse(String(children));
              if (chart) return <ChartBlock {...chart} />;
            }
            if (lang) {
              return <pre style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, overflowX: 'auto', fontSize: 12.5 }}><code>{children}</code></pre>;
            }
            return <code style={{ background: 'var(--niebla)', borderRadius: 6, padding: '1px 5px', fontSize: 13 }}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const hStyle: React.CSSProperties = { fontFamily: 'Fraunces, serif', color: 'var(--tinta)', margin: '4px 0 6px', fontSize: 16 };

function tryParse(s: string): ChartData | null {
  try { const o = JSON.parse(s.trim()); return Array.isArray(o?.data) ? o : null; } catch { return null; }
}

interface ChartData { type?: string; title?: string; unit?: string; data: { label: string; value: number }[] }

/** Gráfico de barras simple, accesible y sin dependencias. */
function ChartBlock({ title, unit, data }: ChartData) {
  const pts = (data || []).slice(0, 7);
  const max = Math.max(1, ...pts.map((d) => Number(d.value) || 0));
  const COLORS = ['#FF7A59', '#5E9B7E', '#5B7FB9', '#E0913A', '#7B91BC', '#3E7A60', '#E85D3D'];
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, margin: '4px 0 10px' }}>
      {title && <div style={{ fontWeight: 700, color: 'var(--tinta)', marginBottom: 10, fontSize: 13.5 }}>{title}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130 }}>
        {pts.map((d, i) => {
          const v = Number(d.value) || 0;
          const h = Math.round((v / max) * 100);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div title={`${v}${unit ? ' ' + unit : ''}`} style={{ width: '100%', height: `${h}%`, minHeight: 3, background: COLORS[i % COLORS.length], borderRadius: '6px 6px 0 0', transition: 'height .4s ease' }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tinta)' }}>{v}{unit ? unit : ''}</div>
              <div className="muted" style={{ fontSize: 10.5, textAlign: 'center', lineHeight: 1.1 }}>{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
