const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

let idClienteActual = null;
let limiteEfectivoActual = 0;
let usaFormatoEspecial = false; 
let eligeCuitFacturar = false; 
let idOrdenEditando = null; 

document.addEventListener("DOMContentLoaded", async () => {

    // --- A. SEGURIDAD Y DATOS ---
    const { data: { user } } = await supabaseCliente.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }

    // MODIFICACIÓN 1: Le pedimos a Supabase que también nos traiga la columna "habilitado"
    const { data: clienteDatos, error: errorCliente } = await supabaseCliente
        .from('clientes').select('id, nombre, limite_efectivo, formato_especial, elige_cuit_facturar, habilitado')
        .eq('auth_user_id', user.id).single();

    if (errorCliente || !clienteDatos) { alert("Usuario no vinculado."); return; }

    // ==========================================
    // MODIFICACIÓN 2: LA TRAMPA DE SEGURIDAD
    // ==========================================
    // Si la base de datos dice explícitamente que está inhabilitado (false), le bloqueamos la carga
    if (clienteDatos.habilitado === false) {
        const divFormulario = document.getElementById("contenedor-formulario");
        const cartelInhabilitado = document.getElementById("mensaje-inhabilitado");
        
        if (divFormulario && cartelInhabilitado) {
            divFormulario.style.display = "none"; // Desaparecemos el formulario entero
            cartelInhabilitado.style.display = "block"; // Prendemos el cartel rojo gigante
        }
        
        // Ponemos el nombre igual arriba de todo por cortesía, pero no lo dejamos seguir ejecutando el resto de la app
        document.querySelector('.nombre-empresa').textContent = clienteDatos.nombre;
        
        // Inicializamos el botón de salir para que pueda irse
        const btnSalir = document.querySelector('.icono-salir');
        if (btnSalir) {
            btnSalir.addEventListener('click', async () => {
                await supabaseCliente.auth.signOut();
                window.location.href = "login.html";
            });
        }
        
        // Cortamos la ejecución de la app acá mismo. No carga sugerencias, ni configura botones, ni nada.
        return; 
    }
    // ==========================================

    idClienteActual = clienteDatos.id;
    limiteEfectivoActual = parseInt(clienteDatos.limite_efectivo) || 0;
    usaFormatoEspecial = clienteDatos.formato_especial === true; 
    eligeCuitFacturar = clienteDatos.elige_cuit_facturar === true;

    document.querySelector('.nombre-empresa').textContent = clienteDatos.nombre;
    document.querySelector('.input-bloqueado').value = clienteDatos.nombre;
    document.getElementById("efectivo").placeholder = `Máx permitido: $${limiteEfectivoActual}`;

    // --- LÓGICA DE MOSTRAR/OCULTAR CASILLEROS ESPECIALES ---
    const cajaNormal = document.getElementById("caja-orden-normal");
    const cajaEspecial = document.getElementById("caja-ordenes-especiales");

    if (usaFormatoEspecial) {
        if(cajaNormal) cajaNormal.style.display = "none";
        if(cajaEspecial) cajaEspecial.style.display = "flex";
    } else {
        if(cajaNormal) cajaNormal.style.display = "block";
        if(cajaEspecial) cajaEspecial.style.display = "none";
    }

    function controlarCamposFacturacion() {
        const cajaFacturacion = document.getElementById("caja-facturacion-especial");
        if (eligeCuitFacturar) {
            if (cajaFacturacion) cajaFacturacion.style.display = "block";
        } else {
            if (cajaFacturacion) cajaFacturacion.style.display = "none";
        }
    }
    controlarCamposFacturacion();

    // --- LÓGICA DEL CHECKBOX "TANQUE LLENO" ---
    const chkTanqueLleno = document.getElementById("tanque_lleno");
    const inputLitros = document.getElementById("litros");

    if (chkTanqueLleno && inputLitros) {
        chkTanqueLleno.addEventListener("change", function() {
            if (this.checked) {
                inputLitros.value = ""; 
                inputLitros.disabled = true; 
                inputLitros.placeholder = "Tanque Lleno";
                inputLitros.style.backgroundColor = "#e9ecef";
            } else {
                inputLitros.disabled = false; 
                inputLitros.placeholder = "Ej: 500";
                inputLitros.style.backgroundColor = "";
            }
        });
    }

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
            .eq('cliente_id', idClienteActual)
            .order('id', { ascending: false })
            .limit(20); 

        if (error) return;

        const cuerpoTabla = document.getElementById("cuerpo-tabla");
        cuerpoTabla.innerHTML = ""; 
        const mapaSucursales = { 1: 'Reconquista', 2: 'Avellaneda', 3: 'Florencia', 4: 'Recreo' };

        data.forEach(orden => {
            const fila = document.createElement("tr");
            let claseEstado = "pendiente";
            let accionesHtml = "";

            if (orden.estado === 'DESPACHADO' || orden.estado === 'AUDITADO') {
                fila.classList.add("fila-despachada");
                claseEstado = "despachado";
                
                let btnFoto = "";
                if (orden.url_foto) {
                    btnFoto = `<button class="btn-accion" style="background-color: #007bff; font-size: 1.1em; color: white; border-radius: 4px; padding: 2px 8px; border: none; cursor: pointer;" onclick="window.open('${orden.url_foto}', '_blank')" title="Ver Foto del Remito">🧾 Ver Remito</button>`;
                } else {
                    btnFoto = `<span style="font-size: 0.8em; color: #999;">Sin Foto</span>`;
                }

                accionesHtml = `
                    <div class="celda-acciones" style="justify-content: flex-start; gap: 10px;">
                        ${btnFoto}
                    </div>
                `;
            } else {
                const ordenEncoded = encodeURIComponent(JSON.stringify(orden)).replace(/'/g, "%27");
                accionesHtml = `
                    <div class="celda-acciones">
                        <button class="btn-accion edit" onclick="prepararEdicion('${ordenEncoded}')">✏️</button>
                        <button class="btn-accion delete" onclick="eliminarOrden(${orden.id})">🗑️</button>
                    </div>
                `;
            }

            let fechaAMostrar = "Sin fecha";
            let etiquetaFecha = "";

            if (orden.estado === 'PENDIENTE') {
                etiquetaFecha = "Emitida: ";
                if (orden.fecha_creacion) {
                    const fechaObj = new Date(orden.fecha_creacion.replace(" ", "T"));
                    if (!isNaN(fechaObj)) {
                        fechaAMostrar = fechaObj.toLocaleDateString('es-AR') + ' ' + 
                                        fechaObj.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
                    }
                }
            } else {
                etiquetaFecha = "Cargada: ";
                if (orden.fecha_despacho) {
                    const fechaObj = new Date(orden.fecha_despacho.replace(" ", "T"));
                    if (!isNaN(fechaObj)) {
                        fechaAMostrar = fechaObj.toLocaleDateString('es-AR') + ' ' + 
                                        fechaObj.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
                    }
                }
            }

            let numeroMostrar = orden.nro_orden_cliente || '-';
            if (usaFormatoEspecial) {
                numeroMostrar = `L:${orden.nro_orden_litros_interna || '-'} | E:${orden.nro_orden_efectivo_interna || '-'}`;
            }

            let textoLitros = "";
            if (orden.estado === 'AUDITADO') {
                textoLitros = `${orden.litros_reales || 0} L`;
            } else if (orden.tanque_lleno === true) {
                textoLitros = `<span style="background-color: #e1f5fe; color: #0288d1; padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 0.9em;">Tanque Lleno</span>`;
            } else {
                textoLitros = `${orden.litros_pedidos || 0} L`;
            }

            // ==========================================
            // MAGIA DE CARTELITOS VISUALES EN LA TABLA
            // ==========================================
            let detallesObj = orden.detalle_combustibles;
            if (typeof detallesObj === 'string') {
                try { detallesObj = JSON.parse(detallesObj); } catch(e) { detallesObj = null; }
            }

            let alertasTabla = "";
            if (detallesObj && typeof detallesObj === 'object' && Object.keys(detallesObj).length > 1) {
                alertasTabla += `<span style="display:inline-block; margin-top:4px; font-size:0.7em; color:#d84315; font-weight:bold; background:#fbe9e7; padding:2px 6px; border-radius:4px; border:1px solid #ffccbc;">MÚLTIPLE</span> `;
            }
            if (orden.articulos_extra && orden.articulos_extra.trim() !== "") {
                alertasTabla += `<span style="display:inline-block; margin-top:4px; font-size:0.7em; color:#6a1b9a; font-weight:bold; background:#f3e5f5; padding:2px 6px; border-radius:4px; border:1px solid #e1bee7;">+ EXTRAS</span>`;
            }
            
            if (alertasTabla !== "") {
                textoLitros += `<br>${alertasTabla}`;
            }
            // ==========================================

            fila.innerHTML = `
                <td style="font-size: 0.9em;"><strong>${numeroMostrar}</strong></td>
                <td><span style="font-size: 0.8em; color: #777; display: block;">${etiquetaFecha}</span>${fechaAMostrar}</td>
                <td><strong>${mapaSucursales[orden.sucursal_carga_id] || '---'}</strong></td>
                <td>${orden.chofer || 'Sin chofer'}</td> 
                <td>${textoLitros}</td>
                <td><span class="estado ${claseEstado}">${orden.estado}</span></td>
                <td>${accionesHtml}</td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    }

    // --- D. RECUPERAMOS LAS SUGERENCIAS ---
    async function cargarSugerencias() {
        const { data, error } = await supabaseCliente
            .from('ordenes_carga').select('patente, chofer').eq('cliente_id', idClienteActual);

        if (error) return;

        const patentesUnicas = [...new Set(data.map(item => item.patente))].filter(Boolean); 
        const choferesUnicos = [...new Set(data.map(item => item.chofer))].filter(Boolean);

        const listadoPatentes = document.getElementById("lista-patentes");
        const listadoChoferes = document.getElementById("lista-choferes");
        listadoPatentes.innerHTML = ""; listadoChoferes.innerHTML = "";

        patentesUnicas.forEach(p => { if(p) listadoPatentes.innerHTML += `<option value="${p}">`; });
        choferesUnicos.forEach(c => { if(c) listadoChoferes.innerHTML += `<option value="${c}">`; });
    }

    // --- E. FUNCIONES DE ACCIÓN ---
    window.eliminarOrden = async (id) => {
        if (!confirm("¿Seguro que querés anular esta orden?")) return;
        const { error } = await supabaseCliente.from('ordenes_carga').delete().eq('id', id);
        if (error) alert("No se pudo eliminar."); else cargarOrdenes();
    };

    window.prepararEdicion = (ordenEncoded) => {
        const orden = JSON.parse(decodeURIComponent(ordenEncoded));

        idOrdenEditando = orden.id;
        document.getElementById("sucursal").value = orden.sucursal_carga_id || "";
        document.getElementById("patente").value = orden.patente || "";
        document.getElementById("chofer").value = orden.chofer || "";
        document.getElementById("efectivo").value = orden.efectivo_pedido || 0;
        
        if (usaFormatoEspecial) {
            document.getElementById("nro_orden_litros_interna").value = orden.nro_orden_litros_interna || "";
            document.getElementById("nro_orden_efectivo_interna").value = orden.nro_orden_efectivo_interna || "";
        } else {
            document.getElementById("nro_orden_cliente").value = orden.nro_orden_cliente || "";
        }

        if (eligeCuitFacturar) {
            document.getElementById("factura_cuit").value = (orden.factura_cuit && orden.factura_cuit !== 'null') ? orden.factura_cuit : "";
            document.getElementById("factura_razon_social").value = (orden.factura_razon_social && orden.factura_razon_social !== 'null') ? orden.factura_razon_social : "";
        }

        const chk = document.getElementById("tanque_lleno");
        const inpLts = document.getElementById("litros");
        const chkExtras = document.getElementById("chk_extras");
        const cajaExtras = document.getElementById("caja_extras");
        const contenedorCombustibles = document.getElementById("contenedor-combustibles-extra");
        const inputArticulosExtra = document.getElementById("articulos_extra");

        contenedorCombustibles.innerHTML = `
            <div class="fila-form fila-extra" style="margin-bottom: 10px;">
                <div class="grupo-input">
                    <label>Combustible Adicional</label>
                    <select class="combustible_extra_select">
                        <option value="">-- Ninguno --</option>
                        <option value="Euro Diesel G3">Euro Diesel G3</option>
                        <option value="Nafta Super G2">Nafta Super G2</option>
                        <option value="Nafta Premium G3">Nafta Premium G3</option>
                    </select>
                </div>
                <div class="grupo-input">
                    <label>Litros Adicionales</label>
                    <input type="number" class="litros_extra_input" placeholder="Ej: 50">
                </div>
            </div>
        `;

        let gasoilLitros = 0;
        let esTanqueLlenoGasoil = false;
        
        let detalles = orden.detalle_combustibles;
        if (typeof detalles === 'string') {
            try { detalles = JSON.parse(detalles); } catch(e) { detalles = null; }
        }
        
        const articulosExtra = orden.articulos_extra;

        if (detalles && typeof detalles === 'object' && Object.keys(detalles).length > 0) {
            
            if (detalles["Gas Oil 500 G2"] === "Tanque Lleno") {
                esTanqueLlenoGasoil = true;
            } else if (detalles["Gas Oil 500 G2"]) {
                gasoilLitros = parseFloat(detalles["Gas Oil 500 G2"]) || 0;
            }

            const otrosCombustibles = Object.entries(detalles).filter(([k, v]) => k !== "Gas Oil 500 G2");

            if (otrosCombustibles.length > 0 || (articulosExtra && articulosExtra.trim() !== "")) {
                chkExtras.checked = true;
                cajaExtras.style.display = "block"; 
                inputArticulosExtra.value = articulosExtra || "";

                otrosCombustibles.forEach((item, index) => {
                    const combustible = item[0];
                    const cantLitros = item[1];

                    if (index === 0) {
                        document.querySelector('.combustible_extra_select').value = combustible;
                        document.querySelector('.litros_extra_input').value = cantLitros;
                    } else {
                        const btnAgregarMas = document.getElementById("btn_agregar_mas");
                        if(btnAgregarMas) btnAgregarMas.click();

                        const selects = document.querySelectorAll('.combustible_extra_select');
                        const inputs = document.querySelectorAll('.litros_extra_input');
                        selects[selects.length - 1].value = combustible;
                        inputs[inputs.length - 1].value = cantLitros;
                    }
                });
            } else {
                chkExtras.checked = false;
                cajaExtras.style.display = "none";
                inputArticulosExtra.value = "";
            }

        } else {
            gasoilLitros = orden.litros_pedidos || 0;
            esTanqueLlenoGasoil = orden.tanque_lleno === true;
            chkExtras.checked = false;
            cajaExtras.style.display = "none";
            inputArticulosExtra.value = "";
        }

        if (esTanqueLlenoGasoil) {
            chk.checked = true;
            inpLts.value = "";
            inpLts.disabled = true;
            inpLts.placeholder = "Tanque Lleno";
            inpLts.style.backgroundColor = "#e9ecef";
        } else {
            chk.checked = false;
            inpLts.value = gasoilLitros || "";
            inpLts.disabled = false;
            inpLts.placeholder = "Ej: 500";
            inpLts.style.backgroundColor = "";
        }
        
        btnEnviar.textContent = "Actualizar Orden de Carga";
        btnEnviar.style.backgroundColor = "#28a745"; 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };

    cargarOrdenes();
    cargarSugerencias();

    // --- F. ENVÍO O ACTUALIZACIÓN ---
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();
        const sucursal = document.getElementById("sucursal").value;
        const patente = document.getElementById("patente").value.toUpperCase().replace(/\s+/g, ''); 
        const chofer = document.getElementById("chofer").value.toUpperCase();
        const efectivo = parseInt(document.getElementById("efectivo").value || "0");
        
        const isTanqueLleno = document.getElementById("tanque_lleno").checked;
        const litrosInput = document.getElementById("litros").value;
        const chkExtras = document.getElementById("chk_extras").checked;
        let artExtra = document.getElementById("articulos_extra").value.trim();

        let litrosGasoil = parseFloat(litrosInput) || 0;
        let paqueteCombustibles = {};
        let sumaTotalLitros = 0;

        // 1. Armamos el Gasoil Principal
        if (isTanqueLleno) {
            paqueteCombustibles["Gas Oil 500 G2"] = "Tanque Lleno";
        } else if (litrosGasoil > 0) {
            paqueteCombustibles["Gas Oil 500 G2"] = litrosGasoil;
            sumaTotalLitros += litrosGasoil;
        }

        // 2. Sumamos los Combustibles Extras
        if (chkExtras) {
            const selectsExtras = document.querySelectorAll('.combustible_extra_select');
            const inputsExtras = document.querySelectorAll('.litros_extra_input');
            
            for (let i = 0; i < selectsExtras.length; i++) {
                const comb = selectsExtras[i].value;
                const lts = parseFloat(inputsExtras[i].value) || 0;
                
                if (comb && lts > 0) {
                    if (paqueteCombustibles[comb]) {
                        paqueteCombustibles[comb] += lts;
                    } else {
                        paqueteCombustibles[comb] = lts;
                    }
                    sumaTotalLitros += lts; 
                }
            }
        }

        // 3. LA NUEVA BARRERA INTELIGENTE: 
        // Si no tildó tanque lleno y no puso ni un solo litro de NADA, frena la orden
        if (!isTanqueLleno && sumaTotalLitros <= 0) {
            alert("⚠️ Por favor, ingresá la cantidad de litros de algún combustible o tildá 'Llenar Tanque'.");
            return;
        }

        // 4. Validaciones obligatorias de sucursal y chofer
        if (!sucursal || sucursal === "" || isNaN(parseInt(sucursal)) || !chofer) {
            alert("⚠️ Por favor, completá los campos obligatorios (Sucursal y Chofer).");
            return;
        }

        // 5. Validación del límite de efectivo
        if (efectivo > limiteEfectivoActual) {
            alert(`Monto solicitado ($${efectivo}) supera el límite ($${limiteEfectivoActual}).`);
            return;
        }

        if (!chkExtras || artExtra === "") {
            artExtra = null;
        }

        let nroOrdenCliente = "";
        let nroOrdenLitros = null;
        let nroOrdenEfectivo = null;

        if (usaFormatoEspecial) {
            nroOrdenLitros = document.getElementById("nro_orden_litros_interna").value.trim();
            nroOrdenEfectivo = document.getElementById("nro_orden_efectivo_interna").value.trim();
            
            if (!nroOrdenLitros || !nroOrdenEfectivo) {
                const confirmaVacio = confirm("⚠️ ATENCIÓN: No completaste los Números de Orden Interna.\n\n¿Deseás emitir la carga de todas formas para completarlos más adelante?");
                if (!confirmaVacio) return; 
            }
        } else {
            nroOrdenCliente = document.getElementById("nro_orden_cliente").value.trim();
        }

        let campoCuitVal = null;
        let campoRsVal = null;

        if (eligeCuitFacturar) {
            const txtCuit = document.getElementById("factura_cuit").value.trim();
            const txtRs = document.getElementById("factura_razon_social").value.trim();

            if (txtCuit !== "" || txtRs !== "") {
                if (txtCuit.length !== 11 || isNaN(txtCuit)) {
                    alert("⚠️ Error: El CUIT a facturar debe tener exactamente 11 números, sin guiones ni puntos.");
                    document.getElementById("factura_cuit").focus();
                    return; 
                }
                campoCuitVal = parseInt(txtCuit); 
                campoRsVal = txtRs.toUpperCase(); 
            }
        }

        const datos = {
            cliente_id: idClienteActual, 
            sucursal_carga_id: parseInt(sucursal), 
            patente: patente || null, 
            chofer,
            litros_pedidos: sumaTotalLitros, 
            tanque_lleno: isTanqueLleno, 
            efectivo_pedido: efectivo,
            nro_orden_cliente: nroOrdenCliente,
            nro_orden_litros_interna: nroOrdenLitros, 
            nro_orden_efectivo_interna: nroOrdenEfectivo,
            factura_cuit: campoCuitVal,              
            factura_razon_social: campoRsVal,        
            estado: 'PENDIENTE',
            detalle_combustibles: paqueteCombustibles,
            articulos_extra: artExtra
        };

        let resultado;
        if (idOrdenEditando) {
            resultado = await supabaseCliente.from('ordenes_carga').update(datos).eq('id', idOrdenEditando);
        } else {
            resultado = await supabaseCliente.from('ordenes_carga').insert([datos]);
        }

        if (resultado.error) {
            alert("Error al procesar la operación.");
            console.error(resultado.error);
        } else {
            alert(idOrdenEditando ? "¡Orden actualizada!" : "¡Orden emitida!");
            idOrdenEditando = null;
            btnEnviar.textContent = "Emitir Orden de Carga";
            btnEnviar.style.backgroundColor = ""; 
            
            formulario.reset(); 
            document.getElementById("litros").disabled = false;
            document.getElementById("litros").placeholder = "Ej: 500";
            document.getElementById("litros").style.backgroundColor = "";
            document.querySelector('.input-bloqueado').value = clienteDatos.nombre; 
            
            document.getElementById("caja_extras").style.display = "none";
            document.getElementById("chk_extras").checked = false;
            
            cargarOrdenes();
            cargarSugerencias(); 
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

// ==========================================
// REGISTRO Y ACTUALIZACIÓN SILENCIOSA PWA
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registro => {
                console.log('PWA: Service Worker registrado.');

                // Escucha si hay una nueva versión del Service Worker instalándose
                registro.addEventListener('updatefound', () => {
                    const nuevoSW = registro.installing;
                    if (nuevoSW) {
                        nuevoSW.addEventListener('statechange', () => {
                            // Cuando la nueva versión termina de instalarse (installed)
                            if (nuevoSW.state === 'installed') {
                                // Si ya había uno activo antes, significa que es una actualización
                                if (navigator.serviceWorker.controller) {
                                    console.log('PWA: Nueva versión detectada y lista. Actualizando pestaña...');
                                    
                                    // Forzamos al nuevo SW a tomar el control y refrescamos la página
                                    nuevoSW.postMessage({ type: 'SKIP_WAITING' });
                                    window.location.reload(); 
                                }
                            }
                        });
                    }
                });
            })
            .catch(error => console.log('Error al registrar PWA:', error));
            
        // Refrescar la página automáticamente si el Service Worker cambia de control (medida de seguridad)
        let recargando;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (recargando) return;
            window.location.reload();
            recargando = true;
        });
    });
}
