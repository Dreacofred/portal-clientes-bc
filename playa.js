
// 1. Conexión a Supabase
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

// CORRECCIÓN: Según tu tabla, RECREO es el ID 4.
const ID_SUCURSAL_ACTUAL = 4; 

document.addEventListener("DOMContentLoaded", () => {
    const contenedorOrdenes = document.getElementById("lista-ordenes");
    
    // Variables para el Modal
    const modal = document.getElementById("modal-detalle");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    let ordenActualizadaID = null; // Guardamos el ID de la orden que estamos viendo

    // Cerrar el modal
    btnCerrarModal.addEventListener("click", () => {
        modal.style.display = "none";
    });

    async function cargarOrdenesPendientes() {
        // Buscamos PENDIENTES de la sucursal 4 (Recreo)
        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .select('*, clientes(nombre)') 
            .eq('Estado', 'PENDIENTE')
            .eq('sucursal_carga_id', ID_SUCURSAL_ACTUAL)
            .order('fecha_creacion', { ascending: true });

        if (error) {
            contenedorOrdenes.innerHTML = "Error al conectar con la base de datos.";
            return;
        }

        if (data.length === 0) {
            contenedorOrdenes.innerHTML = "<p style='text-align:center; padding:20px; opacity:0.6;'>No hay camiones pendientes para esta sucursal.</p>";
            return;
        }

        contenedorOrdenes.innerHTML = ""; 

        data.forEach(orden => {
            const patenteFormateada = orden.patente.length === 7 ? `${orden.patente.slice(0,2)} ${orden.patente.slice(2,5)} ${orden.patente.slice(5,7)}` : orden.patente;
            const iconoEfectivo = orden.efectivo_pedido > 0 ? `<div class="dinero-icon">💵</div>` : '';

            // Creamos la tarjeta interactiva
            const tarjeta = document.createElement("div");
            tarjeta.className = "tarjeta-playa";
            tarjeta.innerHTML = `
                <div class="visual-patente">
                    <div class="placa-azul">
                        <span class="placa-azul-txt">AR</span><span class="placa-azul-txt">Mercosur</span>
                    </div>
                    <div class="placa-blanca">${patenteFormateada}</div>
                </div>
                
                <div class="info-orden">
                    <div class="lbl-info">EMPRESA</div>
                    <div class="txt-empresa">${orden.clientes.nombre}</div>
                    <div style="display:flex; align-items:end; gap: 10px;">
                        <div class="txt-litros">${orden.litros_pedidos} L</div>
                    </div>
                </div>
                
                <span class="status-tag">${orden.Estado}</span>
                ${iconoEfectivo}
            `;

            // EVENTO CLIC: Al tocar la tarjeta, abrimos el modal
            tarjeta.addEventListener("click", () => {
                abrirDetalleOrden(orden, patenteFormateada);
            });

            contenedorOrdenes.appendChild(tarjeta);
        });
    }

    // Función que llena la ventana gigante al tocar una orden
    function abrirDetalleOrden(orden, patenteFormateada) {
        ordenActualizadaID = orden.id; // Nos acordamos qué orden abrimos
        
        document.getElementById("detalle-patente").textContent = patenteFormateada;
        document.getElementById("detalle-empresa").textContent = orden.clientes.nombre;
        document.getElementById("detalle-chofer").textContent = orden.chofer;
        document.getElementById("detalle-litros").textContent = orden.litros_pedidos + " L";

        const cajaEfectivo = document.getElementById("caja-efectivo");
        if (orden.efectivo_pedido > 0) {
            cajaEfectivo.style.display = "block";
            document.getElementById("detalle-efectivo").textContent = orden.efectivo_pedido.toLocaleString('es-AR');
        } else {
            cajaEfectivo.style.display = "none";
        }

        // Mostramos la ventana negra por encima de todo
        modal.style.display = "flex";
    }

    // Le damos vida al botón verde INICIAR CARGA (Por ahora solo cierra el modal, luego lo conectamos)
    document.getElementById("btn-iniciar-carga").addEventListener("click", () => {
        alert("¡Carga iniciada! (Próximamente cambiaremos el estado en Supabase a 'DESPACHADO')");
        modal.style.display = "none";
    });

    cargarOrdenesPendientes();
    setInterval(cargarOrdenesPendientes, 30000); 
});
