import 'dotenv/config'

const NODE_RPC = process.env.NODE_IP

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