import 'dotenv/config'

// https://docs.nano.org/commands/rpc-protocol/

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

export async function getAccountWeight(nanoAddress: string): Promise<string> {
    const result = await fetch(process.env.NODE_RPC!, {
        method: "POST",
        body: JSON.stringify({
            "action": "account_weight",
            "account": nanoAddress
        }),
    })
    const data = await result.json()
    return data.weight
}