const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

const NOMBRE_OPERADOR = localStorage.getItem('empleado_nombre') || "Operador";
const ID_SUCURSAL_ACTUAL = localStorage.getItem('empleado_sucursal');
const nombresSucursales = { 1: "RECONQUISTA", 2: "AVELLANEDA", 3: "FLORENCIA", 4: "RECREO" };

// --- LÓGICA DE SUPER USUARIO (MODO GLOBAL) ---
// Detecta si el que inició sesión sos vos o un administrador
const esSuperUsuario = NOMBRE_OPERADOR.toUpperCase().includes("MUÑOZ DIEGO") || NOMBRE_OPERADOR.toUpperCase().includes("ADMIN");

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
    // Si sos vos, cambiamos el texto de la sucursal por la vista global
    if(elSucursal) elSucursal.textContent = esSuperUsuario ? "🌐 VISTA GLOBAL" : (nombresSucursales[ID_SUCURSAL_ACTUAL] || "BC");

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
        // Preparamos la consulta a la base de datos
        let consulta = supabaseCliente
            .from('ordenes_carga')
            .select('*, clientes(nombre)') 
            .eq('estado', 'PENDIENTE')
            .order('fecha_creacion', { ascending: true });

        // Si NO sos super usuario, le clavamos el filtro de la sucursal para que vea solo lo suyo
        if (!esSuperUsuario) {
            consulta = consulta.eq('sucursal_carga_id', ID_SUCURSAL_ACTUAL);
        }

        // Ejecutamos la consulta
        const { data, error } = await consulta;

        if (error) {
            contenedorOrdenes.innerHTML = "Error al conectar con la base de datos.";
            return;
        }

        if (data.length === 0) {
            contenedorOrdenes.innerHTML = "<p style='text-align:center; padding:20px; opacity:0.6;'>No hay camiones pendientes.</p>";
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
            if (orden.factura_cuit && orden.factura_razon_social) {
                htmlFacturacion = `
                    <div style="background-color: #e8f4fd; border: 1px solid #b3d7ff; padding: 6px 10px; margin-bottom: 10px; border-radius: 5px; color: #004085; font-size: 0.85em;">
                        <strong>FACTURAR A:</strong><br>
                        CUIT: ${orden.factura_cuit}<br>
                        RS: ${orden.factura_razon_social}
                    </div>
                `;
            }

            let htmlLitros = `<div class="txt-litros">${orden.litros_pedidos || 0} L</div>`;
            if (orden.tanque_lleno === true) {
                htmlLitros = `<div class="txt-litros" style="color: #0277bd; font-size: 1.1em; padding: 4px 8px; background: #e1f5fe; border-radius: 4px;">TANQUE LLENO</div>`;
            }

            // ==========================================
            // ALERTAS VISUALES EN LA TARJETA
            // ==========================================
            let alertasTarjeta = "";
            
            if (orden.detalle_combustibles && typeof orden.detalle_combustibles === 'object') {
                if (Object.keys(orden.detalle_combustibles).length > 1) {
                    alertasTarjeta += `<span style="background-color: #ff9800; color: #000; font-size: 10px; padding: 3px 6px; border-radius: 4px; margin-left: 10px; font-weight: bold; letter-spacing: 0.5px; vertical-align: middle;">MÚLTIPLE</span>`;
                }
            }
            
            if (orden.articulos_extra && orden.articulos_extra.trim() !== "") {
                alertasTarjeta += `<span style="background-color: #9c27b0; color: #fff; font-size: 10px; padding: 3px 6px; border-radius: 4px; margin-left: 5px; font-weight: bold; letter-spacing: 0.5px; vertical-align: middle;">+ EXTRAS</span>`;
            }

            htmlLitros = `<div style="display: flex; align-items: center;">${htmlLitros}${alertasTarjeta}</div>`;
            // ==========================================

            // ==========================================
            // ETIQUETA ROJA DE SUCURSAL PARA EL ADMIN
            // ==========================================
            let htmlSucursal = "";
            if (esSuperUsuario) {
                const nombreSuc = nombresSucursales[orden.sucursal_carga_id] || "SUCURSAL DESCONOCIDA";
                htmlSucursal = `<div style="background-color: #C8102E; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">📍 ${nombreSuc}</div>`;
            }
            // ==========================================

            tarjeta.innerHTML = `
                <div class="tarjeta-bloque-superior">
                    ${htmlPatente}
                    <div class="info-orden">
                        ${htmlSucursal}
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
        
        // ==========================================
        // DESGLOSE DE PRODUCTOS
        // ==========================================
        const elLitrosDetalle = document.getElementById("detalle-litros");
        
        if (orden.detalle_combustibles && typeof orden.detalle_combustibles === 'object') {
            let htmlDesglose = `<div style="text-align: left; padding: 10px; background: #2c2c2c; border-radius: 8px; margin-top: 10px; border: 1px solid #444;">`;
            htmlDesglose += `<div style="font-size: 0.8em; color: #ff9800; margin-bottom: 8px; font-weight: bold;">RECETA DE CARGA:</div>`;
            
            for (const [producto, litros] of Object.entries(orden.detalle_combustibles)) {
                let textoLitros = litros === "Tanque Lleno" ? `<span style="color: #03a9f4; font-weight: bold;">LLENO</span>` : `<span style="color: white; font-weight: bold;">${litros} L</span>`;
                htmlDesglose += `<div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #555;">
                                    <span style="color: #ccc;">⛽ ${producto}</span>
                                    ${textoLitros}
                                 </div>`;
            }
            
            if (orden.articulos_extra && orden.articulos_extra.trim() !== "") {
                htmlDesglose += `<div style="margin-top: 8px; color: #ffeb3b; font-size: 0.9em; padding-top: 5px; border-top: 1px solid #555;">
                                    📦 <b>EXTRAS:</b> ${orden.articulos_extra}
                                 </div>`;
            }
            
            htmlDesglose += `</div>`;
            elLitrosDetalle.innerHTML = htmlDesglose;
            
        } else {
            if (orden.tanque_lleno === true) {
                elLitrosDetalle.textContent = "TANQUE LLENO";
                elLitrosDetalle.style.color = "#0277bd";
                elLitrosDetalle.style.fontSize = "1.4em";
            } else {
                elLitrosDetalle.textContent = (orden.litros_pedidos || 0) + " L";
                elLitrosDetalle.style.color = ""; 
                elLitrosDetalle.style.fontSize = "";
            }
        }
        // ==========================================

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

               // === INICIO DE COMPRESIÓN ===
                btnIniciar.disabled = true; 
                btnIniciar.textContent = "COMPRIMIENDO FOTO...";

                const sucursalPrefix = nombresSucursales[ID_SUCURSAL_ACTUAL].substring(0, 3).toUpperCase();
                const nombreArchivoUnique = `${sucursalPrefix}_Orden${orden.id}_${Date.now()}_remito.jpg`;
                
                let archivoParaSubir = archivoImagenCapturado;
                try {
                    archivoParaSubir = await comprimirImagen(archivoImagenCapturado);
                } catch (e) {
                    console.log("Error al comprimir, subiendo original", e);
                }

                btnIniciar.textContent = "SUBIENDO A LA NUBE...";
                const { data: uploadData, error: errUpload } = await supabaseCliente.storage
                    .from('remitos').upload(nombreArchivoUnique, archivoParaSubir);
                // === FIN DE COMPRESIÓN ===

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
                const textoLitros = orden.tanque_lleno ? "TANQUE LLENO" : `${orden.litros_pedidos || 0} L`;
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
// =========================================================
// FUNCIÓN PARA COMPRIMIR IMÁGENES
// =========================================================
async function comprimirImagen(file, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height *= maxWidth / width));
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(blob => {
                    if (!blob) {
                        reject(new Error('Fallo al comprimir la imagen'));
                        return;
                    }
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality); 
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}
