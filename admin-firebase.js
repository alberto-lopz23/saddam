import {
  obtenerPerfumes,
  actualizarPerfume,
  agregarPerfume,
  eliminarPerfume as eliminarPerfumeFirestore,
  moverPerfume,
  limpiarCache,
  loginAdmin,
  logoutAdmin,
  onAuthChange,
} from "./firebase-config.js";

let todosLosPerfumes = [];
let perfumesFiltrados = [];
let perfumeActual = null;
let usuarioActual = null;

// ============ AUTENTICACIÓN ============

onAuthChange((user) => {
  if (user) {
    usuarioActual = user;
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";
    document.getElementById("adminUsername").textContent = user.email;
    inicializarEventListeners(); // Configurar los event listeners para filtros
    cargarPerfumes(); // Carga los perfumes cuando el usuario inicia sesión
  } else {
    usuarioActual = null;
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("adminPanel").style.display = "none";
  }
});

// ============ LOGIN ============

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("loginError");

  errorEl.style.display = "none"; // Inicialmente, ocultamos el mensaje de error

  try {
    await loginAdmin(email, password);
  } catch (error) {
    let mensaje = "Error al iniciar sesión";

    // Definir mensajes de error según el código de error de Firebase
    if (error.code === "auth/invalid-credential") {
      mensaje = "Email o contraseña incorrectos";
    } else if (error.code === "auth/user-not-found") {
      mensaje = "Usuario no encontrado";
    } else if (error.code === "auth/wrong-password") {
      mensaje = "Contraseña incorrecta";
    } else if (error.code === "auth/too-many-requests") {
      mensaje = "Demasiados intentos. Intenta más tarde";
    }

    errorEl.textContent = mensaje;
    errorEl.style.display = "block";
    console.error("Error de login:", error);
  }
});

// ============ LOGOUT ============

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await logoutAdmin();
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
});

// ============ CARGAR PERFUMES ============

async function cargarPerfumes() {
  try {
    console.log("📖 Cargando perfumes desde Firebase...");
    const tbody = document.getElementById("perfumesTableBody");
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 40px;">⏳ Cargando...</td></tr>';

    const data = await obtenerPerfumes();
    todosLosPerfumes = [];

    Object.keys(data.perfumes).forEach((categoria) => {
      Object.keys(data.perfumes[categoria]).forEach((marca) => {
        const perfumesObj = data.perfumes[categoria][marca];

        // Verificamos que perfumesObj sea un objeto válido
        if (perfumesObj && typeof perfumesObj === "object") {
          Object.keys(perfumesObj).forEach((key) => {
            const perfume = perfumesObj[key];

            const precioBase = parseInt(perfume.precio) || 0;
            let precioFinal = precioBase;

            // Definir el precio final según la categoría
            switch (categoria) {
              case "arabes":
                precioFinal = precioBase + 1800;
                break;
              case "disenador":
                precioFinal = precioBase + 2300;
                break;
              case "nicho":
                precioFinal = precioBase + 3000;
                break;
              case "sets":
                precioFinal = precioBase;
                break;
            }

            // Agregar el perfume procesado a la lista
            todosLosPerfumes.push({
              ...perfume,
              categoria,
              marca,
              arrayIndex: parseInt(key, 10),
              precioBase,
              precioFinal,
            });
          });
        }
      });
    });

    perfumesFiltrados = [...todosLosPerfumes]; // Inicializamos perfumesFiltrados con todos los perfumes
    actualizarEstadisticas(); // Actualizamos las estadísticas
    mostrarPerfumes(); // Mostramos los perfumes en la UI
    console.log("✅ Perfumes cargados:", todosLosPerfumes.length);
  } catch (error) {
    console.error("Error al cargar perfumes:", error);
    const tbody = document.getElementById("perfumesTableBody");

    let mensajeError = error.message;
    let sugerencia = "";

    // Error handling para posibles problemas de conexión
    if (
      error.message.includes("offline") ||
      error.message.includes("Failed to get document") ||
      error.message.includes("unavailable")
    ) {
      mensajeError = "Sin conexión a internet";
      sugerencia =
        "<br><br>💡 <strong>Soluciones:</strong><br>1. Verifica tu conexión a internet<br>2. Recarga la página (F5)<br>3. Si el problema persiste, limpia la caché del navegador";
    } else if (error.message.includes("caché")) {
      sugerencia =
        "<br><br>💡 Por favor, conéctate a internet para cargar los datos";
    }

    tbody.innerHTML = ` 
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #e74c3c;">
          <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
          <h3 style="margin: 0 0 10px 0;">Error al cargar perfumes</h3>
          <p style="margin: 10px 0; font-size: 16px;">${mensajeError}</p>
          ${sugerencia}
          <br><br>
          <button onclick="location.reload()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
            🔄 Reintentar
          </button>
        </td>
      </tr>
    `;
  }
}

