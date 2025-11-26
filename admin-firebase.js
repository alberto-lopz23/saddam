import {
  obtenerPerfumes,
  actualizarPerfume,
  agregarPerfume,
  moverPerfume,
  limpiarCache,
  loginAdmin,
  logoutAdmin,
  onAuthChange,
  db,
} from "./firebase-config.js";

// Importar funciones de Firestore necesarias para eliminarPerfume local
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
// Versión robusta con:
// - Comprobación segura de existencia usando 'in' operator y Array.isArray
// - Normalización de estructura (objeto → array) si es necesario
// - Actualización de caché local (todosLosPerfumes y perfumesFiltrados)
// - Recálculo de arrayIndex para perfumes posteriores de la misma categoría/marca
// - Logs de depuración y manejo de errores claro

async function eliminarPerfume(categoria, marca, index) {
  try {
    console.debug(`🗑️ Eliminando perfume: ${categoria}/${marca}[${index}]`);
    
    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error("❌ Documento de catálogo no encontrado en Firestore");
      throw new Error("Documento de catálogo no encontrado");
    }

    const data = docSnap.data();

    // Paso 1: Verificar que la categoría existe
    if (!data.perfumes || !data.perfumes[categoria]) {
      console.error(`❌ Categoría "${categoria}" no encontrada`);
      throw new Error("Perfume no encontrado");
    }

    // Paso 2: Verificar que la marca existe
    if (!data.perfumes[categoria][marca]) {
      console.error(`❌ Marca "${marca}" no encontrada en categoría "${categoria}"`);
      throw new Error("Perfume no encontrado");
    }

    // Paso 3: Obtener la estructura de perfumes de la marca (puede ser objeto o array)
    const marcaPerfumesRaw = data.perfumes[categoria][marca];
    
    // Paso 4: Normalizar a array si es objeto (para orden estable)
    let marcaPerfumes;
    if (Array.isArray(marcaPerfumesRaw)) {
      marcaPerfumes = [...marcaPerfumesRaw]; // Copiar array
      console.debug(`📋 Estructura es array con ${marcaPerfumes.length} elementos`);
    } else if (typeof marcaPerfumesRaw === "object" && marcaPerfumesRaw !== null) {
      marcaPerfumes = Object.values(marcaPerfumesRaw); // Convertir objeto a array
      console.debug(`📋 Estructura normalizada de objeto a array con ${marcaPerfumes.length} elementos`);
    } else {
      console.error(`❌ Estructura de marca inválida: ${typeof marcaPerfumesRaw}`);
      throw new Error("Perfume no encontrado");
    }

    // Paso 5: Verificar que el índice existe de forma segura usando 'in' operator
    if (!(index in marcaPerfumes)) {
      console.error(`❌ Índice ${index} no existe en marca "${marca}" (total: ${marcaPerfumes.length})`);
      throw new Error("Perfume no encontrado");
    }

    // Paso 6: Eliminar el perfume del array usando splice
    const perfumeEliminado = marcaPerfumes[index];
    marcaPerfumes.splice(index, 1);
    console.debug(`✂️ Perfume eliminado: "${perfumeEliminado?.nombre || 'sin nombre'}"`);
    console.debug(`📊 Nuevo total de perfumes en marca: ${marcaPerfumes.length}`);

    // Paso 7: Actualizar Firestore con la nueva lista
    const marcaPath = `perfumes.${categoria}.${marca}`;
    await updateDoc(docRef, {
      [marcaPath]: marcaPerfumes,
    });

    console.debug(`💾 Firestore actualizado: ${categoria}/${marca}`);

    // Paso 8: Actualizar caché local - eliminar el perfume
    // Eliminar el perfume con el índice especificado
    todosLosPerfumes = todosLosPerfumes.filter(
      (p) =>
        !(p.categoria === categoria && p.marca === marca && p.arrayIndex === index)
    );

    console.debug(`🗂️ Perfume eliminado de caché local`);

    // Paso 9: CRÍTICO - Recalcular arrayIndex para perfumes posteriores de la misma categoría/marca
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

    // Paso 10: Actualizar perfumesFiltrados con los cambios
    perfumesFiltrados = [...todosLosPerfumes];

    // Paso 11: Actualizar la UI sin recargar
    mostrarPerfumes();

    console.log(`✅ Perfume eliminado exitosamente: ${categoria}/${marca}[${index}]`);
    alert("✅ Perfume eliminado exitosamente");
  } catch (error) {
    console.error("❌ Error al eliminar el perfume:", error);
    alert("❌ Error al eliminar: " + error.message);
  }
}

// ============ UTILIDADES ============

function capitalizar(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
