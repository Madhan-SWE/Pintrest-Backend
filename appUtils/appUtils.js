const nodemailer = require("nodemailer");

const sendMail = (emailId, message, subject, gmailUserName, gmailPassword) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 8000,
        secure: false,
        auth: {
            user: gmailUserName,
            pass: gmailPassword
        }
    });
    // console.log(gmailUserName, "______", gmailPassword);
    // console.log(emailId, message, subject);
    let mailOptions = {
        from: gmailUserName,
        to: emailId,
        subject: subject,
        html: message
    };

    let res = transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error)
            return false;
        } else {
            console.log(info)
        }
    });
    console.log("------",res);
};

module.exports = {sendMail};