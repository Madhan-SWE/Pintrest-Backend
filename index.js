const express = require("express");
const nodemailer = require("nodemailer");
const fileUpload = require("express-fileupload");
const mongodb = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const randomstring = require("randomstring");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.use(fileUpload());

const { authorizeUser } = require("./customMiddleWares/authentication");
const { sendMail } = require("./appUtils/appUtils");

const ObjectId = mongodb.ObjectID;
const port = process.env.PORT;
const dbName = process.env.DBNAME;
const dbUrl = process.env.DBURL;
const gmailUserName = process.env.GMAILID;
const gmailPassword = process.env.GMAILPASSWORD;
const frontEnd = process.env.FRONTEND;

app.listen(port, () => console.log("App is running in port: ", port));

app.post("/register", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db(dbName);
        let data = req.body;
        let salt = await bcrypt.genSalt(8);
        let result = await db
            .collection("users")
            .findOne({ email: data.email });

        if (result) {
            res.status(409).json({
                result: false,
                message: "User Already exists!",
                status: 409,
            });
            return;
        }
        data.status = "inactive";
        data.activationToken = randomstring.generate();
        data.passwordModificationToken = "";
        data.password = await bcrypt.hash(data.password, salt);
        let link = frontEnd + "/activateuser/" + data.activationToken;
        let message =
            "<p style='color:black;font-weight:bold'> Please click the below url to verify your account </p> <br>" +
            "<a href='" +
            link +
            "'>" +
            link +
            "</a>";
        let subject = "Account Verification";

        result = await sendMail(
            data.email,
            message,
            subject,
            gmailUserName,
            gmailPassword
        );

        result = await db.collection("users").insertOne(data);
        res.status(200).json({
            message:
                "Registration successful, Please check your email to activate your account.",
            result: true,
            status: 200,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
            status: 500,
        });
    }
});

app.get("/users/active/:token", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db(dbName);
        let result = await db
            .collection("users")
            .findOne({ activationToken: req.params.token });
        if (!result) {
            res.status(400).json({
                result: false,
                message: "Please enter a valid activation URL!",
                status: 400,
            });
            return;
        }

        result = await db.collection("users").findOneAndUpdate(
            {
                activationToken: req.params.token,
            },
            {
                $set: {
                    status: "active",
                },
            }
        );
        res.status(200).json({
            message: "User Activation successful, Please Login.",
            result: true,
            status: 200,
        });
    } catch (err) {
        res.status(500).json({
            message: "Internal Server error",
            result: false,
            status: 500,
        });
    }
});

app.post("/login", async (req, res) => {
    try {
        console.log(req)
        let client = await mongodb.connect(dbUrl);
        let db = client.db(dbName);
        let data = await db
            .collection("users")
            .findOne({ email: req.body.email });
        if (data) {
            if (data.status !== "active") {
                res.status(409).json({
                    result: false,
                    message:
                        "Account not activated, Please activate Your account",
                });
                client.close();
                return;
            }
            let isValid = await bcrypt.compare(
                req.body.password,
                data.password
            );
            if (isValid) {
                let token = await jwt.sign(
                    {
                        userId: data._id,
                        email: data.email,
                    },
                    process.env.JWTKEY,
                    { expiresIn: "1h" }
                );
                res.status(200).json({
                    result: true,
                    message: "login successful",
                    token: token,
                    status: 200,
                });
            } else {
                res.status(403).json({
                    result: false,
                    message: "invalid username or password!",
                    status: 400,
                });
            }
        } else {
            res.status(401).json({
                result: false,
                message: "Email ID is not registered",
                status: 401,
            });
        }
        client.close();
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Internal Server error",
            result: false,
            status: 500,
        });
    }
});


