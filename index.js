require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 7000;

// ----------------------------------------------------Middleware-------------------------------------------
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
// corsOptions
app.use(cors(corsOptions));
app.use(express.json());
// app.use(cookieParser);

// --------------------------------------------------MongoDB Connection--------------------------------------

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.cjt8m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // ------------------------------------------DB Collection------------------------------------------
    const db = client.db("Task-Management-Application");
    const usersCollection = db.collection("users");
    const taskCollection = db.collection("task");

    // ----------------------------------------Generate jwt token-----------------------------------------
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // -----------------------------------------Logout(Check JWT)-----------------------------------------
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (err) {
        res.status(500).send(err);
      }
    });

    // -----------------------------------------save user in database---------------------------------------
    app.post("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = req.body;
      // check if user exists in db
      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        return res.send(isExist);
      }
      const result = await usersCollection.insertOne({
        ...user,
        timestamp: Date.now(),
      });
      res.send(result);
    });

    // ----------------------------------------Add Task---------------------------------------------------
    app.post("/add-task", async (req, res) => {
      const task = req.body;
      const result = await taskCollection.insertOne(task);
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
// --------------------------------------------------MongoDB Connection--------------------------------------

// --------------------------------------------------port run-----------------------------------------------
app.get("/", (req, res) => {
  res.send("Task Management Application ");
});

app.listen(port, () => {
  console.log("Port is running on port", port);
});
