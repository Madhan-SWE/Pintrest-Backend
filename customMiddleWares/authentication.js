const jwt = require("jsonwebtoken");

function authorizeUser(req, res, next) {
    if (req.headers.authorization !== undefined) {
      jwt.verify(
        req.headers.authorization,
        process.env.JWTKEY,
        (err, decode) => {
          
          if(err && (err.toString()).includes("TokenExpiredError"))
          {
            res.status(401).json({
                message: "Token Expired, Please login Again.",
                result: false,
                status: 401
            })
            return 
          }
          if (err) throw err;
          if (decode) {
            next();
          } else {
            res.status(403).json({result: false, message: "User not logged in", status: 403});
          }
        }
      );
    } else {
        res.status(403).json({result: false, message: "User not logged in", status: 403});
    }
  }

  module.exports = {authorizeUser};