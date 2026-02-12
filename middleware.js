const jwt = require('jsonwebtoken');
const SECRET = "tu_clave_secreta_super_segura";

module.exports = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Acceso denegado" });

    try {
        const decoded = jwt.verify(token, SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ error: "Token inválido" });
    }
};