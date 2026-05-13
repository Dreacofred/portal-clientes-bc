const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

const NOMBRE_OPERADOR = localStorage.getItem('empleado_nombre') || "Operador";
const ID_SUCURSAL_ACTUAL = localStorage.getItem('empleado_sucursal');
const nombresSucursales = { 1: "RECONQUISTA", 2: "AVELLANEDA", 3: "FLORENCIA", 4: "RECREO" };

// Referencias a los elementos de cámara
const inputFoto = document.getElementById('input-foto');
const btnAbrirCamara = document.getElementById('btn-abrir-camara');
const visualCamara = document.getElementById('caja-camara');
const visualPrevia = document.getElementById('vista-previa');
const imgPreview = document.getElementById('img-preview');
const lblNombreArchivo = document.getElementById('nombre-archivo-capturado');
let archivoImagenCapturado = null; 

// Referencias a los elementos de Contingencia (NUEVO)
const btnOmitirFoto = document.getElementById('btn-omitir-foto');
const cajaContingencia = document.getElementById('caja-contingencia');
const inputMotivo = document.getElementById('input-motivo');
const btnFinalizarContingencia = document.getElementById('btn-finalizar-contingencia');
const btnVolverCamara = document.getElementById('btn-volver-camara');

document.addEventListener("DOMContentLoaded", () => {
    
    if (!ID_SUCURSAL_ACTUAL) {
        window.location.href = "login-playa.html";
        return;
    }

    const elNombre = document.getElementById('nombre-operador');
    const elSucursal = document.getElementById('nombre-sucursal');

    if(elNombre) elNombre.textContent = NOMBRE_OPERADOR;
    if(elSucursal) elSucursal.textContent = nombresSucursales[ID_SUCURSAL_ACTUAL] || "BC";

    const contenedorOrdenes = document.getElementById("lista-ordenes");
    const modal = document.getElementById("modal-detalle");
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    const btnIniciar = document.getElementById("btn-iniciar-carga");
    let ordenActualizadaID = null;

    // --- LÓGICA DE CONTINGENCIA (MOSTRAR/OCULTAR PANELES) ---
    if (btnOmitirFoto) {
        btnOmitirFoto.onclick = () => {
            visualCamara.style.display = 'none';
            btnIniciar.style.display = 'none'; // Ocultamos el botón verde original
            cajaContingencia.style.display = 'block';
        };
    }

    if (btnVolverCamara) {
        btnVolverCamara.onclick = () => {
            cajaContingencia.style.display = 'none';
            visualCamara.style.display = 'block';
            btnIniciar.style.display = 'flex'; // Volvemos a mostrar el botón verde
        };
    }

    // --- GUARDAR SIN FOTO CON MOTIVO ---
    if (btnFinalizarContingencia) {
        btnFinalizarContingencia.onclick = async () => {
            const motivo = inputMotivo.value.trim();
            if (!motivo) {
                alert("⚠️ Debes escribir brevemente por qué no pudiste sacar la foto (Ej: Lluvia, equipo fallando).");
                inputMotivo.focus();
                return;
            }

            btnFinalizarContingencia.disabled = true;
            btnFinalizarContingencia.textContent = "GUARDANDO...";

            // Actualizamos en BD indicando que está despachado, pero guardamos el motivo
            const { error: errUpdate } = await supabaseCliente
                .from('ordenes_carga')
                .update({ 
                    estado: 'DESPACHADO',
                    fecha_despacho: new Date().toISOString(),
                    motivo_sin_foto: motivo
                })
                .eq('id', ordenActualizadaID);

            if (errUpdate) {
                alert("Error al registrar en la base de datos. Intentá de nuevo.");
                btnFinalizarContingencia.disabled = false;
                btnFinalizarContingencia.textContent = "CERRAR ORDEN SIN FOTO";
            } else {
                modal.style.display = "none";
                cargarOrdenesPendientes();
                btnFinalizarContingencia.disabled = false;
                btnFinalizarContingencia.textContent = "CERRAR ORDEN SIN FOTO";
            }
        };
    }

    // --- CONFIGURACIÓN DE LA CÁMARA NORMAL ---
    if(btnAbrirCamara && inputFoto) {
        btnAbrirCamara.onclick = () => {
            inputFoto.click(); 
        };

        inputFoto.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    alert("Por favor, seleccione un archivo de imagen.");
                    return;
                }

                archivoImagenCapturado = file;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    imgPreview.src = event.target.result;
                    visualPrevia.style.display = 'block';
                    lblNombreArchivo.textContent = file.name;
                    
                    btnIniciar.disabled = false; 
                    btnIniciar.innerHTML = '<span class="icono-check">✔</span> FINALIZAR Y SUBIR FOTO';
                    btnIniciar.scrollIntoView({ behavior: 'smooth' }); 
                };
                reader.readAsDataURL(file);
            }
        };
    }

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

        // Reiniciar TODOS los paneles visuales
        archivoImagenCapturado = null;
        inputFoto.value = ''; 
        visualCamara.style.display = 'none';
        visualPrevia.style.display = 'none';
        cajaContingencia.style.display = 'none'; // Ocultar contingencia
        inputMotivo.value = ''; // Limpiar justificación anterior
        btnIniciar.style.display = 'flex'; // Asegurar que el botón verde sea visible
        imgPreview.src = '#';
        btnIniciar.innerHTML = '<span class="icono-check">✔</span> INICIAR CARGA'; 
        btnIniciar.disabled = false;

        modal.style.display = "flex";
    }

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
                alert("Error al leer la orden.");
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
                alert("Error al verificar cliente.");
                btnIniciar.disabled = false;
                btnIniciar.textContent = "INICIAR CARGA";
                return;
            }

            if (cliente.requiere_foto_remito === true) {
                // RUTA A: Lleva foto
                if (!archivoImagenCapturado) {
                    visualCamara.style.display = 'block';
                    btnIniciar.disabled = true; 
                    btnIniciar.textContent = "SAQUE LA FOTO PARA FINALIZAR";
                    btnAbrirCamara.scrollIntoView({ behavior: 'smooth' }); 
                    return; 
                }

                btnIniciar.disabled = true;
                btnIniciar.textContent = "SUBIENDO FOTO...";

                const extension = archivoImagenCapturado.name.split('.').pop() || 'jpg';
                const sucursalPrefix = nombresSucursales[ID_SUCURSAL_ACTUAL].substring(0, 3).toUpperCase();
                const nombreArchivoUnique = `${sucursalPrefix}_Orden${orden.id}_${Date.now()}_remito.${extension}`;

                const { data: uploadData, error: errUpload } = await supabaseCliente.storage
                    .from('remitos')
                    .upload(nombreArchivoUnique, archivoImagenCapturado);

                if (errUpload) {
                    console.error("Error upload:", errUpload);
                    alert("Error al subir la foto a la nube. Verifique conexión.");
                    btnIniciar.disabled = false;
                    btnIniciar.textContent = "FINALIZAR Y SUBIR FOTO";
                    return;
                }

                const { data: publicUrlData } = supabaseCliente.storage
                    .from('remitos')
                    .getPublicUrl(nombreArchivoUnique);

                const laUrlPublicaParaLaBD = publicUrlData.publicUrl;

                btnIniciar.textContent = "GUARDANDO DESPACHO...";
                const { error: errUpdate } = await supabaseCliente
                    .from('ordenes_carga')
                    .update({ 
                        estado: 'DESPACHADO',
                        fecha_despacho: new Date().toISOString(),
                        url_foto: laUrlPublicaParaLaBD
                    })
                    .eq('id', orden.id);

                if (errUpdate) {
                    console.error("Error DB update:", errUpdate);
                    alert("Foto subida, pero no pudimos cerrar la orden en la BD. Avise a administración.");
                    btnIniciar.disabled = false;
                    btnIniciar.textContent = "FINALIZAR Y SUBIR FOTO";
                } else {
                    modal.style.display = "none";
                    cargarOrdenesPendientes();
                    btnIniciar.disabled = false;
                    btnIniciar.innerHTML = '<span class="icono-check">✔</span> INICIAR CARGA';
                }

            } else {
                // RUTA B: No lleva foto
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
                    .eq('id', orden.id);

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
