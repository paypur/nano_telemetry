import 'dotenv/config'
import { NodeTelemetry } from './types.js'

const NODE_RPC = process.env.NODE_IP
const RAW_TO_NANO = 1e+30

export async function getNodeWeights() {
    const result = await fetch(NODE_RPC!, {
        method: "POST",
        body: JSON.stringify({
            "action": "representatives_online",
            "weight": "true"
        })
    })
    const data = await result.json()
    return data.representatives
}

export async function getNonZeroRepresentatives() {
    const result = await fetch(NODE_RPC!, {
        method: "POST",
        body: JSON.stringify({
            "action": "representatives"
        })
    })
    const data = await result.json()

    let repWeightArray: any[][] = []

    for (var key in data.representatives) {
        // fillter out reps with less than 100 Nano voting weight
        if (parseInt(data.representatives[key]) >= 100 * RAW_TO_NANO) {
            repWeightArray.push([key, parseInt(data.representatives[key])])
        }
    }

    return(repWeightArray)
}

export async function getTelemetry(): Promise<NodeTelemetry[]> { 
    const result = await fetch(NODE_RPC!, {
        method: "POST",
        body: JSON.stringify({
            "action": "telemetry",
            "raw": "true"
        })
    })
    const data = await result.json()
    return data.metrics
}