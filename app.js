// 1. Conectamos con tus credenciales
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formulario-orden");

    // --- NUEVA FUNCIÓN: Buscar y mostrar las órdenes en la tabla ---
    async function cargarOrdenes() {
        // Le pedimos a Supabase las órdenes del cliente 2, ordenadas por las más nuevas primero
        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .select('*')
            .eq('cliente_id', 2)
            .order('id', { ascending: false });

        if (error) {
            console.error("Error al traer las órdenes:", error);
            return;
        }

        const cuerpoTabla = document.getElementById("cuerpo-tabla");
        cuerpoTabla.innerHTML = ""; // Limpiamos la fila de mentira

        // Por cada orden real que trae, armamos una fila nueva
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

    // Apenas carga la página, llamamos a la función para que llene la tabla
    cargarOrdenes();

    // --- FIN NUEVA FUNCIÓN ---

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 2. Capturamos los datos del formulario
        const sucursal = document.getElementById("sucursal").value; 
        
        // Lo pasa a mayúsculas y borra CUALQUIER espacio en blanco que haya metido el chofer
        const patente = document.getElementById("patente").value.toUpperCase().replace(/\s+/g, ''); 
        
        const chofer = document.getElementById("chofer").value.toUpperCase();
        const litros = document.getElementById("litros").value;
        const efectivo = document.getElementById("efectivo").value || 0;

        if (!sucursal || !patente || !chofer || !litros) {
            alert("Por favor, completá sucursal, patente, chofer y litros antes de emitir la orden.");
            return;
        }

        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .insert([
                {
                    cliente_id: 2, 
                    sucursal_carga_id: parseInt(sucursal), 
                    patente: patente, 
                    chofer: chofer,
                    litros_pedidos: parseInt(litros),
                    efectivo_pedido: parseInt(efectivo),
                    estado: 'PENDIENTE'
                }
            ]);

        if (error) {
            console.error("Error de Supabase:", error);
            alert("Sigue habiendo un error. Mirá la consola.");
        } else {
            alert(`¡GOLAZO! La orden de ${litros} litros para la patente ${patente} entró perfecto a Supabase.`);
            formulario.reset(); 
            
            // ¡Magia! Apenas se guarda la orden, actualizamos la tabla de abajo
            cargarOrdenes(); 
        }
    });
});
