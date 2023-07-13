import { getNodeWeights } from "./rpcs.js";
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
const client = new MongoClient("mongodb://127.0.0.1:27017");
async function main() {
    await client.connect();
    console.log('Connected successfully to server');
    const dbName = "test";
    const db = client.db(dbName);
    const data = await getData();
    for (const nodeWeight of data) {
        const collection = db.collection(nodeWeight.address);
        await collection.insertOne({ weight: nodeWeight.weight, time: nodeWeight.time });
    }
    return 'done';
}
main()
    .then(console.log)
    .catch(console.error)
    .finally(() => setTimeout(() => { client.close(); }, 1000));
