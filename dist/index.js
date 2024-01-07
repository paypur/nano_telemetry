import { getNodeWeights, getNonZeroRepresentatives } from "./rpcs.js";
import { MongoClient } from "mongodb";
async function getData() {
    let NodeWeightArray = [];
    const time = Date.now();
    const nodesObject = await getNodeWeights();
    for (const address in nodesObject) {
        NodeWeightArray.push({
            address: address,
            weight: nodesObject[address].weight,
            time: time,
        });
    }
    return NodeWeightArray;
}
async function main() {
    const client = new MongoClient("mongodb://127.0.0.1:27017");
    try {
        await client.connect();
        const dbName = "test";
        const db = client.db(dbName);
        console.log(`Connected successfully to ${dbName}`);
        let nodeArray = await getNonZeroRepresentatives();
        nodeArray = nodeArray.sort((a, b) => b[1] - a[1]);
        for (const node of nodeArray) {
            const collection = db.collection("reps");
            const cursor = collection.find({
                'address': node[0]
            });
            if (await cursor.next() === null) {
                await collection.insertOne({ address: node[0], telemetry: {}, telemetryArray: [] });
            }
            else {
                await collection.updateOne({ address: node[0] }, { $push: {
                        telemetryArray: {},
                        $sort: { date: -1 }
                    } });
            }
        }
        console.log(`Finished writing to ${dbName}`);
    }
    finally {
        await client.close();
    }
}
main()
    .catch(console.error);