app.get("/users/forgotPassword/:email", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db(dbName);
        let email = req.params.email;

        passwordModificationToken = randomstring.generate();

        let link = frontEnd + "/changePassword/email/" +  email + "/token/" + passwordModificationToken;
        let message = "<p style='color:black;font-weight:bold'> Please click the below url to change Password</p> <br>" + 
        "<a href='" + link + "'>" + link + "</a>";
        let subject = "Password Reset Link"
        let wait = await sendMail(email, message, subject, gmailUserName, gmailPassword);


        let result = await db.collection("users").findOne({email: req.params.email});
        result = await db.collection("users").findOneAndUpdate({
            email: email
        }, {
            $set: {
                passwordModificationToken: passwordModificationToken
            }
        });
        res.status(200).json({message: "Please check your email to reset password.", result: true, status: 200});
    } catch (err) {
        console.log(err)
        res.status(500).json({message: "Internal server error", result: false, status: 500});
    }
});


app.post("/users/passwordReset/:email", async (req, res) => {
    try {
        
        let client = await mongodb.connect(dbUrl);
        let db = client.db(dbName);
        let email = req.params.email
        let token = req.body.token
        console.log({passwordResetToken: token, email: email})
        let result = await db.collection("users").findOne({passwordModificationToken: token, email: email});
        console.log(result)
        if (! result) {
            res.status(400).json({result: false, message: "Please enter a valid activation URL!", status: 400});
            return;
        }

        res.status(200).json({message: "User authenticated successfully", result: true, status: 200});
    } catch (err) {
        res.status(500).json({message: "Internal Server error", result: false, status: 500});
    }
});

app.post("/users/changePassword/:email", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db(dbName);
        let newPassword = req.body.password;
        let result = await db.collection("users").findOne({email: req.params.email});
        let salt = await bcrypt.genSalt(8);
        if (! result) {
            res.status(404).json({result: false, message: "User Not found!", status: 404});
            return;
        }
        result = await db.collection("users").findOneAndUpdate({
            email: req.params.email
        }, {
            $set: {
                password: await bcrypt.hash(newPassword, salt),
                passwordModificationToken: ""
            }
        });
        res.status(200).json({message: "Password Reset Successful!", result: true, status: 200});
    } catch (err) {
        res.status(500).json({message: "Internal server error", result: false, status: 500});
    }
});

app.post("/isLoggedIn", [authorizeUser], async (req, res) => {
    try {
        res.status(200).json({message: "Logged In", result: true, status: 200});
    } catch (err) {
        res.status(500).json({message: "Internal server error", result: false, status: 500});
    }
});

app.post("/boards", [authorizeUser], async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db(dbName);
        let data = req.body;
        console.log(req.body)
        let result = await db
            .collection("boards")
            .findOne({ email: data.email, boardname: data.boardname });
          
        if (result) {
            res.status(409).json({
                result: false,
                message: "Board Already exists!, Please use a different name.",
                status: 409,
            });
            return;
        }

        data.pins = [];
        result = await db.collection("boards").insertOne(data);
        res.status(200).json({
            message:
                "Board Creation successful!",
            result: true,
            status: 200,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
            status: 500,
        });
    }
});

app.post("/boards/:email", [authorizeUser], async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db(dbName);
        let email = req.params.email;
        let result = await db
            .collection("boards")
            .find({ email: email });
          
        if (result) {
            result = await result.toArray()
            res.status(200).json({
                result: true,
                data: result,
                status: 200
            });
            return;
        }
        else{
            res.status(404).json({
                result: false,
                message: "No boards exists for user"
            })
        }
        

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
            status: 500,
        });
    }
});

// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/index.html');
//   });

//   app.post('/pin', async (req, res) => {
//     try {
//         if (!req.files) {
//             return res.status(500).json({ status: 500, message: "Image not found !", result: false})
//         }

//         const pinImage=req.files.file;
//         console.log(pinImage.name)
//         pinImage.mv(`${__dirname}/public/${pinImage.name}`, function (err) {
//             if (err) {
//                 console.log(err)
//                 return res.status(500).json({ message: "Failed to upload file", status: 500, result: false });
//             }
//             return res.status(200).json({status: 200, message: "File Upload successful!", result: true,
//         name: pinImage.name, path: `/${pinImage.name}`})
//         })
//     }
//     catch (err) {

//         console.log(err);
//         res.status(500).json({
//             message: "Internal server error",
//             result: false,
//         });
//     }
//   });
