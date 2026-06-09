import { createClient } from '@supabase/supabase-js';
import { api } from './api';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const bucket = 'journal';

const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

type Kind = 'image' | 'audio' | 'document';
type SignFn = (kind: Kind, ext: string) => Promise<{ path: string; token: string }>;

/** Sube un archivo a Supabase Storage vía URL firmada emitida por el backend. */
async function uploadVia<K extends Kind>(
  sign: SignFn,
  file: Blob,
  kind: K,
  ext: string,
): Promise<{ type: K; path: string }> {
  if (!supabase) throw new Error('Almacenamiento no configurado');
  const { path, token } = await sign(kind, ext);
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
    contentType: file.type || (kind === 'image' ? 'image/jpeg' : kind === 'audio' ? 'audio/webm' : 'application/octet-stream'),
  });
  if (error) throw error;
  return { type: kind, path } as { type: K; path: string };
}

export const uploadJournalFile = (file: Blob, kind: 'image' | 'audio', ext: string) =>
  uploadVia(api.journalUploadUrl, file, kind, ext);

export const uploadChatFile = (file: Blob, kind: 'image' | 'audio' | 'document', ext: string) =>
  uploadVia(api.aiUploadUrl, file, kind, ext);

export const uploadAvatar = (file: Blob, ext: string) =>
  uploadVia(api.profileAvatarUrl, file, 'image', ext);

export const uploadFoodPhoto = (file: Blob, ext: string) =>
  uploadVia(api.foodUploadUrl, file, 'image', ext);

export const uploadDocPhoto = (file: Blob, ext: string) =>
  uploadVia(api.docsUploadUrl, file, 'image', ext);

export const uploadChatP2P = (file: Blob, kind: 'image' | 'audio' | 'document', ext: string) =>
  uploadVia(api.chatUploadUrl, file, kind, ext);

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
