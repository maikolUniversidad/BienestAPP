import { createClient } from '@supabase/supabase-js';
import { api } from './api';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const bucket = 'journal';

const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

type SignFn = (kind: 'image' | 'audio', ext: string) => Promise<{ path: string; token: string }>;

/** Sube un archivo a Supabase Storage vía URL firmada emitida por el backend. */
async function uploadVia(
  sign: SignFn,
  file: Blob,
  kind: 'image' | 'audio',
  ext: string,
): Promise<{ type: 'image' | 'audio'; path: string }> {
  if (!supabase) throw new Error('Almacenamiento no configurado');
  const { path, token } = await sign(kind, ext);
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
    contentType: file.type || (kind === 'image' ? 'image/jpeg' : 'audio/webm'),
  });
  if (error) throw error;
  return { type: kind, path };
}

export const uploadJournalFile = (file: Blob, kind: 'image' | 'audio', ext: string) =>
  uploadVia(api.journalUploadUrl, file, kind, ext);

export const uploadChatFile = (file: Blob, kind: 'image' | 'audio', ext: string) =>
  uploadVia(api.aiUploadUrl, file, kind, ext);

export const uploadAvatar = (file: Blob, ext: string) =>
  uploadVia(api.profileAvatarUrl, file, 'image', ext);

/** Sube un documento (PDF/doc/txt) para la base de conocimiento y devuelve su ruta. */
export const uploadKnowledgeFile = async (file: Blob, ext: string): Promise<{ path: string }> => {
  if (!supabase) throw new Error('Almacenamiento no configurado');
  const { path, token } = await api.knowledgeUploadUrl(ext);
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;
  return { path };
};
