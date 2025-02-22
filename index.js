require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 7000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// ----------------------------------------------------Middleware-------------------------------------------
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://task-management-applicat-1b939.web.app",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
// corsOptions
app.use(cors(corsOptions));
app.use(express.json());
// app.use(cookieParser);

// ✅ Connect to MongoDB Atlas
mongoose
  .connect(
    `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.cjt8m.mongodb.net/Task-Management-Application?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("✅ Successfully connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define Task Schema
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 50 },
  description: { type: String, maxlength: 200 },
  category: {
    type: String,
    enum: ["To-Do", "In Progress", "Done"],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
});

const Task = mongoose.model("Task", taskSchema);

// --------------------------------------------------MongoDB Connection--------------------------------------

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

    // ----------------------------------------Get all Task-------------------------------------------------
    app.get("/all-task", async (req, res) => {
      const result = await taskCollection.find().toArray();
      res.send(result);
    });

    // ----------------------------------------Get specific Task by id -------------------------------------------------
    app.get("/all-task/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await taskCollection.findOne(query);
      res.send(result);
    });

    // -----------------------------------------Update specific task-----------------------------------------
    app.put("/edit-task/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const update = req.body;
      const taskUpdate = {
        $set: {
          title: update.title,
          description: update.description,
          category: update.category,
        },
      };
      const result = await taskCollection.updateOne(
        filter,
        taskUpdate,
        options
      );
      res.send(result);
    });

    // ---------------------------------------Delete specific task-----------------------------------------
    app.delete("/task-delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await taskCollection.deleteOne(query);
      res.send(result);
    });

    // Delete a task
    // app.delete("/task-delete/:id", async (req, res) => {
    //   try {
    //     await Task.findByIdAndDelete(req.params.id);
    //     res.status(200).json({ message: "Task deleted successfully" });
    //   } catch (error) {
    //     res.status(500).json({ message: "Server error", error });
    //   }
    // });

    // Update task category
    app.put("/task-update/:id", async (req, res) => {
      try {
        const { category } = req.body;
        const updatedTask = await Task.findByIdAndUpdate(
          req.params.id,
          { category },
          { new: true }
        );
        res
          .status(200)
          .json({ message: "Task updated successfully", task: updatedTask });
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
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
