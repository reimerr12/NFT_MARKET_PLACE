import axios from "axios";
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_BASE_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs';

class PinataService{
    constructor(){
    if(!PINATA_API_KEY || !PINATA_SECRET_API_KEY || !PINATA_JWT){
        throw new Error("Pinata environment variables are required. Please check REACT_APP_PINATA_API_KEY, REACT_APP_PINATA_SECRET_API_KEY, and REACT_APP_PINATA_JWT");
    }

    //axios instance
    this.api = axios.create({
        baseURL : PINATA_BASE_URL,
        headers:{
            'pinata_api_key':PINATA_API_KEY,
            "pinata_secret_api_key":PINATA_SECRET_API_KEY,
            'Authorization':`Bearer ${PINATA_JWT}`
        }
    });
}

    //test authentication
    async testAuthentication(){
        try {
            const response = await this.api.get('data/testAuthentication');
            return response.data;
        } catch (error) {
            console.error("pinata authentication failed",error);
            throw new Error("'Failed to authenticate with Pinata'");
        }
    }

    //uplead file to ipfs
    async uploadFile(file,options={}){
        try {

            //check file validity and size
            const maxSize = 10 * 1024 * 1024;
            if(file.size > maxSize){
                throw new Error(`File size exceeds 10MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
            }

            if(file.type && file.type.startsWith('image/')){
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
                if(!allowedTypes.includes(file.type)){
                    throw new Error(`Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, GIF, WebP, SVG`);
                }
            }

            const formData = new FormData();
            formData.append('file',file);

            //add metadata if provided
            if(options.pinataMetadata){
                formData.append('pinataMetadata',JSON.stringify(options.pinataMetadata));
            }

            //add pin options if provided
            if(options.pinataOptions){
                formData.append('pinataOptions',JSON.stringify(options.pinataOptions));
            }

            const response = await this.api.post('/pinning/pinFileToIPFS',formData,{
                headers:{
                    'Content-Type' : 'multipart/form-data'
                },
                maxContentLength : Infinity,
                maxBodyLength : Infinity
            });

            return{
                success:true,
                ipfsHash:response.data.IpfsHash,
                pinSize:response.data.PinSize,
                timestamp:response.data.Timestamp,
                gatewayUrl:`${PINATA_GATEWAY_URL}/${response.data.IpfsHash}`,
            }

        } catch (error) {
            console.error("file upload failed",error);
            throw new Error(`Failed to upload file: ${error.response?.data?.error || error.message}`);
        }
    }

    //upload JSON metadata to ipfs
    async uploadJSON(jsonData,options={}){
        try {
            const data ={
                pinataContent : jsonData,
                pinataMetadata : options.pinataMetadata || {
                    name:'NFT Metadata',
                },
                pinataOptions : options.pinataOptions || {
                    cidVersion : 1
                },
            };

            const response = await this.api.post('/pinning/pinJSONToIpfs',data,{
                headers:{
                    'Content-Type' : 'application/json'
                }
            });

            return{
                success:true,
                ipfsHash:response.data.IpfsHash,
                pinSize:response.data.PinSize,
                timestamp:response.data.Timestamp,
                gatewayUrl:`${PINATA_GATEWAY_URL}/${response.data.IpfsHash}`
            }
        } catch (error) {
            console.error("failed to upload json",error);
            throw new Error(`Failed to upload JSON: ${error.response?.data?.error || error.message}`);
        }
    }

    //upload NFT with image and metadata
    async uploadNFT(imageFile,metadata){
        try {

            if(!imageFile || !imageFile.type || !imageFile.type.startsWith('image/')){
                throw new Error('please neter a valid image file');
            }

            const maxSize = 10 * 1024 * 1024;

            if(imageFile.size > maxSize){
                throw new Error(`Image size exceeds 10MB limit. Current size: ${(imageFile.size / (1024 * 1024)).toFixed(2)}MB`);
            }
            
            //upload image
            console.log("uploading image to IPFS...");
            const imageResult = await this.uploadFile(imageFile , {
                pinataMetadata:{
                    name:`NFT-Image - ${metadata.name || 'untitled'}`,
                },
            });

            //create metadata with imageUrl
            const nftMetadata = {
                ...metadata,
                image : `ipfs://${imageResult.ipfsHash}`,
                imageGatewayUrl : imageResult.gatewayUrl,
            };

            //upload metedata
            console.log("uploading metadata to IPFS...");
            const metadataResult = await this.uploadJSON(nftMetadata,{
                pinataMetadata : {
                    name: `NFT Metadata - ${metadata.name || 'untitled'}`,
                },
            }); 

            return{
                success:true,
                image:{
                    ipfsHash : imageResult.ipfsHash,
                    gatewayUrl : imageResult.gatewayUrl,
                },
                metadata:{
                    ipfsHash : metadataResult.ipfsHash,
                    gatewayUrl : metadataResult.gatewayUrl,
                    tokenURI : `ipfs://${metadataResult.ipfsHash}`,
                },
                fullMetadata:nftMetadata,
            }
        } catch (error) {
            console.error("failed to upload nft",error);
            throw error;
        }
    }   

    //get pinned files
    async getPinnedFiles(options={}){
        try {

            const params ={
                status: 'pinned',
                pageLimit : options.pageLimit || 10,
                pageOffset : options.pageOffset || 0,
            }

            if(options.metadata){
                params.metadata = JSON.stringify(options.metadata);
            }

            const response = await this.api.get('/data/pinList', { params });
            return response.data;
        } catch (error) {
            console.error('Failed to get pinned files:', error);
            throw new Error('Failed to retrieve pinned files');
        }
    }

    //unpin file
    async unpinFile(ipfsHash){
        try{
            const response = await this.api.delete(`/pinning/unpin/${ipfsHash}`);
            return response.data;
        }catch(error){
            console.error('Failed to unpin file:', error);
            throw new Error('Failed to unpin file');
        }
    }

    //helps to format file sizes
    formatFileSize(bytes){
        if(bytes === 0) return '0 bytes';
        const k = 1024;
        const sizes =['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes)/Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    //helps to validate image size
    validateImageFile(file){
        if(!file){
            throw new Error('No file provided');
        }

        if(!(file instanceof File)){
            throw new Error("Please provide a valid file");
        }

        const maxSize = 10 * 1024 * 1024;
        if(file.size > maxSize){
            throw new Error(`Image size exceeds 10MB limit. Current size: ${this.formatFileSize(file.size)}`);
        }

        // More robust MIME type checking
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if(!file.type || !allowedTypes.includes(file.type.toLowerCase())){
            throw new Error(`Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, GIF, WebP, SVG`);
        }

        return true;
    }

    //get ipfs gatewayUrl
    getGatewayUrl(ipfsHash){
        return `${PINATA_GATEWAY_URL}/${ipfsHash}`;
    }

    //extract ipfs hash from various formats
    extractIPFSHash(uri) {
        if (uri.startsWith('ipfs://')) {
        return uri.replace('ipfs://', '');
        }
        if (uri.includes('/ipfs/')) {
        return uri.split('/ipfs/')[1];
        }
        return uri;
    }

    // Convert IPFS URI to gateway URL
    ipfsToGateway(ipfsUri) {
        const hash = this.extractIPFSHash(ipfsUri);
        return this.getGatewayUrl(hash);
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
} = pinataService;