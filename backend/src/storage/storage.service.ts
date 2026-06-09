import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

/**
 * Almacenamiento de archivos (fotos, audio) en Supabase Storage.
 * Bucket PRIVADO: subida y descarga mediante URLs firmadas mediadas por el backend
 * (la app cliente nunca recibe la service key). Apto para datos de salud sensibles.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: SupabaseClient | null = null;
  private readonly bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'journal';

  onModuleInit() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      this.logger.warn('SUPABASE_URL/SECRET_KEY no configurados; el almacenamiento está deshabilitado.');
      return;
    }
    this.client = createClient(url, key, { auth: { persistSession: false } });
    this.ensureBucket().catch((e) => this.logger.warn(`No se pudo crear el bucket: ${e.message}`));
  }

  get enabled() {
    return !!this.client;
  }

  private async ensureBucket() {
    if (!this.client) return;
    const { data } = await this.client.storage.getBucket(this.bucket);
    if (!data) {
      await this.client.storage.createBucket(this.bucket, {
        public: false,
        fileSizeLimit: '25MB',
      });
      this.logger.log(`Bucket '${this.bucket}' creado (privado).`);
    }
  }

  /** Genera una URL firmada de subida para que el cliente suba el archivo directamente. */
  async signUpload(userId: string, kind: 'image' | 'audio', ext: string) {
    if (!this.client) throw new Error('Almacenamiento no disponible');
    const safeExt = (ext || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
    const path = `${userId}/${kind}-${randomUUID()}.${safeExt}`;
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: data.token, signedUrl: data.signedUrl };
  }

  /** URL firmada de subida para documentos de la base de conocimiento (PDF/doc/txt). */
  async signDocUpload(userId: string, ext: string) {
    if (!this.client) throw new Error('Almacenamiento no disponible');
    const safeExt = (ext || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
    const path = `kb/${userId}/${randomUUID()}.${safeExt}`;
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: data.token, signedUrl: data.signedUrl };
  }

  /** URL firmada de lectura (temporal) para mostrar el archivo. */
  async signDownload(path: string, expiresIn = 3600): Promise<string | null> {
    if (!this.client) return null;
    const { data } = await this.client.storage.from(this.bucket).createSignedUrl(path, expiresIn);
    return data?.signedUrl ?? null;
  }

  /** Descarga el contenido binario de un archivo del bucket (para extraer texto de PDFs/documentos). */
  async downloadBuffer(path: string): Promise<Buffer | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.storage.from(this.bucket).download(path);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }

  /** Firma una lista de adjuntos [{type, path}] devolviendo también su URL temporal. */
  async signAttachments(attachments: any): Promise<any[]> {
    if (!Array.isArray(attachments)) return [];
    const out: any[] = [];
    for (const a of attachments) {
      if (a?.path) out.push({ ...a, url: await this.signDownload(a.path) });
    }
    return out;
  }
}
