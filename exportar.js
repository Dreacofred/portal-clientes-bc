const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

let idClienteActual = null;
let usaFormatoEspecial = false;

const columnasDisponibles = [
    { id: 'id', label: 'Nº Orden BC', checked: true },
    { id: 'nro_orden', label: 'Nº de Cliente / Interno', checked: true },
    { id: 'fecha_creacion', label: 'Fecha y Hora (Emisión)', checked: true },
    { id: 'fecha_despacho', label: 'Fecha y Hora (Carga Real)', checked: false },
    { id: 'sucursal', label: 'Sucursal', checked: true },
    { id: 'patente', label: 'Patente / Dominio', checked: true },
    { id: 'chofer', label: 'Chofer', checked: true },
    { id: 'litros_pedidos', label: 'Litros Pedidos', checked: true },
    { id: 'tanque_lleno', label: '¿Tanque Lleno?', checked: false },
    { id: 'litros_reales', label: 'Litros Cargados (Auditado)', checked: true },
    { id: 'efectivo_pedido', label: 'Efectivo Pedido ($)', checked: true },
    { id: 'efectivo_entregado', label: 'Efectivo Entregado ($)', checked: false },
    { id: 'numero_factura', label: 'Nº Factura', checked: false },
    { id: 'monto_factura', label: 'Monto Factura ($)', checked: false },
    { id: 'estado', label: 'Estado Actual', checked: true }
];

const mapaSucursales = { 1: 'Reconquista', 2: 'Avellaneda', 3: 'Florencia', 4: 'Recreo' };

document.addEventListener("DOMContentLoaded", async () => {
    
    const { data: { user } } = await supabaseCliente.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const { data: clienteDatos } = await supabaseCliente
        .from('clientes').select('id, formato_especial')
        .eq('auth_user_id', user.id).single();

    if (!clienteDatos) { alert("Error de usuario."); return; }
    idClienteActual = clienteDatos.id;
    usaFormatoEspecial = clienteDatos.formato_especial === true;

    const contenedorLista = document.getElementById('lista-columnas');
    
    columnasDisponibles.forEach(col => {
        const div = document.createElement('div');
        div.className = 'item-columna';
        div.style.cssText = 'display: flex; align-items: center; padding: 12px; margin-bottom: 8px; background: white; border: 1px solid #e0e0e0; border-radius: 6px; cursor: grab; transition: background 0.2s;';
        div.dataset.id = col.id;
        
        div.innerHTML = `
            <span style="margin-right: 15px; color: #a0a0a0; font-size: 1.5em; cursor: grab;">≡</span>
            <input type="checkbox" id="chk_${col.id}" class="chk-columna" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;" ${col.checked ? 'checked' : ''}>
            <label for="chk_${col.id}" style="margin: 0; font-weight: 600; color: #444; cursor: pointer; flex-grow: 1;">${col.label}</label>
        `;
        contenedorLista.appendChild(div);
    });

    new Sortable(contenedorLista, {
        animation: 150,
        handle: 'span',
    });

    document.getElementById('btn-descargar').addEventListener('click', async () => {
        const btn = document.getElementById('btn-descargar');
        btn.textContent = '⏳ Fabricando Excel...';
        btn.disabled = true;

        const elementosHtml = contenedorLista.querySelectorAll('.item-columna');
        const columnasSeleccionadas = [];
        
        elementosHtml.forEach(el => {
            const checkbox = el.querySelector('.chk-columna');
            if (checkbox.checked) {
                columnasSeleccionadas.push({ 
                    id: el.dataset.id, 
                    label: el.querySelector('label').textContent 
                });
            }
        });

        if (columnasSeleccionadas.length === 0) {
            alert("⚠️ Debes seleccionar al menos una columna para exportar.");
            btn.textContent = '⬇️ Descargar Excel';
            btn.disabled = false;
            return;
        }

        // --- CAPTURA Y CONSTRUCCIÓN DEL FILTRO DE FECHAS ---
        const fechaDesde = document.getElementById('fecha-desde').value;
        const fechaHasta = document.getElementById('fecha-hasta').value;

        let consulta = supabaseCliente
            .from('ordenes_carga')
            .select('*')
            .eq('cliente_id', idClienteActual);

        // Si puso fecha "Desde", filtramos desde el inicio de ese día (00:00:00)
        if (fechaDesde) {
            consulta = consulta.gte('fecha_creacion', `${fechaDesde}T00:00:00`);
        }
        // Si puso fecha "Hasta", filtramos hasta el último segundo de ese día (23:59:59)
        if (fechaHasta) {
            consulta = consulta.lte('fecha_creacion', `${fechaHasta}T23:59:59`);
        }

        const { data: ordenes, error } = await consulta.order('id', { ascending: false });

        if (error || !ordenes) {
            alert("Error al conectar con la base de datos.");
            btn.textContent = '⬇️ Descargar Excel';
            btn.disabled = false;
            return;
        }

        if (ordenes.length === 0) {
            alert("📭 No se encontraron órdenes en el rango de fechas seleccionado.");
            btn.textContent = '⬇️ Descargar Excel';
            btn.disabled = false;
            return;
        }

        const datosParaExcel = ordenes.map(orden => {
            const filaExcel = {};
            
            columnasSeleccionadas.forEach(col => {
                let valor = orden[col.id];

                if (col.id === 'sucursal') {
                    valor = mapaSucursales[orden.sucursal_carga_id] || '---';
                } 
                else if (col.id === 'fecha_creacion' || col.id === 'fecha_despacho') {
                    if (valor) {
                        const d = new Date(valor.replace(" ", "T"));
                        valor = d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
                    } else {
                        valor = '-';
                    }
                }
                else if (col.id === 'nro_orden') {
                    if (usaFormatoEspecial) {
                        valor = `L:${orden.nro_orden_litros_interna || '-'} | E:${orden.nro_orden_efectivo_interna || '-'}`;
                    } else {
                        valor = orden.nro_orden_cliente || '-';
                    }
                }
                else if (col.id === 'tanque_lleno') {
                    valor = orden.tanque_lleno ? 'SÍ' : 'NO';
                }
                else if (col.id === 'litros_pedidos' || col.id === 'litros_reales') {
                     valor = valor ? parseFloat(valor) : 0;
                }
                else if (col.id === 'efectivo_pedido' || col.id === 'efectivo_entregado' || col.id === 'monto_factura') {
                     valor = valor ? parseFloat(valor) : 0;
                }
                else if (col.id === 'patente') {
                    valor = valor ? valor.toUpperCase() : '---';
                }

                filaExcel[col.label] = valor;
            });
            
            return filaExcel;
        });

        const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Historial_Cargas");
        
        const anchos = columnasSeleccionadas.map(col => ({ wch: Math.max(col.label.length + 5, 15) }));
        hoja['!cols'] = anchos;

        XLSX.writeFile(libro, `BC_Reporte_Cargas_${new Date().toISOString().slice(0,10)}.xlsx`);

        btn.textContent = '⬇️ Descargar Excel';
        btn.disabled = false;
    });
});
