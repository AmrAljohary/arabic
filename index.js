const express = require("express");
const asyncHandler = require("express-async-handler");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const expressSession = require("express-session");
const MemoryStore = require("memorystore")(expressSession);
const passport = require("passport");
const flash = require("connect-flash");
const request = require("request");
const connectDB = require("./db");
const app = express();
const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");
const PORT = process.env.PORT;
app.use(
  cors({
    origin:["http://localhost:3000", "https://test-api-one-pi.vercel.app", "http://localhost:4173","http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
mongoose.set("strictQuery", false);
connectDB();
app.use(cookieParser("random"));
app.use(
  expressSession({
    secret: "random",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(require("./controller/routes.js"));

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
