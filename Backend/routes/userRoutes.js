const express = require('express');
const { pool } = require("../Database/dbConfig");
const bcrypt = require("bcryptjs");
const { checkAuthenticated,} = require('../middleware/authMiddleware');


module.exports = (passport) => {
    const router = express.Router();
    const { registerUser, loginUser } = require('../sesion/userManager');

    


//TODOS LO QUE TIENE QUE VER CON USER
router.get("/user/panel",(checkAuthenticated), (req, res) => {
  res.render("user/panel", { user: req.user.name });
  console.log("User role:", req.user.role);
  
});


router.get('/registrarclientes', (checkAuthenticated), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.* 
      FROM persona p
      INNER JOIN cargo_persona cp ON p.id_persona = cp.id_persona
      INNER JOIN cargo c ON cp.id_cargo = c.id_cargo
      WHERE c.de_cargo = 'cliente'
    `);
    res.render('user/registrarclientes', { clientes: result.rows });
  } catch (error) {
    console.error(error.message);
    // Asegúrate de que la vista 'error' exista para renderizarla.
    res.status(500).render('error', { error: error.message });
  }
});


router.post('/registrarclientes', (checkAuthenticated), async (req, res) => {

  const { nombre, apellido, telefono, direccion } = req.body;

  try {
    // Insertar nueva persona y obtener el ID de cargo para 'cliente'
    const clienteIdResult = await pool.query('SELECT id_cargo FROM cargo WHERE de_cargo = $1', ['cliente']);
    const clienteId = clienteIdResult.rows[0].id_cargo;

    const newPersona = await pool.query(
      'INSERT INTO persona (nom_persona, ap_persona, tlf_persona, di_persona) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, apellido, telefono, direccion]
    );

    await pool.query(
      'INSERT INTO cargo_persona (id_persona, id_cargo) VALUES ($1, $2)',
      [newPersona.rows[0].id_persona, clienteId]
    );

    res.redirect('factura'); 
  } catch (error) {
    console.error(error.message);
    res.status(500).render('error', { error: error.message });
  }
});






router.get('/factura', (checkAuthenticated), async (req, res) => {
  try {
    // Obtener clientes que son del tipo 'cliente'
    const clientesQuery = `
      SELECT id_persona, nom_persona 
      FROM persona 
      WHERE id_persona IN (SELECT id_persona FROM cargo_persona WHERE id_cargo = 4);
    `;
    const clientesResult = await pool.query(clientesQuery);
    const clientes = clientesResult.rows;

    // Obtener vendedores que son del tipo 'vendedor'
    const vendedoresQuery = `
      SELECT id_persona, nom_persona 
      FROM persona 
      WHERE id_persona IN (SELECT id_persona FROM cargo_persona WHERE id_cargo = 3);
    `;
    const vendedoresResult = await pool.query(vendedoresQuery);
    const vendedores = vendedoresResult.rows;

    // Obtener productos y sus presentaciones y precios
    const localQuery = `
    SELECT id_local, nom_local 
    FROM local ;
  `;
    const localResult = await pool.query(localQuery);
    const local= localResult.rows;

    // Pasar todos los datos obtenidos a la vista EJS
    res.render('user/factura', {
      clientes: clientes,
      vendedores: vendedores,
      local: local
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: error.message });
  }
});



router.post('/factura', (checkAuthenticated), async (req, res) => {
  const { id_persona_cliente, id_persona_vendedor, id_local, fe_factura } = req.body;
  try {
    // Aquí deberías agregar validaciones para asegurarte de que los datos son correctos
    const nuevaFactura = await pool.query(`
      INSERT INTO factura (id_persona_cliente, id_persona_vendedor, id_local, fe_factura)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [id_persona_cliente, id_persona_vendedor, id_local,  fe_factura]);
    res.redirect('crear_pago'); // Redirige al usuario a crear pago
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Error al crear la factura' });
  }
});





