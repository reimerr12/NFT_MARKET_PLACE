import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Grid3x3, ShoppingCart, Search, Filter, SortAsc, DollarSign, AlertCircle, TrendingUp, Eye, Loader2, Wallet, ChevronLeft, ChevronRight, Menu, X, Settings, Heart, Star, Clock, Tag, Activity, BarChart3, PieChart, Sparkles, Zap, Globe, Users, Flame, TrendingDown, Calendar, RefreshCw, Download, Share2, Bookmark, Grid, List, MoreVertical, ArrowUpDown, SlidersHorizontal, Layers, Image, Trophy, Target } from "lucide-react";
import { SiEthereum } from "react-icons/si";
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils";
import useNFT from "../providers/NFTProvider";
import NFTCard from "../components/NFTcard";
import MosaicNFTCard from "../components/MosaicNFTCard";
import { useWeb3 } from "../providers/Web3Provider";

const DEFAULT_ITEMS_PER_PAGE = 25;
const ITEMS_PER_PAGE_OPTIONS = [25, 35, 45, 55];

const Marketplace = () => {
    const { isConnected, account, provider } = useWeb3();
    const {
        loading: txLoading,
        error: txError,
        buyNFT,
        placeBid,
        getActiveListings,
        getActiveAuctions,
        getNftInfo,
        batchGetNFTMetadata, 
        finalizeAuction,
        cancelAuction,
        cancelListing,
        setError,
        subscribeToMarketPlaceEvents,
    } = useNFT();

    const [allMarketplaceNfts, setAllMarketplaceNfts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('mosaic');
    const [sideBarOpen, setSideBarOpen] = useState(false);
    const [filters, setFilters] = useState({
        priceRange: { min: '', max: '' },
        status: 'all'
    });
    const [dataLoading, setDataLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, sortBy, itemsPerPage, filters]);

    // Forced blockchain sync function
    const forceBlockchainSync = useCallback(async () => {
        if (!window.ethereum) return false;
        
        try {
            console.log("Forcing blockchain sync...");
            
            try {
                await window.ethereum.request({
                    method: 'wallet_requestPermissions',
                    params: [{ eth_accounts: {} }]
                });
            } catch (error) {
                console.log("Permission refresh skipped or failed");
            }

            await window.ethereum.request({
                method: 'eth_blockNumber',
                params: []
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            return true;
        } catch (error) {
            console.error("Forced sync failed:", error);
            return false;
        }
    }, []);

    // Main loading function with improved sync handling
    const loadMarketplaceNftData = useCallback(async (forceSync = false) => {
        try {
            setDataLoading(true);
            setError(null);

            console.log('Loading marketplace data...');

            // Force blockchain sync if requested
            if (forceSync) {
                await forceBlockchainSync();
            }

            // Step 1: Get active listings and auctions from blockchain
            const [activeListings, activeAuctions] = await Promise.all([
                getActiveListings(forceSync),
                getActiveAuctions(forceSync)
            ]);

            
            const allTokenIds = [...new Set([...activeListings, ...activeAuctions])];

            if (allTokenIds.length === 0) {
                console.log('No NFTs found in marketplace');
                setAllMarketplaceNfts([]);
                return;
            }

            
            const nftsWithMetadata = await batchGetNFTMetadata(allTokenIds, 3);

          
            const nftsWithMarketInfo = await Promise.all(
                nftsWithMetadata.map(async (nft) => {
                    if (nft.error) {
                        return null;
                    }

                    try {
                        const marketInfo = await getNftInfo(nft.tokenId, forceSync);
                        return {
                            tokenId: nft.tokenId,
                            metadata: {
                                name: nft.name,
                                description: nft.description,
                                image: nft.image,
                                imageGatewayUrl: nft.imageGatewayUrl,
                                ...nft
                            },
                            info: marketInfo,
                            isListed: activeListings.includes(nft.tokenId),
                            isAuctioned: activeAuctions.includes(nft.tokenId)
                        };
                    } catch (err) {
                        console.warn(`Failed to get market info for token ${nft.tokenId}:`, err.message);
                        return null;
                    }
                })
            );

            // Filter out null values (failed NFTs)
            const validNFTs = nftsWithMarketInfo.filter(nft => nft !== null);

            console.log(`Successfully loaded ${validNFTs.length}/${allTokenIds.length} marketplace NFTs`);
            setAllMarketplaceNfts(validNFTs);

        } catch (err) {
            console.error('Error loading marketplace:', err);
            setError(err.message || 'Failed to load marketplace');
        } finally {
            setDataLoading(false);
        }
    }, [getActiveListings, getActiveAuctions, batchGetNFTMetadata, getNftInfo, setError, forceBlockchainSync]);

    // Apply filters
    const applyFilters = useCallback((nfts) => {
        return nfts.filter((nft) => {
            // Price filter
            if (filters.priceRange.min || filters.priceRange.max) {
                let price = 0;

                if (nft.info?.price && nft.info?.isListed) {
                    price = parseFloat(formatEther(nft.info?.price));
                } else if (nft.info?.isAuctioned && nft.info?.highestBid) {
                    price = parseFloat(formatEther(nft.info?.highestBid));
                }

                if (filters.priceRange.min && price < parseFloat(filters.priceRange.min)) {
                    return false;
                }
                if (filters.priceRange.max && price > parseFloat(filters.priceRange.max)) {
                    return false;
                }
            }

            // Status filter
            if (filters.status !== 'all') {
                if (filters.status === 'listed' && !nft.info?.isListed) return false;
                if (filters.status === 'auction' && !nft.info?.isAuctioned) return false;
            }
            return true;
        });
    }, [filters]);

    // Get display data for search
    const getDisplayDataForSearch = (nft) => {
        const metadata = nft.metadata || {};

        let name = metadata.name || metadata.title || metadata.displayName;

        if (!name && typeof metadata === 'object') {
            const keys = Object.keys(metadata).filter((key) => /^\d+$/.test(key)).sort((a, b) => parseInt(a) - parseInt(b));
            if (keys.length > 0) {
                name = keys.map((key) => metadata[key]).join("");
            }
        }

        if (!name) {
            name = `#NFT${nft.tokenId}`;
        }

        let description = metadata.description || metadata.desc || metadata.summary || '';

        return { name, description };
    };

    // Filter and sort NFTs
    const filteredAndSortedNfts = useMemo(() => {
        let nfts = allMarketplaceNfts;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            nfts = nfts.filter((nft) => {
                const { name, description } = getDisplayDataForSearch(nft);
                return (name.toLowerCase().includes(query) || description.toLowerCase().includes(query));
            });
        }

        // Apply other filters
        nfts = applyFilters(nfts);

        // Sort
        switch (sortBy) {
            case 'newest':
                nfts = [...nfts].sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
                break;
            case 'oldest':
                nfts = [...nfts].sort((a, b) => parseInt(a.tokenId) - parseInt(b.tokenId));
                break;
            case 'price_high':
                nfts = [...nfts].sort((a, b) => {
                    const priceA = a.info?.isListed ? a.info?.price : (a.info?.highestBid || BigNumber.from(0));
                    const priceB = b.info?.isListed ? b.info?.price : (b.info?.highestBid || BigNumber.from(0));
                    return priceB.gt(priceA) ? 1 : priceA.lt(priceB) ? -1 : 0;
                });
                break;
            case 'price_low':
                nfts = [...nfts].sort((a, b) => {
                    const priceA = a.info?.isListed ? a.info?.price : (a.info?.highestBid || BigNumber.from(0));
                    const priceB = b.info?.isListed ? b.info?.price : (b.info?.highestBid || BigNumber.from(0));
                    return priceA.gt(priceB) ? 1 : priceB.lt(priceA) ? -1 : 0;
                });
                break;
            default:
                break;
        }
        return nfts;
    }, [allMarketplaceNfts, searchQuery, sortBy, applyFilters]);

    // Mosaic layout
    const getMosaicLayout = (nfts) => {
        return nfts.map((nft, index) => {
            const patterns = [
                'small',
                'medium',
                'featured',
                'large',
                'tall',
                'medium',
                'large',
                'small',
                'featured',
                'medium',
                'small',
                'featured'
            ];

            const size = patterns[index % patterns.length];

            return { ...nft, mosaicSize: size };
        });
    };

    // Paginated NFTs
    const paginatedNFTS = useMemo(() => {
        if (!filteredAndSortedNfts?.length) return [];

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const sliced = filteredAndSortedNfts.slice(startIndex, endIndex);

        return viewMode === 'mosaic' ? getMosaicLayout(sliced) : sliced;
    }, [filteredAndSortedNfts, currentPage, itemsPerPage, viewMode]);

    // Calculate pagination info
    const totalPages = (!filteredAndSortedNfts?.length) ? 0 : Math.ceil(filteredAndSortedNfts.length / itemsPerPage);
    const hasNextPage = !dataLoading && currentPage > 0 && currentPage < totalPages;
    const hasPrevPage = !dataLoading && currentPage > 1;

    // Event handlers
    const handleBuyNFT = useCallback(async (tokenId) => {
        try {
            await buyNFT(tokenId);
            await loadMarketplaceNftData(true);
            console.log('NFT bought successfully');
        } catch (error) {
            console.error("Error buying NFT:", txError || error.message || "Unknown error");
            throw error;
        }
    }, [buyNFT, loadMarketplaceNftData, txError]);

    const handlePlaceBid = useCallback(async (tokenId, bidAmount) => {
        try {
            await placeBid(tokenId, bidAmount);
            await loadMarketplaceNftData(true);
            console.log("Bid placed successfully for token id", tokenId);
        } catch (error) {
            console.error("Error bidding for NFT:", txError || error.message || "Unknown error");
            throw error;
        }
    }, [placeBid, loadMarketplaceNftData, txError]);

    const handleFinalizeAuction = useCallback(async (tokenId) => {
        try {
            await finalizeAuction(tokenId);
            await loadMarketplaceNftData(true);
            console.log(`Auction has been finalized for ${tokenId}`);
        } catch (error) {
            console.error("Error in finalizing NFT:", txError || error.message || "Unknown error");
            throw error;
        }
    }, [finalizeAuction, loadMarketplaceNftData, txError]);

    const handleCancelListing = useCallback(async (tokenId) => {
        try {
            await cancelListing(tokenId);
            await loadMarketplaceNftData(true);
            console.log(`Listing for NFT ${tokenId} has been cancelled`);
        } catch (error) {
            console.error("Error cancelling listing for NFT:", txError || error.message || "Unknown error");
            throw error;
        }
    }, [cancelListing, loadMarketplaceNftData, txError]);

    const handleCancelAuction = useCallback(async (tokenId) => {
        try {
            await cancelAuction(tokenId);
            await loadMarketplaceNftData(true);
            console.log(`Auction for NFT ${tokenId} cancelled successfully!`);
        } catch (error) {
            console.error("Error in handleCancelAuction", txError || error.message || "Unknown error");
            throw error;
        }
    }, [cancelAuction, loadMarketplaceNftData, txError]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const clearFilters = () => {
        setFilters({
            priceRange: { max: '', min: '' },
            status: 'all'
        });
        setSearchQuery('');
        setSortBy('newest');
    };

    // Load marketplace data on mount and when dependencies change
    useEffect(() => {
        if (!isConnected || !account || !provider) return;

        let eventCleanup = null;
        let pollingInterval = null;

        if (subscribeToMarketPlaceEvents && autoRefreshEnabled) {
            eventCleanup = subscribeToMarketPlaceEvents(() => {
                console.log("Marketplace event detected, refreshing data...");
                setTimeout(() => {
                    loadMarketplaceNftData(true);
                }, 4000);
            });
        }

        if (autoRefreshEnabled) {
            pollingInterval = setInterval(() => {
                console.log("Auto-refresh: checking for updates...");
                loadMarketplaceNftData(true);
            }, 180000); // 3 minutes
        }

        // Initial load
        loadMarketplaceNftData(true);

        return () => {
            if (eventCleanup) eventCleanup();
            if (pollingInterval) clearInterval(pollingInterval);
        };

    }, [isConnected, account, provider, autoRefreshEnabled, loadMarketplaceNftData, subscribeToMarketPlaceEvents]);

    const handleAutoRefreshToggle = () => {
        setAutoRefreshEnabled(!autoRefreshEnabled);
    };

    const displayError = txError;

    if (!isConnected) {
        return (
            <div className="bg-[#202225] min-h-screen flex items-center justify-center p-4">
                <div className="text-center bg-[#34373B] rounded-3xl shadow-2xl p-12 max-w-md w-full border border-gray-700">
                    <div className="mb-8">
                        <div className="h-20 w-20 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <Wallet className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
                        <p className="text-gray-300 text-lg leading-relaxed">Please connect your Web3 wallet to browse and interact with the NFT marketplace.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#202225]">
            {/* Mobile sidebar overlay */}
            {sideBarOpen && (
                <div className="fixed inset-0 lg:hidden bg-black/50 z-40" onClick={() => setSideBarOpen(false)} />
            )}

            {/* Sidebar */}
            <div className={`fixed top-16 bottom-0 left-0 z-30 w-80 bg-[#34373B] border-r border-gray-700 transform transition-transform duration-200 ease-in-out ${sideBarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 overflow-y-auto`}>

                <div className="flex items-center justify-between p-6 border-b border-gray-600 lg:hidden">
                    <h2 className="text-xl text-white font-bold">Filters & Sort</h2>
                    <button onClick={() => setSideBarOpen(false)} className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5 text-red-400" />
                    </button>
                </div>

                <div className="p-6 space-y-8 h-full overflow-y-scroll">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <BarChart3 className="h-8 w-8 mr-2 text-blue-500" />
                            Marketplace Stats
                        </h3>
                        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl p-4 border border-blue-500/30">
                            <div className="flex items-center mb-2">
                                <Globe className="h-10 w-10 mr-2 text-blue-500" />
                                <p className="text-md text-blue-400">Available NFTs</p>
                            </div>
                            <p className="text-2xl font-bold text-white ml-2">{allMarketplaceNfts.length}</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center capitalize">
                            <Search className="h-6 w-6 mr-2 text-blue-500" />
                            search
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-600 bg-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-all duration-200"
                            />
                        </div>
                    </div>

                    {/* Price range */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center capitalize">
                            <SiEthereum className="h-6 w-6 mr-2 text-blue-500" />
                            Price Range (ETH)
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-md font-medium text-gray-400 mb-1">Min</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    step='0.001'
                                    value={filters.priceRange.min}
                                    onChange={(e) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            priceRange: { ...prev.priceRange, min: e.target.value }
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-md font-medium text-gray-400 mb-1">Max</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    step='0.01'
                                    value={filters.priceRange.max}
                                    onChange={(e) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            priceRange: { ...prev.priceRange, max: e.target.value }
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status filter */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center capitalize">
                            <Activity className="h-6 w-6 mr-2 text-blue-500" />
                            status
                        </h3>
                        <div className="space-y-3">
                            {[
                                { value: 'all', label: 'All Items', icon: Grid3x3 },
                                { value: 'listed', label: 'Fixed Price', icon: Tag },
                                { value: 'auction', label: 'On Auction', icon: Clock }
                            ].map((option) => (
                                <label key={option.value} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-700 transition-colors cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={option.value}
                                        checked={filters.status === option.value}
                                        onChange={(e) => {
                                            setFilters((prev) => ({
                                                ...prev,
                                                status: e.target.value
                                            }));
                                        }}
                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                                    />
                                    <option.icon className="h-5 w-5 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-300">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Sort options */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center capitalize">
                            <ArrowUpDown className="h-6 w-6 mr-2 text-blue-500" />
                            Sort By
                        </h3>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-5 py-3 border border-gray-600 bg-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white transition-all duration-200">
                            <option value="newest">Recently Listed</option>
                            <option value="oldest">Oldest Listed</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="price_low">Price: Low to High</option>
                        </select>
                    </div>

                    {/* Clear filter */}
                    <button onClick={clearFilters} className="w-full py-3 px-4 bg-gray-700 text-gray-300 rounded-2xl hover:bg-gray-600 transition-colors font-medium capitalize">
                        clear all filters
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:ml-80 min-h-screen pt-16">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#34373B] to-blue-400 border-b border-gray-700">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <button onClick={() => setSideBarOpen(true)} className="p-2 rounded-lg hover:bg-gray-700 transition-colors lg:hidden">
                                    <Menu className="w-5 h-5 text-gray-400" />
                                </button>
                                <div>
                                    <h1 className="text-lg lg:text-2xl font-bold text-blue-500">
                                        NFT Marketplace
                                    </h1>
                                    <p className="text-sm md:text-base text-gray-300 capitalize">
                                        Discover and collect unique digital assets
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={handleAutoRefreshToggle}
                                    disabled={false}
                                    className={`hidden sm:flex items-center space-x-2 px-3 py-2 rounded-xl font-medium transition-all duration-200 ${autoRefreshEnabled
                                            ? 'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30'
                                            : 'bg-gray-700 border border-gray-600 text-gray-400 hover:bg-gray-600'
                                        }`}
                                >
                                    {autoRefreshEnabled ? (
                                        <Activity className="h-4 w-4" />
                                    ) : (
                                        <Clock className="h-4 w-4" />
                                    )}
                                    <span className="text-sm">
                                        {autoRefreshEnabled ? 'Live' : 'Manual'}
                                    </span>
                                </button>

                                <button
                                    onClick={() => loadMarketplaceNftData(true)}
                                    disabled={dataLoading}
                                    className="flex items-center space-x-2 px-4 py-2 bg-[#202225] border-2 border-blue-500 hover:text-white text-blue-500 rounded-xl group transition-all duration-200 shadow-lg hover:shadow-xl font-semibold capitalize"
                                >
                                    {dataLoading ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : (
                                        <RefreshCw className="h-5 w-5 group-hover:animate-spin" />
                                    )}
                                    <span>refresh</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6">
                    {/* Display error */}
                    {displayError && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                            <div className="flex items-center">
                                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                                <p className="text-red-300 font-medium">{displayError}</p>
                            </div>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="bg-[#34373B] rounded-2xl border border-gray-500 overflow-hidden mb-6">
                        <div className="p-4 bg-[#34373B]/50 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center bg-gray-700 space-x-2 rounded-xl border border-gray-600 p-1">
                                        <button
                                            onClick={() => setViewMode("grid")}
                                            className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-blue-500 text-white" : "text-gray-400 bg-gray-600"
                                                }`}
                                        >
                                            <Grid className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode("list")}
                                            className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-blue-500 text-white" : "text-gray-400 bg-gray-600"
                                                }`}
                                        >
                                            <List className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode("mosaic")}
                                            className={`p-2 rounded-lg transition-colors ${viewMode === "mosaic" ? "bg-blue-500 text-white" : "text-gray-400 bg-gray-600"
                                                }`}
                                        >
                                            <Layers className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                                        className="bg-gray-700 rounded-lg px-2 py-2 text-white border border-blue-500"
                                    >
                                        {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {option} NFTs
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="text-gray-300 font-medium">
                                    Showing {filteredAndSortedNfts.length} NFTs
                                </div>
                            </div>
                        </div>

                        {/* NFT Display Area */}
                        <div className="p-6">
                            {dataLoading && allMarketplaceNfts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                                    <p className="text-lg font-medium">Loading marketplace NFTs...</p>
                                    <p className="text-sm text-gray-500 mt-1">This might take a moment.</p>
                                </div>
                            ) : paginatedNFTS.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-xl font-semibold mb-2">No NFTs found</p>
                                    <p className="text-gray-400">
                                        {searchQuery || filters.priceRange.min || filters.priceRange.max || filters.status !== 'all'
                                            ? 'Try adjusting your filters or search query.'
                                            : 'There are no active listings or auctions in the marketplace right now.'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {viewMode === "mosaic" ? (
                                        /* Masonry-style grid for mosaic view */
                                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-6">
                                            {paginatedNFTS.map((nft) => (
                                                <div key={nft.tokenId} className="break-inside-avoid mb-6">
                                                    <MosaicNFTCard
                                                        nft={nft}
                                                        account={account}
                                                        onBuyNFT={handleBuyNFT}
                                                        onPlaceBid={handlePlaceBid}
                                                        onFinalizeAuction={handleFinalizeAuction}
                                                        onCancelAuction={handleCancelAuction}
                                                        onCancelListing={handleCancelListing}
                                                        txLoading={txLoading}
                                                        txError={txError}
                                                        loadNFTData={loadMarketplaceNftData}
                                                        showOwnerActions={account && nft.info?.owner?.toLowerCase() === account?.toLowerCase()}
                                                        isMarketplace={true}
                                                        size={nft.mosaicSize}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div
                                            className={`grid gap-6 ${viewMode === "grid"
                                                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                                    : "grid-cols-1"
                                                }`}
                                        >
                                            {paginatedNFTS.map((nft) => (
                                                <NFTCard
                                                    key={nft.tokenId}
                                                    nft={nft}
                                                    account={account}
                                                    onBuyNft={handleBuyNFT}
                                                    onPlaceBid={handlePlaceBid}
                                                    onFinalizeAuction={handleFinalizeAuction}
                                                    onCancelAuction={handleCancelAuction}
                                                    onCancelListing={handleCancelListing}
                                                    txLoading={txLoading}
                                                    txError={txError}
                                                    loadNFTData={loadMarketplaceNftData}
                                                    showOwnerActions={account && nft.info?.owner?.toLowerCase() === account?.toLowerCase()}
                                                    isMarketplace={true}
                                                    viewMode={viewMode}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center space-x-4 mt-8">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={!hasPrevPage}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                <span>Previous</span>
                            </button>

                            <div className="flex items-center space-x-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const page = i + 1;
                                    const isActive = page === currentPage;

                                    return (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page)}
                                            className={`px-4 py-2 rounded-xl font-medium transition-colors ${isActive
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}

                                {totalPages > 5 && (
                                    <>
                                        <span className="text-gray-500">...</span>
                                        <button
                                            onClick={() => handlePageChange(totalPages)}
                                            className={`px-4 py-2 rounded-xl font-medium transition-colors ${totalPages === currentPage
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                }`}
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={!hasNextPage}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>Next</span>
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Marketplace;