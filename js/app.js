const SUPABASE_URL = "https://ygfplfditxwjewrpryon.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZnBsZmRpdHh3amV3cnByeW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNDE4ODgsImV4cCI6MjEwOTgxNzg4OH0.zUrDd_u4W8SS9OKdQoxJT_-WB0xArAqf2jVi2YGOPbU";

const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NOMBRE_TABLA = "marely_aquino_flores";
const BUCKET = "negocios";
const CLAVE_VOTOS = "tienditas_votos";

const SIN_FOTO = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250">' +
    '<rect width="100%" height="100%" fill="#e9ecef"/>' +
    '<text x="50%" y="50%" font-family="Arial" font-size="22" fill="#6c757d" ' +
    'text-anchor="middle" dominant-baseline="middle">Sin foto</text></svg>'
);

// DOM 
const formNegocio = document.getElementById('form-negocio');
const inputId = document.getElementById('negocio-id');
const inputNombre = document.getElementById('nombre');
const selectCategoria = document.getElementById('categoria');
const inputDireccion = document.getElementById('direccion');
const inputTelefono = document.getElementById('telefono');
const inputInformacion = document.getElementById('informacion');
const inputImagen = document.getElementById('imagen');
const vistaPrevia = document.getElementById('vista-previa');
const contenedorTarjetas = document.getElementById('contenedor-tarjetas');
const btnGuardar = document.getElementById('btn-guardar');
const btnCancelar = document.getElementById('btn-cancelar');
const tituloFormulario = document.getElementById('titulo-formulario');

const modalEliminar = new bootstrap.Modal(document.getElementById('modal-eliminar'));
const modalNombre = document.getElementById('modal-nombre');
const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');

const modalInformacion = new bootstrap.Modal(document.getElementById('modal-informacion'));
const infoModalNombre = document.getElementById('info-modal-nombre');
const infoModalTexto = document.getElementById('info-modal-texto');

const toastEl = document.getElementById('toast-mensaje');
const toastTexto = document.getElementById('toast-texto');
const toastBootstrap = new bootstrap.Toast(toastEl, { delay: 3000 });

let listaNegocios = [];
let idAEliminar = null;

function mostrarMensaje(texto, tipo = 'success') {
    toastEl.className = `toast align-items-center border-0 text-bg-${tipo}`;
    toastTexto.textContent = texto;
    toastBootstrap.show();
}

function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
}

function mostrarVistaPrevia(src) {
    if (src) {
        vistaPrevia.src = src;
        vistaPrevia.classList.remove('d-none');
    } else {
        vistaPrevia.removeAttribute('src');
        vistaPrevia.classList.add('d-none');
    }
}

function ponerCargando(cargando) {
    btnGuardar.disabled = cargando;
    if (cargando) {
        btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';
    } else {
        btnGuardar.textContent = inputId.value ? 'Actualizar Registro' : 'Guardar';
    }
}

function leerVotos() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_VOTOS)) || {};
    } catch {
        return {};
    }
}

function guardarVoto(idNegocio, valor) {
    try {
        const votos = leerVotos();
        votos[idNegocio] = valor;
        localStorage.setItem(CLAVE_VOTOS, JSON.stringify(votos));
    } catch {}
}

async function subirImagen(archivo) {
    if (!archivo.type.startsWith('image/')) {
        throw new Error('El archivo seleccionado debe ser una imagen válida.');
    }
    if (archivo.size > 5 * 1024 * 1024) {
        throw new Error('La imagen no debe pesar más de 5 MB.');
    }

    const ext = archivo.name.split('.').pop().toLowerCase();
    const ruta = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await clienteSupabase.storage
        .from(BUCKET)
        .upload(ruta, archivo, { contentType: archivo.type });
    
    if (error) {
        console.error('Error detallado en Supabase Storage:', error);
        throw new Error('Error al subir la imagen al Storage: ' + error.message);
    }

    const { data } = clienteSupabase.storage.from(BUCKET).getPublicUrl(ruta);
    return data.publicUrl;
}

