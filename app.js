// 1. Conectamos con tus credenciales (Cambiamos el nombre a supabaseCliente)
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formulario-orden");

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        const sucursal = document.getElementById("sucursal").value;
        const patente = document.getElementById("patente").value;
        const chofer = document.getElementById("chofer").value;
        const litros = document.getElementById("litros").value;
        const clienteFijo = "TRANSPORTE FRANCOVIG SH"; 

        if (!sucursal || !patente || !chofer || !litros) {
            alert("Por favor, completá todos los campos antes de emitir la orden.");
            return;
        }

        // 3. Usamos supabaseCliente para mandar los datos
        const { data, error } = await supabaseCliente
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

        if (error) {
            console.error("Error de Supabase:", error);
            alert("Hubo un error de conexión con la base de datos.");
        } else {
            alert(`¡Golazo! La orden de ${litros} litros para la patente ${patente} se guardó en la nube.`);
            formulario.reset(); 
        }
    });
});
