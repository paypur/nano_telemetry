import { getAccountWeight, getNodeWeights } from "./rpcs.js"
import { NodeWeight } from "./types.js"

import 'dotenv/config'
import { CronJob } from "cron"
import { MongoClient } from "mongodb"

async function main() {

    const USERNAME = encodeURIComponent(process.env.MONGODB_USER!)
    const PASSWORD = encodeURIComponent(process.env.MONGODB_PASS!)
    const URL = process.env.MONGODB_URL!
    const AUTH_MECH = "DEFAULT"
    const DATABASE = "nodes"
    
    const client = new MongoClient(`mongodb://${USERNAME}:${PASSWORD}@${URL}/?authMechanism=${AUTH_MECH}&authSource=${DATABASE}`, { tls: true })
    
    try {
        await client.connect()
        console.log('Connected to database')

        const DB = client.db(DATABASE)

        // filter interal mongodb stuff
        const cursor = DB.listCollections({name: {$not: {$regex: "^system.*" }}})
        let knownNodes = (await cursor.toArray()).map((collection) => {return collection.name})

        const nodesObject = await getNodeWeights()

        for (const address in nodesObject) {
            let data = {
                time: new Date() /*.split('T')[0]*/,
                rawWeight: nodesObject[address].weight,
            } as NodeWeight

            if (knownNodes.find(e => e === address) === undefined) {
                await DB.createCollection(address, {
                    timeseries: { timeField: "time" }
                })
                console.log(`Creating new collection for ${address}`)
            }

            // removes address from knownNodes
            knownNodes = knownNodes.filter(e => e !== address)

            await DB.collection(address).insertOne(data)
            console.log(`Sampled ${address}`)
        }

        console.log(`${knownNodes.length} Remaining known nodes`)
        
        // samples nodes that have been previously sampled but are currently offline
        for (const address of knownNodes) {
            let data = {
                time: new Date() /*.split('T')[0]*/,
                rawWeight: await getAccountWeight(address),
            } as NodeWeight

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