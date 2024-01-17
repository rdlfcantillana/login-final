const express = require('express');
const { pool } = require("../Database/dbConfig");
const bcrypt = require("bcryptjs");
const {checkAdmin } = require('../middleware/authMiddleware');


module.exports = (passport) => {
    const router = express.Router();


    
    router.get("/admin/panel", (checkAdmin), (req, res) => {
        res.render("admin/panel", { user: req.user.name });
    });


    router.get('/registrarPersona', (checkAdmin),(req, res) => {
        res.render('admin/registrarPersona');
      });
  


    router.post('/registrarPersona', (checkAdmin),async (req, res) => {
        const { nom_persona, ap_persona, tlf_persona, di_persona } = req.body;
      
        try {
          const insertQuery = `
            INSERT INTO persona (nom_persona, ap_persona, tlf_persona, di_persona)
            VALUES ($1, $2, $3, $4)
            RETURNING id_persona
          `;
          await pool.query(insertQuery, [nom_persona, ap_persona, tlf_persona, di_persona]);
      
          // Redireccionar a la misma página con un mensaje de éxito
          req.flash('success', 'Persona registrada con éxito');
          res.redirect('registrarPersona');
        } catch (err) {
          console.error(err);
      
          // Redireccionar a la misma página con un mensaje de error
          req.flash('error', 'Error al registrar la persona: ' + err.message);
          res.redirect('admin/registrarPersona');
        }
      });


 
// Ruta para mostrar el formulario de asignación de cargos
router.get('/asignarCargo', (checkAdmin), async (req, res) => {
    try {
      const personasQuery = 'SELECT nom_persona FROM persona';
      const personasResult = await pool.query(personasQuery);
      const personas = personasResult.rows;
  
      const cargosQuery = 'SELECT de_cargo FROM cargo';
      const cargosResult = await pool.query(cargosQuery);
      const cargos = cargosResult.rows;
  
      res.render('admin/asignarCargo', { personas, cargos });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener los datos' });
    }
  }); 
  
  // Ruta para procesar el formulario de asignación de cargos
  router.post('/asignarCargo', (checkAdmin), async (req, res) => {
    try {
      console.log('paso');
      const { persona, cargo } = req.body;
  
      const personaQuery = 'SELECT id_persona FROM persona WHERE nom_persona = $1';
      const personaResult = await pool.query(personaQuery, [persona]);
      const idPersona = personaResult.rows[0].id_persona;
  
      const cargoQuery = 'SELECT id_cargo FROM cargo WHERE de_cargo = $1';
      const cargoResult = await pool.query(cargoQuery, [cargo]);
      const idCargo = cargoResult.rows[0].id_cargo;
  
      const insertQuery = 'INSERT INTO cargo_persona (id_persona, id_cargo) VALUES ($1, $2)';
      await pool.query(insertQuery, [idPersona, idCargo]);
  
      res.redirect('asignarCargo');
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al asignar el cargo' });
    }
  });
  
  //grid para mostrar los usuarios 
  router.get('/personaCargo', (checkAdmin),async (req, res) => {
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
  
  router.get('/viewcargos', (checkAdmin),async (req, res) => {
    try {
      const cargosQuery = 'SELECT * FROM cargo';
      const cargosResult = await pool.query(cargosQuery);
      const cargos = cargosResult.rows;
  
      res.render('admin/viewcargos', { cargos });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener los datos' });
    }
  });
  
     
  
  
  router.get('/producto',(checkAdmin), async (req, res) => {
    try {
      const query = 'SELECT * FROM producto';
      const result = await pool.query(query);
  
      // Renderizar la vista EJS y pasar los datos de los productos
      res.render('admin/producto', { productos: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al obtener los productos: ' + err.message);
    }
  });
  
  // Ruta POST para agregar un nuevo producto
  router.post('/producto', (checkAdmin),async (req, res) => {
    const { de_producto } = req.body;
  
    try {
      // Verificar si el producto ya existe antes de insertarlo
      const existingProduct = await pool.query('SELECT * FROM producto WHERE de_producto = $1', [de_producto]);
      
      if (existingProduct.rows.length > 0) {
        // El producto ya existe, puedes manejarlo como desees (por ejemplo, mostrar un mensaje de error)
        res.status(400).send('El producto ya existe');
      } else {
        // El producto no existe, puedes proceder con la inserción
        const insertQuery = 'INSERT INTO producto (de_producto) VALUES ($1) RETURNING id_producto';
        const result = await pool.query(insertQuery, [de_producto]);
        
        // Redirigir a la página de productos después de agregar uno nuevo
        res.redirect('producto');
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al crear el producto: ' + err.message);
    }
  });
  
  
  router.get('/producto_presentacion', (checkAdmin), async (req, res) => {
    try {
      const query = `
        SELECT 
          pp.id_producto_presentacion,
          prod.de_producto AS nombre_producto, 
          pres.de_presentacion AS descripcion_presentacion, 
          pp.precio
        FROM 
          producto_presentacion pp
          INNER JOIN producto prod ON pp.id_producto = prod.id_producto
          INNER JOIN presentacion_producto pres ON pp.id_presentacion = pres.id_presentacion;
      `;
      const { rows } = await pool.query(query);
  
      // Obtener los datos de productos y presentaciones para mostrar en el formulario
      const queryProductos = 'SELECT * FROM producto';
      const resultProductos = await pool.query(queryProductos);
      const productos = resultProductos.rows;
  
      const queryPresentaciones = 'SELECT * FROM presentacion_producto';
      const resultPresentaciones = await pool.query(queryPresentaciones);
      const presentaciones = resultPresentaciones.rows;
  
      res.render('admin/producto_presentacion', { productosPresentaciones: rows, productos, presentaciones });
    } catch (error) {
      res.status(500).render('error', { error: error.message });
    }
  });
  
  
  
  router.post('/producto_presentacion', (checkAdmin),async (req, res) => {
    const { id_producto, id_presentacion, precio } = req.body;
    try {
      const query = `
        INSERT INTO producto_presentacion (id_producto, id_presentacion, precio)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      await pool.query(query, [id_producto, id_presentacion, precio]);
      res.redirect('producto_presentacion');
    } catch (error) {
      res.status(500).render('error', { error: error.message });
    }
  });
  
  router.get('/rutas', (checkAdmin),async (req, res) => {
    try {
      const query = 'SELECT * FROM ruta';
      const { rows } = await pool.query(query);
      res.render('admin/rutas', { rutas: rows }); // 'lista_rutas' es el nombre de tu archivo EJS
    } catch (error) {
      res.status(500).render('error', { error: error.message });
    }
  });
  
  router.post('/rutas', (checkAdmin),async (req, res) => {
    const { av_ruta, ca_ruta, mu_ruta } = req.body;
    try {
      const query = 'INSERT INTO ruta (av_ruta, ca_ruta, mu_ruta) VALUES ($1, $2, $3)';
      await pool.query(query, [av_ruta, ca_ruta, mu_ruta]);
      res.redirect('rutas'); // Esto redirige al cliente al método GET, mostrando la lista actualizada
    } catch (error) {
      res.status(500).render('error', { error: error.message });
    }
  });
  
  router.get('/locales', (checkAdmin),async (req, res) => {
    try {
      const localesQuery = 'SELECT * FROM local';
      const rutasQuery = 'SELECT * FROM ruta';
      
      // Ejecutar ambas consultas de manera concurrente
      const [localesResult, rutasResult] = await Promise.all([
        pool.query(localesQuery),
        pool.query(rutasQuery)
      ]);
  
      res.render('admin/locales', {
        locales: localesResult.rows,
        rutas: rutasResult.rows
      });
    } catch (error) {
      res.status(500).render('error', { error: error.message });
    }
  });
  
  
  router.post('/locales', (checkAdmin),async (req, res) => {
    const { nom_local, num_local, dir_local, re_local, id_ruta } = req.body;
    try {
      const insertQuery = `
        INSERT INTO local (nom_local, num_local, dir_local, re_local, id_ruta)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await pool.query(insertQuery, [nom_local, num_local, dir_local, re_local, id_ruta]);
      res.redirect('locales');
    } catch (error) {
      res.status(500).render('error', { error: error.message });
    }
  });
  
  
  router.get('/persona_local',(checkAdmin), async (req, res) => {
    try {
      const personasQuery = 'SELECT * FROM persona';
      const localesQuery = 'SELECT * FROM local'; // Asumiendo que existe una tabla 'local'
      const personaLocalQuery = 'SELECT * FROM persona_local';
      
      // Ejecutar todas las consultas de manera concurrente
      const [personasResult, localesResult, personaLocalResult] = await Promise.all([
        pool.query(personasQuery),
        pool.query(localesQuery),
        pool.query(personaLocalQuery)
      ]);
  
      res.render('admin/persona_local', {
        personas: personasResult.rows,
        locales: localesResult.rows,
        personaLocal: personaLocalResult.rows
      });
    } catch (error) {
      res.status(500).render('error', { error: error.message });
    }
  });
  
  router.post('/persona_local', (checkAdmin),async (req, res) => {
    const { id_persona, id_local } = req.body;
    try {
      const insertQuery = 'INSERT INTO persona_local (id_persona, id_local) VALUES ($1, $2)';
      await pool.query(insertQuery, [id_persona, id_local]);
      res.redirect('persona_local'); // Redirige para ver la lista actualizada
    } catch (error) {
      res.status(500).render('error', { error: error.message });
    }
  });
  
  
  
  router.get('/nomina',(checkAdmin), async (req, res) => {
    try {
        const consulta = `SELECT cp.id_cargo_persona, p.nom_persona, c.de_cargo
                          FROM cargo_persona cp
                          JOIN persona p ON cp.id_persona = p.id_persona
                          JOIN cargo c ON cp.id_cargo = c.id_cargo`;
        const resultado = await pool.query(consulta);
        res.render('admin/nomina', { cargoPersonas: resultado.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener datos');
    }
  });
  
  
  router.post('/nomina', (checkAdmin),async (req, res) => {
    const { idCargoPersona, monto, fechaPago } = req.body;
  
    try {
        const sql = 'INSERT INTO nomina (id_cargo_persona, monto, fecha_pago) VALUES ($1, $2, $3)';
        await pool.query(sql, [idCargoPersona, monto, fechaPago]);
        res.redirect('nomina');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al registrar en nomina');
    }
  });
  
  router.get('/viewnomina',(checkAdmin), async (req, res) => {
    try {
        const consulta = `SELECT n.id_nomina, p.nom_persona, c.de_cargo, n.monto, n.fecha_pago
                          FROM nomina n
                          JOIN cargo_persona cp ON n.id_cargo_persona = cp.id_cargo_persona
                          JOIN persona p ON cp.id_persona = p.id_persona
                          JOIN cargo c ON cp.id_cargo = c.id_cargo`;
        const resultado = await pool.query(consulta);
        res.render('admin/viewnomina', { nominas: resultado.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener datos de nomina');
    }
  });
  
  
  
  router.get('/asignarusuario', (checkAdmin), async (req, res) => {
    try {
      const usersQuery = 'SELECT id, email FROM users'; // Selecciona el ID y el correo electrónico del usuario
      const usersResult = await pool.query(usersQuery);
      const users = usersResult.rows;
  
      const personasQuery = 'SELECT id_persona, nom_persona FROM persona'; // Selecciona el ID y el nombre de la persona
      const personasResult = await pool.query(personasQuery);
      const personas = personasResult.rows;
  
      res.render('admin/asignarusuario', { users, personas }); // Renderiza la vista 'asignacion.ejs'
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener los datos' });
    }
  });
  
  // Ruta para procesar el formulario de asignación de usuarios a personas
  router.post('/asignarusuario', (checkAdmin), async (req, res) => {
    try {
      const { id, id_persona } = req.body;
  
      const insertQuery = 'INSERT INTO usuario_persona (id, id_persona) VALUES ($1, $2)';
      await pool.query(insertQuery, [id, id_persona]);
  
      res.redirect('asignarusuario'); // Redirige a la vista de asignación para confirmar o continuar asignando
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al asignar el usuario a la persona' });
    }
  });
  // Ruta para mostrar una lista de usuarios asignados a personas con sus nombres y correos electrónicos
  router.get('/viewusuario', (checkAdmin), async (req, res) => {
    try {
      const asignacionesQuery = `
        SELECT 
          up.id_usuario_persona, 
          u.email AS correo_usuario, 
          p.nom_persona 
        FROM 
          usuario_persona up 
          JOIN users u ON u.id = up.id 
          JOIN persona p ON p.id_persona = up.id_persona`;
  
      const asignacionesResult = await pool.query(asignacionesQuery);
      const asignaciones = asignacionesResult.rows;
  
      res.render('admin/viewusuario', { asignaciones }); // Renderiza la vista 'viewusuario.ejs'
    } catch (err) {
      console.error(err);
      res.status(500).send("Error " + err);
    }
  });
  
  
  router.get('/asignacion', (checkAdmin), async (req, res) => {
    try {
      // Consulta para obtener solo las personas con el cargo de vendedor
      const personasQuery = `
        SELECT per.id_persona, per.nom_persona
        FROM persona per
        JOIN cargo_persona cp ON per.id_persona = cp.id_persona
        JOIN cargo c ON cp.id_cargo = c.id_cargo
        WHERE c.de_cargo = 'vendedor'
      `;
      const personasResult = await pool.query(personasQuery);
      const personas = personasResult.rows;
  
      // Consulta para obtener los productos y sus presentaciones
      const productosPresentacion = await pool.query(`
        SELECT pp.id_producto_presentacion, prod.de_producto, pres.de_presentacion
        FROM producto_presentacion pp
        JOIN presentacion_producto pres ON pp.id_presentacion = pres.id_presentacion
        JOIN producto prod ON pp.id_producto = prod.id_producto
      `);
  
      // Consulta para obtener los estados
      const estados = await pool.query('SELECT id_estado, ti_estado FROM estado');
  
      // Consulta para obtener las asignaciones existentes, filtrando solo por vendedores
      const asignaciones = await pool.query(`
        SELECT a.id_asignacion, per.nom_persona, prod.de_producto, pres.de_presentacion, e.ti_estado, a.fe_asignacion
        FROM asignacion a
        JOIN persona per ON a.id_persona = per.id_persona
        JOIN cargo_persona cp ON per.id_persona = cp.id_persona
        JOIN cargo c ON cp.id_cargo = c.id_cargo
        JOIN producto_presentacion pp ON a.id_producto_presentacion = pp.id_producto_presentacion
        JOIN presentacion_producto pres ON pp.id_presentacion = pres.id_presentacion
        JOIN producto prod ON pp.id_producto = prod.id_producto
        JOIN estado e ON a.id_estado = e.id_estado
        WHERE c.de_cargo = 'vendedor'
      `);
  
      // Renderizar la vista con los datos obtenidos
      res.render('admin/asignacion', {
        personas: personas,
        productosPresentacion: productosPresentacion.rows,
        estados: estados.rows,
        asignaciones: asignaciones.rows
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error en el servidor');
    }
  });
  
  
  router.post('/asignacion', (checkAdmin), async (req, res) => {
    try {
      // Recuperar los datos enviados desde el formulario
      const { id_persona, id_producto_presentacion, fe_asignacion, id_estado } = req.body;
  
      // Ejecutar la consulta de inserción sin asignar a una variable si no se va a usar después
      await pool.query(`
        INSERT INTO asignacion (id_persona, id_producto_presentacion, fe_asignacion, id_estado)
        VALUES ($1, $2, $3, $4)
      `, [id_persona, id_producto_presentacion, fe_asignacion, id_estado]);
  
      // Redirigir al usuario a la página de asignaciones con una señal de éxito
      // O podrías enviar un mensaje de éxito o el resultado de la inserción si es necesario
      res.redirect('asignacion');
    } catch (err) {
      console.error(err);
      // Podrías renderizar una vista con el mensaje de error
      // o enviar un código de estado con un mensaje de error
      res.status(500).send('Error al crear asignación: ' + err.message);
    }
  });
  // actualizar estado
  router.post('/asignacion-update-status', (checkAdmin), async (req, res) => {
    try {
      const { id_asignacion, id_estado } = req.body;
      
      const updateQuery = `
        UPDATE asignacion
        SET id_estado = $1
        WHERE id_asignacion = $2
      `;
      await pool.query(updateQuery, [id_estado, id_asignacion]);
  
      res.redirect('asignacion'); 
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al actualizar el estado de la asignación: ' + err.message);
    }
  });


//VENTA POR RUTA(listo)
router.get('/venta-por-ruta', async (req, res) => {
  try {
      const fechaSeleccionada = req.query.fecha || ""; // Usa un string vacío como predeterminado si no hay fecha.
      let ventasPorRuta = [];

      if (fechaSeleccionada) {
          // Ajusta la consulta para incluir todas las rutas, incluso si no tuvieron ventas
          const ventasPorRutaQuery = `
          SELECT 
          r.av_ruta, 
          r.ca_ruta, 
          COALESCE(SUM(rg.monto), 0) AS "Ventas por Ruta"
      FROM 
          ruta r
      LEFT JOIN 
          local l ON r.id_ruta = l.id_ruta
      LEFT JOIN 
          factura f ON l.id_local = f.id_local AND DATE(f.fe_factura) = $1
      LEFT JOIN 
          reglon rg ON f.id_factura = rg.id_factura
      GROUP BY 
          r.av_ruta, r.ca_ruta
      ORDER BY 
          r.av_ruta, r.ca_ruta;
      
          `;
          const resultado = await pool.query(ventasPorRutaQuery, [fechaSeleccionada]);
          ventasPorRuta = resultado.rows;
      }

      res.render('admin/venta-por-ruta', { ventasPorRuta, fechaSeleccionada });
  } catch (error) {
      console.error(error);
      res.status(500).render('error', { message: 'Error al obtener las ventas por ruta' });
  }
});

//Pago Vendedores()
router.get('/ver-pagos-vendedores', async (req, res) => {
  try {
    const vendedoresQuery = `
      SELECT DISTINCT cp.id_persona, p.nombre_completo
      FROM cargo_persona cp
      JOIN persona p ON cp.id_persona = p.id_persona
      JOIN cargo c ON cp.id_cargo = c.id_cargo AND c.de_cargo = 'vendedor';
    `;
    const vendedores = await pool.query(vendedoresQuery);
    res.render('admin/pago-vendedor', { vendedores: vendedores.rows });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error al obtener la lista de vendedores' });
  }
});

router.get('/deuda_total', async (req, res) => {
  try {
    const deudoresQuery = `
    SELECT p.nom_persona, COALESCE(SUM(rg.monto), 0) AS "Deuda Total"
    FROM factura f
    LEFT JOIN reglon rg ON f.id_factura = rg.id_factura
    JOIN persona p ON f.id_persona_cliente = p.id_persona
    GROUP BY p.nom_persona;    
    `;
    const resultado = await pool.query(deudoresQuery);
    res.render('admin/deuda_total', { deudores: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error al obtener la lista de deudores' });
  }
});

router.get('/ventas-total', async (req, res) => {
  try {
    // Obtiene la fecha deseada desde la consulta GET
    const fechaSeleccionada = req.query.fecha || '2023-11-16'; // Fecha predeterminada si no se proporciona

    // Consulta SQL para obtener las ventas totales del día
    const ventasTotalQuery = `
    SELECT SUM(rg.monto) AS "Ventas Totales del Día"
    FROM factura f
    JOIN reglon rg ON f.id_factura = rg.id_factura
    WHERE DATE(f.fe_factura) = $1;    
    `;

    // Ejecuta la consulta con la fecha seleccionada
    const resultado = await pool.query(ventasTotalQuery, [fechaSeleccionada]);

    // Renderiza la vista con los datos
    res.render('admin/ventas-total', {
      ventasTotal: resultado.rows[0]['Ventas Totales del Día'], // Cambié el nombre de la variable aquí
      fechaSeleccionada: fechaSeleccionada,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error al obtener las ventas totales del día' });
  }
});


router.get('/pago-vendedor', checkAdmin, async (req, res) => {
  let nominas = []; // Inicializa nominas como un arreglo vacío
  // Filtrar por fecha si se proporciona una
  const fechaPago = req.query.fecha_pago;
  if (fechaPago) {
    let consulta = `SELECT n.id_nomina, p.nom_persona, c.de_cargo, n.monto, n.fecha_pago
                    FROM nomina n
                    JOIN cargo_persona cp ON n.id_cargo_persona = cp.id_cargo_persona
                    JOIN persona p ON cp.id_persona = p.id_persona
                    JOIN cargo c ON cp.id_cargo = c.id_cargo
                    WHERE c.de_cargo = 'vendedor'
                    AND n.fecha_pago = '${fechaPago}'`; // Asegúrate de sanitizar este input para prevenir inyección SQL

    try {
      const resultado = await pool.query(consulta);
      nominas = resultado.rows;
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al obtener datos de nomina');
    }
  }

  res.render('admin/pago-vendedor', { nominas: nominas });
});


return router;
} 



