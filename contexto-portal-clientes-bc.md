# Contexto del Proyecto: Portal Clientes BC

Volcado de estado consolidado desde dos chats de Gemini (uno viejo: "Módulo Playa", y uno nuevo y más completo: "Portal Clientes BC"). Última actualización: 2026-07-27. La versión nueva es la fuente de verdad; la vieja queda documentada como referencia histórica al final.

<resumen_proyecto>
El sistema "Portal Clientes BC" es una plataforma web descentralizada para la gestión, emisión y auditoría de órdenes de carga de combustible en una red de estaciones de servicio (sucursales: Reconquista, Avellaneda, Florencia, Recreo).

Resuelve el problema operativo de digitalizar la pre-autorización de cargas por parte de los clientes (incluyendo control de límites de adelantos en efectivo y solicitud de múltiples tipos de combustibles/extras) y permite a los playeros (operadores de surtidor) visualizar los camiones pendientes, confirmar el despacho y adjuntar fotográficamente el remito firmado en tiempo real.

Los usuarios finales se dividen en tres roles:

Clientes: Emiten órdenes desde sus dispositivos.

Playeros: Gestionan la cola de carga en la playa y suben comprobantes.

Administrador/Súper Usuario (Diego Muñoz / Nancy / Personal de Administración): Monitorean toda la red globalmente, gestionan la base de datos y auditan los despachos mediante un panel centralizado.
</resumen_proyecto>

<arquitectura_y_stack>
Arquitectura Serverless dividida en frontend, backend-as-a-service (BaaS) y panel administrativo:

Frontend (Portal y Playa): HTML5, CSS3, Vanilla JavaScript. Configurado como PWA (Progressive Web App) con Service Workers (sw.js) para instalación nativa en dispositivos móviles. Dos manifiestos separados: manifest.json (Clientes) y manifest-playa.json (Playeros). Alojado y desplegado continuamente vía Vercel desde el repositorio de GitHub (Dreacofred/portal-clientes-bc).

Backend y Base de Datos: Supabase (PostgreSQL). Maneja la autenticación (supabase.auth), las tablas relacionales (clientes, ordenes_carga), políticas de seguridad (RLS - Row Level Security) y el almacenamiento de imágenes (Storage Bucket: remitos).

Panel de Administración Global: Streamlit (Python), archivo lector.py. Actúa como el entorno de auditoría para los administradores, utilizando claves de servicio para bypass de RLS y permitiendo consultas globales en tiempo real. Incluye el módulo "Monitor Global" para súper usuarios.
</arquitectura_y_stack>

<logica_de_negocio>

Autenticación y Bloqueo: Los clientes inician sesión. Si la columna habilitado en la tabla clientes es false, se bloquea el renderizado del formulario, cortando la ejecución de la app inmediatamente.

Límites de Efectivo: Las órdenes con adelanto de efectivo (efectivo_pedido) se bloquean en el frontend si superan el limite_efectivo definido en la base de datos para ese cliente.

Facturación y Formatos Especiales: Si el cliente tiene elige_cuit_facturar (true), se le exigen datos de facturación exactos (CUIT de 11 dígitos). Si tiene formato_especial (true), la orden cliente pasa a dividirse en orden de litros y orden de efectivo internas.

Lógica de Combustibles (Validación Flexible): Un cliente puede pedir Gas Oil G2, otros combustibles (Euro, Naftas) o "Tanque Lleno". La validación exige que la suma total de litros de todos los combustibles sea mayor a 0, o que "Tanque Lleno" esté tildado, de lo contrario bloquea la emisión.

Filtro de Sucursales y Súper Usuario: En la app de playa, los playeros solo ven órdenes de su sucursal (ID_SUCURSAL_ACTUAL). Si el NOMBRE_OPERADOR incluye "MUÑOZ DIEGO" o "ADMIN", se activa el "Modo Global" (bypasseando el filtro local en JavaScript y mostrando etiquetas rojas identificativas por sucursal).

Captura de Remitos y Contingencia: El playero está obligado a subir una foto del remito para pasar el estado a DESPACHADO. La imagen se comprime vía Canvas API (max width 1200px, 70% quality) antes de subir al bucket de Supabase. Existe un flujo de "Contingencia" que permite cerrar la orden sin foto, requiriendo justificación escrita (motivo_sin_foto) y permite registrar el efectivo entregado igual.

