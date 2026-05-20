const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

const NOMBRE_OPERADOR = localStorage.getItem('empleado_nombre') || "Operador";
const ID_SUCURSAL_ACTUAL = localStorage.getItem('empleado_sucursal');
const nombresSucursales = { 1: "RECONQUISTA", 2: "AVELLANEDA", 3: "FLORENCIA", 4: "RECREO" };

const inputFoto = document.getElementById('input-foto');
const btnAbrirCamara = document.getElementById('btn-abrir-camara');
const visualCamara = document.getElementById('caja-camara');
const visualPrevia = document.getElementById('vista-previa');
const imgPreview = document.getElementById('img-preview');
const lblNombreArchivo = document.getElementById('nombre-archivo-capturado');
let archivoImagenCapturado = null; 

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

    if (btnOmitirFoto) {
        btnOmitirFoto.onclick = () => {
            visualCamara.style.display = 'none';
            btnIniciar.style.display = 'none'; 
            cajaContingencia.style.display = 'block';
        };
    }

    if (btnVolverCamara) {
        btnVolverCamara.onclick = () => {
            cajaContingencia.style.display = 'none';
            visualCamara.style.display = 'block';
            btnIniciar.style.display = 'flex'; 
        };
    }

    // --- GUARDAR CONTINGENCIA SIN FOTO (Incluyendo Efectivo) ---
    if (btnFinalizarContingencia) {
        btnFinalizarContingencia.onclick = async () => {
            const motivo = inputMotivo.value.trim();
            if (!motivo) {
                alert("⚠️ Debes escribir brevemente por qué no pudiste sacar la foto (Ej: Lluvia, equipo fallando).");
                inputMotivo.focus();
                return;
            }

            const efectivoReal = parseInt(document.getElementById("input-efectivo-entregado").value) || 0;

            btnFinalizarContingencia.disabled = true;
            btnFinalizarContingencia.textContent = "GUARDANDO...";

            const { error: errUpdate } = await supabaseCliente
                .from('ordenes_carga')
                .update({ 
                    estado: 'DESPACHADO',
                    fecha_despacho: new Date().toISOString(),
                    motivo_sin_foto: motivo,
                    efectivo_entregado: efectivoReal 
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

    if(btnAbrirCamara && inputFoto) {
        btnAbrirCamara.onclick = () => { inputFoto.click(); };
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
            .select('*, clientes(nombre, factura_cuit, factura_razon_social)') 
            .eq('estado', 'PENDIENTE')
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
            const patenteFormateada = orden.patente;
            const iconoEfectivo = orden.efectivo_pedido > 0 ? `<div class="dinero-icon">💵</div>` : '';
            const nombreEmpresa = orden.clientes ? orden.clientes.nombre : "CLIENTE DESCONOCIDO";
            const nombreChofer = orden.chofer ? orden.chofer : "SIN ESPECIFICAR"; 

            let fechaFormateada = "Sin fecha";
            if (orden.fecha_creacion) {
                const fechaObj = new Date(orden.fecha_creacion.replace(" ", "T"));
                if (!isNaN(fechaObj)) {
                    fechaFormateada = fechaObj.toLocaleDateString('es-AR') + ' ' + 
                                      fechaObj.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
                }
            }

            const tarjeta = document.createElement("div");
            tarjeta.className = "tarjeta-playa";
            
            let htmlPatente = '';
            if (patenteFormateada && patenteFormateada !== 'null' && patenteFormateada.trim() !== '') {
                htmlPatente = `
                    <div class="visual-patente">
                        <div class="placa-azul">
                            <span class="placa-azul-txt">AR</span><span class="placa-azul-txt">Mercosur</span>
                        </div>
                        <div class="placa-blanca">${patenteFormateada}</div>
                    </div>`;
            } else {
                htmlPatente = `
                    <div style="color: #A0A0A0; font-size: 0.75em; font-style: italic; display: flex; align-items: center; justify-content: center; background: #f8f9fa; padding: 4px 8px; border-radius: 4px; border: 1px dashed #dcdcdc; margin-bottom: 10px;">
                        Sin patente
                    </div>`;
            }

            let htmlFacturacion = "";
            if (orden.clientes.factura_cuit && orden.clientes.factura_razon_social) {
                htmlFacturacion = `
                    <div style="background-color: #e8f4fd; border: 1px solid #b3d7ff; padding: 6px 10px; margin-bottom: 10px; border-radius: 5px; color: #004085; font-size: 0.85em;">
                        <strong>FACTURAR A:</strong><br>
                        CUIT: ${orden.clientes.factura_cuit}<br>
                        RS: ${orden.clientes.factura_razon_social}
                    </div>
                `;
            }

            // NUEVO: Lógica visual para Tanque Lleno en la tarjeta
            let htmlLitros = `<div class="txt-litros">${orden.litros_pedidos} L</div>`;
            if (orden.tanque_lleno) {
                htmlLitros = `<div class="txt-litros" style="color: #0277bd; font-size: 1.1em; padding: 4px 8px; background: #e1f5fe; border-radius: 4px;">TANQUE LLENO</div>`;
            }

            tarjeta.innerHTML = `
                <div class="tarjeta-bloque-superior">
                    ${htmlPatente}
                    <div class="info-orden">
                        <div class="chofer-txt">👤 ${nombreChofer}</div>
                        <div class="empresa-txt">(${nombreEmpresa})</div>
                    </div>
                </div>
                
                ${htmlFacturacion}
                
                <div class="tarjeta-bloque-inferior" style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        ${htmlLitros}
                        <div class="tarjeta-badges">
                            <span class="status-tag">${orden.estado}</span>
                            ${iconoEfectivo}
                        </div>
                    </div>
                    <div style="font-size: 0.75em; color: #8a8a8a; text-align: right; font-style: italic;">
                        Emitida: ${fechaFormateada}
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
        
        const elPatenteDetalle = document.getElementById("detalle-patente");
        if (patenteFormateada && patenteFormateada !== 'null' && patenteFormateada.trim() !== '') {
            elPatenteDetalle.textContent = patenteFormateada;
            elPatenteDetalle.style.fontSize = "1.3em";
            elPatenteDetalle.style.color = "inherit";
            elPatenteDetalle.style.fontStyle = "normal";
        } else {
            elPatenteDetalle.textContent = "Sin Patente Declarada";
            elPatenteDetalle.style.fontSize = "0.95em";
            elPatenteDetalle.style.color = "#777777";
            elPatenteDetalle.style.fontStyle = "italic";
        }

        document.getElementById("detalle-empresa").textContent = nombreEmpresa;
        document.getElementById("detalle-chofer").textContent = orden.chofer;
        
        // NUEVO: Lógica visual para Tanque Lleno en el modal de detalle
        const elLitrosDetalle = document.getElementById("detalle-litros");
        if (orden.tanque_lleno) {
            elLitrosDetalle.textContent = "TANQUE LLENO";
            elLitrosDetalle.style.color = "#0277bd";
            elLitrosDetalle.style.fontSize = "1.4em";
        } else {
            elLitrosDetalle.textContent = orden.litros_pedidos + " L";
            elLitrosDetalle.style.color = ""; // Vuelve al color por defecto si no es tanque lleno
            elLitrosDetalle.style.fontSize = "";
        }

        const cajaEfectivo = document.getElementById("caja-efectivo");
        const inputEfectivoEntregado = document.getElementById("input-efectivo-entregado");
        
        if (orden.efectivo_pedido > 0) {
            cajaEfectivo.style.display = "block";
            document.getElementById("detalle-efectivo-pedido").textContent = orden.efectivo_pedido.toLocaleString('es-AR');
            inputEfectivoEntregado.value = orden.efectivo_pedido; 
        } else {
            cajaEfectivo.style.display = "none";
            inputEfectivoEntregado.value = 0;
        }

        archivoImagenCapturado = null;
        inputFoto.value = ''; 
        visualCamara.style.display = 'none';
        visualPrevia.style.display = 'none';
        cajaContingencia.style.display = 'none'; 
        inputMotivo.value = ''; 
        btnIniciar.style.display = 'flex'; 
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
                .from('ordenes_carga').select('*').eq('id', ordenActualizadaID).single();

            if (errOrden || !orden) {
                alert("Error al leer la orden.");
                btnIniciar.disabled = false; btnIniciar.textContent = "INICIAR CARGA"; return;
            }

            const { data: cliente, error: errCliente } = await supabaseCliente
                .from('clientes').select('nombre, requiere_foto_remito').eq('id', orden.cliente_id).single();

            if (errCliente || !cliente) {
                alert("Error al verificar cliente.");
                btnIniciar.disabled = false; btnIniciar.textContent = "INICIAR CARGA"; return;
            }

            const efectivoReal = parseInt(document.getElementById("input-efectivo-entregado").value) || 0;

            if (cliente.requiere_foto_remito === true) {
                if (!archivoImagenCapturado) {
                    visualCamara.style.display = 'block';
                    btnIniciar.disabled = true; 
                    btnIniciar.textContent = "SAQUE LA FOTO PARA FINALIZAR";
                    btnAbrirCamara.scrollIntoView({ behavior: 'smooth' }); 
                    return; 
                }

                btnIniciar.disabled = true; btnIniciar.textContent = "SUBIENDO FOTO...";

                const extension = archivoImagenCapturado.name.split('.').pop() || 'jpg';
                const sucursalPrefix = nombresSucursales[ID_SUCURSAL_ACTUAL].substring(0, 3).toUpperCase();
                const nombreArchivoUnique = `${sucursalPrefix}_Orden${orden.id}_${Date.now()}_remito.${extension}`;

                const { data: uploadData, error: errUpload } = await supabaseCliente.storage
                    .from('remitos').upload(nombreArchivoUnique, archivoImagenCapturado);

                if (errUpload) {
                    alert("Error al subir la foto a la nube. Verifique conexión.");
                    btnIniciar.disabled = false; btnIniciar.textContent = "FINALIZAR Y SUBIR FOTO"; return;
                }

                const { data: publicUrlData } = supabaseCliente.storage.from('remitos').getPublicUrl(nombreArchivoUnique);

                btnIniciar.textContent = "GUARDANDO DESPACHO...";
                const { error: errUpdate = null } = await supabaseCliente
                    .from('ordenes_carga')
                    .update({ 
                        estado: 'DESPACHADO',
                        fecha_despacho: new Date().toISOString(),
                        url_foto: publicUrlData.publicUrl,
                        efectivo_entregado: efectivoReal 
                    })
                    .eq('id', orden.id);

                if (errUpdate) {
                    alert("Foto subida, pero no pudimos cerrar la orden. Avise a administración.");
                    btnIniciar.disabled = false; btnIniciar.textContent = "FINALIZAR Y SUBIR FOTO";
                } else {
                    modal.style.display = "none"; cargarOrdenesPendientes();
                    btnIniciar.disabled = false; btnIniciar.innerHTML = '<span class="icono-check">✔</span> INICIAR CARGA';
                }

            } else {
                // Modificamos el mensaje de alerta para que sea coherente
                const textoLitros = orden.tanque_lleno ? "TANQUE LLENO" : `${orden.litros_pedidos} L`;
                const mensajeAlerta = `⚠️ Está a punto de despachar ${textoLitros} y entregar $${efectivoReal} a:\n\n👤 ${cliente.nombre}\n\n¿Confirma que el camión ya fue cargado?`;
                
                if (!confirm(mensajeAlerta)) {
                    btnIniciar.disabled = false; btnIniciar.textContent = "INICIAR CARGA"; return;
                }

                btnIniciar.textContent = "GUARDANDO...";
                const { error: errUpdate } = await supabaseCliente
                    .from('ordenes_carga')
                    .update({ 
                        estado: 'DESPACHADO',
                        fecha_despacho: new Date().toISOString(),
                        efectivo_entregado: efectivoReal 
                    })
                    .eq('id', orden.id);

                if (errUpdate) {
                    alert("No se pudo registrar en la base de datos.");
                    btnIniciar.disabled = false; btnIniciar.textContent = "INICIAR CARGA";
                } else {
                    modal.style.display = "none"; cargarOrdenesPendientes();
                    btnIniciar.disabled = false; btnIniciar.innerHTML = '<span class="icono-check">✔</span> INICIAR CARGA';
                }
            }
        };
    }

    const btnSalir = document.getElementById("btn-cerrar-sesion");
    if (btnSalir) {
        btnSalir.addEventListener("click", () => {
            if (confirm("¿Cerrar sesión de " + NOMBRE_OPERADOR + "?")) {
                localStorage.removeItem('empleado_nombre'); localStorage.removeItem('empleado_sucursal');
                window.location.href = "login-playa.html";
            }
        });
    }

    cargarOrdenesPendientes();
    setInterval(cargarOrdenesPendientes, 30000); 
});
