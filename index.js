const express = require("express");
const fileUpload = require('express-fileupload');
const mongodb = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv")


dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));
app.use(fileUpload());

const ObjectId = mongodb.ObjectID;
const port = process.env.PORT;


app.listen(port, () => console.log("App is running in port: ", port));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });



  app.post('/pin', async (req, res) => {
    try {
        if (!req.files) {
            return res.status(500).json({ status: 500, message: "Image not found !", result: false})
        }
        
        const pinImage=req.files.file;
        console.log(pinImage.name)
        pinImage.mv(`${__dirname}/public/${pinImage.name}`, function (err) {
            if (err) {
                console.log(err)
                return res.status(500).json({ message: "Failed to upload file", status: 500, result: false });
            }
            return res.status(200).json({status: 200, message: "File Upload successful!", result: true,
        name: pinImage.name, path: `/${pinImage.name}`})
        })
    }
    catch (err) {
        
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
        });
    }
  });