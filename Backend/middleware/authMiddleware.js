function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
    console.log("is autenticated");
    }
    next();
  }

  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/users/login");
  }
  function checkAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === "admin")
     {
    
        return next();
    }
    // Si no es un administrador, puedes redirigirlo o mostrarle un mensaje de error
   else res.redirect("/user/panel"); // o donde quieras redirigir a los usuarios no administradores
}


  module.exports = {
      checkAuthenticated,
      checkNotAuthenticated,
      checkAdmin
  };
  
  