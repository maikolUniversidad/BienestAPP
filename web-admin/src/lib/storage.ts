import { createClient } from '@supabase/supabase-js';
import { api } from './api';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const bucket = 'journal';

const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

/**
 * Sube un archivo a Supabase Storage usando una URL firmada emitida por el backend
 * (el cliente nunca maneja la service key). Devuelve { type, path } para guardar en el diario.
 */
export async function uploadJournalFile(
  file: Blob,
  kind: 'image' | 'audio',
  ext: string,
): Promise<{ type: 'image' | 'audio'; path: string }> {
  if (!supabase) throw new Error('Almacenamiento no configurado');
  const { path, token } = await api.journalUploadUrl(kind, ext);
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
    contentType: file.type || (kind === 'image' ? 'image/jpeg' : 'audio/webm'),
  });
  if (error) throw error;
  return { type: kind, path };
}