router.get('/LL', (checkAuthenticated), async (req, res) => {
  try {
    const consultaFacturas = `
    SELECT
  f.id_factura,
  cliente.nom_persona AS nombre_cliente,
  vendedor.nom_persona AS nombre_vendedor,
  f.fe_factura,
  local.nom_local,
  SUM(r.monto) AS monto_total,
  STRING_AGG(pr.de_producto || ' - ' || pres.de_presentacion || ' - $' || pp.precio::text, ', ') AS productos
FROM factura f
JOIN persona cliente ON f.id_persona_cliente = cliente.id_persona
JOIN cargo_persona cp_cliente ON cliente.id_persona = cp_cliente.id_persona AND cp_cliente.id_cargo = (SELECT id_cargo FROM cargo WHERE de_cargo = 'cliente')
JOIN persona vendedor ON f.id_persona_vendedor = vendedor.id_persona
JOIN cargo_persona cp_vendedor ON vendedor.id_persona = cp_vendedor.id_persona AND cp_vendedor.id_cargo = (SELECT id_cargo FROM cargo WHERE de_cargo = 'vendedor')
JOIN local ON f.id_local = local.id_local
LEFT JOIN reglon r ON f.id_factura = r.id_factura
LEFT JOIN producto_presentacion pp ON r.id_producto_presentacion = pp.id_producto_presentacion
LEFT JOIN presentacion_producto pres ON pp.id_presentacion = pres.id_presentacion
LEFT JOIN producto pr ON pp.id_producto = pr.id_producto
GROUP BY f.id_factura, cliente.nom_persona, vendedor.nom_persona, f.fe_factura, local.nom_local;
`
    
    const resultadoFacturas = await pool.query(consultaFacturas);
    res.render('user/LL', { facturas: resultadoFacturas.rows });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Error al obtener las facturas' });
  }
});



router.get('/crear_pago', (checkAuthenticated), async (req, res) => {
  try {
    // Consulta para obtener clientes
    const clientes = await pool.query(`
      SELECT id_persona, nom_persona
      FROM persona 
      WHERE id_persona IN (SELECT id_persona FROM cargo_persona WHERE id_cargo = 4);
    `);
    
    // Consulta para obtener las formas de pago
    const formasPago = await pool.query('SELECT id_forma_pago, forma_pago FROM forma_pago');
    
    // Consulta para obtener facturas
    const facturas = await pool.query('SELECT id_factura, fe_factura FROM factura');
    
    // Consulta para obtener bancos
    const bancos = await pool.query('SELECT id_banco, nom_banco FROM banco');

    // Renderiza la vista con los datos obtenidos
    res.render('user/crear_pago', { 
      clientes: clientes.rows, 
      formasPago: formasPago.rows, 
      facturas: facturas.rows,
      bancos: bancos.rows // Añade los bancos al objeto de opciones
    });
  } catch (error) {
    console.error('Error al obtener datos para el formulario:', error);
    res.status(500).render('error', { message: 'Error al obtener datos para el formulario' });
  }
});



router.post('/crear_pago', (checkAuthenticated), async (req, res) => {
  try {
    // Extraer las variables del cuerpo de la solicitud
    const { id_persona_cliente: id_persona, id_forma_pago, id_factura, id_banco } = req.body;

    // Asegurarse de que los datos necesarios están presentes
    if (!id_persona || !id_forma_pago || !id_factura || !id_banco) {
      // Puedes enviar un mensaje de error al usuario si falta algún dato
      return res.status(400).render('error', { message: 'Faltan datos para crear el pago' });
    }

    // Ejecutar la consulta SQL para insertar el nuevo pago
    const result = await pool.query(`
      INSERT INTO pago (id_persona_cliente, id_forma_pago, id_factura, id_banco, fe_pago)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id_pago;
    `, [id_persona, id_forma_pago, id_factura, id_banco]);

    // Redirigir al usuario a la vista de pagos con un mensaje de éxito
    req.flash('success', 'Pago creado con éxito'); // Asumiendo que tienes flash messages configurado
    res.redirect('crear-reglon'); // Asegúrate de que la ruta de redirección es correcta
  } catch (error) {
    console.error('Error al crear el pago: ', error);
    // Enviar al usuario a una página de error con detalles
    res.status(500).render('error', { message: 'Error al crear el pago: ' + error.detail });
  }
});


// GET: Muestra la lista de pagos registrados
router.get('/viewpago', (checkAuthenticated), async (req, res) => {
  try {
    const pagos = await pool.query(`
      SELECT p.id_pago, pe.nom_persona || ' ' || pe.ap_persona AS nombre_completo, fp.forma_pago, p.fe_pago, p.id_factura, b.nom_banco
      FROM pago p
      JOIN persona pe ON pe.id_persona = p.id_persona_cliente
      JOIN forma_pago fp ON p.id_forma_pago = fp.id_forma_pago
      JOIN banco b ON p.id_banco = b.id_banco;
    `);

    res.render('user/viewpago', { pagos: pagos.rows });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener la lista de pagos');
  }
});


