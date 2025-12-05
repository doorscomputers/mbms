"use client"

import { useEffect } from "react"
import config from "devextreme/core/config"

const LICENSE_KEY = "ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogIjgyYWM4Yzg5LTU5ZmEtNDhiNi1hNTY1LTA3NWFhOGVkNDU0ZCIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUxCn0=.PSjcfNSOAoDXki/sjqBEsGUziPFOsDWgJrEoIguTNIpy7MicCu4zvTgcUUB6ok9i+lf2AYeUXJ8cyq2Nn1WTeVWWFJdgMsF0pTiFZObyiUuq18qw64El+H1bybYg1VqNeXODUQ=="

// Initialize license immediately when module loads (client-side only)
if (typeof window !== "undefined") {
  config({ licenseKey: LICENSE_KEY })
}

export function DevExtremeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure license is set on mount as well
    config({ licenseKey: LICENSE_KEY })
  }, [])

  return <>{children}</>
}