// ============ BOTÓN REFRESCAR ============

document.getElementById("refreshBtn").addEventListener("click", async () => {
  try {
    limpiarCache();
    await cargarPerfumes(); // Esperamos a que los perfumes se carguen
    document.getElementById("searchInput").value = "";
    document.getElementById("categoryFilter").value = "";
  } catch (error) {
    console.error("Error al refrescar los perfumes:", error);
    alert("❌ Error al refrescar. Intenta de nuevo más tarde.");
  }
});

// ============ BOTÓN AGREGAR PERFUME ============

document.getElementById("addPerfumeBtn").addEventListener("click", () => {
  cargarMarcasDisponibles(); // Aseguramos que las marcas estén cargadas
  document.getElementById("addModal").classList.add("show");
  document.body.style.overflow = "hidden"; // Deshabilitar scroll cuando el modal está abierto
});

// ============ CARGAR MARCAS DISPONIBLES ============

function cargarMarcasDisponibles() {
  const categoriaSelect = document.getElementById("addCategoria");
  const marcaSelect = document.getElementById("addMarcaSelect");

  // Listener para cuando cambia la categoría
  categoriaSelect.addEventListener("change", () => {
    const categoria = categoriaSelect.value;
    marcaSelect.innerHTML =
      '<option value="">Seleccionar marca existente</option><option value="__NUEVA__">➕ Agregar nueva marca</option>';

    if (!categoria) return;

    // Obtener marcas únicas de esa categoría
    const marcas = new Set();
    todosLosPerfumes
      .filter((p) => p.categoria === categoria)
      .forEach((p) => marcas.add(p.marca));

    // Agregar opciones al select
    Array.from(marcas)
      .sort()
      .forEach((marca) => {
        const option = document.createElement("option");
        option.value = marca;
        option.textContent = capitalizar(marca);
        marcaSelect.appendChild(option);
      });
  });

  // Listener para mostrar/ocultar campo de nueva marca
  marcaSelect.addEventListener("change", () => {
    const inputGroup = document.getElementById("addMarcaInputGroup");
    const input = document.getElementById("addMarcaInput");

    if (marcaSelect.value === "__NUEVA__") {
      inputGroup.style.display = "block";
      input.required = true;
    } else {
      inputGroup.style.display = "none";
      input.required = false;
      input.value = "";
    }
  });
}

// ============ ABRIR MODAL DE EDICIÓN ============

