import { getNodeWeights } from "./rpcs.js";
import { MongoClient } from "mongodb";
import { CronJob } from "cron";
const client = new MongoClient("mongodb://127.0.0.1:27017");
async function getData() {
    let NodeWeightArray = [];
    const time = new Date().toISOString().split('T')[0];
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
async function writeToDB() {
    await client.connect();
    const dbName = "test";
    const db = client.db(dbName);
    const data = await getData();
    for (const nodeWeight of data) {
        const collection = db.collection(nodeWeight.address);
        await collection.insertOne({ weight: nodeWeight.weight, time: nodeWeight.time });
    }
    console.log("Successfully sampled " + data.length + " nodes");
}
let cronJob = new CronJob("0 12 * * *", () => writeToDB()
    .catch(console.error)
    .finally(() => setTimeout(() => { client.close(); }, 1000)));
cronJob.start();
