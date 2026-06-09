import { Hilo } from '../../components/brand';

export default function Loading() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="float" style={{ display: 'inline-block' }}><Hilo size={48} /></div>
        <div className="spin" style={{ margin: '16px auto 0' }} />
      </div>
    </div>
  );
}
