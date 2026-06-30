import type { FigmaFileResponse, FigmaImagesResponse } from './types.js';

export interface FigmaClientConfig {
  accessToken: string;
  baseUrl?: string;
}

export class FigmaClient {
  private accessToken: string;
  private baseUrl: string;

  constructor(config: FigmaClientConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://api.figma.com/v1';
  }

  async getFile(fileKey: string, nodeIds?: string[]): Promise<FigmaFileResponse> {
    const params = new URLSearchParams();
    if (nodeIds?.length) {
      params.set('ids', nodeIds.join(','));
    }
    const url = `${this.baseUrl}/files/${fileKey}${params.toString() ? `?${params}` : ''}`;
    return this.request<FigmaFileResponse>(url);
  }

  async getImages(
    fileKey: string,
    nodeIds: string[],
    format: 'png' | 'jpg' | 'svg' | 'pdf' = 'png',
    scale = 2,
  ): Promise<FigmaImagesResponse> {
    const params = new URLSearchParams({
      ids: nodeIds.join(','),
      format,
      scale: String(scale),
    });
    const url = `${this.baseUrl}/images/${fileKey}?${params}`;
    return this.request<FigmaImagesResponse>(url);
  }

  async getMe(): Promise<{ id: string; email: string; handle: string }> {
    return this.request(`${this.baseUrl}/me`);
  }

  private async request<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': this.accessToken,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Figma API error ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }
}

export function createFigmaClient(accessToken: string): FigmaClient {
  return new FigmaClient({ accessToken });
}
