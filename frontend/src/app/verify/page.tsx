"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, CheckCircle, XCircle, Camera, AlertTriangle, Users, Calendar, MapPin, Ticket, Search, List } from "lucide-react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { eventTicketingAbi, eventTicketingAddress, ticketNftAbi, ticketNftAddress } from "@/lib/contracts"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { formatEther } from "viem"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TicketVerificationData {
  tokenId: string
  ticketId: string
  eventName: string
  eventDate: string
  location: string
  owner: string
  isValid: boolean
  alreadyUsed: boolean
  eventStatus: "upcoming" | "passed" | "canceled" | "closed"
  eventId: string
}

interface EventOption {
  id: string
  name: string
  date: string
  location: string
  status: string
}

export default function VerifyPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [scannedData, setScannedData] = useState<string>("")
  const [verificationResult, setVerificationResult] = useState<TicketVerificationData | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [manualTicketId, setManualTicketId] = useState("")
  const [checkedInTickets, setCheckedInTickets] = useState<Set<string>>(new Set())
  const [ticketIdToVerify, setTicketIdToVerify] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [userEvents, setUserEvents] = useState<EventOption[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // Fetch all events to get user's events
  const { data: totalTickets } = useReadContract({
    address: eventTicketingAddress,
    abi: eventTicketingAbi,
    functionName: 'getTotalTickets',
  })

  const { data: recentTickets } = useReadContract({
    address: eventTicketingAddress,
    abi: eventTicketingAbi,
    functionName: 'getRecentTickets',
  })

  // Get event details - using selectedEventId as the ticket/event ID
  const { data: eventData, isLoading: eventLoading, error: eventError } = useReadContract({
    address: eventTicketingAddress,
    abi: eventTicketingAbi,
    functionName: 'tickets',
    args: selectedEventId ? [BigInt(selectedEventId)] : undefined,
    query: {
      enabled: !!selectedEventId,
    }
  })

  // Get NFT owner - ticketIdToVerify is the NFT token ID
  const { data: nftOwner, isLoading: ownerLoading, error: ownerError } = useReadContract({
    address: ticketNftAddress,
    abi: ticketNftAbi,
    functionName: 'ownerOf',
    args: ticketIdToVerify ? [BigInt(ticketIdToVerify)] : undefined,
    query: {
      enabled: !!ticketIdToVerify,
    }
  })

  // Get NFT metadata to verify it belongs to the selected event
  const { data: nftMetadata, isLoading: metadataLoading } = useReadContract({
    address: ticketNftAddress,
    abi: ticketNftAbi,
    functionName: 'getTicketMetadata',
    args: ticketIdToVerify ? [BigInt(ticketIdToVerify)] : undefined,
    query: {
      enabled: !!ticketIdToVerify,
    }
  })

  useEffect(() => {
    if (!isConnected) {
      toast.error("Please connect your wallet to verify tickets")
      router.push("/")
    }
  }, [isConnected, router])

  // Process events to show only user's created events
  useEffect(() => {
    if (!recentTickets || !address) return

    try {
      const tickets = recentTickets as any[]
      const myEvents: EventOption[] = []

      tickets.forEach((ticket: any) => {
        // Only show events created by the connected user
        if (ticket.creator.toLowerCase() === address.toLowerCase()) {
          const eventTimestamp = Number(ticket.eventTimestamp || 0)
          const eventDate = new Date(eventTimestamp * 1000)
          const now = new Date()
          const isPassed = eventDate < now
          const isCanceled = ticket.canceled || false
          const isClosed = ticket.closed || false

          let status = "upcoming"
          if (isCanceled) status = "canceled"
          else if (isClosed) status = "closed"
          else if (isPassed) status = "passed"

          myEvents.push({
            id: String(ticket.id),
            name: ticket.eventName || "Unnamed Event",
            date: eventDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            location: ticket.location || "TBA",
            status
          })
        }
      })

      setUserEvents(myEvents)
      
      // Auto-select first event if none selected
      if (myEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(myEvents[0].id)
      }

      if (myEvents.length === 0) {
        toast.info("You haven't created any events yet. Only event creators can verify tickets.")
      }
    } catch (error) {
      console.error("Error processing events:", error)
    }
  }, [recentTickets, address, selectedEventId])

  // Start camera for QR scanning
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setIsScanning(true)
      scanQRCode()
    } catch (error) {
      console.error("Camera access error:", error)
      toast.error("Unable to access camera. Please check permissions.")
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsScanning(false)
  }

  // Scan QR code from video stream
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Use a QR code library here in production (e.g., jsQR)
      // For now, we'll use manual input simulation
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      // TODO: Integrate jsQR library
      // const code = jsQR(imageData.data, imageData.width, imageData.height)
      // if (code) {
      //   handleQRCodeScanned(code.data)
      //   stopCamera()
      //   return
      // }
    }

    requestAnimationFrame(scanQRCode)
  }

  // Parse QR code data
  const parseQRData = (data: string): { ticketId: string; tokenId: string } | null => {
    try {
      // Expected format from QR: "ID:1\nEvent:...\n..."
      const lines = data.split('\n')
      const idLine = lines.find(line => line.startsWith('ID:'))
      
      if (idLine) {
        const ticketId = idLine.replace('ID:', '').trim()
        return { ticketId, tokenId: ticketId } // Simplified - in production, extract actual tokenId
      }
      return null
    } catch (error) {
      console.error("QR parse error:", error)
      return null
    }
  }

  // Effect to process data when blockchain data is fetched
  useEffect(() => {
    if (!ticketIdToVerify || !eventData || eventLoading || ownerLoading || metadataLoading) {
      return
    }

    try {
      const eventDataResult = eventData as any
      
      if (!eventDataResult || !eventDataResult.eventName) {
        toast.error("Event not found")
        setVerificationResult(null)
        setIsVerifying(false)
        setTicketIdToVerify(null)
        return
      }

      // Check if NFT exists (owner found)
      if (ownerError) {
        toast.error("NFT Token ID not found. Please check the token ID.")
        setVerificationResult(null)
        setIsVerifying(false)
        setTicketIdToVerify(null)
        return
      }

      // Verify NFT belongs to the selected event using metadata
      const metadata = nftMetadata as any
      console.log('NFT Metadata:', metadata)
      
      if (metadata && metadata.ticketId !== undefined) {
        const nftEventId = String(metadata.ticketId)
        console.log('NFT Event ID:', nftEventId, 'Selected Event ID:', selectedEventId)
        
        if (selectedEventId && nftEventId !== selectedEventId) {
          toast.error(`This NFT (Token #${ticketIdToVerify}) belongs to event ID ${nftEventId}, not the selected event (ID ${selectedEventId})`)
          setVerificationResult(null)
          setIsVerifying(false)
          setTicketIdToVerify(null)
          return
        }
      } else {
        console.warn('NFT metadata missing ticketId')
      }

      const now = Math.floor(Date.now() / 1000)
      const eventTimestamp = Number(eventDataResult.eventTimestamp || 0)
      const isCanceled = eventDataResult.canceled || false
      const isClosed = eventDataResult.closed || false
      const isPassed = eventTimestamp < now
      
      let eventStatus: "upcoming" | "passed" | "canceled" | "closed" = "upcoming"
      if (isCanceled) eventStatus = "canceled"
      else if (isClosed) eventStatus = "closed"
      else if (isPassed) eventStatus = "passed"

      const isValid = !isCanceled && !isClosed && eventStatus === "upcoming"
      const alreadyUsed = checkedInTickets.has(`${selectedEventId}-${ticketIdToVerify}`)

      const verificationData: TicketVerificationData = {
        tokenId: ticketIdToVerify,
        ticketId: ticketIdToVerify,
        eventName: eventDataResult.eventName || "Unknown Event",
        eventDate: new Date(eventTimestamp * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        location: eventDataResult.location || "TBA",
        owner: (nftOwner as string) || "Unknown",
        isValid,
        alreadyUsed,
        eventStatus,
        eventId: selectedEventId || String(eventDataResult.id)
      }

      setVerificationResult(verificationData)

      if (isValid && !alreadyUsed) {
        toast.success("Valid ticket! ✅")
      } else if (alreadyUsed) {
        toast.error("This ticket has already been checked in!")
      } else if (isCanceled) {
        toast.error("Event has been canceled")
      } else if (isClosed) {
        toast.error("Event is closed")
      } else if (isPassed) {
        toast.error("Event has already passed")
      } else {
        toast.error("Invalid ticket")
      }
    } catch (error) {
      console.error("Verification error:", error)
      toast.error("Failed to verify ticket")
      setVerificationResult(null)
    } finally {
      setIsVerifying(false)
      setTicketIdToVerify(null)
    }
  }, [eventData, nftOwner, nftMetadata, eventLoading, ownerLoading, metadataLoading, ticketIdToVerify, checkedInTickets, selectedEventId, ownerError])

  // Effect to handle errors
  useEffect(() => {
    if (eventError && ticketIdToVerify) {
      toast.error("Failed to fetch ticket data from blockchain")
      setIsVerifying(false)
      setTicketIdToVerify(null)
      setVerificationResult(null)
    }
  }, [eventError, ticketIdToVerify])

  // Verify ticket - trigger the blockchain fetch
  const verifyTicket = async (ticketId: string) => {
    if (!ticketId || ticketId.trim() === "") {
      toast.error("Invalid ticket ID")
      return
    }

    if (!selectedEventId) {
      toast.error("Please select an event first")
      return
    }

    setIsVerifying(true)
    setVerificationResult(null)
    setTicketIdToVerify(ticketId)
  }

  // Handle QR code scanned
  const handleQRCodeScanned = (data: string) => {
    setScannedData(data)
    const parsed = parseQRData(data)
    if (parsed) {
      verifyTicket(parsed.ticketId)
    } else {
      toast.error("Invalid QR code format")
    }
  }

  // Handle manual verification
  const handleManualVerify = () => {
    if (!manualTicketId.trim()) {
      toast.error("Please enter a ticket ID")
      return
    }
    verifyTicket(manualTicketId)
  }

  // Check in ticket
  const checkInTicket = () => {
    if (!verificationResult || !selectedEventId) return
    
    const checkInKey = `${selectedEventId}-${verificationResult.ticketId}`
    setCheckedInTickets(prev => new Set([...prev, checkInKey]))
    toast.success(`Ticket #${verificationResult.ticketId} checked in successfully for ${verificationResult.eventName}!`)
    
    // In production, this should update the blockchain or backend
    setTimeout(() => {
      setVerificationResult(null)
      setManualTicketId("")
      setScannedData("")
      setTicketIdToVerify(null)
    }, 2000)
  }

  // Reset verification
  const resetVerification = () => {
    setVerificationResult(null)
    setManualTicketId("")
    setScannedData("")
    setTicketIdToVerify(null)
    setIsVerifying(false)
  }

  if (!isConnected) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-foreground py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] flex items-center justify-center">
              <QrCode className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            Ticket{" "}
            <span className="bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] bg-clip-text text-transparent">
              Verification
            </span>
          </h1>
          <p className="text-xl text-slate-300">
            Scan or enter ticket IDs to verify attendee entry
          </p>
        </div>

        {/* Event Selector */}
        <Card className="mb-8 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <List className="h-5 w-5 text-[#dd7e9a]" />
              Select Event to Verify
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userEvents.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <Label htmlFor="event-select" className="text-slate-300 md:w-32">
                    Your Events:
                  </Label>
                  <Select value={selectedEventId || ""} onValueChange={setSelectedEventId}>
                    <SelectTrigger id="event-select" className="flex-1 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select an event to verify tickets for" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {userEvents.map((event) => (
                        <SelectItem key={event.id} value={event.id} className="text-white hover:bg-slate-700">
                          <div className="flex flex-col">
                            <span className="font-medium">{event.name}</span>
                            <span className="text-xs text-slate-400">
                              {event.date} • {event.location} • {event.status}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedEventId && (
                  <div className="bg-slate-700/30 p-4 rounded-lg">
                    <p className="text-sm text-slate-300">
                      <strong className="text-[#dd7e9a]">Currently verifying for:</strong>{" "}
                      {userEvents.find(e => e.id === selectedEventId)?.name || "Unknown Event"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Only tickets for this event will be accepted
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                <p className="text-slate-300 mb-2">No events found</p>
                <p className="text-slate-400 text-sm">
                  You need to be an event creator to verify tickets. Create an event first!
                </p>
                <Button
                  onClick={() => router.push("/create-event")}
                  className="mt-4 bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] hover:from-[#c06b8a] hover:to-[#c06b8a]"
                >
                  Create Event
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{checkedInTickets.size}</p>
              <p className="text-slate-400">Checked In</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <Ticket className="h-8 w-8 text-[#dd7e9a] mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">
                {verificationResult ? "1" : "0"}
              </p>
              <p className="text-slate-400">Currently Scanning</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">
                {verificationResult?.isValid && !verificationResult.alreadyUsed ? "Valid" : "---"}
              </p>
              <p className="text-slate-400">Status</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Camera className="h-5 w-5 text-[#dd7e9a]" />
                QR Code Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera View */}
              <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
                {isScanning ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-4 border-[#dd7e9a]/50 m-8" />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <QrCode className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">Camera inactive</p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={isScanning ? stopCamera : startCamera}
                className={`w-full ${
                  isScanning
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gradient-to-r from-[#dd7e9a] to-[#dd7e9a] hover:from-[#c06b8a] hover:to-[#c06b8a]"
                }`}
              >
                <Camera className="h-4 w-4 mr-2" />
                {isScanning ? "Stop Camera" : "Start Camera"}
              </Button>

              {/* Manual Entry */}
              <div className="pt-4 border-t border-slate-600">
                <Label htmlFor="ticketId" className="text-slate-300 mb-2 block font-medium">
                  Or Enter NFT Token ID Manually
                </Label>
                <p className="text-slate-400 text-sm mb-3">
                  Enter the NFT Token ID from the attendee&apos;s ticket to verify
                </p>
                <div className="flex gap-2">
                  <Input
                    id="ticketId"
                    type="number"
                    placeholder="Enter NFT Token ID (e.g., 1, 2, 3...)"
                    value={manualTicketId}
                    onChange={(e) => setManualTicketId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isVerifying && handleManualVerify()}
                    disabled={isVerifying || !selectedEventId}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 disabled:opacity-50"
                  />
                  <Button
                    onClick={handleManualVerify}
                    disabled={isVerifying || !manualTicketId.trim() || !selectedEventId}
                    className="bg-[#dd7e9a] hover:bg-[#c06b8a] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Search for ticket"
                  >
                    {isVerifying ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {!selectedEventId && (
                  <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Please select an event first
                  </p>
                )}
                {manualTicketId && !isVerifying && selectedEventId && (
                  <p className="text-xs text-slate-400 mt-2">
                    Press Enter or click the search button to verify NFT Token #{manualTicketId}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification Result */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Ticket className="h-5 w-5 text-[#dd7e9a]" />
                Verification Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isVerifying ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-[#dd7e9a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Verifying ticket...</p>
                </div>
              ) : verificationResult ? (
                <div className="space-y-6">
                  {/* Status Badge */}
                  <div className="text-center">
                    {verificationResult.isValid && !verificationResult.alreadyUsed ? (
                      <div className="space-y-2">
                        <CheckCircle className="h-16 w-16 text-green-400 mx-auto" />
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/50 text-lg px-4 py-2">
                          ✓ Valid Ticket
                        </Badge>
                      </div>
                    ) : verificationResult.alreadyUsed ? (
                      <div className="space-y-2">
                        <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto" />
                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50 text-lg px-4 py-2">
                          ⚠ Already Used
                        </Badge>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <XCircle className="h-16 w-16 text-red-400 mx-auto" />
                        <Badge className="bg-red-500/20 text-red-300 border-red-500/50 text-lg px-4 py-2">
                          ✗ Invalid Ticket
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Ticket Details */}
                  <div className="space-y-3 bg-slate-700/30 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-[#dd7e9a] mt-0.5" />
                      <div className="flex-1">
                        <p className="text-slate-400 text-sm">Event</p>
                        <p className="text-white font-medium">{verificationResult.eventName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-[#dd7e9a] mt-0.5" />
                      <div className="flex-1">
                        <p className="text-slate-400 text-sm">Date</p>
                        <p className="text-white">{verificationResult.eventDate}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-[#dd7e9a] mt-0.5" />
                      <div className="flex-1">
                        <p className="text-slate-400 text-sm">Location</p>
                        <p className="text-white">{verificationResult.location}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Ticket className="h-5 w-5 text-[#dd7e9a] mt-0.5" />
                      <div className="flex-1">
                        <p className="text-slate-400 text-sm">Ticket ID</p>
                        <p className="text-white font-mono">#{verificationResult.ticketId}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-[#dd7e9a] mt-0.5" />
                      <div className="flex-1">
                        <p className="text-slate-400 text-sm">Owner</p>
                        <p className="text-white font-mono text-sm truncate">
                          {verificationResult.owner.slice(0, 10)}...{verificationResult.owner.slice(-8)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {verificationResult.isValid && !verificationResult.alreadyUsed && (
                    <Button
                      onClick={checkInTicket}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Check In Attendee
                    </Button>
                  )}

                  {verificationResult.alreadyUsed && (
                    <Button
                      variant="outline"
                      onClick={resetVerification}
                      className="w-full border-slate-600 text-slate-300"
                    >
                      Scan Another Ticket
                    </Button>
                  )}

                  {!verificationResult.isValid && (
                    <Button
                      variant="outline"
                      onClick={resetVerification}
                      className="w-full border-slate-600 text-slate-300"
                    >
                      Try Another Ticket
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <QrCode className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Scan or enter a ticket to verify</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">How to Verify Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-slate-300">
              <li>Connect your wallet as an event organizer</li>
              <li>Select the event you want to verify tickets for from the dropdown</li>
              <li>
                <strong>Option 1 - QR Code:</strong> Click "Start Camera" to enable QR code scanning, then point at attendee&apos;s QR code
              </li>
              <li>
                <strong>Option 2 - Manual Entry:</strong> Enter the attendee&apos;s NFT Token ID (found on their ticket) and press Enter or click search
              </li>
              <li>The system will verify the NFT belongs to your selected event and check its validity on the blockchain</li>
              <li>If valid and not already used, click "Check In Attendee" to mark them as entered</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>Note:</strong> Each attendee receives a unique NFT Token ID when they register for your event. 
                This Token ID is what you need to verify their ticket.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
