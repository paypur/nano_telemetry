import { getNodeWeights } from "./rpcs.js"
import { NodeWeight } from "./types.js"

import 'dotenv/config'
import { CronJob } from "cron"
import { MongoClient } from "mongodb"

async function main() {

    const username = encodeURIComponent(process.env.MONGODB_USER!)
    const password = encodeURIComponent(process.env.MONGODB_PASS!)
    const url = process.env.MONGODB_URL!
    const authMechanism = "DEFAULT"
    const database = "nodes"
    
    const client = new MongoClient(`mongodb://${username}:${password}@${url}/?authMechanism=${authMechanism}&authSource=${database}`, { tls: true })
    
    try {
        await client.connect()
        console.log('Connected to database')

        const DB = client.db(database)

        const cursor = DB.listCollections()
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
        console.log(`Sampled ${Object.keys(nodesObject).length} nodes\nDisconnected from database\nNext cronjob scheduled for ${cronJob.nextDate()}`)
    }   
    catch (error) {
        console.error(error)
    }
    finally {
        await client.close()
    }
    
}

let cronJob = new CronJob(
    "0 12 * * *",
    () => main()
)

cronJob.start()
console.log(`Started cronjob scheduled for ${cronJob.nextDate()}`)