function abrirEditarModal(categoria, marca, index) {
  perfumeActual = todosLosPerfumes.find(
    (p) =>
      p.categoria === categoria && p.marca === marca && p.arrayIndex === index
  );

  if (!perfumeActual) {
    alert("Perfume no encontrado");
    return;
  }

  // Actualizamos los campos con los datos del perfume
  document.getElementById("editImage").src = perfumeActual.imagen;
  document.getElementById("editCategoriaTexto").textContent =
    capitalizar(categoria);
  document.getElementById("editIndex").textContent = index;
  document.getElementById("editNombre").value = perfumeActual.nombre;
  document.getElementById("editImagen").value = perfumeActual.imagen;
  document.getElementById("editPrecio").value = perfumeActual.precioFinal;
  document.getElementById("editGenero").value =
    perfumeActual.genero || "unisex";
  document.getElementById("editDescripcion").value =
    perfumeActual.descripcion || "";

  // Cargar categoría actual
  const editCategoriaSelect = document.getElementById("editCategoriaSelect");
  editCategoriaSelect.value = categoria;

  // Función para cargar marcas según la categoría seleccionada
  function cargarMarcasPorCategoria(cat) {
    const editMarcaSelect = document.getElementById("editMarcaSelect");
    editMarcaSelect.innerHTML =
      '<option value="">Seleccionar marca existente</option><option value="__NUEVA__">➕ Agregar nueva marca</option>';

    const marcas = new Set();
    todosLosPerfumes
      .filter((p) => p.categoria === cat)
      .forEach((p) => marcas.add(p.marca));

    Array.from(marcas)
      .sort()
      .forEach((m) => {
        const option = document.createElement("option");
        option.value = m;
        option.textContent = capitalizar(m);
        if (m === marca && cat === categoria) option.selected = true;
        editMarcaSelect.appendChild(option);
      });
  }

  // Cargar marcas iniciales
  cargarMarcasPorCategoria(categoria);

  // Agregar listener para cambio de categoría
  editCategoriaSelect.onchange = function () {
    cargarMarcasPorCategoria(this.value);
  };

  // Cargar tamaños disponibles y precios personalizados
  const tamanosDisponibles = perfumeActual.tamanosDisponibles || [100];
  const preciosPersonalizados = perfumeActual.preciosPersonalizados || {};

  const tamanos = [30, 50, 60, 75, 80, 90, 100, 120, 125, 200];
  tamanos.forEach((tamano) => {
    const checkbox = document.getElementById(`editTamano${tamano}`);
    const precioInput = document.getElementById(`editPrecio${tamano}`);

    if (checkbox) {
      checkbox.checked = tamanosDisponibles.includes(tamano);
    }
    if (precioInput) {
      precioInput.value = preciosPersonalizados[tamano] || "";
    }
  });

  if (perfumeActual.notas) {
    document.getElementById("editNotasSalida").value =
      perfumeActual.notas.salida || "";
    document.getElementById("editNotasCorazon").value =
      perfumeActual.notas.corazon || "";
    document.getElementById("editNotasFondo").value =
      perfumeActual.notas.fondo || "";
  }

  document.getElementById("editModal").classList.add("show");
  document.body.style.overflow = "hidden";
}

// ============ CERRAR MODAL ============

window.closeEditModal = function (forzar = false) {
  // Si no es forzado, preguntar confirmación
  if (!forzar) {
    const confirmar = confirm(
      "⚠️ ¿Estás seguro de cerrar? Si no guardaste los cambios, se perderán."
    );
    if (!confirmar) return;
  }

  document.getElementById("editModal").classList.remove("show");
  document.body.style.overflow = "";
  perfumeActual = null;
};

document
  .querySelector(".modal-overlay")
  .addEventListener("click", () => closeEditModal(false));

// ============ GUARDAR CAMBIOS ============

