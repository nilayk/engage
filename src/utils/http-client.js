/**
 * Shared HTTP client utilities
 * Reduces code duplication for HTTP/HTTPS requests
 */

const https = require('https');
const http = require('http');

/**
 * Get the appropriate protocol module for a URL
 * @param {string} url - The URL to check
 * @returns {Object} http or https module
 */
function getProtocol(url) {
  const parsedUrl = new URL(url);
  return parsedUrl.protocol === 'https:' ? https : http;
}

/**
 * Make an HTTP GET request
 * @param {string} url - URL to fetch
 * @param {Object} options - Request options
 * @returns {Promise<{data: string, statusCode: number, headers: Object}>}
 */
function get(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = getProtocol(url);
    
    const request = protocol.get(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve({
          data,
          statusCode: response.statusCode,
          headers: response.headers,
        });
      });
    });

    request.on('error', reject);
    
    if (options.timeout) {
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    }
  });
}

/**
 * Make an HTTP POST request with JSON body
 * @param {string} url - URL to post to
 * @param {Object} body - JSON body to send
 * @param {Object} options - Additional request options
 * @returns {Promise<{data: Object, statusCode: number}>}
 */
function postJSON(url, body, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = getProtocol(url);
    const postData = JSON.stringify(body);
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      ...options,
    };

    const request = protocol.request(url, requestOptions, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ data: parsed, statusCode: response.statusCode });
        } catch (e) {
          resolve({ data, statusCode: response.statusCode });
        }
      });
    });

    request.on('error', reject);
    
    if (options.timeout) {
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    }

    request.write(postData);
    request.end();
  });
}

module.exports = {
  get,
  postJSON,
  getProtocol,
};

