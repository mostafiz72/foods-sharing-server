require('dotenv').config();
const express = require('express')
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//// middleware configuration------------

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

/// mongodb configuration starting here now ---------------


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.eywn0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to MongoDB!");

    // Use the client to perform database operations
    const foodCollection = client.db("foodSharing").collection("foods");
    const foodRequestCollection = client.db("foodSharing").collection("requesfoods");

    app.get("/foods", async (req, res) => {
      const result = await foodCollection.find().toArray();
      res.send(result);
    })

    // get the single foods data --------

    app.get("/food/:id", async (req, res) => {
      const id = req.params.id;
      const result = await foodCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    })

    app.get("/allfoods", async (req, res) => {
      const result = await foodCollection.find().limit(6).sort({ quantity: -1 }).toArray();
      res.send(result);
    })

    //// get the posted user data ---------------

    app.get("/posted", async (req, res) => {
      const email = req.query.email;
      const result = await foodCollection.find({ "donator.email": email }).toArray();
      res.send(result);
    })

    /// Update Movie data in database and UI 
    app.put('/update/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateFood = req.body;
      const updated = {
        $set: {
          foodName: updateFood.foodName,
          foodImg: updateFood.foodImg,
          quantity: updateFood.quantity,
          location: updateFood.location,
          updateFood: updateFood.updateFood,
          foodStatus: updateFood.foodStatus
        }
      }
      const result = await foodCollection.updateOne(filter, updated, options);
      res.send(result);
    })

    // delete my posted food data form mongodb ***************************

    app.delete("/delete/:id", async (req, res) => {
      const id = req.params.id;
      const result = await foodCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    })

    // request my posted food data in mongodb ***************************

    app.post("/request", async (req, res) => {
      const foodData = req.body;
      const result = await foodRequestCollection.insertOne(foodData);
      res.send(result);
    })

    /// add foods data save in mongodb database

    app.post("/addfoods", async (req, res) => {
      const foodData = req.body;
      const result = await foodCollection.insertOne(foodData);
      res.send(result);
    })


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})