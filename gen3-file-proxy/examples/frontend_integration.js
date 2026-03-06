"""Example frontend integration code.

This file shows how to integrate the Gen3 File Proxy service
from a JavaScript/TypeScript frontend application.
"""

// TypeScript/JavaScript Example

/**
 * Gen3 File Proxy Client
 */
class Gen3FileProxyClient {
  constructor(baseUrl, getToken) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.getToken = getToken; // Function that returns user's Gen3 token
  }

  /**
   * Download a file by ID
   * @param {string} fileId - Gen3 file GUID/DID
   * @param {string} filename - Optional filename for download
   * @returns {Promise<void>}
   */
  async downloadFile(fileId, filename = null) {
    const token = await this.getToken();
    
    const response = await fetch(`${this.baseUrl}/api/files/${fileId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Correlation-ID': this.generateCorrelationId()
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Download failed: ${response.statusText}`);
    }

    // Get filename from Content-Disposition header or use provided/fileId
    const disposition = response.headers.get('content-disposition');
    const downloadFilename = filename || 
      this.parseFilename(disposition) || 
      fileId;

    // Create blob and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get file metadata without downloading
   * @param {string} fileId - Gen3 file GUID/DID
   * @returns {Promise<Object>} File metadata from headers
   */
  async getFileMetadata(fileId) {
    const token = await this.getToken();
    
    const response = await fetch(`${this.baseUrl}/api/files/${fileId}`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get file metadata: ${response.statusText}`);
    }

    return {
      size: parseInt(response.headers.get('content-length')) || null,
      contentType: response.headers.get('content-type'),
      filename: this.parseFilename(response.headers.get('content-disposition'))
    };
  }

  /**
   * Stream file with progress tracking
   * @param {string} fileId - Gen3 file GUID/DID
   * @param {Function} onProgress - Callback with (loaded, total) bytes
   * @returns {Promise<Blob>}
   */
  async streamFileWithProgress(fileId, onProgress) {
    const token = await this.getToken();
    
    const response = await fetch(`${this.baseUrl}/api/files/${fileId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    let loaded = 0;

    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      loaded += value.length;
      
      if (onProgress) {
        onProgress(loaded, total);
      }
    }

    return new Blob(chunks);
  }

  /**
   * Check service health
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return await response.json();
  }

  /**
   * Parse filename from Content-Disposition header
   * @private
   */
  parseFilename(disposition) {
    if (!disposition) return null;
    
    const filenameMatch = disposition.match(/filename="?(.+?)"?$/);
    return filenameMatch ? filenameMatch[1] : null;
  }

  /**
   * Generate correlation ID for request tracking
   * @private
   */
  generateCorrelationId() {
    return `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Usage Example 1: Simple download
const client = new Gen3FileProxyClient(
  'http://localhost:8000',
  () => localStorage.getItem('gen3_token') // Or from your auth system
);

async function downloadMyFile() {
  try {
    await client.downloadFile('dg.1234/abc-def-ghi', 'myfile.dat');
    console.log('Download complete!');
  } catch (error) {
    console.error('Download failed:', error);
  }
}

// Usage Example 2: Check file size before downloading
async function checkBeforeDownload(fileId) {
  try {
    const metadata = await client.getFileMetadata(fileId);
    
    const sizeMB = (metadata.size / (1024 * 1024)).toFixed(2);
    const confirmed = confirm(`This file is ${sizeMB} MB. Continue download?`);
    
    if (confirmed) {
      await client.downloadFile(fileId);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Usage Example 3: Download with progress bar
async function downloadWithProgress(fileId) {
  const progressBar = document.getElementById('progress');
  
  try {
    const blob = await client.streamFileWithProgress(
      fileId,
      (loaded, total) => {
        const percent = (loaded / total * 100).toFixed(1);
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent}%`;
      }
    );
    
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileId;
    a.click();
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Download failed:', error);
  }
}

// Usage Example 4: React Hook
function useGen3FileDownload() {
  const [downloading, setDownloading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState(null);

  const downloadFile = async (fileId, filename) => {
    setDownloading(true);
    setError(null);
    setProgress(0);

    try {
      await client.streamFileWithProgress(
        fileId,
        (loaded, total) => {
          setProgress((loaded / total) * 100);
        }
      ).then(blob => {
        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || fileId;
        a.click();
        window.URL.revokeObjectURL(url);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return { downloadFile, downloading, progress, error };
}

// React Component Example
function FileDownloadButton({ fileId, filename }) {
  const { downloadFile, downloading, progress, error } = useGen3FileDownload();

  return (
    <div>
      <button 
        onClick={() => downloadFile(fileId, filename)}
        disabled={downloading}
      >
        {downloading ? `Downloading... ${progress.toFixed(1)}%` : 'Download'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
