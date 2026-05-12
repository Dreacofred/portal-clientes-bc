const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

const NOMBRE_OPERADOR = localStorage.getItem('empleado_nombre') || "Operador";
const ID_SUCURSAL_ACTUAL = localStorage.getItem('empleado_sucursal');

document.addEventListener("DOMContentLoaded", () => {
    
    if (!ID_SUCURSAL_ACTUAL) {
        window.location.href = "login-playa.html";
        return;
    }

    const nombresSucursales = { 1: "RECONQUISTA", 2: "AVELLANEDA", 3: "FLORENCIA", 4: "RECREO" };
    const elNombre = document.getElementById('nombre-operador');
    const elSucursal = document.getElementById('nombre-sucursal');

    if(elNombre) elNombre.textContent = NOMBRE_OPERADOR;
    if(elSucursal) elSucursal.textContent = nombresSucursales[ID_SUCURSAL_ACTUAL] || "BC";

    const contenedorOrdenes = document.getElementById("lista-ordenes");
    const modal = document.getElementById("modal-detalle");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    let ordenActualizadaID = null;

    if(btnCerrarModal) {
        btnCerrarModal.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

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
            const nombreChofer = orden.chofer ? orden.chofer : "SIN ESPECIFICAR"; 

            const tarjeta = document.createElement("div");
            tarjeta.className = "tarjeta-playa";
            
            // Estructura renovada en dos bloques (Superior e Inferior)
            tarjeta.innerHTML = `
                <div class="tarjeta-bloque-superior">
                    <div class="visual-patente">
                        <div class="placa-azul">
                            <span class="placa-azul-txt">AR</span><span class="placa-azul-txt">Mercosur</span>
                        </div>
                        <div class="placa-blanca">${patenteFormateada}</div>
                    </div>
                    <div class="info-orden">
                        <div class="chofer-txt">👤 ${nombreChofer}</div>
                        <div class="empresa-txt">(${nombreEmpresa})</div>
                    </div>
                </div>
                
                <div class="tarjeta-bloque-inferior">
                    <div class="txt-litros">${orden.litros_pedidos} L</div>
                    <div class="tarjeta-badges">
                        <span class="status-tag">${orden.estado}</span>
                        ${iconoEfectivo}
                    </div>
                </div>
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

    const btnIniciar = document.getElementById("btn-iniciar-carga");
    if(btnIniciar) {
        btnIniciar.onclick = async () => {
            btnIniciar.disabled = true;
            btnIniciar.textContent = "VERIFICANDO...";

            const { data: orden, error: errOrden } = await supabaseCliente
                .from('ordenes_carga')
                .select('*')
                .eq('id', ordenActualizadaID)
                .single();

            if (errOrden || !orden) {
                alert("Error al leer la orden. Reintentá.");
                btnIniciar.disabled = false;
                btnIniciar.textContent = "INICIAR CARGA";
                return;
            }

            const { data: cliente, error: errCliente } = await supabaseCliente
                .from('clientes')
                .select('nombre, requiere_foto_remito')
                .eq('id', orden.cliente_id)
                .single();

            if (errCliente || !cliente) {
                alert("Error al verificar los datos del cliente.");
                btnIniciar.disabled = false;
                btnIniciar.textContent = "INICIAR CARGA";
                return;
            }

            if (cliente.requiere_foto_remito === true) {
                alert(`📸 El cliente ${cliente.nombre} REQUIERE FOTO de la factura o remito.\n(En breve habilitaremos la cámara aquí).`);
                btnIniciar.disabled = false;
                btnIniciar.textContent = "INICIAR CARGA";
            } else {
                const mensajeAlerta = `⚠️ Está a punto de despachar ${orden.litros_pedidos} Litros a:\n\n👤 ${cliente.nombre}\n\n¿Confirma que el camión ya fue cargado?`;
                if (!confirm(mensajeAlerta)) {
                    btnIniciar.disabled = false;
                    btnIniciar.textContent = "INICIAR CARGA";
                    return;
                }

                btnIniciar.textContent = "GUARDANDO...";
                const { error: errUpdate } = await supabaseCliente
                    .from('ordenes_carga')
                    .update({ 
                        estado: 'DESPACHADO',
                        fecha_despacho: new Date().toISOString()
                    })
                    .eq('id', ordenActualizadaID);

                if (errUpdate) {
                    alert("No se pudo registrar en la base de datos.");
                    btnIniciar.disabled = false;
                    btnIniciar.textContent = "INICIAR CARGA";
                } else {
                    modal.style.display = "none";
                    cargarOrdenesPendientes();
                    btnIniciar.disabled = false;
                    btnIniciar.innerHTML = '<span class="icono-check">✔</span> INICIAR CARGA';
                }
            }
        };
    }

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
