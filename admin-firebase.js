import {
  obtenerPerfumes,
  actualizarPerfume,
  agregarPerfume,
  eliminarPerfume,
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
    cargarPerfumes();
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

  errorEl.style.display = "none";

  try {
    await loginAdmin(email, password);
  } catch (error) {
    let mensaje = "Error al iniciar sesión";

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
    if (perfumesObj && typeof perfumesObj === "object") {
      Object.keys(perfumesObj).forEach((key) => {
        const perfume = perfumesObj[key];

        const precioBase = parseInt(perfume.precio) || 0;
        let precioFinal = precioBase;

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


    perfumesFiltrados = [...todosLosPerfumes];
    actualizarEstadisticas();
    mostrarPerfumes();
    console.log("✅ Perfumes cargados:", todosLosPerfumes.length);
  } catch (error) {
    console.error("Error al cargar perfumes:", error);
    const tbody = document.getElementById("perfumesTableBody");

    let mensajeError = error.message;
    let sugerencia = "";

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


// ============ ESTADÍSTICAS ============
function actualizarEstadisticas() {
  document.getElementById("totalPerfumes").textContent =
    todosLosPerfumes.length;
  document.getElementById("totalArabes").textContent = todosLosPerfumes.filter(
    (p) => p.categoria === "arabes"
  ).length;
  document.getElementById("totalDisenador").textContent =
    todosLosPerfumes.filter((p) => p.categoria === "disenador").length;
  document.getElementById("totalNicho").textContent = todosLosPerfumes.filter(
    (p) => p.categoria === "nicho"
  ).length;
  document.getElementById("totalSets").textContent = todosLosPerfumes.filter(
    (p) => p.categoria === "sets"
  ).length;
}

// ============ MOSTRAR PERFUMES ============
function mostrarPerfumes() {
  const tbody = document.getElementById("perfumesTableBody");
  tbody.innerHTML = "";

  if (perfumesFiltrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
          No se encontraron perfumes
        </td>
      </tr>
    `;
    return;
  }

  perfumesFiltrados.forEach((perfume) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${perfume.imagen}" alt="${
      perfume.nombre
    }" class="perfume-img"></td>
      <td><strong>${perfume.nombre}</strong></td>
      <td>${capitalizar(perfume.marca)}</td>
      <td><span class="category-badge category-${perfume.categoria}">
        ${capitalizar(perfume.categoria)}
      </span></td>
      <td><strong>$${perfume.precioFinal.toLocaleString()}</strong></td>
      <td>
        <button class="btn-edit" data-categoria="${
          perfume.categoria
        }" data-marca="${perfume.marca}" data-index="${perfume.arrayIndex}">
          ✏️ Editar
        </button>
        <button class="btn-delete" data-categoria="${
          perfume.categoria
        }" data-marca="${perfume.marca}" data-index="${perfume.arrayIndex}">
          🗑️ Eliminar
        </button>
      </td>
    `;

    tr.querySelector(".btn-edit").addEventListener("click", function () {
      abrirEditarModal(
        this.dataset.categoria,
        this.dataset.marca,
        parseInt(this.dataset.index)
      );
    });

    tr.querySelector(".btn-delete").addEventListener("click", function () {
      eliminarPerfumeConfirm(
        this.dataset.categoria,
        this.dataset.marca,
        parseInt(this.dataset.index),
        perfume.nombre
      );
    });

    tbody.appendChild(tr);
  });
}

// ============ BÚSQUEDA ============
document.getElementById("searchInput").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();

  perfumesFiltrados = todosLosPerfumes.filter((perfume) => {
    return (
      perfume.nombre.toLowerCase().includes(query) ||
      perfume.marca.toLowerCase().includes(query)
    );
  });

  const categoriaSeleccionada = document.getElementById("categoryFilter").value;
  if (categoriaSeleccionada) {
    perfumesFiltrados = perfumesFiltrados.filter(
      (p) => p.categoria === categoriaSeleccionada
    );
  }

  mostrarPerfumes();
});

// ============ FILTRO POR CATEGORÍA ============
document.getElementById("categoryFilter").addEventListener("change", (e) => {
  const categoria = e.target.value;

  if (categoria) {
    perfumesFiltrados = todosLosPerfumes.filter(
      (p) => p.categoria === categoria
    );
  } else {
    perfumesFiltrados = [...todosLosPerfumes];
  }

  const query = document.getElementById("searchInput").value.toLowerCase();
  if (query) {
    perfumesFiltrados = perfumesFiltrados.filter((perfume) => {
      return (
        perfume.nombre.toLowerCase().includes(query) ||
        perfume.marca.toLowerCase().includes(query)
      );
    });
  }

  mostrarPerfumes();
});

// ============ BOTÓN REFRESCAR ============
document.getElementById("refreshBtn").addEventListener("click", () => {
  limpiarCache();
  cargarPerfumes();
  document.getElementById("searchInput").value = "";
  document.getElementById("categoryFilter").value = "";
});

// ============ BOTÓN AGREGAR PERFUME ============
document.getElementById("addPerfumeBtn").addEventListener("click", () => {
  cargarMarcasDisponibles();
  document.getElementById("addModal").classList.add("show");
  document.body.style.overflow = "hidden";
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

// ============ CERRAR MODAL DE AGREGAR ============
window.closeAddModal = function () {
  // Confirmar si hay datos ingresados
  const nombre = document.getElementById("addNombre").value;
  if (nombre && nombre.trim() !== "") {
    const confirmar = confirm(
      "⚠️ ¿Estás seguro de cerrar? Se perderán los datos ingresados."
    );
    if (!confirmar) return;
  }

  document.getElementById("addModal").classList.remove("show");
  document.body.style.overflow = "";
  document.getElementById("addForm").reset();
};

document
  .querySelector("#addModal .modal-overlay")
  .addEventListener("click", closeAddModal);

// ============ GUARDAR NUEVO PERFUME (MODIFICADO – SIN RECARGA) ============
document.getElementById("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const categoria = document.getElementById("addCategoria").value;
  const marcaSelect = document.getElementById("addMarcaSelect").value;

  // Determinar la marca: existente o nueva
  let marca;
  if (marcaSelect === "__NUEVA__") {
    marca = document.getElementById("addMarcaInput").value.toLowerCase().trim();
    if (!marca) {
      alert("Por favor ingresa el nombre de la nueva marca");
      return;
    }
  } else {
    // La marca seleccionada ya viene en lowercase de Firebase
    marca = marcaSelect.trim();
  }

  const precioFinalInput =
    parseInt(document.getElementById("addPrecio").value) || 0;

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
      if (precio) preciosPersonalizados[tamano] = parseInt(precio);
    }
  });

  const nuevoPerfume = {
    nombre: document.getElementById("addNombre").value,
    imagen: document.getElementById("addImagen").value,
    precio: precioBase,
    genero: document.getElementById("addGenero").value,
    tamanosDisponibles: tamanosDisponibles,
    preciosPersonalizados:
      Object.keys(preciosPersonalizados).length > 0
        ? preciosPersonalizados
        : null,
    descripcion: document.getElementById("addDescripcion").value || "",
    notas: {
      salida: document.getElementById("addNotasSalida").value || "",
      corazon: document.getElementById("addNotasCorazon").value || "",
      fondo: document.getElementById("addNotasFondo").value || "",
    },
  };

  try {
    const indexNuevo = await agregarPerfume(categoria, marca, nuevoPerfume);

    // --- AÑADIR LOCAL SIN RECARGAR ---
    todosLosPerfumes.push({
      ...nuevoPerfume,
      categoria,
      marca,
      arrayIndex: indexNuevo,
      precioBase,
      precioFinal: precioFinalInput,
    });

    perfumesFiltrados = [...todosLosPerfumes];

    mostrarPerfumes();
    closeAddModal();

    alert("✅ Perfume agregado exitosamente");
  } catch (error) {
    console.error("Error al agregar:", error);
    alert("❌ Error al agregar: " + error.message);
  }
});

// ============ ELIMINAR PERFUME (MODIFICADO – SIN RECARGA) ============
async function eliminarPerfume(categoria, marca, index) {
  try {
    const perfumesObj = data.perfumes[categoria][marca];

    if (perfumesObj && typeof perfumesObj === "object") {
      // Convertir objeto a array si es necesario
      const keys = Object.keys(perfumesObj);

      // Si no es un array, convertirlo a uno
      const perfumesArray = keys.map((key) => perfumesObj[key]);

      // Eliminar el perfume basado en el índice
      perfumesArray.splice(index, 1); // elimina el perfume

      // Ahora actualizamos la base de datos de Firebase
      // Usar el índice para actualizar correctamente el objeto
      data.perfumes[categoria][marca] = perfumesArray.reduce((acc, perfume, idx) => {
        acc[idx] = perfume; // reconstruir el objeto
        return acc;
      }, {});

      console.log("Perfume eliminado con éxito");
    }
  } catch (error) {
    console.error("Error al eliminar el perfume:", error);
    throw new Error("Error al eliminar el perfume");
  }
}


// ============ UTILIDADES ============
function capitalizar(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
