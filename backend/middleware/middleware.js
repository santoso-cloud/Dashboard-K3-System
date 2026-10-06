const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan"
      });
    }

    const parts = header.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Format token tidak valid"
      });
    }

    const token = parts[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: "Token tidak valid atau sudah expired"
    });

  }
}

function authorize(...roles) {

  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Belum login"
      });
    }

    if (
      roles.length > 0 &&
      !roles.includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses"
      });
    }

    next();
  };

}

module.exports = {
  auth,
  authorize
};