PWA Separadas: El ecosistema maneja dos aplicaciones instalables distintas desde el mismo dominio, orquestadas apuntando a dos manifiestos distintos: manifest.json (Clientes) y manifest-playa.json (Playeros).
</logica_de_negocio>

<indice_de_archivos>

manifest-playa.json (Versión final confirmada)

playa.html (Versión final confirmada)

playa.js (Versión final confirmada, incluye compresión de imagen y modo súper usuario)

app.js (Versión final confirmada, portal de clientes)

index.html (Solo snippet — falta el archivo completo)

lector.py (Solo fragmento del módulo Monitor Global — falta el archivo completo)
</indice_de_archivos>

<estructura_y_codigo>

```json
// Archivo: manifest-playa.json
{
  "name": "BC Playa - Despacho",
  "short_name": "BC Playa",
  "start_url": "/playa.html",
  "display": "standalone",
  "background_color": "#121212",
  "theme_color": "#C8102E",
  "icons": [
    { "src": "icono-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icono-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

```html
<!-- Archivo: index.html (ÚLTIMO FRAGMENTO MODIFICADO - falta el archivo completo) -->
<div class="grupo-input">
    <label>Litros Gas Oil G2</label>
    <input type="number" id="litros" placeholder="Ej: 500">
    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; margin-top: 5px; color: #0277bd;">
        <input type="checkbox" id="tanque_lleno" style="width: 15px; height: 15px;"> 
        <strong>Llenar Tanque</strong>
    </label>
</div>
```

```python
# Archivo: lector.py (ÚLTIMO FRAGMENTO MODIFICADO - MONITOR GLOBAL, falta el archivo completo)
# ==========================================
# 7. MÓDULO: MONITOR GLOBAL DE ÓRDENES (SÚPER USUARIO)
# ==========================================
elif opcion == "Monitor Global":
    st.title("📡 Monitor Global en Vivo")
    st.markdown('<p style="color:#666; font-size:16px;">Vista de Súper Usuario: Órdenes PENDIENTES en todas las sucursales.</p>', unsafe_allow_html=True)

    col_btn, col_vacia = st.columns([1, 4])
    with col_btn:
        if st.button("🔄 Actualizar Datos", use_container_width=True):
            st.rerun()

    st.markdown("<br>", unsafe_allow_html=True)

    with st.spinner("Buscando órdenes en todas las estaciones..."):
        try:
            res_ordenes = supabase.table("ordenes_carga").select("*").eq("estado", "PENDIENTE").order("fecha_creacion", desc=True).execute()
            ordenes_pendientes = res_ordenes.data

            if not ordenes_pendientes:
                st.success("✅ Todo limpio. No hay ninguna orden pendiente de carga en la red en este momento.")
            else:
                res_clientes = supabase.table("clientes").select("id, nombre").execute()
                mapa_clientes = {c['id']: c['nombre'] for c in res_clientes.data} if res_clientes.data else {}
                mapa_sucursales = {1: 'Reconquista', 2: 'Avellaneda', 3: 'Florencia', 4: 'Recreo'}

                datos_tabla = []
                for o in ordenes_pendientes:
                    fecha_limpia = str(o.get('fecha_creacion', '')).replace("T", " ")[:16]
                    if o.get('tanque_lleno'):
                        litros = "Tanque Lleno"
                    else:
                        litros = f"{o.get('litros_pedidos', 0)} L"

                    detalles = o.get('detalle_combustibles', {})
                    if isinstance(detalles, str):
                        import json
                        try: detalles = json.loads(detalles) 
                        except: detalles = {}

                    if len(detalles) > 1 or o.get('articulos_extra'):
                        litros += " (+ Extras)"

                    datos_tabla.append({
                        "Fecha / Hora": fecha_limpia,
                        "Sucursal": mapa_sucursales.get(o.get('sucursal_carga_id'), "---"),
                        "Empresa": mapa_clientes.get(o.get('cliente_id'), "Desconocida"),
                        "Chofer": o.get('chofer', '---'),
                        "Patente": o.get('patente', '---'),
                        "Carga": litros,
                        "Adelanto Efectivo": f"$ {o.get('efectivo_pedido', 0)}"
                    })

                st.metric("Total de Camiones Esperando Carga", len(ordenes_pendientes))
                st.markdown('<div class="tarjeta-pro">', unsafe_allow_html=True)
                st.dataframe(datos_tabla, use_container_width=True)
                st.markdown('</div>', unsafe_allow_html=True)

        except Exception as e:
            st.error(f"Error de conexión al cargar el monitor: {e}")
