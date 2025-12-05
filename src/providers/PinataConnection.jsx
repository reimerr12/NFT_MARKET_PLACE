import axios from "axios";

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_BASE_URL = 'https://api.pinata.cloud';


const PINATA_GATEWAY_URL = import.meta.env.VITE_PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';

// Fallback 
const IPFS_GATEWAYS = [
    PINATA_GATEWAY_URL,
    'https://ipfs.io/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://dweb.link/ipfs'
];

class PinataService {
    constructor() {
        if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY || !PINATA_JWT) {
            throw new Error("Pinata environment variables are required. Please check VITE_PINATA_API_KEY, VITE_PINATA_SECRET_API_KEY, and VITE_PINATA_JWT");
        }

        
        this.api = axios.create({
            baseURL: PINATA_BASE_URL,
            headers: {
                'pinata_api_key': PINATA_API_KEY,
                "pinata_secret_api_key": PINATA_SECRET_API_KEY,
                'Authorization': `Bearer ${PINATA_JWT}`
            }
        });

   
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.requestDelay = 500; 
        this.maxRetries = 3;
        this.metadataCache = new Map();
    }

    // Test authentication
    async testAuthentication() {
        try {
            const response = await this.api.get('data/testAuthentication');
            console.log('Pinata authentication successful');
            return response.data;
        } catch (error) {
            console.error("Pinata authentication failed", error);
            throw new Error("Failed to authenticate with Pinata");
        }
    }


    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    async fetchWithFallback(ipfsHash, retryCount = 0) {
        // Check cache first
        const cacheKey = `ipfs://${ipfsHash}`;
        if (this.metadataCache.has(cacheKey)) {
            console.log(`Cache hit for ${ipfsHash.substring(0, 8)}...`);
            return this.metadataCache.get(cacheKey);
        }

        for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
            const gateway = IPFS_GATEWAYS[i];
            const url = `${gateway}/${ipfsHash}`;
            
            try {
                console.log(`Attempting to fetch from gateway ${i + 1}/${IPFS_GATEWAYS.length}: ${gateway}`);
                
                const response = await axios.get(url, {
                    timeout: 10000, // 10 second timeout
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.status === 200 && response.data) {
                    console.log(`Successfully fetched from ${gateway}`);
                    // Cache the result
                    this.metadataCache.set(cacheKey, response.data);
                    return response.data;
                }
            } catch (error) {
                console.warn(`Gateway ${gateway} failed:`, error.message);
                

                if (error.response?.status === 429 && retryCount < this.maxRetries) {
                    const waitTime = Math.pow(2, retryCount) * 1000; 
                    console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
                    await this.delay(waitTime);
                    return this.fetchWithFallback(ipfsHash, retryCount + 1);
                }
                

                continue;
            }
        }

        throw new Error(`Failed to fetch from all ${IPFS_GATEWAYS.length} gateways for hash: ${ipfsHash}`);
    }

    // Queue-based fetch to prevent rate limiting
    async queuedFetch(ipfsHash) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ ipfsHash, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const { ipfsHash, resolve, reject } = this.requestQueue.shift();
            
            try {
                const data = await this.fetchWithFallback(ipfsHash);
                resolve(data);
            } catch (error) {
                reject(error);
            }

            // Wait before processing next request
            if (this.requestQueue.length > 0) {
                await this.delay(this.requestDelay);
            }
        }

        this.isProcessingQueue = false;
    }

    // Batch fetch multiple IPFS hashes with throttling
    async batchFetchMetadata(ipfsHashes, batchSize = 3) {
        console.log(`Batch fetching ${ipfsHashes.length} items (batch size: ${batchSize})`);
        const results = [];
        
        for (let i = 0; i < ipfsHashes.length; i += batchSize) {
            const batch = ipfsHashes.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ipfsHashes.length / batchSize)}`);
            
            const batchPromises = batch.map(hash => 
                this.queuedFetch(hash)
                    .catch(err => {
                        console.error(`Failed to fetch ${hash.substring(0, 8)}...:`, err.message);
                        return null;
                    })
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Wait between batches (except for last batch)
            if (i + batchSize < ipfsHashes.length) {
                await this.delay(1000);
            }
        }
        
        const successCount = results.filter(r => r !== null).length;
        console.log(`Successfully fetched ${successCount}/${ipfsHashes.length} items`);
        
        return results;
    }

    // Upload file to IPFS
    async uploadFile(file, options = {}) {
        try {
            // Check file validity and size
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error(`File size exceeds 10MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
            }

            if (file.type && file.type.startsWith('image/')) {
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
                if (!allowedTypes.includes(file.type)) {
                    throw new Error(`Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, GIF, WebP, SVG`);
                }
            }

            const formData = new FormData();
            formData.append('file', file);

            // Add metadata if provided
            if (options.pinataMetadata) {
                formData.append('pinataMetadata', JSON.stringify(options.pinataMetadata));
            }

            // Add pin options if provided
            if (options.pinataOptions) {
                formData.append('pinataOptions', JSON.stringify(options.pinataOptions));
            }

            console.log('Uploading file to Pinata...');
            const response = await this.api.post('/pinning/pinFileToIPFS', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            return {
                success: true,
                ipfsHash: response.data.IpfsHash,
                pinSize: response.data.PinSize,
                timestamp: response.data.Timestamp,
                gatewayUrl: `${PINATA_GATEWAY_URL}/${response.data.IpfsHash}`,
            };

        } catch (error) {
            console.error("File upload failed", error);
            throw new Error(`Failed to upload file: ${error.response?.data?.error || error.message}`);
        }
    }

    // Upload JSON metadata to IPFS
    async uploadJSON(jsonData, options = {}) {
        try {
            const data = {
                pinataContent: jsonData,
                pinataMetadata: options.pinataMetadata || {
                    name: 'NFT Metadata',
                },
                pinataOptions: options.pinataOptions || {
                    cidVersion: 1
                },
            };

            console.log('Uploading JSON to Pinata...');
            const response = await this.api.post('/pinning/pinJSONToIPFS', data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: true,
                ipfsHash: response.data.IpfsHash,
                pinSize: response.data.PinSize,
                timestamp: response.data.Timestamp,
                gatewayUrl: `${PINATA_GATEWAY_URL}/${response.data.IpfsHash}`
            };
        } catch (error) {
            console.error("Failed to upload JSON", error);
            throw new Error(`Failed to upload JSON: ${error.response?.data?.error || error.message}`);
        }
    }

    // Upload NFT with image and metadata
    async uploadNFT(imageFile, metadata) {
        try {
            if (!imageFile || !imageFile.type || !imageFile.type.startsWith('image/')) {
                throw new Error('Please enter a valid image file');
            }

            const maxSize = 10 * 1024 * 1024;
            if (imageFile.size > maxSize) {
                throw new Error(`Image size exceeds 10MB limit. Current size: ${(imageFile.size / (1024 * 1024)).toFixed(2)}MB`);
            }
            
            // Upload image
            console.log("Uploading image to IPFS...");
            const imageResult = await this.uploadFile(imageFile, {
                pinataMetadata: {
                    name: `NFT-Image - ${metadata.name || 'untitled'}`,
                },
            });

            // Create metadata with imageUrl
            const nftMetadata = {
                ...metadata,
                image: `ipfs://${imageResult.ipfsHash}`,
                imageGatewayUrl: imageResult.gatewayUrl,
            };

            // Upload metadata
            console.log("Uploading metadata to IPFS...");
            const metadataResult = await this.uploadJSON(nftMetadata, {
                pinataMetadata: {
                    name: `NFT Metadata - ${metadata.name || 'untitled'}`,
                },
            }); 

            return {
                success: true,
                image: {
                    ipfsHash: imageResult.ipfsHash,
                    gatewayUrl: imageResult.gatewayUrl,
                },
                metadata: {
                    ipfsHash: metadataResult.ipfsHash,
                    gatewayUrl: metadataResult.gatewayUrl,
                    tokenURI: `ipfs://${metadataResult.ipfsHash}`,
                },
                fullMetadata: nftMetadata,
            };
        } catch (error) {
            console.error("Failed to upload NFT", error);
            throw error;
        }
    }   

    // Get pinned files
    async getPinnedFiles(options = {}) {
        try {
            const params = {
                status: 'pinned',
                pageLimit: options.pageLimit || 10,
                pageOffset: options.pageOffset || 0,
            };

            if (options.metadata) {
                params.metadata = JSON.stringify(options.metadata);
            }

            const response = await this.api.get('/data/pinList', { params });
            return response.data;
        } catch (error) {
            console.error('Failed to get pinned files:', error);
            throw new Error('Failed to retrieve pinned files');
        }
    }

    // Unpin file
    async unpinFile(ipfsHash) {
        try {
            const response = await this.api.delete(`/pinning/unpin/${ipfsHash}`);
            return response.data;
        } catch (error) {
            console.error('Failed to unpin file:', error);
            throw new Error('Failed to unpin file');
        }
    }

    // Clear metadata cache
    clearCache() {
        this.metadataCache.clear();
        console.log('Metadata cache cleared');
    }

    // Format file sizes
    formatFileSize(bytes) {
        if (bytes === 0) return '0 bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Validate image file
    validateImageFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        if (!(file instanceof File)) {
            throw new Error("Please provide a valid file");
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error(`Image size exceeds 10MB limit. Current size: ${this.formatFileSize(file.size)}`);
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
            throw new Error(`Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, GIF, WebP, SVG`);
        }

        return true;
    }

    // Get IPFS gateway URL (use ipfs.io to avoid rate limits on images)
    getGatewayUrl(ipfsHash) {
        // Use ipfs.io instead of Pinata for better reliability
        return `https://ipfs.io/ipfs/${ipfsHash}`;
    }

    // Extract IPFS hash from various formats
    extractIPFSHash(uri) {
        if (uri.startsWith('ipfs://')) {
            return uri.replace('ipfs://', '');
        }
        if (uri.includes('/ipfs/')) {
            return uri.split('/ipfs/')[1];
        }
        return uri;
    }

    // Convert IPFS URI to gateway URL (use ipfs.io for reliability)
    ipfsToGateway(ipfsUri) {
        const hash = this.extractIPFSHash(ipfsUri);

        return `https://ipfs.io/ipfs/${hash}`;
    }
}

const pinataService = new PinataService();

export default pinataService;

export const {
    testAuthentication,
    uploadFile,
    uploadJSON,
    uploadNFT,
    getPinnedFiles,
    unpinFile,
    getGatewayUrl,
    extractIPFSHash,
    ipfsToGateway,
    queuedFetch,
    batchFetchMetadata,
    clearCache,
} = pinataService;