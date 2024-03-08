import 'dotenv/config'

export async function getNodeWeights() {
    const result = await fetch(process.env.NODE_RPC!, {
        method: "POST",
        body: JSON.stringify({
            "action": "representatives_online",
            "weight": "true"
        })
    })
    const data = await result.json()
    return data.representatives
}