```

```html
<!-- Archivo: playa.html -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Despacho de Combustible - BC</title>
    <link rel="manifest" href="manifest-playa.json">
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { background-color: #121212; color: #eee; }
        .tarjeta-playa { background: #1E1E1E; border-radius: 10px; margin-bottom: 15px; padding: 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s; border: 2px solid transparent;}
        .tarjeta-playa:hover { background: #252525; border-color: #C8102E; }
        .tarjeta-bloque-superior { display: flex; align-items: center; flex: 1; }
        .tarjeta-bloque-inferior { display: flex; align-items: center; justify-content: flex-end; gap: 15px; min-width: 180px; }
        .tarjeta-badges { display: flex; align-items: center; }
        .visual-patente { width: 140px; flex-shrink: 0; text-align: center; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.5); overflow: hidden;}
        .placa-azul { background-color: #2D4C82; height: 16px; display: flex; align-items: center; justify-content: space-between; padding: 0 10px;}
        .placa-azul-txt { color: white; font-weight: bold; font-size: 8px;}
        .placa-blanca { background-color: white; color: black; font-weight: bold; font-size: 24px; padding: 5px 0; letter-spacing: 2px;}
        .info-orden { margin-left: 20px; }
        .chofer-txt { font-size: 18px; font-weight: 800; color: #FFFFFF; margin-bottom: 2px; text-transform: uppercase; }
        .empresa-txt { font-size: 12px; color: #AAAAAA; text-transform: uppercase; }
        .txt-litros { font-size: 22px; font-weight: 700; color: #fff; }
        .status-tag { background-color: #f7b731; color: black; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 12px; margin-left: 10px;}
        .dinero-icon { font-size: 24px; margin-left: 10px;}
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
        .modal-contenido { background: #111; border: 3px solid #C8102E; border-radius: 15px; padding: 30px; width: 100%; max-width: 450px; position: relative; overflow-y: auto; max-height: 90vh; }
        .btn-cerrar { position: absolute; top: 15px; right: 20px; background: none; border: none; color: white; font-size: 24px; cursor: pointer; z-index: 10; }
        .btn-verde { width: 100%; background-color: #00b894; color: white; border: none; padding: 15px; font-size: 20px; font-weight: bold; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 25px; transition: 0.2s;}
        .btn-verde:hover { background-color: #00a080; }
        .btn-verde:disabled { background-color: #555; cursor: not-allowed; opacity: 0.6; }
        .icono-check { background: white; color: #00b894; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; }
        .detalle-texto { font-size: 16px; line-height: 1.8; margin-top: 20px; }
        .btn-logout { background: rgba(255,255,255,0.1); color: #ff7675; border: 1px solid #ff7675; padding: 4px 12px; border-radius: 20px; font-size: 11px; cursor: pointer; font-weight: bold; margin-top: 5px; transition: 0.3s; }
        .btn-logout:hover { background: #ff7675; color: white; }
        @media (max-width: 768px) {
            .header-rojo { padding: 12px 15px !important; }
            .header-der { gap: 10px !important; }
            .tarjeta-playa { flex-direction: column; align-items: stretch; gap: 15px; padding: 15px; }
            .tarjeta-bloque-superior { flex-direction: column; text-align: center; gap: 12px; }
            .info-orden { margin-left: 0; }
            .visual-patente { margin: 0 auto; width: 100%; max-width: 180px; }
            .placa-blanca { font-size: 28px; }
            .tarjeta-bloque-inferior { justify-content: space-between; border-top: 1px solid #333; padding-top: 15px; }
            .status-tag { margin-left: 0; }
        }
    </style>
</head>
<body>
    <header class="header-rojo">
        <div class="header-izq" style="display: flex; align-items: center;">
            <img src="https://bjhykcdhafoqpfkpngvw.supabase.co/storage/v1/object/public/remitos/Logo.jpeg" style="height: 45px; border-radius: 50%; margin-right: 10px; border: 2px solid white;">
            <h2 style="color:white; margin: 0; font-size: 16px; line-height: 1.1;">Despacho<br>Playa</h2>
        </div>
        <div class="header-der" style="display: flex; align-items: center; gap: 10px;">
            <div style="text-align: right; line-height: 1.3;">
                <div style="font-size: 13px; color: white;">👤 <strong id="nombre-operador">---</strong></div>
                <div style="opacity: 0.8; font-size: 11px;">📍 <strong id="nombre-sucursal">---</strong></div>
            </div>
            <button id="btn-instalar" style="display: none; background-color: #ffc107; color: #000; border: none; padding: 5px 10px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 10px; text-transform: uppercase;">📲 INSTALAR</button>
            <button id="btn-cerrar-sesion" class="btn-logout" style="margin: 0;">SALIR</button>
        </div>
    </header>
    <main class="contenedor">
        <input type="text" placeholder="Buscar patente o chofer..." style="width: 100%; padding: 15px; background: #1E1E1E; color:white; border: 1px solid #444; border-radius: 30px; font-size: 16px; margin-bottom: 25px; outline:none;">
        <h3 style="opacity: 0.7;">Órdenes PENDIENTES</h3>
        <div id="lista-ordenes"></div>
    </main>
    <div id="modal-detalle" class="modal-overlay">
        <div class="modal-contenido">
            <button id="btn-cerrar-modal" class="btn-cerrar">✖</button>
            <div class="visual-patente" style="width: 100%; margin-bottom: 20px;">
                <div class="placa-azul"><span class="placa-azul-txt">AR</span><span class="placa-azul-txt">Mercosur</span></div>
                <div class="placa-blanca" id="detalle-patente" style="font-size: 45px; padding: 20px 0;"></div>
            </div>
            <div class="detalle-texto">
                <div>EMPRESA: <strong id="detalle-empresa">...</strong></div>
                <div>CHOFER: <strong id="detalle-chofer">...</strong></div>
                <div>LITROS AUTORIZADOS: <strong id="detalle-litros">...</strong></div>
                <div id="caja-efectivo" style="background: #2d2d2d; border-left: 4px solid #f7b731; padding: 15px; margin-top: 15px; border-radius: 4px; display: none;">
                    <div style="color: #aaa; font-size: 12px; margin-bottom: 5px;">EFECTIVO SOLICITADO: $<span id="detalle-efectivo-pedido">0</span></div>
                    <label style="color: #f7b731; font-weight: bold; display: block; margin-bottom: 5px;">CANTIDAD A ENTREGAR ($)</label>
                    <input type="number" id="input-efectivo-entregado" style="width: 100%; padding: 10px; background: #111; color: #f7b731; border: 1px solid #f7b731; border-radius: 6px; font-size: 18px; font-weight: bold; box-sizing: border-box;">
                </div>
                <div style="margin-top: 15px;"><span class="status-tag" style="margin-left: 0;">PENDIENTE</span></div>
            </div>
            <div id="caja-camara" style="display: none; margin-top: 25px; text-align: center; border-top: 1px solid #333; padding-top: 20px;">
                <label style="color: #fff; font-size: 16px; display: block; margin-bottom: 15px; font-weight: 600;">📸 Sacar foto del remito/factura (Obligatorio)</label>
                <input type="file" id="input-foto" accept="image/*" capture="camera" style="display: none;">
                <button id="btn-abrir-camara" class="btn-logout" style="padding: 10px 20px; font-size: 14px; text-transform: uppercase; border-color: #fff; color: #fff; margin-bottom: 15px;">Abrir Cámara / Seleccionar</button>
                <div id="vista-previa" style="margin-top: 15px; display: none;">
                    <img id="img-preview" src="#" alt="Vista previa" style="max-width: 100%; max-height: 250px; border-radius: 8px; border: 2px solid #ccc; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
                    <div id="nombre-archivo-capturado" style="font-size: 11px; opacity: 0.6; margin-top: 5px; color: white;"></div>
                </div>
                <button id="btn-omitir-foto" style="background:none; border:none; color:#ff7675; text-decoration:underline; font-size:14px; cursor:pointer; margin-top:25px; padding:10px; width: 100%;">⚠️ Problemas técnicos: Omitir foto</button>
            </div>
            <div id="caja-contingencia" style="display: none; margin-top: 25px; text-align: center; border-top: 1px solid #ff7675; padding-top: 20px;">
                <label style="color: #ff7675; font-size: 14px; display: block; margin-bottom: 10px; font-weight: bold;">JUSTIFICAR FALTA DE FOTO</label>
                <input type="text" id="input-motivo" placeholder="Ej: Lluvia intensa, celular roto..." style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #444; background: #222; color: white; margin-bottom: 15px; font-size: 16px; box-sizing: border-box;">
                <button id="btn-finalizar-contingencia" class="btn-verde" style="background-color: #d63031;">CERRAR ORDEN SIN FOTO</button>
                <button id="btn-volver-camara" style="background:none; border:none; color:#aaa; text-decoration:underline; font-size:14px; cursor:pointer; margin-top:15px; padding:10px;">⬅ Volver a intentar con la cámara</button>
            </div>
            <button id="btn-iniciar-carga" class="btn-verde"><span class="icono-check">✔</span> INICIAR CARGA</button>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="playa.js"></script>
    <script>
        let eventoInstalacionPlaya;
        const btnInstalarPlaya = document.getElementById('btn-instalar');
        if (btnInstalarPlaya) {
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                eventoInstalacionPlaya = e;
                btnInstalarPlaya.style.display = 'block'; 
            });
            btnInstalarPlaya.addEventListener('click', async () => {
                if (!eventoInstalacionPlaya) return;
                eventoInstalacionPlaya.prompt();
                const { outcome } = await eventoInstalacionPlaya.userChoice;
                eventoInstalacionPlaya = null;
                btnInstalarPlaya.style.display = 'none';
            });
            window.addEventListener('appinstalled', () => {
                btnInstalarPlaya.style.display = 'none';
            });
        }
    </script>
</body>
</html>
```

```javascript
// Archivo: playa.js
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

const NOMBRE_OPERADOR = localStorage.getItem('empleado_nombre') || "Operador";
const ID_SUCURSAL_ACTUAL = localStorage.getItem('empleado_sucursal');
const nombresSucursales = { 1: "RECONQUISTA", 2: "AVELLANEDA", 3: "FLORENCIA", 4: "RECREO" };

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
        let consulta = supabaseCliente
            .from('ordenes_carga')
            .select('*, clientes(nombre)') 
            .eq('estado', 'PENDIENTE')
            .order('fecha_creacion', { ascending: true });

        if (!esSuperUsuario) {
            consulta = consulta.eq('sucursal_carga_id', ID_SUCURSAL_ACTUAL);
        }

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

            let htmlSucursal = "";
            if (esSuperUsuario) {
                const nombreSuc = nombresSucursales[orden.sucursal_carga_id] || "SUCURSAL DESCONOCIDA";
                htmlSucursal = `<div style="background-color: #C8102E; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">📍 ${nombreSuc}</div>`;
            }

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

                if (errUpload) {
                    alert("Error al subir la foto a la nube. Verifique conexión.");
                    btnIniciar.disabled = false; btnIniciar.textContent = "FINALIZAR Y SUBIR FOTO"; return;
                }

                const { data: publicUrlData } = supabaseCliente.storage.from('remitos').getPublicUrl(nombreArchivoUnique);

                btnIniciar.textContent = "GUARDANDO DESPACHO...";
                const { error: errUpdate } = await supabaseCliente
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
```

```javascript
// Archivo: app.js (Portal de Clientes)
const supabaseUrl = 'https://bjhykcdhafoqpfkpngvw.supabase.co';
const supabaseKey = 'sb_publishable_OvXN3LjawazkF5GNpsslUQ_SQOhTakr';
const supabaseCliente = window.supabase.createClient(supabaseUrl, supabaseKey);

let idClienteActual = null;
let limiteEfectivoActual = 0;
let usaFormatoEspecial = false; 
let eligeCuitFacturar = false; 
let idOrdenEditando = null; 

document.addEventListener("DOMContentLoaded", async () => {
    const { data: { user } } = await supabaseCliente.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const { data: clienteDatos, error: errorCliente } = await supabaseCliente
        .from('clientes').select('id, nombre, limite_efectivo, formato_especial, elige_cuit_facturar, habilitado')
        .eq('auth_user_id', user.id).single();

    if (errorCliente || !clienteDatos) { alert("Usuario no vinculado."); return; }

    if (clienteDatos.habilitado === false) {
        const divFormulario = document.getElementById("contenedor-formulario");
        const cartelInhabilitado = document.getElementById("mensaje-inhabilitado");

        if (divFormulario && cartelInhabilitado) {
            divFormulario.style.display = "none";
            cartelInhabilitado.style.display = "block";
        }

        document.querySelector('.nombre-empresa').textContent = clienteDatos.nombre;

        const btnSalir = document.querySelector('.icono-salir');
        if (btnSalir) {
            btnSalir.addEventListener('click', async () => {
                await supabaseCliente.auth.signOut();
                window.location.href = "login.html";
            });
        }

        return; 
    }

    idClienteActual = clienteDatos.id;
    limiteEfectivoActual = parseInt(clienteDatos.limite_efectivo) || 0;
    usaFormatoEspecial = clienteDatos.formato_especial === true; 
    eligeCuitFacturar = clienteDatos.elige_cuit_facturar === true;

    document.querySelector('.nombre-empresa').textContent = clienteDatos.nombre;
    document.querySelector('.input-bloqueado').value = clienteDatos.nombre;
    document.getElementById("efectivo").placeholder = `Máx permitido: $${limiteEfectivoActual}`;

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

    formulario.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.nodeName === "INPUT") {
            e.preventDefault();
            return false;
        }
    });

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

        if (isTanqueLleno) {
            paqueteCombustibles["Gas Oil 500 G2"] = "Tanque Lleno";
        } else if (litrosGasoil > 0) {
            paqueteCombustibles["Gas Oil 500 G2"] = litrosGasoil;
            sumaTotalLitros += litrosGasoil;
        }

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

        if (!isTanqueLleno && sumaTotalLitros <= 0) {
            alert("⚠️ Por favor, ingresá la cantidad de litros de algún combustible o tildá 'Llenar Tanque'.");
            return;
        }

        if (!sucursal || sucursal === "" || isNaN(parseInt(sucursal)) || !chofer) {
            alert("⚠️ Por favor, completá los campos obligatorios (Sucursal y Chofer).");
            return;
        }

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

    const btnSalir = document.querySelector('.icono-salir');
    if (btnSalir) {
        btnSalir.addEventListener('click', async () => {
            await supabaseCliente.auth.signOut();
            window.location.href = "login.html";
        });
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registro => {
                console.log('PWA: Service Worker registrado.');

                registro.addEventListener('updatefound', () => {
                    const nuevoSW = registro.installing;
                    if (nuevoSW) {
                        nuevoSW.addEventListener('statechange', () => {
                            if (nuevoSW.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    console.log('PWA: Nueva versión detectada y lista. Actualizando pestaña...');
                                    nuevoSW.postMessage({ type: 'SKIP_WAITING' });
                                    window.location.reload(); 
                                }
                            }
                        });
                    }
                });
            })
            .catch(error => console.log('Error al registrar PWA:', error));

        let recargando;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (recargando) return;
            window.location.reload();
            recargando = true;
        });
    });
}
```
</estructura_y_codigo>

<estado_actual_y_pendientes>
Estado de las implementaciones recién completadas: PWA Separadas (resolución del conflicto de caché en dispositivos de playa). Se creó manifest-playa.json y se vinculó exitosamente en playa.html para separar la instalación de la aplicación de playeros de la de clientes. **Falta confirmación de pruebas locales en los teléfonos de la playa.**

Pendientes heredados sin resolver en este volcado: no se posee el archivo index.html completo (solo un snippet de la leyenda del Gasoil) ni el archivo lector.py completo (solo el módulo Monitor Global) — verificar con el usuario si tiene esas versiones completas en otro chat.
</estado_actual_y_pendientes>

<referencia_historica_chat_anterior>
Nota: existió un chat previo, más simple, sobre el mismo sistema de despacho (llamado "Módulo Playa"), que ya quedó superado por este volcado. En esa versión anterior:

- El sistema todavía no tenía modo súper usuario, ni flujo de contingencia sin foto, ni compresión de imágenes, ni PWA separada para playeros.
- Se había resuelto un bug de RLS en Supabase (error 400 al subir fotos al bucket remitos), que ya sigue funcionando en esta versión nueva.
- Estaba pendiente construir el panel administrativo en Streamlit desde cero; en este volcado nuevo ya existe al menos el módulo "Monitor Global" de lector.py, por lo que ese trabajo ya avanzó parcialmente.

Se conserva esta referencia por si hace falta contrastar alguna decisión de diseño anterior.
</referencia_historica_chat_anterior>
