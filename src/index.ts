import { getAccountWeight, getNodeWeights } from "./rpcs.js"
import { NodeWeight } from "./types.js"

import 'dotenv/config'
import { CronJob } from "cron"
import { MongoClient } from "mongodb"

const USERNAME = encodeURIComponent(process.env.MONGODB_USER!)
const PASSWORD = encodeURIComponent(process.env.MONGODB_PASS!)
const URL = process.env.MONGODB_URL!
const AUTH_MECH = "DEFAULT"
const DATABASE = "NodeWeights"

async function move(source: MongoClient, destination: MongoClient) {
    try {
        await source.connect()
        const sourceDB = source.db("nodes")
        console.log('Connected to source DB')

        await destination.connect()
        const destinationDB = destination.db("NodeWeights")
        console.log('Connected to destination DB')

        // filter interal mongodb stuff
        const cursor = sourceDB.listCollections({ name: { $not: { $regex: "^system.*" } } })
        let knownNodes = (await cursor.toArray()).map((collection) => { return collection.name }).sort()

        let counter = 0
        let nodeCounter = 0
        for (const node of knownNodes) {
            const data = await sourceDB.collection(node).find({}).toArray()
            for (let day of data) {
                if (day.extrapolation !== undefined) {
                    // 12 am pst
                    day.time = new Date(new Date(day.time).getTime() + 68400000)
                }
                counter++
                destinationDB.collection(node).insertOne(day)
            }
            nodeCounter++
        }

        console.log(`Copied ${nodeCounter} nodes, ${counter} data points`)

        await cursor.close()
    }
    catch (error) {
        console.error(error)
    }
    finally {
        setTimeout(() => source.close(), 1000)
        setTimeout(() => destination.close(), 1000)
    }
}

async function fill(date: string) {
    const client = new MongoClient(`mongodb://${USERNAME}:${PASSWORD}@${URL}/?authMechanism=${AUTH_MECH}&authSource=${DATABASE}`, { tls: true })
    try {
        const today = new Date(new Date(date).getTime() + 68400000)
        const tomorrow = new Date(new Date(today).setDate(today.getDate() + 1))
        const yesterday = new Date(new Date(today).setDate(today.getDate() - 1))

        await client.connect()
        console.log('Connected to database')

        const DB = client.db(DATABASE)

        // filter interal mongodb stuff
        const cursor = DB.listCollections({ name: { $not: { $regex: "^system.*" } } })
        let knownNodes = (await cursor.toArray()).map((collection) => { return collection.name }).sort()

        let counter = 0
        for (const node of knownNodes) {
            const dataToday = await DB.collection(node).findOne({ time: { $gte: today, $lt: tomorrow } })
            const dataYesterday = await DB.collection(node).findOne({ time: { $gte: yesterday, $lt: today } })

            if (dataToday === null && dataYesterday !== null) {
                DB.collection(node).insertOne({
                    time: today,
                    rawWeight: dataYesterday.rawWeight,
                    extrapolation: true
                } as NodeWeight)
                counter++
                console.log(`Extrapolated data for ${node} on ${date}`)
            }
        }

        await cursor.close()
        console.log(`${counter} data points added`)
    }
    catch (error) {
        console.error(error)
    }
    finally {
        setTimeout(() => client.close(), 1000)
    }
}

async function main() {
    const client = new MongoClient(`mongodb://${USERNAME}:${PASSWORD}@${URL}/?authMechanism=${AUTH_MECH}&authSource=${DATABASE}`, { tls: true })
    try {
        await client.connect()
        console.log('Connected to database')

        const DB = client.db(DATABASE)

        // filter interal mongodb stuff
        const cursor = DB.listCollections({ name: { $not: { $regex: "^system.*" } } })
        let knownNodes = (await cursor.toArray()).map((collection) => { return collection.name })

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
                offline: true
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
        setTimeout(() => client.close(), 1000)
    }

}

let cronJob = new CronJob(
    "0 12 * * *",
    () => main()
)

cronJob.start()
console.log(`Started cronjob scheduled for ${cronJob.nextDate()}`)

// input validation sucks
// await fill("2024-03-20")

// move(new MongoClient(`mongodb://${USERNAME}:${PASSWORD}@${URL}/?authMechanism=${AUTH_MECH}&authSource=${DATABASE}`, { tls: true }),
//     new MongoClient(`mongodb://nodeWeightsRW:${PASSWORD}@${URL}/?authMechanism=${AUTH_MECH}&authSource=NodeWeights`, { tls: true }))