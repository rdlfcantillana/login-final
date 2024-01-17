const { pool } = require("../Database/database");
const bcrypt = require("bcryptjs");

async function registerUser(req, res) {
    let { name, email, password, password2, role } = req.body;
    let errors = [];
  
    if (!name || !email || !password || !password2) {
      errors.push({ message: "Please enter all fields" });
    }
  
    if (password.length < 6) {
      errors.push({ message: "Password must be at least 6 characters long" });
    }
  
    if (password !== password2) {
      errors.push({ message: "Passwords do not match" });
    }
  
    if (errors.length > 0) {
      return res.render("user/register", { errors, name, email, password, password2 });
    }
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  
      if (user.rows.length > 0) {
        return res.render("user/register", { message: "Email already registered" });
      }
  
      // Aquí asignamos el rol especificado al usuario durante el registro
      console.log(role)
      await pool.query(
        `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, password`,
      
        [name, email, hashedPassword, role]
      );
  
      req.flash("success_msg", "You are now registered. Please log in");
      res.redirect("/sesions/login");
  
    } catch (error) {
      console.error(error);
      res.redirect("/sesions/register");
    }
  }

function loginUser(passport) {
    return passport.authenticate("local", {
        successRedirect: "/users/user/panel",
        failureRedirect: "/sesions/login",
        failureFlash: true
    });
}

module.exports = {
    registerUser,
    loginUser
};
