require('dotenv').config();
const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//// middleware configuration------------

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://foods-sharing.web.app',
    'https://foods-sharing.firebaseapp.com'
  ],
  credentials: true  // j kono jaiga theke data asle amra take access ditesi
}));
app.use(express.json());
app.use(cookieParser());  /// atar jonno amara sob jaiga theke cookie access korete pertesi

/// Create thek middleware and access the anything api this middleware ------------------------

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log("Tumi tomar api theke ai token ta access korte perteso", token)

  // token jodi na thake taile amra tare ekta error message dibo

  if (!token) {
    return res.status(401).send({ message: 'No token, authorization denied' });
  }

  // jodi token thake taile amra tare validations korbo -------------------
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Token is not valid' });
    }
    req.user = decoded;   /// joto jaigei token ta //// verify tokan ta user kora hobe toot jaigei decoded ta use kora hobe......
    next();
  })

}

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

        /// Jwt and Authorization and Api Authentication 

        app.post('/jwt', (req, res)=>{  /// ai post jwt api k authProvider er mordhe theke calll kora hoyse
          const user = req.body;
          const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '10h' })  //// jwt.sign mane tader function er mardhome jwt create kora hoy... user-------> mane j sing up korbe se hobe ekjob user. R jodi keu admin hoy taile oi khane amara admin or etc bosaiya dibo. tarpor expireIn mane use er token kotokkhon thakbe
          res.cookie("token", token,{
              httpOnly: true,
              secure: process.env.NODE_ENV==='production',  // jodi production na hoy taile auto false hoye jabe
              sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({success: true})   /// token ta jodi thik moto crate hoy taile amra font end a success ta dekhabo
      })

      /// logout user and clear the database ----------

      app.post('/logout', (req, res) => {
        res.clearCookie("token", {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production"
        })
        res.send({ success: true });
      })

    app.get("/foods", verifyToken, async (req, res) => {

      if(req.user?.email !== req.query?.email){
        return res.status(401).send({message: 'Unauthorized access'});
    }

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
    // my request food data get the clint side ***************************

    app.get("/myrequest", async (req, res) => {
      const email = req.query.email;
      const result = await foodRequestCollection.find({ userEamil: email }).toArray();
      res.send(result);
    })
    // delete my request food data get the clint side and sever side ***************************

    app.delete("/deletereq/:id", async (req, res) => {
      const id = req.params.id;
      const result = await foodRequestCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    })

    //// searching the database and showing the clint side ...............

    app.get('/food', async (req, res) => {
      const { searchParams } = req.query;
      let option = {};
      if (searchParams) {
        option = { foodName: { $regex: searchParams, $options: "i" } }
      }
      const movies = await foodCollection.find(option).toArray();
      res.send(movies);
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