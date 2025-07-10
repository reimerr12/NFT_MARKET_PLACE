import { useState } from "react";
import { X, Image, Info, DollarSign, Loader2, CheckCircle, AlertCircle ,Plus} from 'lucide-react';

const MintNFTModal=({isOpen,onClose,onMint,txError,txLoading})=>{
    const[imageFile,setImageFile] = useState(null);
    const[name,setName] = useState('');
    const[description,setDescription] = useState('');
    const[royaltyBps,setRoyaltyBps] = useState('');
    const[mintStatus,setMintStatus] = useState(null);

    const resetForm =()=>{
        setImageFile(null);
        setName('');
        setDescription('');
        setRoyaltyBps('');
        setMintStatus(null);
    }

    const handleClose=()=>{
        resetForm();
        onClose();
    }

    const handleSubmit=async(e)=>{
        e.preventDefault();
        setMintStatus('pending');
        try {
            if(!imageFile || !name || !description || royaltyBps === ''){
                throw new Error("All fields are required.");
            }

            const metadata = {name,description};

            await onMint(imageFile,name,royaltyBps);

            setMintStatus('success');
            setTimeout(handleClose,2000);

        } catch (error) {
            console.error("Minting submission error:", error);
            setMintStatus('error');
        }
    }

    if(!isOpen) return null;

    return(
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-[#202225] rounded-xl shadow-2xl w-full max-w-md p-6 relative transform scale-95 animate-scale-in border border-[#34373B]">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors duration-200 rounded-full p-1 hover:bg-[#34373B]"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6 text-center">Mint New NFT</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="image" className="block text-sm font-medium text-gray-300 mb-2">
                    NFT Image
                    </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[#474A50] border-dashed rounded-md cursor-pointer hover:border-blue-500 transition-colors duration-200">
                        <label htmlFor="image-upload" className="relative cursor-pointer bg-[#202225] rounded-md font-medium text-blue-400 hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <input
                            id="image-upload"
                            name="image-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files[0])}
                            />
                            <div className="text-center">
                            {imageFile ? (
                                <img
                                src={URL.createObjectURL(imageFile)}
                                alt="Selected NFT"
                                className="mx-auto h-24 w-24 object-cover rounded-md mb-2 shadow-sm"
                                />
                            ) : (
                                <Image className="mx-auto h-12 w-12 text-gray-500" />
                            )}
                            <p className="mt-1 text-sm text-gray-400">
                                {imageFile ? imageFile.name : 'Drag and drop or click to upload'}
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                            </div>
                        </label>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Name <span className="text-red-500">*</span>
                        </label>
                        <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full px-4 py-2 border border-[#474A50] rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-[#34373B] text-white placeholder-gray-400 transition-colors duration-200"
                        placeholder="e.g. 'Awesome Digital Art'"
                        required
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                        Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="3"
                        className="mt-1 block w-full px-4 py-2 border border-[#474A50] rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-[#34373B] text-white placeholder-gray-400 transition-colors duration-200"
                        placeholder="Tell us about your NFT"
                        required
                        ></textarea>
                    </div>

                    <div>
                        <label htmlFor="royalty" className="block text-sm font-medium text-gray-300 mb-2">
                        Royalty Percentage (BPS) <span className="text-red-500">*</span>
                        <span className="text-gray-400 ml-2 text-xs">(100 BPS = 1%)</span>
                        </label>
                        <input
                        type="number"
                        id="royalty"
                        value={royaltyBps}
                        onChange={(e) => setRoyaltyBps(e.target.value)}
                        min="0"
                        max="10000"
                        step="1"
                        className="mt-1 block w-full px-4 py-2 border border-[#474A50] rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-[#34373B] text-white placeholder-gray-400 transition-colors duration-200"
                        placeholder="e.g. 250 (for 2.5%)"
                        required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={txLoading || mintStatus === 'pending'}
                        className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {txLoading || mintStatus === 'pending' ? (
                        <Loader2 className="animate-spin h-5 w-5 mr-3" />
                        ) : (
                        <Plus className="h-5 w-5 mr-3" />
                        )}
                        {txLoading || mintStatus === 'pending' ? 'Minting NFT...' : 'Mint NFT'}
                    </button>

                    {mintStatus === 'success' && (
                        <div className="mt-4 flex items-center justify-center text-green-400">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span>NFT Minted Successfully!</span>
                        </div>
                    )}

                    {(mintStatus === 'error' || txError) && (
                        <div className="mt-4 flex items-center justify-center text-red-500">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span>Minting Failed: {txError || 'Please try again.'}</span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}   
export default MintNFTModal;