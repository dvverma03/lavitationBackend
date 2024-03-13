const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const CookieParser = require("cookie-parser");
const { DATABASE_NAME } = require("./src/constants.js");
require("dotenv").config();
const User = require("./src/models/user.model.js");
const Product = require("./src/models/product.model.js");

const app = express();
app.use(express.json());
const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(CookieParser());

// app.use(function(req,res,next) {
//   jwt.verify(req.cookies['token'], process.env.ACCESS_TOKEN_SECRET, function(err, decodedToken) {
//     if(err) { /* handle token err */ }
//     else {
//      req.userId = decodedToken._id;   // Add to req object
//      next();
//     }
//   });
//  });

mongoose
  .connect(process.env.DATABASE_URL, {
    autoIndex: true,
    useNewUrlParser: true, // Add this option to avoid deprecation warning
    useUnifiedTopology: true, // Add this option to avoid deprecation warning
  })
  .then(() => {
    console.log(`MongoDB connected !! DB HOST: ${mongoose.connection.host}`);
  })
  .catch((err) => {
    console.error("MONGODB connection FAILED ", err);
    process.exit(1);
  });

app.post("/register", (req, res) => {
  const { fullName, email, password } = req.body;
  const user1 = User.findOne({ email: email });
  if (user1) res.json("user already exist");
  bcrypt
    .hash(password, 10)
    .then((hash) => {
      User.create({ fullName, email, password: hash })
        .then((user) => {
          const token = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            {
              expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            }
          );

          User.findByIdAndUpdate(user._id, { token: token }, { new: true })
            .then((updatedUser) => {
              res.cookie("token", token);
              res.json({ status: "ok", user: updatedUser._id, token: token });
            })
            .catch((err) => res.status(500).json(err));
        })
        .catch((err) => res.status(500).json(err));
    })
    .catch((err) => res.status(500).json(err));
});

// app.post("/register", (req, res) => {
//   const { fullName, email, password } = req.body;
//   bcrypt
//     .hash(password, 10)
//     .then((hash) => {
//       User.create({ fullName, email, password: hash })
//         .then((user) => {
//           const token = jwt.sign(
//             { userId: user._id },
//             process.env.ACCESS_TOKEN_SECRET,
//             {
//               expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
//             }
//           );
//           res.cookie("token", token, { httpOnly: true });
//           res.json({ status: "ok", user:user._id, token: token });
//         })
//         .catch((err) => res.status(500).json(err));
//     })
//     .catch((err) => res.status(500).json(err));
// });

app.post("/add-invoice", async (req, res) => {
  console.log(req.body);
  const loginId = req?.body?.userId;
  const { product, rate, total, quantity } = req.body;
  const pro = { product, rate, total, quantity };
  console.log(loginId);

  try {
    const user = await User.findByIdAndUpdate(
      loginId,
      { $push: { products: pro } },
      { new: true }
    );

    console.log("User:", user);
    res.json({ status: "ok", message: "Product added to user's products" });
  } catch (err) {
    console.error("Error adding product to user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email: email }).then((user) => {
    if (user) {
      console.log(user);
      bcrypt.compare(password, user.password, (err, response) => {
        if (response) {
          const Token = jwt.sign(
            {
              _id: user._id,
              email: user.email,
              username: user.username,
              fullName: user.fullName,
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
              expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            }
          );
          User.findByIdAndUpdate(
            user._id,
            { token: Token },
            { new: true }
          ).then((updatedUser) => {
            res.cookie("token", Token);
            console.log(updatedUser);
            console.log(updatedUser.products);
            return res.json(updatedUser);
          }).catch((err) => {
            console.error("Error updating token:", err);
            return res.status(500).json({ error: "Internal server error" });
          });
        } else {
          return res.json("Password is incorrect");
        }
      });
    } else {
      return res.json("No record found");
    }
  });
});

app.post("/logout", (req, res) => {
  const { token1 } = req.body;
  User.findOne({ token: token1 }).then((user) => {
    if (user) {
      const token2 = Math.random()+ new Date()
      User.findByIdAndUpdate(
        user._id,
        { token: token2 },
        { new: true }
      ).then((updatedUser) => {
        return res.json(updatedUser);
      }).catch((err) => {
        console.error("Error updating token:", err);
        return res.status(500).json({ error: "Internal server error" });
      });
    } else {
      return res.json("Password is incorrect");
    }
  });
});

// app.post("/login", (req, res) => {
//   const { email, password } = req.body;
//   User.findOne({ email: email }).then((user) => {
//     if (user) {
//       console.log(user);
//       bcrypt.compare(password, user.password, (err, response) => {
//         if (response) {
//           const Token = jwt.sign(
//             {
//               _id: user._id,
//               email: user.email,
//               username: user.username,
//               fullName: user.fullName,
//             },
//             process.env.ACCESS_TOKEN_SECRET,
//             {
//               expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
//             }
//           );
//           res.cookie("token", Token);
//           console.log(user);
//           console.log(user.products);
//           return res.json(user);
//         } else {
//           return res.json("Password is incorrect");
//         }
//       });
//     } else {
//       return res.json("No record find");
//     }
//   });
// });

app.post("/browse", (req, res) => {
  const { token1 } = req.body;
  User.findOne({ token: token1 }).then((user) => {
    console.log(user)
    if (user) {
      return res.json(user);
    } else {
      return res.json("Password is incorrect");
    }
  });
});

app.listen(1234, () => {
  console.log(`server is running at port${1234}`);
});