async function obtenerNegocios() {
    const { data, error } = await clienteSupabase
        .from(NOMBRE_TABLA)
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error al cargar datos:', error);
        mostrarMensaje('No se pudieron cargar los negocios', 'danger');
        return;
    }

    listaNegocios = data || [];
    renderizarTarjetas(listaNegocios);
}

function htmlEstrellas(item) {
    const calificacionActual = item.calificacion || 0;
    const votoPrevio = leerVotos()[item.id];

    let estrellas = '';
    for (let v = 5; v >= 1; v--) {
        estrellas += `<span class="estrella ${v <= calificacionActual ? 'activa' : ''}" data-id="${item.id}" data-valor="${v}" title="${v} de 5">★</span>`;
    }

    const texto = calificacionActual > 0
        ? `${calificacionActual} de 5 estrellas`
        : 'Sin calificaciones';

    return `
        <div class="estrellas-tarjeta ${votoPrevio ? 'votado' : ''}">${estrellas}</div>
        <div class="small text-muted">${texto}</div>
        <div class="small text-success">${votoPrevio ? `Tu voto: ${votoPrevio} ★` : ''}</div>
    `;
}

function renderizarTarjetas(negocios) {
    contenedorTarjetas.innerHTML = '';

    if (negocios.length === 0) {
        contenedorTarjetas.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info mb-0">Aún no hay negocios registrados.</div>
            </div>`;
        return;
    }

    negocios.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = `
            <article class="card h-100 shadow-sm tarjeta">
                <div class="position-relative">
                    <img src="${item.imagen_url || SIN_FOTO}" class="card-img-top" alt="${escaparHTML(item.nombre)}">
                    <span class="badge etiqueta position-absolute top-0 start-0 m-2 shadow-sm">${escaparHTML(item.categoria)}</span>
                </div>
                <div class="card-body py-2 px-3">
                    <h3 class="h6 card-title fw-bold mb-1">${escaparHTML(item.nombre)}</h3>
                    <div>${htmlEstrellas(item)}</div>
                </div>
                
                <div id="info-tarjeta-${item.id}" class="d-none mx-3 mb-2 p-2 rounded tarjeta-info-amarilla small">
                    <p class="mb-1"><strong>Dirección:</strong> ${escaparHTML(item.direccion || 'Sin dirección')}</p>
                    <p class="mb-1"><strong>Teléfono:</strong> ${escaparHTML(item.telefono || 'Sin teléfono')}</p>
                    <p class="mb-0"><strong>Info:</strong> ${escaparHTML(item.informacion || 'Sin información adicional')}</p>
                </div>

                <div class="card-footer bg-transparent border-0 pb-3 pt-1 d-flex gap-1 flex-wrap mt-auto">
                    <button class="btn btn-sm btn-outline-warning flex-fill" onclick="alternarInformacion(${item.id})">Información</button>
                    <button class="btn btn-sm btn-primary flex-fill" onclick="prepararEdicion(${item.id})">Editar</button>
                    <button class="btn btn-sm btn-danger flex-fill" onclick="eliminarNegocio(${item.id})">Eliminar</button>
                </div>
            </article>
        `;
        contenedorTarjetas.appendChild(col);
    });
}

inputImagen.addEventListener('change', () => {
    const archivo = inputImagen.files[0];
    mostrarVistaPrevia(archivo ? URL.createObjectURL(archivo) : null);
});

window.alternarInformacion = (id) => {
    const tarjetaInfo = document.getElementById(`info-tarjeta-${id}`);
    if (tarjetaInfo) {
        tarjetaInfo.classList.toggle('d-none');
    }
};

contenedorTarjetas.addEventListener('click', async (e) => {
    const estrella = e.target.closest('.estrella');
    if (!estrella) return;

    const idNegocio = Number(estrella.dataset.id);
    const valor = Number(estrella.dataset.valor);

    const { error } = await clienteSupabase
        .from(NOMBRE_TABLA)
        .update({ calificacion: valor })
        .eq('id', idNegocio);

    if (error) {
        console.error('Error al calificar:', error);
        mostrarMensaje('No se pudo guardar tu calificación', 'danger');
        return;
    }

    guardarVoto(idNegocio, valor);
    mostrarMensaje('¡Calificación guardada con éxito!');
    obtenerNegocios();
});

formNegocio.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!inputNombrenomValidoCheck()) {
    }

    const id = inputId.value.trim();
    const datos = {
        nombre: inputNombre.value.trim(),
        categoria: selectCategoria.value,
        direccion: inputDireccion.value.trim(),
        telefono: inputTelefono.value.trim(),
        informacion: inputInformacion ? inputInformacion.value.trim() : ""
    };

    ponerCargando(true);

    try {
        const archivo = inputImagen.files[0];
        if (archivo) {
            console.log("Subiendo imagen archivo:", archivo.name);
            datos.imagen_url = await subirImagen(archivo);
        }

        let respuesta;
        if (id) {
            respuesta = await clienteSupabase
                .from(NOMBRE_TABLA)
                .update(datos)
                .eq('id', Number(id));
        } else {
            respuesta = await clienteSupabase
                .from(NOMBRE_TABLA)
                .insert([datos]);
        }

        if (respuesta.error) {
            throw respuesta.error;
        }

        mostrarMensaje(id ? 'Negocio actualizado con éxito' : 'Negocio registrado con éxito');
        limpiarFormulario();
        obtenerNegocios();
    } catch (err) {
        console.error('❌ Error al guardar:', err);
        alert('Error al guardar: ' + (err.message || JSON.stringify(err)));
        mostrarMensaje(err.message || 'No se pudo guardar el negocio', 'danger');
    } finally {
        ponerCargando(false);
    }
});

function inputNombrenomValidoCheck() {
    if (!inputNombre.value.trim() || !selectCategoria.value || !inputDireccion.value.trim() || !inputTelefono.value.trim()) {
        formNegocio.classList.add('was-validated');
        return false;
    }
    return true;
}

window.prepararEdicion = (id) => {
    const item = listaNegocios.find(n => n.id === id);
    if (!item) return;

    inputId.value = item.id;
    inputNombre.value = item.nombre;
    selectCategoria.value = item.categoria;
    inputDireccion.value = item.direccion;
    inputTelefono.value = item.telefono;
    if (inputInformacion) {
        inputInformacion.value = item.informacion || '';
    }

    inputImagen.value = '';
    mostrarVistaPrevia(item.imagen_url);

    formNegocio.classList.remove('was-validated');
    tituloFormulario.textContent = 'Editar Negocio';
    btnGuardar.textContent = 'Actualizar Registro';
    btnCancelar.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.eliminarNegocio = (id) => {
    const item = listaNegocios.find(n => n.id === id);
    if (!item) return;

    idAEliminar = id;
    modalNombre.textContent = item.nombre;
    modalEliminar.show();
};

btnConfirmarEliminar.addEventListener('click', async () => {
    if (idAEliminar === null) return;

    const { error } = await clienteSupabase
        .from(NOMBRE_TABLA)
        .delete()
        .eq('id', idAEliminar);

    modalEliminar.hide();

    if (error) {
        console.error('Error al eliminar:', error);
        mostrarMensaje('No se pudo eliminar el negocio', 'danger');
    } else {
        mostrarMensaje('Negocio eliminado');
        if (String(idAEliminar) === inputId.value) limpiarFormulario();
        obtenerNegocios();
    }
    idAEliminar = null;
});

btnCancelar.addEventListener('click', limpiarFormulario);

function limpiarFormulario() {
    inputId.value = '';
    formNegocio.reset();
    formNegocio.classList.remove('was-validated');
    mostrarVistaPrevia(null);

    tituloFormulario.textContent = 'Registrar Nuevo Negocio';
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar';
    btnCancelar.classList.add('d-none');
}

document.addEventListener('DOMContentLoaded', obtenerNegocios);