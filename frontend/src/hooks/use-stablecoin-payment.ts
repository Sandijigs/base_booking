import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { toast } from 'sonner'
import { parseUnits } from 'viem'

// Base Mainnet USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
// Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e

export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base Mainnet
export const USDT_ADDRESS = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' // Base Mainnet

const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export type PaymentToken = 'NATIVE' | 'USDC' | 'USDT'

export interface UseStablecoinPaymentResult {
  approveToken: (token: PaymentToken, spender: string, amount: string) => Promise<void>
  isApproving: boolean
  isApproved: boolean
  checkAllowance: (token: PaymentToken, owner: string, spender: string) => Promise<bigint>
  getTokenAddress: (token: PaymentToken) => string | null
}

export function useStablecoinPayment(): UseStablecoinPaymentResult {
  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const { address } = useAccount()

  const { writeContract, data: approveHash } = useWriteContract()
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  const getTokenAddress = (token: PaymentToken): string | null => {
    switch (token) {
      case 'USDC':
        return USDC_ADDRESS
      case 'USDT':
        return USDT_ADDRESS
      default:
        return null
    }
  }

  const approveToken = async (
    token: PaymentToken,
    spender: string,
    amount: string
  ): Promise<void> => {
    if (token === 'NATIVE') {
      toast.error('Native token does not require approval')
      return
    }

    const tokenAddress = getTokenAddress(token)
    if (!tokenAddress) {
      toast.error('Invalid token')
      return
    }

    try {
      setIsApproving(true)
      
      // USDC and USDT use 6 decimals
      const decimals = 6
      const amountInUnits = parseUnits(amount, decimals)

      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender as `0x${string}`, amountInUnits],
      })

      toast.info('Approving token... Please confirm the transaction')
    } catch (error) {
      console.error('Approval error:', error)
      toast.error('Failed to approve token')
      setIsApproving(false)
    }
  }

  const checkAllowance = async (
    token: PaymentToken,
    owner: string,
    spender: string
  ): Promise<bigint> => {
    if (token === 'NATIVE') return BigInt(0)

    const tokenAddress = getTokenAddress(token)
    if (!tokenAddress) return BigInt(0)

    // This would need to use readContract from wagmi
    // For now, returning 0 - implement with useReadContract in production
    return BigInt(0)
  }

  // Update approval status when transaction succeeds
  if (isApproveSuccess && isApproving) {
    setIsApproved(true)
    setIsApproving(false)
    toast.success('Token approved successfully!')
  }

  return {
    approveToken,
    isApproving,
    isApproved,
    checkAllowance,
    getTokenAddress,
  }
}
