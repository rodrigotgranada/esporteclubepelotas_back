import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewsSchedulerService } from './news-scheduler.service.js';
import { NewsStatus } from './schemas/news-article.schema.js';

describe('NewsSchedulerService', () => {
  let service: NewsSchedulerService;
  let mockArticleModel: any;

  beforeEach(() => {
    mockArticleModel = {
      updateMany: vi.fn(),
    };

    service = new NewsSchedulerService(mockArticleModel);
  });

  it('should update scheduled articles to PUBLISHED when publishedAt <= now', async () => {
    mockArticleModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

    await service.handleScheduledNewsPublishing();

    expect(mockArticleModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: NewsStatus.SCHEDULED,
        isActive: true,
      }),
      {
        $set: { status: NewsStatus.PUBLISHED },
      },
    );
  });

  it('should handle errors gracefully without throwing', async () => {
    mockArticleModel.updateMany.mockRejectedValue(new Error('DB Error'));

    await expect(service.handleScheduledNewsPublishing()).resolves.not.toThrow();
  });
});
