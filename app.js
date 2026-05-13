// 1. Conectamos con tus credenciales
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

let idClienteActual = null;
let limiteEfectivoActual = 0; // NUEVO: Variable para guardar el límite del cliente

document.addEventListener("DOMContentLoaded", async () => {

    // --- A. SEGURIDAD: Verificar sesión activa ---
    const { data: { user } } = await supabaseCliente.auth.getUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // --- B. DATOS DEL CLIENTE (Actualizado para traer el límite) ---
    const { data: clienteDatos, error: errorCliente } = await supabaseCliente
        .from('clientes')
        .select('id, nombre, limite_efectivo') // Traemos también el límite
        .eq('auth_user_id', user.id)
        .single();

    if (errorCliente || !clienteDatos) {
        alert("Tu usuario no está vinculado a BC Combustibles.");
        return;
    }

    idClienteActual = clienteDatos.id;
    limiteEfectivoActual = clienteDatos.limite_efectivo || 0; // Guardamos el límite en memoria
    
    document.querySelector('.nombre-empresa').textContent = clienteDatos.nombre;
    document.querySelector('.input-bloqueado').value = clienteDatos.nombre;

    const formulario = document.getElementById("formulario-orden");

    // --- C. TABLA DE ÓRDENES ---
    async function cargarOrdenes() {
        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .select('*')
            .eq('cliente_id', idClienteActual) 
            .order('id', { ascending: false });

        if (error) return;

        const cuerpoTabla = document.getElementById("cuerpo-tabla");
        cuerpoTabla.innerHTML = ""; 

        const mapaSucursales = { 1: 'Reconquista', 2: 'Avellaneda', 3: 'Florencia', 4: 'Recreo' };

        data.forEach(orden => {
            const fila = document.createElement("tr");
            let fechaRaw = orden.fecha_creacion;
            let claseEstado = "pendiente";
            
            if (orden.estado === 'DESPACHADO') {
                fila.classList.add("fila-despachada");
                claseEstado = "despachado";
                if (orden.fecha_despacho) fechaRaw = orden.fecha_despacho;
            }

            let fechaFormateada = "Sin fecha";
            if (fechaRaw) {
                const fechaLimpia = fechaRaw.replace(" ", "T");
                const fechaObj = new Date(fechaLimpia);
                if (!isNaN(fechaObj)) {
                    fechaFormateada = fechaObj.toLocaleDateString('es-AR') + ' ' + 
                                     fechaObj.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
                }
            }

            const nombreSucursal = mapaSucursales[orden.sucursal_carga_id] || 'Sin asignar';

            fila.innerHTML = `
                <td>#${orden.id}</td>
                <td><strong>${orden.nro_orden_cliente || '-'}</strong></td>
                <td>${fechaFormateada}</td>
                <td><strong>${nombreSucursal}</strong></td>
                <td>${orden.patente}</td>
                <td>${orden.litros_pedidos} L</td>
                <td><span class="estado ${claseEstado}">${orden.estado}</span></td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    }

    // --- D. SUGERENCIAS (Datalists) ---
    async function cargarSugerencias() {
        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .select('patente, chofer')
            .eq('cliente_id', idClienteActual);

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

    // --- E. ENVÍO DEL FORMULARIO (Con validación de límite) ---
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();
        const sucursal = document.getElementById("sucursal").value;
        const patente = document.getElementById("patente").value.toUpperCase().replace(/\s+/g, ''); 
        const chofer = document.getElementById("chofer").value.toUpperCase();
        const litros = document.getElementById("litros").value;
        const efectivoStr = document.getElementById("efectivo").value || "0";
        const efectivo = parseInt(efectivoStr);
        const nroOrdenCliente = document.getElementById("nro_orden_cliente").value;

        // --- VALIDACIÓN DE EFECTIVO (PUNTO 2) ---
        if (efectivo > limiteEfectivoActual) {
            alert(`⚠️ El monto solicitado ($${efectivo}) supera tu límite autorizado ($${limiteEfectivoActual}).\nPor favor, ingresá un monto menor o contactate con administración.`);
            return;
        }

        if (!sucursal || !patente || !chofer || !litros) {
            alert("Por favor, completá todos los campos obligatorios.");
            return;
        }

        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .insert([{
                cliente_id: idClienteActual, 
                sucursal_carga_id: parseInt(sucursal), 
                patente: patente, 
                chofer: chofer,
                litros_pedidos: parseInt(litros),
                efectivo_pedido: efectivo,
                nro_orden_cliente: nroOrdenCliente,
                estado: 'PENDIENTE'
            }]);

        if (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar la orden.");
        } else {
            alert("¡GOLAZO! Orden cargada correctamente.");
            formulario.reset(); 
            document.querySelector('.input-bloqueado').value = clienteDatos.nombre; 
            cargarOrdenes();
            cargarSugerencias();
        }
    });

    // --- F. LOGOUT ---
    const btnSalir = document.querySelector('.icono-salir');
    if (btnSalir) {
        btnSalir.addEventListener('click', async () => {
            await supabaseCliente.auth.signOut();
            window.location.href = "login.html";
        });
    }
});
