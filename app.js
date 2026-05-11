// 1. Conectamos con tus credenciales
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formulario-orden");

    // --- FUNCIÓN: Buscar y mostrar las órdenes en la tabla ---
    async function cargarOrdenes() {
        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .select('*')
            .eq('cliente_id', 2)
            .order('id', { ascending: false });

        if (error) return;

        const cuerpoTabla = document.getElementById("cuerpo-tabla");
        cuerpoTabla.innerHTML = ""; 

        data.forEach(orden => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${orden.id}</td>
                <td>${orden.patente}</td>
                <td><span class="estado pendiente">${orden.estado}</span></td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    }

    // --- NUEVA FUNCIÓN: Llenar las listas de sugerencias (Datalists) ---
    async function cargarSugerencias() {
        // Buscamos todas las órdenes para extraer choferes y patentes únicos
        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .select('patente, chofer')
            .eq('cliente_id', 2);

        if (error) return;

        // Usamos Set para que no haya nombres repetidos
        const patentesUnicas = [...new Set(data.map(item => item.patente))];
        const choferesUnicos = [...new Set(data.map(item => item.chofer))];

        const listadoPatentes = document.getElementById("lista-patentes");
        const listadoChoferes = document.getElementById("lista-choferes");

        listadoPatentes.innerHTML = "";
        listadoChoferes.innerHTML = "";

        patentesUnicas.forEach(p => {
            if(p) listadoPatentes.innerHTML += `<option value="${p}">`;
        });

        choferesUnicos.forEach(c => {
            if(c) listadoChoferes.innerHTML += `<option value="${c}">`;
        });
    }

    // Cargamos todo al iniciar
    cargarOrdenes();
    cargarSugerencias();

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        const sucursal = document.getElementById("sucursal").value;
        const patente = document.getElementById("patente").value.toUpperCase().replace(/\s+/g, ''); 
        const chofer = document.getElementById("chofer").value.toUpperCase();
        const litros = document.getElementById("litros").value;
        const efectivo = document.getElementById("efectivo").value || 0; 

        if (!sucursal || !patente || !chofer || !litros) {
            alert("Por favor, completá todos los campos.");
            return;
        }

        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .insert([{
                cliente_id: 2, 
                sucursal_carga_id: parseInt(sucursal), 
                patente: patente, 
                chofer: chofer,
                litros_pedidos: parseInt(litros),
                efectivo_pedido: parseInt(efectivo),
                estado: 'PENDIENTE'
            }]);

        if (error) {
            alert("Error al guardar.");
        } else {
            alert("¡GOLAZO! Orden cargada.");
            formulario.reset(); 
            cargarOrdenes();
            cargarSugerencias(); // Actualiza la lista por si escribiste uno nuevo
        }
    });
});
