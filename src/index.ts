import { getNodeWeights, getNonZeroRepresentatives, getTelemetry } from "./rpcs.js"
import { MongoClient } from "mongodb"
import { NodeWeight } from "./types.js"

async function getData() {
    let NodeWeightArray: NodeWeight[] = []
    const time = Date.now()
    const nodesObject = await getNodeWeights()
    
    for (const address in nodesObject) {
        NodeWeightArray.push({
            address: address,
            weight: nodesObject[address].weight,
            time: time,
        })

    }

    return NodeWeightArray
}


async function main() {

    const client = new MongoClient("mongodb://127.0.0.1:27017");

    try {

        await client.connect();
        const dbName = "test" 
        const db = client.db(dbName);
        const collection = db.collection("reps");
        
        console.log(`Connected successfully to ${dbName}`);
    
        // let nodeArray = await getNonZeroRepresentatives()
        // nodeArray = nodeArray.sort((a, b) => b[1] - a[1])
    
        let nodeArray = await getTelemetry()

        for (const node of nodeArray) {
            const cursor = collection.find({
                "node_id": node.node_id
            });

            const telemetry = {
                bandwidth_cap: node.bandwidth_cap,
                protocol_version: node.node_id,
                uptime: node.uptime,
                genesis_block: node.genesis_block,
                major_version: node.major_version,
                minor_version: node.minor_version,
                patch_version: node.patch_version,
                pre_release_version: node.pre_release_version,
                maker: node.maker,
                timestamp:  node.timestamp,
                active_difficulty: node.active_difficulty,
                node_id: node.node_id,
                signature: node.signature,
                port: node.port,
                address: node.address,
            }

            const telemetryArray = {
                block_count: node.block_count,
                cemented_count: node.cemented_count,
                unchecked_count: node.unchecked_count,
                account_count: node.account_count,
                peer_count: node.peer_count,
            }

            if (await cursor.next() === null) {
                await collection.insertOne({ node_id: node.node_id, telemetry: {}, telemetryArray: [] })
            }
            else {
                await collection.updateOne(
                    { node_id: node.node_id },
                    { $set: {
                        telemetry: {},
                    }}
                )
                await collection.updateOne(
                    { node_id: node.node_id },
                    { $push: {
                        telemetryArray: {},
                        $sort: { date: -1 }
                    }}
                )
            }

        }

        console.log(`Finished writing to ${dbName}`)
    }
    finally {
        await client.close()
    }

}

main()
  .catch(console.error)