import { getNodeWeights } from "./rpcs.js"
import { MongoClient } from "mongodb"
import { CronJob } from "cron"
import { NodeWeight } from "./types.js"


async function main() {
    const client = new MongoClient("mongodb://127.0.0.1:27017")

    await client.connect()
    console.log(`Connected to database`)

    const dbName = "nodes"
    const DB = client.db(dbName)

    const cursor = await DB.listCollections()
    const known = await cursor.toArray()

    const nodesObject = await getNodeWeights()

    for (const address in nodesObject) {
        let data = {
            time: new Date() /*.split('T')[0]*/,
            rawWeight: nodesObject[address].weight,
        } as NodeWeight

        if (known.find(c => c.name === address) === undefined) {
            await DB.createCollection(address, {
                timeseries: { timeField: "time" }
            })
            console.log(`Creating new collection for ${address}`)
        }

        await DB.collection(address).insertOne(data)
        console.log(`Sampled ${address}`)

    }

    cursor.close()
    client.close()
    console.log(`Sampled ${Object.keys(nodesObject).length} nodes\nDisconnected from database\nNext cronjob scheduled for ${cronJob.nextDate()}`)
}

let cronJob = new CronJob(
    "0 12 * * *",
    () => main().catch(console.error)
)

cronJob.start()
console.log(`Started cronjob scheduled for ${cronJob.nextDate()}`)