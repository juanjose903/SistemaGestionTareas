const cors = require('cors');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, User, Task } = require('./models');
const authMiddleware = require('./middleware');

const app = express();
app.use(cors());
app.use(express.json());
const SECRET = "tu_clave_secreta_super_segura";



// --- RUTAS DE AUTENTICACIÓN ---

app.post('/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = await User.create({ username: req.body.username, password: hashedPassword });
        res.json({ message: "Usuario creado", id: user.id });
    } catch (e) { res.status(400).json({ error: "El usuario ya existe" }); }
});

app.post('/auth/login', async (req, res) => {
    const user = await User.findOne({ where: { username: req.body.username } });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1h' });
        return res.json({ token });
    }
    res.status(401).json({ error: "Credenciales incorrectas" });
});

// --- RUTAS DE TAREAS (PROTEGIDAS) ---

app.post('/tareas', authMiddleware, async (req, res) => {
    const tarea = await Task.create({ ...req.body, UserId: req.userId });
    res.json(tarea);
});

app.get('/tareas', authMiddleware, async (req, res) => {
    const tareas = await Task.findAll({ where: { UserId: req.userId } });
    res.json(tareas);
});

app.get('/tareas/:id', authMiddleware, async (req, res) => {
    const tarea = await Task.findOne({ where: { id: req.params.id, UserId: req.userId } });
    tarea ? res.json(tarea) : res.status(404).json({ error: "No encontrada" });
});

app.put('/tareas/:id', authMiddleware, async (req, res) => {
    const tarea = await Task.findOne({ where: { id: req.params.id, UserId: req.userId } });
    if (tarea) {
        await tarea.update(req.body);
        return res.json(tarea);
    }
    res.status(404).json({ error: "No encontrada o no autorizada" });
});

app.delete('/tareas/:id', authMiddleware, async (req, res) => {
    const result = await Task.destroy({ where: { id: req.params.id, UserId: req.userId } });
    result ? res.json({ success: true }) : res.status(404).json({ error: "No encontrada" });
});

// --- ENDPOINTS DE DETALLE Y ACTUALIZACIÓN ---

// GET /tareas/:id - Obtener una tarea específica (verificando propiedad)
app.get('/tareas/:id', authMiddleware, async (req, res) => {
    try {
        // Buscamos la tarea por ID Y por el ID del usuario autenticado
        const tarea = await Task.findOne({ 
            where: { 
                id: req.params.id, 
                UserId: req.userId 
            } 
        });

        if (!tarea) {
            return res.status(404).json({ error: "Tarea no encontrada o no tienes permiso para verla" });
        }

        res.json(tarea);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener la tarea" });
    }
});

// PUT /tareas/:id - Actualizar una tarea existente (verificando propiedad)
app.put('/tareas/:id', authMiddleware, async (req, res) => {
    try {
        // Primero verificamos que la tarea exista y pertenezca al usuario
        const tarea = await Task.findOne({ 
            where: { 
                id: req.params.id, 
                UserId: req.userId 
            } 
        });

        if (!tarea) {
            return res.status(404).json({ error: "No puedes actualizar esta tarea porque no existe o no te pertenece" });
        }

        // Actualizamos con los datos que vienen en el body (ej: title o completed)
        await tarea.update(req.body);
        
        res.json({ message: "Tarea actualizada con éxito", tarea });
    } catch (error) {
        res.status(400).json({ error: "Error al actualizar la tarea" });
    }
});

// Iniciar servidor
sequelize.sync().then(() => {
    app.listen(3000, () => console.log("Servidor en http://localhost:3000"));
});