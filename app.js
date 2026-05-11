// 1. Conectamos con tus credenciales de Supabase
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formulario-orden");

    formulario.addEventListener("submit", async (e) => {
        // Evitamos que la página se recargue sola
        e.preventDefault();

        // 2. Capturamos lo que el cliente eligió en la pantalla
        const sucursal = document.getElementById("sucursal").value;
        const patente = document.getElementById("patente").value;
        const chofer = document.getElementById("chofer").value;
        const litros = document.getElementById("litros").value;
        
        // Por ahora dejamos al cliente fijo para la prueba
        const clienteFijo = "TRANSPORTE FRANCOVIG SH"; 

        if (!sucursal || !patente || !chofer || !litros) {
            alert("Por favor, completá todos los campos antes de emitir la orden.");
            return;
        }

        // 3. Mandamos los datos a la tabla ordenes_carga en Supabase
        const { data, error } = await supabase
            .from('ordenes_carga')
            .insert([
                {
                    cliente: clienteFijo,
                    sucursal: sucursal,
                    patente: patente,
                    chofer: chofer,
                    litros: parseInt(litros),
                    estado: 'PENDIENTE'
                }
            ]);

        // 4. Verificamos si llegó bien o hubo drama
        if (error) {
            console.error("Error de Supabase:", error);
            alert("Hubo un error de conexión con la base de datos.");
        } else {
            alert(`¡Golazo! La orden de ${litros} litros para la patente ${patente} se guardó en la nube.`);
            formulario.reset(); // Limpia la pantalla para el próximo pedido
        }
    });
});