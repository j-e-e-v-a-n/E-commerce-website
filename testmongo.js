const { MongoClient } = require('mongodb');

async function main() {
    const uri = "mongodb://localhost:27017";
    
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        console.log("Connected successfully");
        await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    const db = client.db("shopping");
    const collection = db.collection("product");
    const result = await collection.insertOne({ message: "Hello, world!" });
    } catch (err) {
        console.error(`Could not connect to MongoDB: ${err}`);
    } finally {
        
    }
}

main().catch(console.error);
