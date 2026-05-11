// 1. Conexión a Supabase
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- DINAMISMO: Leemos los datos del empleado que guardó el Login ---
const NOMBRE_OPERADOR = localStorage.getItem('empleado_nombre') || "Operador";
const ID_SUCURSAL_ACTUAL = localStorage.getItem('empleado_sucursal');

document.addEventListener("DOMContentLoaded", () => {
    
    // SEGURIDAD: Si no hay sucursal en memoria, lo mandamos al login de playa
    if (!ID_SUCURSAL_ACTUAL) {
        window.location.href = "login-playa.html";
        return;
    }

    // Actualizamos los textos de la cabecera con los datos del empleado
    const nombresSucursales = { 1: "RECONQUISTA", 2: "AVELLANEDA", 3: "FLORENCIA", 4: "RECREO" };
    document.querySelector('.header-der div:first-child strong').textContent = NOMBRE_OPERADOR;
    document.querySelector('.header-der div:last-child strong').textContent = nombresSucursales[ID_SUCURSAL_ACTUAL] || "BC";

    const contenedorOrdenes = document.getElementById("lista-ordenes");
    const modal = document.getElementById("modal-detalle");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    let ordenActualizadaID = null;

    btnCerrarModal.addEventListener("click", () => {
        modal.style.display = "none";
    });

    async function cargarOrdenesPendientes() {
        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .select('*, clientes(nombre)') 
            .eq('estado', 'PENDIENTE')
            .eq('sucursal_carga_id', ID_SUCURSAL_ACTUAL)
            .order('fecha_creacion', { ascending: true });

        if (error) {
            console.error("Detalle del error:", error);
            contenedorOrdenes.innerHTML = "Error al conectar con la base de datos.";
            return;
        }

        if (data.length === 0) {
            contenedorOrdenes.innerHTML = "<p style='text-align:center; padding:20px; opacity:0.6;'>No hay camiones pendientes para esta sucursal.</p>";
            return;
        }

        contenedorOrdenes.innerHTML = ""; 

        data.forEach(orden => {
            const patenteFormateada = orden.patente;
            const iconoEfectivo = orden.efectivo_pedido > 0 ? `<div class="dinero-icon">💵</div>` : '';
            const nombreEmpresa = orden.clientes ? orden.clientes.nombre : "CLIENTE DESCONOCIDO";

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
                    <div class="txt-empresa">${nombreEmpresa}</div>
                    <div style="display:flex; align-items:end; gap: 10px;">
                        <div class="txt-litros">${orden.litros_pedidos} L</div>
                    </div>
                </div>
                
                <span class="status-tag">${orden.estado}</span>
                ${iconoEfectivo}
            `;

            tarjeta.addEventListener("click", () => {
                abrirDetalleOrden(orden, patenteFormateada, nombreEmpresa);
            });

            contenedorOrdenes.appendChild(tarjeta);
        });
    }

    function abrirDetalleOrden(orden, patenteFormateada, nombreEmpresa) {
        ordenActualizadaID = orden.id; 
        
        document.getElementById("detalle-patente").textContent = patenteFormateada;
        document.getElementById("detalle-empresa").textContent = nombreEmpresa;
        document.getElementById("detalle-chofer").textContent = orden.chofer;
        document.getElementById("detalle-litros").textContent = orden.litros_pedidos + " L";

        const cajaEfectivo = document.getElementById("caja-efectivo");
        if (orden.efectivo_pedido > 0) {
            cajaEfectivo.style.display = "block";
            document.getElementById("detalle-efectivo").textContent = orden.efectivo_pedido.toLocaleString('es-AR');
        } else {
            cajaEfectivo.style.display = "none";
        }

        modal.style.display = "flex";
    }

    document.getElementById("btn-iniciar-carga").addEventListener("click", () => {
        alert("¡Carga iniciada! (Próximamente cambiaremos el estado a DESPACHADO)");
        modal.style.display = "none";
    });

    // --- LÓGICA DEL BOTÓN SALIR ---
    const btnSalir = document.getElementById("btn-cerrar-sesion");
    if (btnSalir) {
        btnSalir.addEventListener("click", () => {
            if (confirm("¿Cerrar sesión de " + NOMBRE_OPERADOR + "?")) {
                localStorage.removeItem('empleado_nombre');
                localStorage.removeItem('empleado_sucursal');
                window.location.href = "login-playa.html";
            }
        });
    }

    cargarOrdenesPendientes();
    setInterval(cargarOrdenesPendientes, 30000); 
});
