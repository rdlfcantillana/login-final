const LocalStrategy = require("passport-local").Strategy;
const { pool } = require("../Database/dbConfig");
const bcrypt = require("bcryptjs");
const passport = require("passport");

function initialize(passport) {
  console.log("Initialized");

  // Debería estar definida aquí
  const authenticateUser = (email, password, done) => {
    console.log(email, password);
    pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        }
        console.log(results.rows);

        if (results.rows.length > 0) {
          const user = results.rows[0];

          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
              console.log(err);
            }
            if (isMatch) {
              return done(null, user, { message: "Logged in successfully" });
            } else {
              return done(null, false, { message: "Password is incorrect" });
            }
          });
        } else {
          // No user
          return done(null, false, { message: "No user with that email address" });
        }
      }
    );
  };

 

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      authenticateUser
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser((id, done) => {
    pool.query(`SELECT * FROM users WHERE id = $1`, [id], (err, results) => {
      if (err) {
        return done(err);
      }
      const user = results.rows[0];
      if (!user) {
        return done(null, false);
      }
      // Añade la propiedad 'role' al objeto del usuario (esto parece innecesario)
      user.role = user.role;
      console.log("Deserialized user:", user); // Agrega este console.log
      return done(null, user);
    });
  });
}  

module.exports = initialize;
