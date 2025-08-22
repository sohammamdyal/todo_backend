const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
app.use(cors());

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const jwt = require("jsonwebtoken");
const moment = require("moment");

mongoose.connect("mongodb+srv://soham:soham@cluster0.jp3uqwb.mongodb.net/")
    .then(() => {
        console.log("connected to mongodb");
    }).catch((error) => {
        console.log("error connection to mongodb", error);
    });
app.listen(3000, () => {
    console.log("server is running on port 3000");
});

const User = require("./models/user");
const Todo = require("./models/todo");

app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        //check if email already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("Email already registered");
        }

        const newUser = new User({
            name,
            email,
            password,
        });

        await newUser.save();
        res.status(202).json({ message: "User Registered successfully" });
    } catch (error) {
        console.log("Error registering the user", error);
        res.status(500).json({ message: "Registration failed" });
    }
});

const generateSecretKey = () => {
    const secretkey = crypto.randomBytes(32).toString("hex");

    return secretkey;
};

const secretKey = generateSecretKey();

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid Email" });
        }

        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid Password" });
        }

        const token = jwt.sign({ userId: user._id }, secretKey);
        res.status(200).json({ token });
    } catch (error) {
        console.log("Login Failed", error);
        res.status(500).json({ message: "Login Failed" });
    }
});

app.post("/todos/:userId", async (req, res) => {
    try {
        const userId = req.params.userId
        const { title, category } = req.body;

        const newTodo = new Todo({
            title,
            category,
            dueDate: moment().format("YYYY-MM-DD")
        });

        await newTodo.save();

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ error: "User not found" })
        }
        user?.todos.push(newTodo._id);
        await user.save();

        res.status(200).json({ message: "Todo Added Successfully", todo: newTodo });
    } catch (error) {
        res.status(200).json({ message: "Todo not added" })
    }
});

app.get("/users/:userId/todos", async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await User.findById(userId).populate("todos");
        if (!user) {
            res.status(404).json({ error: "user not found" })
        }

        res.status(200).json({ todos: user.todos });
    } catch (error) {
        res.status(500).json({ error: "something went wrong" })
    }
});

app.patch("/todos/:todoId/complete", async (req, res) => {
    try {
        const todoId = req.params.todoId;

        const updatedTodo = await Todo.findByIdAndUpdate(todoId, {
            status: "completed",
        }, { new: true });
        if (!updatedTodo) {
            return res.status(404).json({ error: "Todo not found" })
        }
        res.status(200).json({ message: "Todo marks as complete", todo: updatedTodo });
    } catch (error) {
        res.status(500).json({ error: "something went wrong" })
    }
});

app.get("/todos/completed/:date",async(req,res) => {
    try{
        const date = req.params.date;

        const completedTodos = await Todo.find({
            status:"completed",
            createdAt:{
                $gte: new Date(`${date}T06:50:10.445Z`),
                $lt: new Date(`${date}T15:53:35.405Z`),
            },
        }).exec();

        res.status(200).json({completedTodos})
    }catch(error){
        res.status(500).json({error:"Something went wrong"})
    }
});


app.get("/todos/count",async(req,res) => {
        try{
            const totalCompletedTodos = await Todo.countDocuments({
                status:"completed"
            }).exec()

            const totalPendingTodos = await Todo.countDocuments({
                status:"pending"
            }).exec();

            res.status(200).json({totalCompletedTodos,totalPendingTodos})
        }catch(error){
            res.status(500).json({error:"network error"})
        }
})