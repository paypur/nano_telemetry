import 'dotenv/config';
const NODE_RPC = `http://${process.env.NODE_IP}:7076`;
export async function getNodeWeights() {
    const result = await fetch(NODE_RPC, {
        method: "POST",
        body: JSON.stringify({
            "action": "representatives_online",
            "weight": "true"
        })
    });
    const data = await result.json();
    return data.representatives;
}
export async function getNonZeroRepresentatives() {
    const result = await fetch(NODE_RPC, {
        method: "POST",
        body: JSON.stringify({
            "action": "representatives"
        })
    });
    const data = await result.json();
    const RAW_TO_NANO = 1e+30;
    let repWeightArray = [];
    for (var key in data.representatives) {
        // fillter out reps with less than 100 Nano voting weight
        if (parseInt(data.representatives[key]) >= 100 * RAW_TO_NANO) {
            repWeightArray.push([key, parseInt(data.representatives[key])]);
        }
    }
    return (repWeightArray);
}
