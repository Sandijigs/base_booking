"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  DollarSign, AlertCircle, CheckCircle, XCircle, RefreshCw,
  Calendar, MapPin, Clock, Info
} from "lucide-react"
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { eventTicketingAddress, eventTicketingAbi } from "@/lib/contracts"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { formatEther } from "viem"

interface RefundableTicket {
  ticketId: string
  eventName: string
  eventDate: string
  location: string
  paidAmount: string
  refundStatus: "pending" | "processing" | "completed"
  eventStatus: "canceled" | "active"
}

export default function RefundsPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [refundingTickets, setRefundingTickets] = useState<Set<string>>(new Set())

  // Get all tickets
  const { data: allTickets, refetch: refetchTickets } = useReadContract({
    address: eventTicketingAddress,
    abi: eventTicketingAbi,
    functionName: 'getRecentTickets',
  })

  // Check registration status for user
  const registrationChecks = useReadContracts({
    contracts: (allTickets as any[] || []).map((ticket: any) => ({
      address: eventTicketingAddress,
      abi: eventTicketingAbi,
      functionName: 'isRegistered',
      args: [BigInt(ticket.id), address],
    })),
    query: {
      enabled: !!allTickets && !!address,
    },
  })

  // Check paid amounts for registered tickets
  const paidAmountChecks = useReadContracts({
    contracts: (allTickets as any[] || [])
      .filter((_, index) => registrationChecks.data?.[index]?.result === true)
      .map((ticket: any) => ({
        address: eventTicketingAddress,
        abi: eventTicketingAbi,
        functionName: 'paidAmount',
        args: [BigInt(ticket.id), address],
      })),
    query: {
      enabled: !!allTickets && !!address && registrationChecks.data !== undefined,
    },
  })

  // Write contract for claiming refund
  const { 
    writeContract: claimRefund, 
    data: refundHash, 
    isPending: isClaimingRefund 
  } = useWriteContract()

  const { 
    isSuccess: isRefundSuccess,
    isLoading: isRefundProcessing 
  } = useWaitForTransactionReceipt({ hash: refundHash })

  useEffect(() => {
    if (isRefundSuccess) {
      toast.success("Refund claimed successfully!")
      refetchTickets()
    }
  }, [isRefundSuccess, refetchTickets])

  useEffect(() => {
    if (!isConnected) {
      toast.error("Please connect your wallet")
      router.push("/")
    }
  }, [isConnected, router])

  // Get refundable tickets
  const refundableTickets = useMemo(() => {
    if (!allTickets || !registrationChecks.data || !paidAmountChecks.data) return []

    const tickets = allTickets as any[]
    const refundable: RefundableTicket[] = []
    let paidAmountIndex = 0

    tickets.forEach((ticket, index) => {
      const isRegistered = registrationChecks.data[index]?.result === true
      if (!isRegistered) return

      const isCanceled = ticket.canceled
      const paidAmount = paidAmountChecks.data[paidAmountIndex]?.result as bigint
      paidAmountIndex++

      if (isCanceled && paidAmount && paidAmount > 0n) {
        refundable.push({
          ticketId: ticket.id.toString(),
          eventName: ticket.eventName,
          eventDate: new Date(Number(ticket.eventTimestamp) * 1000).toLocaleDateString(),
          location: ticket.location,
          paidAmount: formatEther(paidAmount),
          refundStatus: refundingTickets.has(ticket.id.toString()) ? "processing" : "pending",
          eventStatus: "canceled"
        })
      }
    })

    return refundable
  }, [allTickets, registrationChecks.data, paidAmountChecks.data, refundingTickets])

  // Calculate total refundable amount
  const totalRefundable = useMemo(() => {
    return refundableTickets
      .filter(t => t.refundStatus === "pending")
      .reduce((sum, ticket) => sum + parseFloat(ticket.paidAmount), 0)
      .toFixed(4)
  }, [refundableTickets])

  // Handle claim refund
  const handleClaimRefund = async (ticketId: string) => {
    try {
      setRefundingTickets(prev => new Set([...prev, ticketId]))
      
      claimRefund({
        address: eventTicketingAddress,
        abi: eventTicketingAbi,
        functionName: 'claimRefund',
        args: [BigInt(ticketId)],
      })

      toast.info("Processing refund claim...")
    } catch (error) {
      console.error("Refund error:", error)
      toast.error("Failed to claim refund")
      setRefundingTickets(prev => {
        const newSet = new Set(prev)
        newSet.delete(ticketId)
        return newSet
      })
    }
  }

  // Claim all refunds
  const handleClaimAllRefunds = async () => {
    const pendingRefunds = refundableTickets.filter(t => t.refundStatus === "pending")
    
    for (const ticket of pendingRefunds) {
      await handleClaimRefund(ticket.ticketId)
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  if (!isConnected) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-foreground py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            Refund{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Management
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Claim refunds for canceled events automatically through smart contracts
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-slate-800/50 to-green-900/20 border-green-500/30">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{totalRefundable}</p>
              <p className="text-slate-400">Total Refundable (BASE)</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">
                {refundableTickets.filter(t => t.refundStatus === "pending").length}
              </p>
              <p className="text-slate-400">Pending Refunds</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">
                {refundableTickets.filter(t => t.refundStatus === "completed").length}
              </p>
              <p className="text-slate-400">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        {refundableTickets.filter(t => t.refundStatus === "pending").length > 0 && (
          <div className="mb-8">
            <Button
              onClick={handleClaimAllRefunds}
              disabled={isClaimingRefund || isRefundProcessing}
              className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isClaimingRefund || isRefundProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing Refunds...
                </>
              ) : (
                <>
                  <DollarSign className="h-5 w-5 mr-2" />
                  Claim All Refunds ({totalRefundable} BASE)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Refundable Tickets List */}
        {refundableTickets.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Your Refundable Tickets</h2>
            {refundableTickets.map((ticket) => (
              <Card key={ticket.ticketId} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">
                            {ticket.eventName}
                          </h3>
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/50 mb-2">
                            Event Canceled
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar className="h-4 w-4" />
                          {ticket.eventDate}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapPin className="h-4 w-4" />
                          {ticket.location}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <DollarSign className="h-4 w-4" />
                          Ticket #{ticket.ticketId}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-2 border-t border-slate-600">
                        <div>
                          <p className="text-slate-400 text-sm">Refund Amount</p>
                          <p className="text-2xl font-bold text-green-400">
                            {ticket.paidAmount} BASE
                          </p>
                        </div>
                        {ticket.refundStatus !== "pending" && (
                          <Badge 
                            className={`${
                              ticket.refundStatus === "processing"
                                ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
                                : "bg-green-500/20 text-green-300 border-green-500/50"
                            }`}
                          >
                            {ticket.refundStatus === "processing" ? (
                              <>
                                <Clock className="h-3 w-3 mr-1 animate-spin" />
                                Processing
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {ticket.refundStatus === "pending" ? (
                        <Button
                          onClick={() => handleClaimRefund(ticket.ticketId)}
                          disabled={isClaimingRefund || refundingTickets.has(ticket.ticketId)}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 min-w-[140px]"
                        >
                          {refundingTickets.has(ticket.ticketId) ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Claiming...
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Claim Refund
                            </>
                          )}
                        </Button>
                      ) : ticket.refundStatus === "processing" ? (
                        <Button
                          disabled
                          variant="outline"
                          className="border-yellow-500/50 text-yellow-300 min-w-[140px]"
                        >
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Processing
                        </Button>
                      ) : (
                        <Button
                          disabled
                          variant="outline"
                          className="border-green-500/50 text-green-300 min-w-[140px]"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Refunded
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-16 text-center">
              <CheckCircle className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No Refunds Available</h3>
              <p className="text-slate-400 mb-6">
                You don't have any pending refunds. Refunds are automatically available when events are canceled.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-gradient-to-br from-slate-800/50 to-blue-900/20 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-400" />
              About Refunds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Refunds are processed automatically through smart contracts when events are canceled</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>You'll receive the full amount you paid for the ticket</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Refunds are sent directly to your wallet - no waiting for bank transfers</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Gas fees for claiming refunds are paid by you (network requirement)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Once claimed, the refund will appear in your wallet within minutes</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
