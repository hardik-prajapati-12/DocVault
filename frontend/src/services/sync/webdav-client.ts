/**
 * WebDAV Client — Client-side WebDAV implementation using browser fetch API.
 * Supports standard operations: PROPFIND, PUT, GET, DELETE, MKCOL.
 */

export interface WebDAVFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: Date;
}

export class WebDAVClient {
  private url: string;
  private authHeader: string;

  constructor(url: string, username: string, password: string) {
    // Ensure trailing slash on URL
    this.url = url.endsWith('/') ? url : `${url}/`;
    // Create base64 basic authentication header
    const credentials = btoa(`${username}:${password}`);
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Helper to perform fetch requests with WebDAV credentials.
   */
  private async request(
    path: string,
    method: string,
    body?: BodyInit,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    let requestUrl = `${this.url}${cleanPath}`;
    const requestHeaders: Record<string, string> = {
      Authorization: this.authHeader,
      ...headers,
    };

    // Auto-proxy to bypass browser CORS limitations
    const isRemote = !requestUrl.startsWith(window.location.origin) && !requestUrl.startsWith('/');

    if (isRemote) {
  requestHeaders['x-target-url'] = this.url;
  requestUrl = `/api/api-proxy/${cleanPath}`;
}

    const res = await fetch(requestUrl, {
      method,
      headers: requestHeaders,
      body,
    });

    if (res.status === 401) {
      throw new Error('Unauthorized — Invalid WebDAV credentials');
    }

    return res;
  }

  /**
   * Test the connection to the WebDAV server.
   */
  async testConnection(): Promise<boolean> {
    try {
      const res = await this.request('', 'PROPFIND', undefined, {
        Depth: '0',
      });
      return res.ok || res.status === 207;
    } catch {
      return false;
    }
  }

  /**
   * Create a folder (MKCOL).
   */
  async createFolder(folderName: string): Promise<boolean> {
    try {
      const res = await this.request(folderName, 'MKCOL');
      return res.status === 201 || res.status === 405; // 405 means folder already exists
    } catch {
      return false;
    }
  }

  /**
   * Upload a file (PUT).
   */
  async uploadFile(path: string, content: Blob | string): Promise<boolean> {
    const res = await this.request(path, 'PUT', content, {
      'Content-Type': content instanceof Blob ? content.type : 'application/octet-stream',
    });
    return res.ok || res.status === 201 || res.status === 204;
  }

  /**
   * Download a file (GET).
   */
  async downloadFile(path: string): Promise<Blob> {
    const res = await this.request(path, 'GET');
    if (!res.ok) {
      throw new Error(`Failed to download file: ${res.statusText}`);
    }
    return res.blob();
  }

  /**
   * Delete a file or directory (DELETE).
   */
  async deleteFile(path: string): Promise<boolean> {
    const res = await this.request(path, 'DELETE');
    return res.ok || res.status === 204;
  }

  /**
   * List files in a folder (PROPFIND).
   * Parses the XML responses to retrieve file metadata.
   */
  async listFiles(path: string = ''): Promise<WebDAVFile[]> {
    const res = await this.request(path, 'PROPFIND', undefined, {
      Depth: '1',
    });

    if (!res.ok && res.status !== 207) {
      throw new Error(`Failed to list files: ${res.statusText}`);
    }

    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // WebDAV namespace can vary, so we select response elements generically or match localName
    const responses = Array.from(xmlDoc.getElementsByTagNameNS('*', 'response'));
    const files: WebDAVFile[] = [];

    // The first response is usually the queried directory itself, so we skip it or filter it out
    const rootPath = new URL(this.url).pathname;

    for (const response of responses) {
      const hrefEl = response.getElementsByTagNameNS('*', 'href')[0];
      if (!hrefEl || !hrefEl.textContent) continue;

      const href = decodeURIComponent(hrefEl.textContent);
      
      // Extract file name
      const name = href.split('/').filter(Boolean).pop() || '';
      if (!name) continue;

      // Skip the root folder itself
      const cleanHref = href.endsWith('/') ? href : `${href}/`;
      const cleanRootPath = rootPath.endsWith('/') ? rootPath : `${rootPath}/`;
      if (cleanHref === cleanRootPath || href === path) continue;

      // Get properties
      const propstat = response.getElementsByTagNameNS('*', 'propstat')[0];
      if (!propstat) continue;

      const prop = propstat.getElementsByTagNameNS('*', 'prop')[0];
      if (!prop) continue;

      const isDirectory = prop.getElementsByTagNameNS('*', 'collection').length > 0 || href.endsWith('/');
      
      const getcontentlength = prop.getElementsByTagNameNS('*', 'getcontentlength')[0]?.textContent;
      const size = getcontentlength ? parseInt(getcontentlength, 10) : 0;

      const getlastmodified = prop.getElementsByTagNameNS('*', 'getlastmodified')[0]?.textContent;
      const lastModified = getlastmodified ? new Date(getlastmodified) : new Date();

      files.push({
        name,
        path: href.replace(rootPath, ''),
        isDirectory,
        size,
        lastModified,
      });
    }

    return files;
  }
}