document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!perfumeActual) return;

  const precioFinalInput =
    parseInt(document.getElementById("editPrecio").value) || 0;
  let precioBase = precioFinalInput;

  switch (perfumeActual.categoria) {
    case "arabes":
      precioBase = precioFinalInput - 1800;
      break;
    case "disenador":
      precioBase = precioFinalInput - 2300;
      break;
    case "nicho":
      precioBase = precioFinalInput - 3000;
      break;
    case "sets":
      precioBase = precioFinalInput;
      break;
  }

  // Obtener tamaños disponibles y precios personalizados
  const tamanosDisponibles = [];
  const preciosPersonalizados = {};

  const tamanos = [30, 50, 60, 75, 80, 90, 100, 120, 125, 200];
  tamanos.forEach((tamano) => {
    const checkbox = document.getElementById(`editTamano${tamano}`);
    const precioInput = document.getElementById(`editPrecio${tamano}`);

    if (checkbox && checkbox.checked) {
      tamanosDisponibles.push(tamano);
      const precio = precioInput.value;
      if (precio) preciosPersonalizados[tamano] = parseInt(precio);
    }
  });

  // Obtener marca del selector o del input de nueva marca
  const marcaSelect = document.getElementById("editMarcaSelect").value;
  let nuevaMarca;
  if (marcaSelect === "__NUEVA__") {
    nuevaMarca = document
      .getElementById("editMarcaInput")
      .value.toLowerCase()
      .trim();
    if (!nuevaMarca) {
      alert("Por favor ingresa el nombre de la nueva marca");
      return;
    }
  } else {
    // La marca del selector ya viene en el formato correcto (lowercase desde Firebase)
    nuevaMarca = marcaSelect.trim();
  }

  const categoriaAnterior = perfumeActual.categoria;
  const marcaAnterior = perfumeActual.marca;
  const nuevaCategoria = document.getElementById("editCategoriaSelect").value;

  const cambioDeMarca = nuevaMarca !== marcaAnterior;
  const cambioDeCategoria = nuevaCategoria !== categoriaAnterior;
  const seMovio = cambioDeMarca || cambioDeCategoria;

  const updates = {
    nombre: document.getElementById("editNombre").value,
    imagen: document.getElementById("editImagen").value,
    precio: precioBase,
    genero: document.getElementById("editGenero").value,
    tamanosDisponibles: tamanosDisponibles,
    preciosPersonalizados:
      Object.keys(preciosPersonalizados).length > 0
        ? preciosPersonalizados
        : null,
    descripcion: document.getElementById("editDescripcion").value,
    notas: {
      salida: document.getElementById("editNotasSalida").value,
      corazon: document.getElementById("editNotasCorazon").value,
      fondo: document.getElementById("editNotasFondo").value,
    },
  };

  try {
    if (seMovio) {
      // Si cambió la marca o categoría, usar moverPerfume (1 operación optimizada)
      console.log(
        `🔄 Moviendo perfume de "${categoriaAnterior}/${marcaAnterior}" a "${nuevaCategoria}/${nuevaMarca}"`
      );

      // Mover en una sola operación (MUCHO MÁS RÁPIDO)
      await moverPerfume(
        categoriaAnterior,
        marcaAnterior,
        perfumeActual.arrayIndex,
        nuevaCategoria,
        nuevaMarca,
        updates
      );

      alert("✅ Perfume movido exitosamente");
    } else {
      // Actualización normal sin cambio de ubicación
      await actualizarPerfume(
        perfumeActual.categoria,
        perfumeActual.marca,
        perfumeActual.arrayIndex,
        updates
      );

      alert("✅ Perfume actualizado correctamente");
    }

    // Limpiar caché y recargar
    limpiarCache();
    closeEditModal(true); // Forzar cierre sin confirmación porque ya se guardó
    await cargarPerfumes();
  } catch (error) {
    console.error("❌ ERROR AL GUARDAR:", error);
    console.error("Detalles:", {
      categoria: perfumeActual.categoria,
      marca: perfumeActual.marca,
      index: perfumeActual.arrayIndex,
      nombre: updates.nombre,
    });
    alert(
      "❌ ERROR AL GUARDAR\n\n" +
        "⚠️ NO CIERRES ESTE MODAL NI REFRESQUES LA PÁGINA\n\n" +
        "Error: " +
        error.message +
        "\n\n" +
        "Intenta guardar de nuevo o copia los datos y contacta al desarrollador."
    );
    // NO cerrar el modal para que no se pierdan los datos
  }
});

// ============ ELIMINAR PERFUME (MODIFICADO – SIN RECARGA) ============
// Esta función wrapper:
// - Usa la implementación compartida de firebase-config.js para la operación en Firestore
// - Actualiza la caché local (todosLosPerfumes y perfumesFiltrados)
// - Recalcula arrayIndex para perfumes posteriores de la misma categoría/marca
// Esto evita duplicación de código y mantiene sincronizada la lógica de eliminación

