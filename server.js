const express = require("express");
const { pool } = require("./Backend/Database/dbConfig");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
require("dotenv").config();
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');


const app = express();
const PORT = process.env.PORT || 4000;

const initializePassport = require("./Backend/sesion/passportConfig");
initializePassport(passport);

// Middlewares
app.use(express.urlencoded({ extended: false }));
app.use( express.static('Frontend/public')); // Middleware para archivos estáticos

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.set("view engine", "ejs");
app.set('views', './Frontend/views');
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app); // Crear un servidor HTTP
const io = socketIo(server); // Inicializar una nueva instancia de Socket.IO

// Rutas
app.get("/", (req, res) => {
  res.render("index");
});

// Importa las rutas de usuario
const userRoutes = require('./Backend/routes/userRoutes')(passport);
const adminRoutes = require('./Backend/routes/adminRoutes')(passport);
const sesionRoutes = require('./Backend/routes/sesionRoutes')(passport);
// Usa las rutas importadas
app.use('/users', userRoutes);
app.use('/admins',adminRoutes);
app.use('/sesions', sesionRoutes);

//grid para mostrar los usuarios 
app.get('/datos', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT p.nom_persona, c.de_cargo FROM persona p JOIN cargo_persona cp ON p.id_persona = cp.id_persona JOIN cargo c ON cp.id_cargo = c.id_cargo;');
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// Esta sección es para socket.io
io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado');

  socket.on('send message', (data) => {
    io.emit('chat message', { text: data.text, username: data.username });
  });

  socket.on('disconnect', () => {
    console.log('Un usuario se ha desconectado');
  });
});

app.get('/chat', (req, res) => {
  if(req.isAuthenticated()) {
    res.render('chat', { username: req.user.name }); // Cambia 'name' por la propiedad correcta si es necesario
  } else {
    res.redirect('/login');
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
