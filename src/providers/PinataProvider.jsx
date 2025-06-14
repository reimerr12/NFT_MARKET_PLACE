import { useState,useCallback } from "react";
import axios from "axios";
import { use } from "react";

//pinata configuration
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_PIN_FILE_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_PIN_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs/';

export const usePinata =()=>{
    const[uploading,setUploading] = useState(false);
    const[uploadProgress,setUploadProgress] = useState(0);

    const uploadToIpfs = useCallback(async(file,options={})=>{
        try {
            setUploading(true);
            setUploadProgress(0);

            if(!file){
                throw new Error("no file provided");
            };

            if(options.allowedTypes && !options.allowedTypes.includes(file.type)){
                throw new Error(`file type of ${file.type} not supported`);
            };

            if(options.maxSize && file.size > options.maxSize){
                throw new Error(`file size exceeds maximum of ${options.maxSize} bytes`);
            };

            const formData = new FormData();
            formData.append('file',file);

            const metaData = {
                mame:options.name || file.name,
                keyvalues:options.keyvalues || {}
            };
            formData.append('pinataMetadata',JSON.stringify(metaData));

            const pinataOptions = {
                cidVersion : options.cidVersion || 1,
                ...options.pinataOptions
            };
            formData.append('pinataOptions',JSON.stringify(pinataOptions));

            const headers = {
                'Content-Type' : 'multipart/form-data',
            };

            if(PINATA_JWT){
                headers.Authorization =`Bearer${PINATA_JWT}`;
            }
            else if(PINATA_API_KEY && PINATA_SECRET_API_KEY){
                headers.pinata_api_key = PINATA_API_KEY,
                headers.pinata_secret_api_key = PINATA_SECRET_API_KEY
            }
            else{
                throw new Error('Pinata API credentials not configured');
            }

            const response = await axios.post(PINATA_PIN_FILE_URL,formData,{
                headers,
                onUploadProgress :(ProgressEvent)=>{
                    const progress = Math.round((ProgressEvent.loaded * 100)/ProgressEvent.total);
                    setUploadProgress(progress);
                }
            });

            return{
                success:true,
                ipfsHash:response.data.ipfsHash,
                pinSize:response.data.pinSize,
                timestamp:response.data.timestamp,
                url: `${PINATA_GATEWAY_URL}${response.data.IpfsHash}`,
                gatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
            }

        } catch (error) {
            console.error("error uploading file to ipfs",error);
            return{
                success:false,
                error:error.response?.data?.error || error.message
            }
        }
        finally{
            setUploading(false);
            setUploadProgress(0);
        }
    },[]);

    const uploadJSONtoIpfs = useCallback(async(jsonData,options={})=>{
        try {
            setUploading(true);

            if(!jsonData){
                throw new Error("No JSON data provided");
            }

            const data ={
                    pinataContent : jsonData,
                    pinataMetaData:{
                        name:options.name || 'NFT MetaData',
                        keyvalues:options.keyvalues || {}
                    },

                    pinataOptions:{
                        cidVersion:options.cidVersion || 1,
                        ...options.pinataOptions
                    },
                };

            const headers = {
                'Content-Type' : 'application/json',
            };

            if(PINATA_JWT){
                headers.Authorization = `Bearer ${PINATA_JWT}`;
            }
            else if(PINATA_API_KEY && PINATA_SECRET_API_KEY){
                headers.pinata_api_key = PINATA_API_KEY;
                headers.pinata_secret_api_key = PINATA_SECRET_API_KEY;
            }else{
                throw new Error('Pinata API credentials not configured');
            }

            const response = await axios.post(PINATA_PIN_JSON_URL,data,{headers});

            return{
                success:true,
                ipfsHash:response.data.IpfsHash,
                pinSize:response.data.PinSize,
                timestamp:response.data.Timestamp,
                url: `${PINATA_GATEWAY_URL}${response.data.IpfsHash}`,
                gatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
            };
        } catch (error) {
            console.error('Error uploading JSON to IPFS:', error);
            return{
                success:false,
                error:error.response?.data?.error || error.message,
            }
        }finally{
            setUploading(false);
        }
    },[]);

    const createAndUploadNFTMetadata = useCallback(async(nftData)=>{
        try {
            const {
                name,
                description,
                imageFile,
                attributes=[],
                externalUrl='',
                animationUrl='',
                backgroundColor='',
            } = nftData;

            if(!name || !description || !imageFile){
                throw new Error('Name, description, and image file are required');
            }

            const imageUpload = await uploadToIpfs(imageFile,{
                name:`${name}_image`,
                allowedTypes:['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'],
                maxSize:10 * 1024 * 1024,
                keyValues:{
                    type:"nft_image",
                    nft_name:name
                }
            });

            if(!imageUpload.success){
                throw new Error(`image upload failed ${imageUpload.error}`);
            }

            const metadata = {
                name,
                description,
                image:imageUpload.url,
                external_url:externalUrl,
                attributes:attributes.map(attr =>({
                    trait_type:attr.trait_type,
                    value:attr.value,
                    ...(attr.display_type && {display_type : attr.display_type})
                }))
            };

            if(animationUrl) metadata.animation_url = animationUrl;
            if(backgroundColor) metadata.background_color = backgroundColor;

        } catch (error) {
            
        }
    })
}