async function eliminarPerfume(categoria, marca, index) {
  try {
    console.debug(`🗑️ [Admin] Iniciando eliminación: ${categoria}/${marca}[${index}]`);
    
    // Paso 1: Usar la implementación compartida para eliminar de Firestore
    // Esta función ya tiene toda la lógica robusta de validación y normalización
    await eliminarPerfumeFirestore(categoria, marca, index);

    console.debug(`💾 Firestore actualizado correctamente`);

    // Paso 2: Actualizar caché local - eliminar el perfume
    // Usar findIndex + splice para mejor rendimiento con datasets grandes
    const indexEnCache = todosLosPerfumes.findIndex(
      (p) => p.categoria === categoria && p.marca === marca && p.arrayIndex === index
    );
    
    if (indexEnCache !== -1) {
      todosLosPerfumes.splice(indexEnCache, 1);
      console.debug(`🗂️ Perfume eliminado de caché local en posición ${indexEnCache}`);
    } else {
      console.warn(`⚠️ Perfume no encontrado en caché local (esto es normal si se acabó de agregar)`);
    }

    // Paso 3: CRÍTICO - Recalcular arrayIndex para perfumes posteriores de la misma categoría/marca
    // Esto evita que los índices queden obsoletos y causa "Perfumes no encontrados"
    todosLosPerfumes = todosLosPerfumes.map((p) => {
      // Solo ajustar perfumes de la misma categoría/marca con índice mayor al eliminado
      if (p.categoria === categoria && p.marca === marca && p.arrayIndex > index) {
        console.debug(`📉 Recalculando índice: ${p.arrayIndex} → ${p.arrayIndex - 1} para "${p.nombre}"`);
        return {
          ...p,
          arrayIndex: p.arrayIndex - 1, // Reducir índice en 1
        };
      }
      return p; // Mantener otros perfumes sin cambios
    });

    console.debug(`🔢 Índices recalculados para perfumes posteriores`);

    // Paso 4: Actualizar perfumesFiltrados con los cambios
    perfumesFiltrados = [...todosLosPerfumes];

    // Paso 5: Actualizar estadísticas
    actualizarEstadisticas();

    // Paso 6: Actualizar la UI sin recargar
    mostrarPerfumes();

    console.log(`✅ Perfume eliminado exitosamente: ${categoria}/${marca}[${index}]`);
    alert("✅ Perfume eliminado exitosamente");
  } catch (error) {
    console.error("❌ Error al eliminar el perfume:", error);
    alert("❌ Error al eliminar: " + error.message);
  }
}

// ============ ACTUALIZAR ESTADÍSTICAS ============

function actualizarEstadisticas() {
  try {
    // Calcular totales a partir de todosLosPerfumes
    const total = todosLosPerfumes.length;
    const totalArabes = todosLosPerfumes.filter(p => p.categoria === 'arabes').length;
    const totalDisenador = todosLosPerfumes.filter(p => p.categoria === 'disenador').length;
    const totalNicho = todosLosPerfumes.filter(p => p.categoria === 'nicho').length;
    const totalSets = todosLosPerfumes.filter(p => p.categoria === 'sets').length;

    // Log de debug con los totales
    console.log('📊 Estadísticas actualizadas:', {
      total,
      arabes: totalArabes,
      disenador: totalDisenador,
      nicho: totalNicho,
      sets: totalSets
    });

    // Actualizar elementos del DOM de forma segura (verificar que existan)
    const elementoTotalPerfumes = document.getElementById('totalPerfumes');
    if (elementoTotalPerfumes) elementoTotalPerfumes.textContent = total;

    const elementoTotalArabes = document.getElementById('totalArabes');
    if (elementoTotalArabes) elementoTotalArabes.textContent = totalArabes;

    const elementoTotalDisenador = document.getElementById('totalDisenador');
    if (elementoTotalDisenador) elementoTotalDisenador.textContent = totalDisenador;

    const elementoTotalNicho = document.getElementById('totalNicho');
    if (elementoTotalNicho) elementoTotalNicho.textContent = totalNicho;

    const elementoTotalSets = document.getElementById('totalSets');
    if (elementoTotalSets) elementoTotalSets.textContent = totalSets;

  } catch (error) {
    console.error('⚠️ Error al actualizar estadísticas:', error);
    // No lanzar la excepción para evitar romper la carga de perfumes
  }
}

// ============ MOSTRAR PERFUMES EN LA TABLA ============

