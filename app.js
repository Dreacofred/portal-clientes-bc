// 1. Conectamos con tus credenciales
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formulario-orden");

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 2. Capturamos los datos del formulario (agregamos el efectivo)
        const patente = document.getElementById("patente").value;
        const chofer = document.getElementById("chofer").value;
        const litros = document.getElementById("litros").value;
        const efectivo = document.getElementById("efectivo").value || 0; // Si lo deja vacío, manda 0

        if (!patente || !chofer || !litros) {
            alert("Por favor, completá patente, chofer y litros antes de emitir la orden.");
            return;
        }

        // 3. Mandamos los datos con los NOMBRES EXACTOS de tu tabla
        const { data, error } = await supabaseCliente
            .from('ordenes_carga')
            .insert([
                {
                    cliente_id: 1, // Temporalmente mandamos el ID 1 para que pase
                    sucursal_carga_id: 1, // Temporalmente mandamos el ID 1
                    Patente: patente, // Con P mayúscula, tal cual tu tabla
                    chofer: chofer,
                    litros_pedidos: parseInt(litros),
                    efectivo_pedido: parseInt(efectivo),
                    estado: 'PENDIENTE'
                }
            ]);

        // 4. Verificamos
        if (error) {
            console.error("Error de Supabase:", error);
            alert("Sigue habiendo un error. Mirá la consola.");
        } else {
            alert(`¡GOLAZO! La orden de ${litros} litros para la patente ${patente} entró perfecto a Supabase.`);
            formulario.reset(); 
        }
    });
});
