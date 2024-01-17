const express = require('express');
const { pool } = require("../Database/dbConfig");
const bcrypt = require("bcryptjs");
const { checkAuthenticated } = require('../middleware/authMiddleware');


module.exports = (passport) => {
    const router = express.Router();
    const { registerUser, loginUser } = require('../sesion/userManager');



// Rutas relacionadas con el registro y el inicio de sesión
router.get("/register", checkAuthenticated, (req, res) => {
    res.render("sesion/register.ejs");
});

router.post("/register", registerUser);

router.get("/login", checkAuthenticated, (req, res) => {
    res.render("sesion/login.ejs", { messages: req.flash() });
});

router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            req.flash("error", "Invalid username or password");
            return res.redirect("sesion/login");
        }

        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }

            if (user.role === "admin") {
                return res.redirect("/admins/admin/panel");
            } else {
                return res.redirect("/users/user/panel");
            }
        });
    })(req, res, next);
});



router.get("/logout", (req, res) => {
    req.logout(() => {
        res.render("index", { message: "You have logged out successfully" });
    });
});

router.get('/forgot-password', (req, res) => {
    res.render('sesion/forgot-password.ejs');
  });
  
  router.post('/forgot-password', async (req, res) => {
    let { email, newPassword } = req.body;
  
    if (!newPassword) {
      return res.status(400).send('La nueva contraseña no está definida correctamente');
    }
  
    pool.query(
      `SELECT * FROM users
      WHERE email = $1`, [email],
      async (err, results) => {
        if (err) {
          throw err;
        }
  
        if (results.rows.length > 0) {
          let hashedPassword = await bcrypt.hash(newPassword, 10); // Cambiar el valor de trabajo (work factor) si es necesario
          console.log(hashedPassword);
  
          pool.query(
            `UPDATE users
            SET password = $1
            WHERE email = $2`, [hashedPassword, email],
            (err, result) => {
              if (err) {
                throw err;
              }
  
              res.render('sesion/forgot-password-success.ejs');
            }
          );
        } else {
          res.render('sesion/forgot-password.ejs', { error: 'El correo electrónico no está registrado' });
        }
      }
    );
  });



























    return router;

}
