import { Logger } from '@nestjs/common';
import type { IStorageProvider } from '../../../common/providers/storage/storage.interface.js';

const logger = new Logger('NewsContentProcessor');

/**
 * Processa nós do Tiptap JSON substituindo imagens base64 inline por URLs persistidas no Storage.
 */
export async function processContentBase64Images(
  content: Record<string, any>,
  storageProvider: IStorageProvider,
): Promise<Record<string, any>> {
  if (!content || !Array.isArray(content.content)) {
    return content;
  }

  const processNodes = async (nodes: any[]): Promise<any[]> => {
    const result: any[] = [];
    for (const node of nodes) {
      if (node.type === 'image' && typeof node.attrs?.src === 'string' && node.attrs.src.startsWith('data:image/')) {
        try {
          const dataUrl: string = node.attrs.src;
          const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const ext = mimeType.split('/')[1] || 'png';
            const unique = Math.round(Math.random() * 1e6);
            const fileName = `content-${Date.now()}-${unique}.${ext}`;
            const folder = `news/content`;

            const url = await storageProvider.uploadFile(buffer, fileName, folder, mimeType);
            result.push({
              ...node,
              attrs: {
                ...node.attrs,
                src: url,
              },
            });
            continue;
          }
        } catch (err) {
          logger.error({ err }, 'Failed to convert base64 image in content to storage url');
        }
      }

      if (Array.isArray(node.content)) {
        result.push({
          ...node,
          content: await processNodes(node.content),
        });
      } else {
        result.push(node);
      }
    }
    return result;
  };

  return {
    ...content,
    content: await processNodes(content.content),
  };
}

