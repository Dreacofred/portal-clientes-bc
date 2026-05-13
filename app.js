const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

let idClienteActual = null;
let limiteEfectivoActual = 0;
let idOrdenEditando = null; 

document.addEventListener("DOMContentLoaded", async () => {

    // --- A. SEGURIDAD Y DATOS ---
    const { data: { user } } = await supabaseCliente.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const { data: clienteDatos, error: errorCliente } = await supabaseCliente
        .from('clientes').select('id, nombre, limite_efectivo')
        .eq('auth_user_id', user.id).single();

    if (errorCliente || !clienteDatos) { alert("Usuario no vinculado."); return; }

    idClienteActual = clienteDatos.id;
    limiteEfectivoActual = parseInt(clienteDatos.limite_efectivo) || 0;
    document.querySelector('.nombre-empresa').textContent = clienteDatos.nombre;
    document.querySelector('.input-bloqueado').value = clienteDatos.nombre;
    document.getElementById("efectivo").placeholder = `Máx permitido: $${limiteEfectivoActual}`;

    const formulario = document.getElementById("formulario-orden");
    const btnEnviar = formulario.querySelector('button[type="submit"]');

    // --- B. BLOQUEO DE TECLA ENTER ---
    formulario.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.nodeName === "INPUT") {
            e.preventDefault();
            return false;
        }
    });

    // --- C. TABLA DE ÓRDENES CON ACCIONES ---
    async function cargarOrdenes() {
        const { data, error } = await supabaseCliente
            .from('ordenes_carga').select('*')
            .eq('cliente_id', idClienteActual).order('id', { ascending: false });

        if (error) return;

        const cuerpoTabla = document.getElementById("cuerpo-tabla");
        cuerpoTabla.innerHTML = ""; 
        const mapaSucursales = { 1: 'Reconquista', 2: 'Avellaneda', 3: 'Florencia', 4: 'Recreo' };

        data.forEach(orden => {
            const fila = document.createElement("tr");
            let fechaRaw = orden.fecha_creacion;
            let claseEstado = "pendiente";
            let accionesHtml = "";

            if (orden.estado === 'DESPACHADO') {
                fila.classList.add("fila-despachada");
                claseEstado = "despachado";
                if (orden.fecha_despacho) fechaRaw = orden.fecha_despacho;
                accionesHtml = `<span style="color: #999; font-size: 0.8em;">Cerrada</span>`;
            } else {
                accionesHtml = `
                    <div class="celda-acciones">
                        <button class="btn-accion edit" onclick="prepararEdicion(${orden.id}, '${orden.patente}', '${orden.chofer}', ${orden.litros_pedidos}, ${orden.efectivo_pedido}, '${orden.nro_orden_cliente || ''}', ${orden.sucursal_carga_id})">✏️</button>
                        <button class="btn-accion delete" onclick="eliminarOrden(${orden.id})">🗑️</button>
                    </div>
                `;
            }

            let fechaFormateada = "Sin fecha";
            if (fechaRaw) {
                const fechaObj = new Date(fechaRaw.replace(" ", "T"));
                if (!isNaN(fechaObj)) {
                    fechaFormateada = fechaObj.toLocaleDateString('es-AR') + ' ' + 
                                     fechaObj.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
                }
            }

            fila.innerHTML = `
                <td>#${orden.id}</td>
                <td><strong>${orden.nro_orden_cliente || '-'}</strong></td>
                <td>${fechaFormateada}</td>
                <td><strong>${mapaSucursales[orden.sucursal_carga_id] || '---'}</strong></td>
                <td>${orden.patente}</td>
                <td>${orden.litros_pedidos} L</td>
                <td><span class="estado ${claseEstado}">${orden.estado}</span></td>
                <td>${accionesHtml}</td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    }

    // --- D. RECUPERAMOS LAS SUGERENCIAS (DATALISTS) ---
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

    // --- E. FUNCIONES DE ACCIÓN (ELIMINAR Y EDITAR) ---
    window.eliminarOrden = async (id) => {
        if (!confirm("¿Seguro que querés anular esta orden?")) return;
        const { error } = await supabaseCliente.from('ordenes_carga').delete().eq('id', id);
        if (error) alert("No se pudo eliminar.");
        else cargarOrdenes();
    };

    window.prepararEdicion = (id, patente, chofer, litros, efectivo, nroCliente, sucursal) => {
        idOrdenEditando = id;
        document.getElementById("sucursal").value = sucursal || "";
        document.getElementById("patente").value = patente;
        document.getElementById("chofer").value = chofer;
        document.getElementById("litros").value = litros;
        document.getElementById("efectivo").value = efectivo;
        document.getElementById("nro_orden_cliente").value = nroCliente;
        
        btnEnviar.textContent = "Actualizar Orden de Carga";
        btnEnviar.style.backgroundColor = "#28a745"; 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };

    // Inicializamos tabla y sugerencias
    cargarOrdenes();
    cargarSugerencias();

    // --- F. ENVÍO O ACTUALIZACIÓN (CON VALIDACIÓN ESTRICTA) ---
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();
        const sucursal = document.getElementById("sucursal").value;
        const patente = document.getElementById("patente").value.toUpperCase().replace(/\s+/g, ''); 
        const chofer = document.getElementById("chofer").value.toUpperCase();
        const litros = document.getElementById("litros").value;
        const efectivo = parseInt(document.getElementById("efectivo").value || "0");
        const nroOrdenCliente = document.getElementById("nro_orden_cliente").value;

        // Validación estricta de campos obligatorios
        if (!sucursal || sucursal === "" || isNaN(parseInt(sucursal)) || !patente || !chofer || !litros) {
            alert("⚠️ Por favor, completá todos los campos obligatorios (Sucursal, Patente, Chofer y Litros).");
            return;
        }

        if (efectivo > limiteEfectivoActual) {
            alert(`Monto solicitado ($${efectivo}) supera el límite ($${limiteEfectivoActual}).`);
            return;
        }

        const datos = {
            cliente_id: idClienteActual, 
            sucursal_carga_id: parseInt(sucursal), 
            patente, chofer,
            litros_pedidos: parseInt(litros),
            efectivo_pedido: efectivo,
            nro_orden_cliente: nroOrdenCliente,
            estado: 'PENDIENTE'
        };

        let resultado;
        if (idOrdenEditando) {
            resultado = await supabaseCliente.from('ordenes_carga').update(datos).eq('id', idOrdenEditando);
        } else {
            resultado = await supabaseCliente.from('ordenes_carga').insert([datos]);
        }

        if (resultado.error) {
            alert("Error al procesar la operación.");
        } else {
            alert(idOrdenEditando ? "¡Orden actualizada!" : "¡Orden emitida!");
            idOrdenEditando = null;
            btnEnviar.textContent = "Emitir Orden de Carga";
            btnEnviar.style.backgroundColor = ""; 
            formulario.reset(); 
            document.querySelector('.input-bloqueado').value = clienteDatos.nombre; 
            cargarOrdenes();
            cargarSugerencias(); // Refrescamos las sugerencias por si agregó patente nueva
        }
    });

    // --- G. LOGOUT ---
    const btnSalir = document.querySelector('.icono-salir');
    if (btnSalir) {
        btnSalir.addEventListener('click', async () => {
            await supabaseCliente.auth.signOut();
            window.location.href = "login.html";
        });
    }
});
