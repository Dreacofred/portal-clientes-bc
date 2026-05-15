const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

let idClienteActual = null;
let limiteEfectivoActual = 0;
let usaFormatoEspecial = false; 
let idOrdenEditando = null; 

document.addEventListener("DOMContentLoaded", async () => {

    // --- A. SEGURIDAD Y DATOS ---
    const { data: { user } } = await supabaseCliente.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const { data: clienteDatos, error: errorCliente } = await supabaseCliente
        .from('clientes').select('id, nombre, limite_efectivo, formato_especial')
        .eq('auth_user_id', user.id).single();

    if (errorCliente || !clienteDatos) { alert("Usuario no vinculado."); return; }

    idClienteActual = clienteDatos.id;
    limiteEfectivoActual = parseInt(clienteDatos.limite_efectivo) || 0;
    usaFormatoEspecial = clienteDatos.formato_especial === true; 

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
        // ACTUALIZADO: Ya NO filtramos AUDITADO para que puedan ver el historial
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
            let fechaRaw = orden.fecha_creacion;
            let claseEstado = "pendiente";
            let accionesHtml = "";

            // ACTUALIZADO: Lógica para mostrar botón de factura si está despachada o auditada
            if (orden.estado === 'DESPACHADO' || orden.estado === 'AUDITADO') {
                fila.classList.add("fila-despachada");
                claseEstado = "despachado";
                if (orden.fecha_despacho) fechaRaw = orden.fecha_despacho;
                
                let btnFoto = "";
                if (orden.url_foto) {
                    // Botón azul para abrir la foto en una pestaña nueva
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
                accionesHtml = `
                    <div class="celda-acciones">
                        <button class="btn-accion edit" onclick="prepararEdicion(${orden.id}, '${orden.patente || ''}', '${orden.chofer}', ${orden.litros_pedidos}, ${orden.efectivo_pedido}, '${orden.nro_orden_cliente || ''}', ${orden.sucursal_carga_id}, '${orden.nro_orden_litros_interna || ''}', '${orden.nro_orden_efectivo_interna || ''}')">✏️</button>
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

            let numeroMostrar = orden.nro_orden_cliente || '-';
            if (usaFormatoEspecial) {
                numeroMostrar = `L:${orden.nro_orden_litros_interna || '-'} | E:${orden.nro_orden_efectivo_interna || '-'}`;
            }

            fila.innerHTML = `
                <td>#${orden.id}</td>
                <td style="font-size: 0.9em;"><strong>${numeroMostrar}</strong></td>
                <td>${fechaFormateada}</td>
                <td><strong>${mapaSucursales[orden.sucursal_carga_id] || '---'}</strong></td>
                <td>${orden.chofer || 'Sin chofer'}</td> 
                <td>${orden.litros_pedidos} L</td>
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

    window.prepararEdicion = (id, patente, chofer, litros, efectivo, nroCliente, sucursal, nroLitros, nroEfectivo) => {
        idOrdenEditando = id;
        document.getElementById("sucursal").value = sucursal || "";
        document.getElementById("patente").value = patente || "";
        document.getElementById("chofer").value = chofer;
        document.getElementById("litros").value = litros;
        document.getElementById("efectivo").value = efectivo;
        
        if (usaFormatoEspecial) {
            document.getElementById("nro_orden_litros_interna").value = nroLitros;
            document.getElementById("nro_orden_efectivo_interna").value = nroEfectivo;
        } else {
            document.getElementById("nro_orden_cliente").value = nroCliente;
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
        const litros = document.getElementById("litros").value;
        const efectivo = parseInt(document.getElementById("efectivo").value || "0");

        if (!sucursal || sucursal === "" || isNaN(parseInt(sucursal)) || !chofer || !litros) {
            alert("⚠️ Por favor, completá los campos obligatorios (Sucursal, Chofer y Litros).");
            return;
        }

        if (efectivo > limiteEfectivoActual) {
            alert(`Monto solicitado ($${efectivo}) supera el límite ($${limiteEfectivoActual}).`);
            return;
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

        const datos = {
            cliente_id: idClienteActual, 
            sucursal_carga_id: parseInt(sucursal), 
            patente: patente || null, 
            chofer,
            litros_pedidos: parseInt(litros),
            efectivo_pedido: efectivo,
            nro_orden_cliente: nroOrdenCliente,
            nro_orden_litros_interna: nroOrdenLitros, 
            nro_orden_efectivo_interna: nroOrdenEfectivo,
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
            console.error(resultado.error);
        } else {
            alert(idOrdenEditando ? "¡Orden actualizada!" : "¡Orden emitida!");
            idOrdenEditando = null;
            btnEnviar.textContent = "Emitir Orden de Carga";
            btnEnviar.style.backgroundColor = ""; 
            formulario.reset(); 
            document.querySelector('.input-bloqueado').value = clienteDatos.nombre; 
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