function mostrarPerfumes() {
  try {
    const tbody = document.getElementById('perfumesTableBody');
    if (!tbody) {
      console.error('❌ No se encontró el elemento perfumesTableBody');
      return;
    }

    // Si no hay perfumes para mostrar
    if (perfumesFiltrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
            <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
            <h3 style="margin: 0;">No se encontraron perfumes</h3>
            <p style="margin: 10px 0;">Intenta ajustar los filtros de búsqueda</p>
          </td>
        </tr>
      `;
      return;
    }

    // Generar las filas de la tabla
    tbody.innerHTML = perfumesFiltrados.map(perfume => {
      const nombreEscapado = escaparHTML(perfume.nombre);
      const marcaEscapada = escaparHTML(perfume.marca);
      const imagenValidada = validarURL(perfume.imagen);
      const nombreParaConfirm = escaparAtributo(perfume.nombre);
      const categoriaParaOnclick = escaparAtributo(perfume.categoria);
      const marcaParaOnclick = escaparAtributo(perfume.marca);
      // arrayIndex es un número, pero lo validamos por seguridad
      const arrayIndexSeguro = parseInt(perfume.arrayIndex, 10);
      if (isNaN(arrayIndexSeguro)) {
        console.error('arrayIndex inválido para perfume:', perfume.nombre);
        return ''; // Saltar este perfume si el índice es inválido
      }
      
      return `
        <tr>
          <td>
            <img src="${escaparHTML(imagenValidada)}" alt="${nombreEscapado}" 
                 style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;" 
                 onerror="this.src='logo2.jpeg'">
          </td>
          <td>${nombreEscapado}</td>
          <td>${capitalizar(marcaEscapada)}</td>
          <td>
            <span class="category-badge category-${perfume.categoria}">
              ${capitalizar(perfume.categoria)}
            </span>
          </td>
          <td>$${perfume.precioFinal.toLocaleString()}</td>
          <td>
            <button class="btn-edit" onclick="abrirEditarModal('${categoriaParaOnclick}', '${marcaParaOnclick}', ${arrayIndexSeguro})" title="Editar">
              ✏️
            </button>
            <button class="btn-delete" onclick="if(confirm('¿Eliminar ${nombreParaConfirm}?')) eliminarPerfume('${categoriaParaOnclick}', '${marcaParaOnclick}', ${arrayIndexSeguro})" title="Eliminar">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');

    console.log(`✅ Mostrando ${perfumesFiltrados.length} perfumes en la tabla`);

  } catch (error) {
    console.error('❌ Error al mostrar perfumes:', error);
    const tbody = document.getElementById('perfumesTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #e74c3c;">
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <h3>Error al mostrar perfumes</h3>
            <p>${error.message}</p>
          </td>
        </tr>
      `;
    }
  }
}

// ============ FILTROS Y BÚSQUEDA ============

function aplicarFiltros() {
  try {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const categoryFilter = document.getElementById('categoryFilter').value;

    perfumesFiltrados = todosLosPerfumes.filter(perfume => {
      // Filtro de búsqueda (nombre o marca)
      const matchesSearch = !searchTerm || 
        perfume.nombre.toLowerCase().includes(searchTerm) ||
        perfume.marca.toLowerCase().includes(searchTerm);

      // Filtro de categoría
      const matchesCategory = !categoryFilter || perfume.categoria === categoryFilter;

      return matchesSearch && matchesCategory;
    });

    mostrarPerfumes();
    console.log(`🔍 Filtros aplicados: ${perfumesFiltrados.length} de ${todosLosPerfumes.length} perfumes`);

  } catch (error) {
    console.error('❌ Error al aplicar filtros:', error);
  }
}

// Agregar event listeners para los filtros cuando el DOM esté listo
// Se ejecutan después de que el usuario haya iniciado sesión y se haya cargado el panel
function inicializarEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  
  if (searchInput) {
    searchInput.addEventListener('input', aplicarFiltros);
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', aplicarFiltros);
  }
}

// Llamar a la inicialización cuando sea necesario (después del login)
// Los event listeners se configurarán en onAuthChange cuando el usuario inicie sesión

// ============ UTILIDADES ============

function capitalizar(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escaparHTML(str) {
  if (!str) return "";
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escaparAtributo(str) {
  if (!str) return "";
  // Escapar caracteres peligrosos para atributos HTML
  return str
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#96;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;');
}

function validarURL(url) {
  if (!url) return 'logo2.jpeg';
  try {
    // Permitir URLs relativas y URLs HTTP/HTTPS
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return url;
    }
    const urlObj = new URL(url);
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return url;
    }
  } catch (e) {
    // Si no es una URL válida, usar imagen por defecto
    return 'logo2.jpeg';
  }
  return 'logo2.jpeg';
}

// ============ CERRAR MODAL DE AGREGAR ============

window.closeAddModal = function () {
  const modal = document.getElementById("addModal");
  if (modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "";
    // Resetear el formulario
    document.getElementById("addForm").reset();
    // Resetear estado de marca nueva
    const marcaInputGroup = document.getElementById("addMarcaInputGroup");
    if (marcaInputGroup) {
      marcaInputGroup.style.display = "none";
    }
  }
};

// ============ AGREGAR PERFUME ============

const addForm = document.getElementById("addForm");
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const categoria = document.getElementById("addCategoria").value;
    const marcaSelect = document.getElementById("addMarcaSelect").value;
    const nombre = document.getElementById("addNombre").value;
    const imagen = document.getElementById("addImagen").value;
    const precioFinalInput = parseInt(document.getElementById("addPrecio").value, 10) || 0;
    const genero = document.getElementById("addGenero").value;
    const descripcion = document.getElementById("addDescripcion").value;

    // Validar campos obligatorios
    if (!categoria) {
      alert("Por favor selecciona una categoría");
      return;
    }

    if (!nombre || !nombre.trim()) {
      alert("Por favor ingresa el nombre del perfume");
      return;
    }

    if (!imagen || !imagen.trim()) {
      alert("Por favor ingresa la URL de la imagen");
      return;
    }

    if (!precioFinalInput || precioFinalInput <= 0) {
      alert("Por favor ingresa un precio válido");
      return;
    }

    // Obtener marca (existente o nueva)
    let marca;
    if (marcaSelect === "__NUEVA__") {
      marca = document.getElementById("addMarcaInput").value.toLowerCase().trim();
      if (!marca) {
        alert("Por favor ingresa el nombre de la nueva marca");
        return;
      }
    } else if (!marcaSelect) {
      alert("Por favor selecciona una marca");
      return;
    } else {
      marca = marcaSelect.trim();
    }

    // Calcular precio base (restar incremento según categoría)
    let precioBase = precioFinalInput;
    switch (categoria) {
      case "arabes":
        precioBase = precioFinalInput - 1800;
        break;
      case "disenador":
        precioBase = precioFinalInput - 2300;
        break;
      case "nicho":
        precioBase = precioFinalInput - 3000;
        break;
      case "sets":
        precioBase = precioFinalInput;
        break;
    }

    // Obtener tamaños disponibles y precios personalizados
    const tamanosDisponibles = [];
    const preciosPersonalizados = {};

    const tamanos = [30, 50, 60, 75, 80, 90, 100, 120, 125, 200];
    tamanos.forEach((tamano) => {
      const checkbox = document.getElementById(`addTamano${tamano}`);
      const precioInput = document.getElementById(`addPrecio${tamano}`);

      if (checkbox && checkbox.checked) {
        tamanosDisponibles.push(tamano);
        const precio = precioInput.value;
        if (precio) preciosPersonalizados[tamano] = parseInt(precio, 10);
      }
    });

    // Si no hay tamaños seleccionados, usar 100ml por defecto
    if (tamanosDisponibles.length === 0) {
      tamanosDisponibles.push(100);
    }

    // Construir objeto de perfume
    const nuevoPerfume = {
      nombre,
      imagen,
      precio: precioBase,
      genero,
      descripcion,
      tamanosDisponibles,
      preciosPersonalizados: Object.keys(preciosPersonalizados).length > 0 ? preciosPersonalizados : null,
      notas: {
        salida: document.getElementById("addNotasSalida").value || "",
        corazon: document.getElementById("addNotasCorazon").value || "",
        fondo: document.getElementById("addNotasFondo").value || "",
      },
    };

    try {
      console.log("➕ Agregando nuevo perfume:", { categoria, marca, nuevoPerfume });
      
      await agregarPerfume(categoria, marca, nuevoPerfume);
      
      alert("✅ Perfume agregado exitosamente");
      
      // Limpiar caché y recargar
      limpiarCache();
      closeAddModal();
      await cargarPerfumes();
    } catch (error) {
      console.error("❌ Error al agregar perfume:", error);
      alert("❌ Error al agregar perfume: " + error.message);
    }
  });
}

// ============ EXPONER FUNCIONES AL ÁMBITO GLOBAL ============

// Exponer funciones que son llamadas desde el HTML con onclick
window.abrirEditarModal = abrirEditarModal;
window.eliminarPerfume = eliminarPerfume;
