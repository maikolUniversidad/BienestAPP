'use client';

import { useRef } from 'react';

/**
 * Selector de archivo con dos vías: activar la CÁMARA o subir un ARCHIVO.
 * - camera: muestra el botón de cámara (captura de imagen). Por defecto true.
 * - accept: tipos para el botón de archivo (ej: 'image/*' o '.pdf,.doc').
 * - onFile(file): se llama con el archivo elegido por cualquiera de las dos vías.
 */
export function FilePicker({
  onFile,
  accept = 'image/*',
  camera = true,
  cameraLabel = '📷 Cámara',
  fileLabel = '📎 Archivo',
  disabled = false,
  size = 'sm',
}: {
  onFile: (file: File) => void;
  accept?: string;
  camera?: boolean;
  cameraLabel?: string;
  fileLabel?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cls = `btn btn-ghost ${size === 'sm' ? 'btn-sm' : ''}`;

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = '';
  }

  return (
    <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
      {camera && (
        <button type="button" className={cls} onClick={() => camRef.current?.click()} disabled={disabled}>{cameraLabel}</button>
      )}
      <button type="button" className={cls} onClick={() => fileRef.current?.click()} disabled={disabled}>{fileLabel}</button>
      {/* capture=environment abre la cámara directamente en móvil */}
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={fileRef} type="file" accept={accept} hidden onChange={pick} />
    </span>
  );
}
