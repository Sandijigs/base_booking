"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ShoppingCart, Tag, TrendingUp, Search, Filter, Calendar, 
  MapPin, DollarSign, Users, AlertCircle, CheckCircle, XCircle,
  ArrowUpDown, Sparkles
} from "lucide-react"
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { 
  resaleMarketAddress, 
  resaleMarketAbi, 
  ticketNftAddress, 
  ticketNftAbi,
  eventTicketingAddress,
  eventTicketingAbi 
} from "@/lib/contracts"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { formatEther, parseEther } from "viem"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ResaleListing {
  tokenId: string
  ticketId: string
  seller: string
  price: string
  active: boolean
  eventName: string
  eventDate: string
  location: string
  originalPrice: string
}

export default function ResalePage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"price-low" | "price-high" | "recent">("recent")
  const [showListDialog, setShowListDialog] = useState(false)
  const [listingPrice, setListingPrice] = useState("")
  const [selectedTokenId, setSelectedTokenId] = useState<string>("")
  const [listingStep, setListingStep] = useState<'idle' | 'approving' | 'listing' | 'success'>('idle')

  // Get user's tickets
  const { data: userBalance } = useReadContract({
    address: ticketNftAddress,
    abi: ticketNftAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // Write contracts for approving, listing and buying
  const { 
    writeContract: approveNFT, 
    data: approveHash, 
    isPending: isApproving 
  } = useWriteContract()

  const { 
    writeContract: listTicket, 
    data: listHash, 
    isPending: isListing 
  } = useWriteContract()

  const { 
    writeContract: buyTicket, 
    data: buyHash, 
    isPending: isBuying 
  } = useWriteContract()

  const { 
    isSuccess: isApproveSuccess 
  } = useWaitForTransactionReceipt({ hash: approveHash })

  const { 
    isSuccess: isListSuccess 
  } = useWaitForTransactionReceipt({ hash: listHash })

  const { 
    isSuccess: isBuySuccess 
  } = useWaitForTransactionReceipt({ hash: buyHash })

  // Get all events to find active listings
  const { data: allTickets } = useReadContract({
    address: eventTicketingAddress,
    abi: eventTicketingAbi,
    functionName: 'getRecentTickets',
  })

  // Mock listings data - in production, you'd fetch this from events or subgraph
  const [listings, setListings] = useState<ResaleListing[]>([])

  // Handle approval success - then list the ticket
  useEffect(() => {
    if (isApproveSuccess && listingPrice && selectedTokenId && listingStep === 'approving') {
      setListingStep('listing')
      toast.success("✅ Approval successful! Now listing your ticket...")
      
      const priceInWei = parseEther(listingPrice)
      listTicket({
        address: resaleMarketAddress,
        abi: resaleMarketAbi,
        functionName: 'listTicket',
        args: [BigInt(selectedTokenId), priceInWei],
      })
    }
  }, [isApproveSuccess, listingPrice, selectedTokenId, listTicket, listingStep])

  useEffect(() => {
    if (isListSuccess && listingStep === 'listing') {
      setListingStep('success')
      toast.success("🎉 Ticket listed successfully!")
      setTimeout(() => {
        setShowListDialog(false)
        setListingPrice("")
        setSelectedTokenId("")
        setListingStep('idle')
      }, 2000)
    }
  }, [isListSuccess, listingStep])

  useEffect(() => {
    if (isBuySuccess) {
      toast.success("Ticket purchased successfully!")
    }
  }, [isBuySuccess])

  useEffect(() => {
    if (!isConnected) {
      toast.error("Please connect your wallet")
      router.push("/")
    }
  }, [isConnected, router])

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let filtered = listings.filter(listing => 
      listing.active &&
      listing.eventName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sort
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
        break
      case "price-high":
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
        break
      case "recent":
        // Already in recent order
        break
    }

    return filtered
  }, [listings, searchTerm, sortBy])

  // Handle listing a ticket
  const handleListTicket = async () => {
    if (!listingPrice || !selectedTokenId) {
      toast.error("Please enter a valid price and token ID")
      return
    }

    if (!address) {
      toast.error("Please connect your wallet")
      return
    }

    try {
      console.log('Starting listing process for token:', selectedTokenId)
      console.log('Price:', listingPrice, 'BASE')
      
      setListingStep('approving')
      
      // First approve the marketplace to transfer the NFT
      toast.info("📝 Step 1/2: Approving marketplace... Please confirm in your wallet")
      
      approveNFT({
        address: ticketNftAddress,
        abi: ticketNftAbi,
        functionName: 'approve',
        args: [resaleMarketAddress, BigInt(selectedTokenId)],
      })
    } catch (error) {
      console.error("Listing error:", error)
      toast.error("❌ Failed to approve NFT transfer")
      setListingStep('idle')
    }
  }

  // Handle buying a ticket
  const handleBuyTicket = async (listing: ResaleListing) => {
    try {
      const priceInWei = parseEther(listing.price)
      
      buyTicket({
        address: resaleMarketAddress,
        abi: resaleMarketAbi,
        functionName: 'buyTicket',
        args: [BigInt(listing.tokenId)],
        value: priceInWei,
      })

      toast.info("Processing purchase...")
    } catch (error) {
      console.error("Purchase error:", error)
      toast.error("Failed to purchase ticket")
    }
  }

  // Calculate price difference percentage
  const getPriceDifference = (currentPrice: string, originalPrice: string) => {
    const current = parseFloat(currentPrice)
    const original = parseFloat(originalPrice)
    const diff = ((current - original) / original) * 100
    return diff.toFixed(1)
  }

  if (!isConnected) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-foreground py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            Ticket{" "}
            <span className="bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] bg-clip-text text-transparent">
              Resale Market
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Buy and sell event tickets securely on the blockchain with transparent pricing
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <Tag className="h-8 w-8 text-[#dd7e9a] mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{listings.length}</p>
              <p className="text-slate-400">Active Listings</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">
                {listings.length > 0 ? (
                  listings.reduce((sum, l) => sum + parseFloat(l.price), 0) / listings.length
                ).toFixed(2) : "0"}
              </p>
              <p className="text-slate-400">Avg Price (BASE)</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">
                {new Set(listings.map(l => l.seller)).size}
              </p>
              <p className="text-slate-400">Active Sellers</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <Sparkles className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">2.5%</p>
              <p className="text-slate-400">Platform Fee</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search by event name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-slate-800/50 border-slate-700 focus:border-[#dd7e9a] text-white h-12"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setSortBy("price-low")}
              className={`border-slate-600 ${
                sortBy === "price-low" ? "bg-[#dd7e9a]/20 text-[#dd7e9a]" : "text-slate-300"
              }`}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Price: Low
            </Button>
            <Button
              variant="outline"
              onClick={() => setSortBy("price-high")}
              className={`border-slate-600 ${
                sortBy === "price-high" ? "bg-[#dd7e9a]/20 text-[#dd7e9a]" : "text-slate-300"
              }`}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Price: High
            </Button>
            <Button
              onClick={() => setShowListDialog(true)}
              className="bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] hover:from-[#c06b8a] hover:to-[#c06b8a]"
            >
              <Tag className="h-4 w-4 mr-2" />
              List Ticket
            </Button>
          </div>
        </div>

        {/* Listings Grid */}
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const priceDiff = getPriceDifference(listing.price, listing.originalPrice)
              const isPriceUp = parseFloat(priceDiff) > 0

              return (
                <Card key={listing.tokenId} className="bg-slate-800/50 border-slate-700 hover:border-[#dd7e9a]/50 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-white mb-2">
                          {listing.eventName}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                          <Calendar className="h-4 w-4" />
                          {listing.eventDate}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <MapPin className="h-4 w-4" />
                          {listing.location}
                        </div>
                      </div>
                      <Badge 
                        className={`${
                          isPriceUp 
                            ? "bg-red-500/20 text-red-300 border-red-500/50" 
                            : "bg-green-500/20 text-green-300 border-green-500/50"
                        }`}
                      >
                        {isPriceUp ? "+" : ""}{priceDiff}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Current Price</span>
                        <span className="text-2xl font-bold text-[#dd7e9a]">
                          {listing.price} BASE
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Original Price</span>
                        <span className="text-slate-500 line-through">
                          {listing.originalPrice} BASE
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Seller</span>
                        <span className="text-slate-300 font-mono">
                          {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                        </span>
                      </div>
                    </div>

                    {address?.toLowerCase() === listing.seller.toLowerCase() ? (
                      <Button
                        variant="outline"
                        className="w-full border-slate-600 text-slate-400"
                        disabled
                      >
                        Your Listing
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleBuyTicket(listing)}
                        disabled={isBuying}
                        className="w-full bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] hover:from-[#c06b8a] hover:to-[#c06b8a]"
                      >
                        {isBuying ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Buying...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Buy Now
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-16 text-center">
              <ShoppingCart className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No Listings Available</h3>
              <p className="text-slate-400 mb-6">
                {searchTerm 
                  ? `No listings match "${searchTerm}"`
                  : "Be the first to list a ticket for resale!"}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowListDialog(true)}
                  className="bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] hover:from-[#c06b8a] hover:to-[#c06b8a]"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  List Your Ticket
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-gradient-to-br from-slate-800/50 to-[#dd7e9a]/20 border-[#dd7e9a]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#dd7e9a]" />
              How Resale Market Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>List your unused tickets for resale at any price you choose</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>All transactions are secured by smart contracts on the blockchain</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>2.5% platform fee is automatically deducted from sales</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Only valid, unverified tickets for upcoming events can be listed</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Transfer happens instantly upon purchase - no waiting period</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* List Ticket Dialog */}
        <Dialog open={showListDialog} onOpenChange={(open) => {
          if (!open && listingStep === 'idle') {
            setShowListDialog(false)
          }
        }}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {listingStep === 'idle' && 'List Ticket for Resale'}
                {listingStep === 'approving' && '⏳ Approving Marketplace...'}
                {listingStep === 'listing' && '📋 Listing Ticket...'}
                {listingStep === 'success' && '✅ Listing Successful!'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {listingStep === 'idle' && 'Set your price and list your ticket on the marketplace'}
                {listingStep === 'approving' && 'Step 1/2: Please confirm the approval transaction in your wallet'}
                {listingStep === 'listing' && 'Step 2/2: Please confirm the listing transaction in your wallet'}
                {listingStep === 'success' && 'Your ticket has been successfully listed on the marketplace!'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Progress Indicator */}
              {listingStep !== 'idle' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={`${listingStep === 'approving' || listingStep === 'listing' || listingStep === 'success' ? 'text-green-400' : 'text-slate-400'}`}>
                      {listingStep === 'approving' || listingStep === 'listing' || listingStep === 'success' ? '✓' : '○'} Approve
                    </span>
                    <span className={`${listingStep === 'listing' || listingStep === 'success' ? 'text-green-400' : 'text-slate-400'}`}>
                      {listingStep === 'listing' || listingStep === 'success' ? '✓' : '○'} List
                    </span>
                    <span className={`${listingStep === 'success' ? 'text-green-400' : 'text-slate-400'}`}>
                      {listingStep === 'success' ? '✓' : '○'} Done
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] transition-all duration-500"
                      style={{ 
                        width: listingStep === 'approving' ? '33%' : 
                               listingStep === 'listing' ? '66%' : 
                               listingStep === 'success' ? '100%' : '0%' 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Form Fields - Only show in idle state */}
              {listingStep === 'idle' && (
                <>
                  <div>
                    <Label htmlFor="tokenId" className="text-slate-300">
                      Ticket Token ID
                    </Label>
                    <Input
                      id="tokenId"
                      type="number"
                      placeholder="Enter your ticket token ID"
                      value={selectedTokenId}
                      onChange={(e) => setSelectedTokenId(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      You can find this in your "My Tickets" page
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="price" className="text-slate-300">
                      Listing Price (BASE)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Set your desired selling price in BASE tokens
                    </p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-sm text-yellow-300">
                      <strong>Note:</strong> A 2.5% platform fee will be deducted from your sale
                    </p>
                  </div>
                </>
              )}

              {/* Status Messages for Processing States */}
              {(listingStep === 'approving' || listingStep === 'listing') && (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-[#dd7e9a] border-t-transparent rounded-full animate-spin mx-auto" />
                    <div>
                      <p className="text-white font-medium">
                        {listingStep === 'approving' ? 'Waiting for approval...' : 'Waiting for listing confirmation...'}
                      </p>
                      <p className="text-slate-400 text-sm mt-2">
                        Please check your wallet and confirm the transaction
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {listingStep === 'success' && (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Ticket Listed Successfully!</p>
                      <p className="text-slate-400 text-sm mt-2">
                        Your ticket is now available on the resale marketplace
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Buttons - Only show in idle state */}
              {listingStep === 'idle' && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowListDialog(false)
                      setListingPrice("")
                      setSelectedTokenId("")
                    }}
                    className="flex-1 border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleListTicket}
                    disabled={!listingPrice || !selectedTokenId}
                    className="flex-1 bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] hover:from-[#c06b8a] hover:to-[#c06b8a]"
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    List Ticket
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
