// 1. Conectamos con tus credenciales
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

// Variable para guardar el ID de la empresa que acaba de entrar
let idClienteActual = null;

document.addEventListener("DOMContentLoaded", async () => {

    // --- A. SEGURIDAD: Verificar quién entró ---
    const { data: { user } } = await supabaseCliente.auth.getUser();

    if (!user) {
        // Si no hay nadie logueado, lo pateamos a la página de login
        window.location.href = "login.html";
        return;
    }

    // --- B. BUSCAR SUS DATOS: ¿Qué empresa es? ---
    const { data: clienteDatos, error: errorCliente } = await supabaseCliente
        .from('clientes')
        .select('id, nombre')
        .eq('auth_user_id', user.id)
        .single(); // Buscamos a qué empresa pertenece este mail

    if (errorCliente || !clienteDatos) {
        alert("Tu usuario no está vinculado a BC Combustibles. Contactá a administración.");
        return;
    }

    idClienteActual = clienteDatos.id; // ¡Acá capturamos su ID dinámico! (ej: 2)

    // Actualizamos la pantalla con su nombre real sacado de la base de datos
    document.querySelector('.nombre-empresa').textContent = clienteDatos.nombre;
    document.querySelector('.input-bloqueado').value = clienteDatos.nombre;

    // --- C. EL RESTO DEL CÓDIGO (Usando el ID dinámico) ---
    const formulario = document.getElementById("formulario-orden");

    async function cargarOrdenes() {
        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .select('*')
            .eq('cliente_id', idClienteActual) // <--- MAGIA: Solo ve sus cosas
            .order('id', { ascending: false });

        if (error) return;

        const cuerpoTabla = document.getElementById("cuerpo-tabla");
        cuerpoTabla.innerHTML = ""; 

        data.forEach(orden => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${orden.id}</td>
                <td>${orden.patente}</td>
                <td><span class="estado pendiente">${orden.estado}</span></td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    }

    async function cargarSugerencias() {
        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .select('patente, chofer')
            .eq('cliente_id', idClienteActual); // <--- MAGIA: Solo ve sus cosas

        if (error) return;

        const patentesUnicas = [...new Set(data.map(item => item.patente))];
        const choferesUnicos = [...new Set(data.map(item => item.chofer))];

        const listadoPatentes = document.getElementById("lista-patentes");
        const listadoChoferes = document.getElementById("lista-choferes");

        listadoPatentes.innerHTML = "";
        listadoChoferes.innerHTML = "";

        patentesUnicas.forEach(p => { if(p) listadoPatentes.innerHTML += `<option value="${p}">`; });
        choferesUnicos.forEach(c => { if(c) listadoChoferes.innerHTML += `<option value="${c}">`; });
    }

    cargarOrdenes();
    cargarSugerencias();

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        const sucursal = document.getElementById("sucursal").value;
        const patente = document.getElementById("patente").value.toUpperCase().replace(/\s+/g, ''); 
        const chofer = document.getElementById("chofer").value.toUpperCase();
        const litros = document.getElementById("litros").value;
        const efectivo = document.getElementById("efectivo").value || 0; 

        if (!sucursal || !patente || !chofer || !litros) {
            alert("Por favor, completá todos los campos.");
            return;
        }

        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .insert([{
                cliente_id: idClienteActual, // <--- MAGIA: Carga a su nombre
                sucursal_carga_id: parseInt(sucursal), 
                patente: patente, 
                chofer: chofer,
                litros_pedidos: parseInt(litros),
                efectivo_pedido: parseInt(efectivo),
                estado: 'PENDIENTE'
            }]);

        if (error) {
            alert("Error al guardar.");
        } else {
            alert("¡GOLAZO! Orden cargada.");
            formulario.reset(); 
            // Para que no le borre el nombre bloqueado al reiniciar el formulario:
            document.querySelector('.input-bloqueado').value = clienteDatos.nombre; 
            cargarOrdenes();
            cargarSugerencias();
        }
    });

    // --- D. BOTÓN DE SALIR (Cerrar sesión) ---
    const btnSalir = document.querySelector('.icono-salir');
    if (btnSalir) {
        btnSalir.addEventListener('click', async () => {
            await supabaseCliente.auth.signOut(); // Le avisa a Supabase que corte la sesión
            window.location.href = "login.html";  // Lo manda a la puerta
        });
    }
});
