import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { hardhat } from 'wagmi/chains'

export const config = createConfig({
  chains: [hardhat],
  connectors: [injected()],
  transports: {
    [hardhat.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
})