router.get('/crear-reglon', (checkAuthenticated), async (req, res) => {
  try {
    const pagos = await pool.query(`
      SELECT p.id_pago, fp.forma_pago
      FROM pago p
      JOIN forma_pago fp ON p.id_forma_pago = fp.id_forma_pago;
    `);
    const facturas = await pool.query(`
      SELECT f.id_factura, cl.nom_persona as nombre_cliente, ve.nom_persona as nombre_vendedor 
      FROM factura f
      JOIN persona cl ON f.id_persona_cliente = cl.id_persona
      JOIN persona ve ON f.id_persona_vendedor = ve.id_persona;
    `);
    const productos = await pool.query(`
      SELECT pp.id_producto_presentacion, p.de_producto, pr.de_presentacion, pp.precio 
      FROM producto_presentacion pp
      JOIN producto p ON pp.id_producto = p.id_producto
      JOIN presentacion_producto pr ON pp.id_presentacion = pr.id_presentacion;
    `);

    res.render('user/crear-reglon', {
      pagos: pagos.rows,
      facturas: facturas.rows,
      productos: productos.rows
    }); 
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor');
  }
});


router.post('/reglon', (checkAuthenticated), async (req, res) => {
  try {
    // Convierte req.body en un array de productos
    const productosArray = Object.entries(req.body).reduce((acc, [key, value]) => {
      const match = key.match(/^productos\[(\d+)]\[(.+)]$/);
      if (match) {
        const [, index, name] = match;
        if (!acc[index]) acc[index] = {};
        acc[index][name] = value;
      }
      return acc;
    }, []);

    // Itera sobre los productos y realiza las inserciones en la base de datos
    for (const producto of productosArray) {
      const { id_pago, id_factura, id_producto_presentacion, cantidad } = producto;
      if (!id_pago || !id_factura || !id_producto_presentacion || !cantidad) {
        continue; // o maneja el error según sea necesario
      }

      // Realiza la inserción en la base de datos
      const insertQuery = `
        INSERT INTO reglon (id_pago, id_factura, id_producto_presentacion, cantidad)
        VALUES ($1, $2, $3, $4);
      `;

      await pool.query(insertQuery, [id_pago, id_factura, id_producto_presentacion, cantidad]);
    }

   

    // Agrega las nuevas consultas al final del método POST
    const createFunctionQuery = 
    ` UPDATE reglon r SET monto = (CAST(pp.precio AS NUMERIC) * r.cantidad) FROM producto_presentacion pp WHERE r.id_producto_presentacion = pp.id_producto_presentacion;   
    
    `
    await pool.query(createFunctionQuery);
    
    res.redirect('user/panel')
    
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

   






router.get('/detalle-completo', (checkAuthenticated), async (req, res) => {
  try {
    const detalles = await pool.query(`SELECT
    f.id_factura,
    loc.nom_local, -- Nombre del local justo después de id_factura
    loc.dir_local, -- Dirección del local justo después del nombre del local
    cl.nom_persona AS nombre_cliente,
    ve.nom_persona AS nombre_vendedor,
    fp.forma_pago,
    b.nom_banco,
    f.fe_factura,
    pr.de_producto,
    pres.de_presentacion,
    pp.precio,
    r.cantidad,
    r.monto
  FROM
    reglon r
    JOIN factura f ON r.id_factura = f.id_factura
    JOIN local loc ON f.id_local = loc.id_local -- Asegúrate de que esta JOIN es correcta
    JOIN persona cl ON f.id_persona_cliente = cl.id_persona
    JOIN persona ve ON f.id_persona_vendedor = ve.id_persona
    JOIN pago p ON f.id_factura = p.id_factura
    JOIN forma_pago fp ON p.id_forma_pago = fp.id_forma_pago
    JOIN banco b ON p.id_banco = b.id_banco
    JOIN producto_presentacion pp ON r.id_producto_presentacion = pp.id_producto_presentacion
    JOIN presentacion_producto pres ON pp.id_presentacion = pres.id_presentacion
    JOIN producto pr ON pp.id_producto = pr.id_producto;`);

  
    res.render('user/detalle-completo', { detalles: detalles.rows });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error al obtener los detalles completos' });
  }
});







router.get('/crear-deuda', (checkAuthenticated), async (req, res) => {
  try {
    const facturas = await pool.query('SELECT id_factura FROM factura');
    const reglones = await pool.query('SELECT id_reglon, id_factura FROM reglon');
    res.render('user/crear-deuda', { facturas: facturas.rows, reglones: reglones.rows });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error al cargar el formulario de deuda' });
  }
});



router.post('/deuda',(checkAuthenticated),  async (req, res) => {
  try {
    const { id_factura, id_reglon } = req.body;
    // Asegúrate de que el pool ha sido definido y está importado correctamente
    const result = await pool.query(
      'INSERT INTO deuda (id_factura, id_reglon) VALUES ($1, $2) RETURNING *',
      [id_factura, id_reglon]
    );

    // Asumiendo que tienes configurado el middleware de flash para mensajes
    req.flash('success', 'Deuda creada con éxito');
    res.redirect('deudadetalles'); // Asegúrate de que esta ruta existe y es correcta
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error al crear la deuda' });
  }
});

router.get('/deudadetalles', (checkAuthenticated), async (req, res) => {
  try {
    const consulta = `
      SELECT
        d.id_deuda,
        f.id_factura,
        r.id_pago,
        r.monto AS monto_reglon,  
        cl.nom_persona AS nombre_cliente,
        ve.nom_persona AS nombre_vendedor,
        f.fe_factura
      FROM
        deuda d
        INNER JOIN factura f ON d.id_factura = f.id_factura
        INNER JOIN reglon r ON f.id_factura = r.id_factura
        INNER JOIN persona cl ON f.id_persona_cliente = cl.id_persona
        INNER JOIN persona ve ON f.id_persona_vendedor = ve.id_persona
      ORDER BY
        d.id_deuda ASC;
    `;

    const resultado = await pool.query(consulta);
    res.render('user/deudadetalles', { detallesDeuda: resultado.rows });
  } catch (error) {
    console.error('Error al obtener los detalles de deuda:', error);
    res.status(500).render('error', { message: 'Error al obtener los detalles de deuda' });
  }
});


router.post('/eliminar-deuda/:idDeuda', (checkAuthenticated), async (req, res) => {
  try {
    const { idDeuda } = req.params;
    await pool.query('DELETE FROM deuda WHERE id_deuda = $1', [idDeuda]);

    
    res.redirect('../deudadetalles');
  } catch (error) {
    console.error('Error al eliminar la deuda:', error);
    res.status(500).render('error', { message: 'Error al eliminar la deuda' });
  }
});





  
router.get('/crear-mora',(checkAuthenticated),  async (req, res) => {
  try {
    // Aquí puedes obtener cualquier otro dato necesario para el formulario
    const deudas = await pool.query('SELECT id_deuda, id_factura FROM deuda;');
    
    res.render('user/crear-mora', { deudas: deudas.rows });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor');
  }
});


router.post('/crear-mora', (checkAuthenticated), async (req, res) => {
  try {
    const { id_deuda, fecha_inicio_mora, tasa_interes, monto_interes_acumulado, estado, fecha_ultimo_calculo } = req.body;

    const fechainiciomora = fecha_inicio_mora || new Date().toISOString().slice(0, 10);
    const fechaUltimoCalculo = fecha_ultimo_calculo || new Date().toISOString().slice(0, 10);

    const Mora = await pool.query(
      'INSERT INTO mora (id_deuda, fecha_inicio_mora, tasa_interes, monto_interes_acumulado, estado, fecha_ultimo_calculo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;',
      [id_deuda, fechainiciomora, tasa_interes,monto_interes_acumulado, estado, fechaUltimoCalculo]
    );
    
    // Redirigir al usuario o enviar una confirmación
    res.redirect('crear-mora');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor');
  }
});

router.get('/viewmora',(checkAuthenticated),  async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT 
        f.id_factura, 
        d.id_deuda, 
        m.*,
        p.nom_persona
      FROM 
        factura f
      JOIN 
        deuda d ON f.id_factura = d.id_factura
      JOIN 
        mora m ON d.id_deuda = m.id_deuda
      JOIN 
        persona p ON f.id_persona_cliente = p.id_persona;  
    `);
    res.render('user/viewmora', { registros: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor');
  }
});

router.post('/actualizar-mora/:idMora',(checkAuthenticated),  async (req, res) => {
  try {
    const { idMora } = req.params;
    const { nuevo_estado } = req.body;
    
    await pool.query('UPDATE mora SET estado = $1 WHERE id_mora = $2', [nuevo_estado, idMora]);

    res.redirect('../viewmora');
  } catch (error) {
    console.error('Error al actualizar el estado:', error);
    res.status(500).send('Error en el servidor');
  }
});

return router;
} 
