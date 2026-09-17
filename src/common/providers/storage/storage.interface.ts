export const STORAGE_PROVIDER_TOKEN = 'IStorageProvider';

export interface IStorageProvider {
  uploadFile(fileBuffer: Buffer, fileName: string, folder: string, mimeType: string): Promise<string>;
}
