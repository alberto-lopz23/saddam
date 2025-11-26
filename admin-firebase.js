import {
  obtenerPerfumes,
  actualizarPerfume,
  agregarPerfume,
  eliminarPerfume,
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
    // onAuthChange se encargará de mostrar el panel
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

    // Convertir a array con precios finales
    Object.keys(data.perfumes).forEach((categoria) => {
      Object.keys(data.perfumes[categoria]).forEach((marca) => {
        data.perfumes[categoria][marca].forEach((perfume, index) => {
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
            categoria: categoria,
            marca: marca,
            arrayIndex: index,
            precioBase: precioBase,
            precioFinal: precioFinal,
          });
        });
      });
    });

    perfumesFiltrados = [...todosLosPerfumes];
    actualizarEstadisticas();
    mostrarPerfumes();
    console.log("✅ Perfumes cargados:", todosLosPerfumes.length);
  } catch (error) {
    console.error("Error al cargar perfumes:", error);
    const tbody = document.getElementById("perfumesTableBody");
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #e74c3c;">
          ❌ Error al cargar perfumes: ${error.message}
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
      <td><span class="category-badge category-${
        perfume.categoria
      }">${capitalizar(perfume.categoria)}</span></td>
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

    // Event listeners para los botones
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
  limpiarCache(); // Forzar recarga desde Firebase
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
  console.log("Abriendo modal:", { categoria, marca, index });

  perfumeActual = todosLosPerfumes.find(
    (p) =>
      p.categoria === categoria && p.marca === marca && p.arrayIndex === index
  );

  if (!perfumeActual) {
    alert("Perfume no encontrado");
    return;
  }

  document.getElementById("editImage").src = perfumeActual.imagen;
  document.getElementById("editCategoria").textContent = capitalizar(categoria);
  document.getElementById("editIndex").textContent = index;
  document.getElementById("editNombre").value = perfumeActual.nombre;
  document.getElementById("editImagen").value = perfumeActual.imagen;
  document.getElementById("editPrecio").value = perfumeActual.precioFinal;
  document.getElementById("editGenero").value =
    perfumeActual.genero || "unisex";
  document.getElementById("editDescripcion").value =
    perfumeActual.descripcion || "";

  // Cargar marcas disponibles en el selector
  const editMarcaSelect = document.getElementById("editMarcaSelect");
  editMarcaSelect.innerHTML =
    '<option value="">Seleccionar marca existente</option><option value="__NUEVA__">➕ Agregar nueva marca</option>';

  const marcas = new Set();
  todosLosPerfumes
    .filter((p) => p.categoria === categoria)
    .forEach((p) => marcas.add(p.marca));

  Array.from(marcas)
    .sort()
    .forEach((m) => {
      const option = document.createElement("option");
      option.value = m;
      option.textContent = capitalizar(m);
      if (m === marca) option.selected = true;
      editMarcaSelect.appendChild(option);
    });

  // Cargar tamaños disponibles y precios personalizados
  const tamanosDisponibles = perfumeActual.tamanosDisponibles || [100];
  const preciosPersonalizados = perfumeActual.preciosPersonalizados || {};

  document.getElementById("editTamano60").checked =
    tamanosDisponibles.includes(60);
  document.getElementById("editTamano100").checked =
    tamanosDisponibles.includes(100);
  document.getElementById("editTamano120").checked =
    tamanosDisponibles.includes(120);

  document.getElementById("editPrecio60").value =
    preciosPersonalizados[60] || "";
  document.getElementById("editPrecio100").value =
    preciosPersonalizados[100] || "";
  document.getElementById("editPrecio120").value =
    preciosPersonalizados[120] || "";

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
window.closeEditModal = function () {
  document.getElementById("editModal").classList.remove("show");
  document.body.style.overflow = "";
  perfumeActual = null;
};

document
  .querySelector(".modal-overlay")
  .addEventListener("click", closeEditModal);

// Evento para mostrar/ocultar campo de nueva marca en modal de edición
document
  .getElementById("editMarcaSelect")
  .addEventListener("change", function () {
    const inputGroup = document.getElementById("editMarcaInputGroup");
    const input = document.getElementById("editMarcaInput");

    if (this.value === "__NUEVA__") {
      inputGroup.style.display = "block";
      input.required = true;
    } else {
      inputGroup.style.display = "none";
      input.required = false;
      input.value = "";
    }
  });

// ============ GUARDAR CAMBIOS ============
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!perfumeActual) return;

  const precioFinalInput =
    parseInt(document.getElementById("editPrecio").value) || 0;
  let precioBase = precioFinalInput;

  // Calcular precio base restando incremento
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

  // Obtener tamaños disponibles
  // Obtener tamaños disponibles y precios personalizados
  const tamanosDisponibles = [];
  const preciosPersonalizados = {};

  if (document.getElementById("editTamano60").checked) {
    tamanosDisponibles.push(60);
    const precio60 = document.getElementById("editPrecio60").value;
    if (precio60) preciosPersonalizados[60] = parseInt(precio60);
  }
  if (document.getElementById("editTamano100").checked) {
    tamanosDisponibles.push(100);
    const precio100 = document.getElementById("editPrecio100").value;
    if (precio100) preciosPersonalizados[100] = parseInt(precio100);
  }
  if (document.getElementById("editTamano120").checked) {
    tamanosDisponibles.push(120);
    const precio120 = document.getElementById("editPrecio120").value;
    if (precio120) preciosPersonalizados[120] = parseInt(precio120);
  }

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

  const marcaAnterior = perfumeActual.marca;
  const cambioDeMarca = nuevaMarca !== marcaAnterior;

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
    if (cambioDeMarca) {
      // Si cambió la marca, eliminar de la marca anterior y agregar a la nueva
      console.log(
        `🔄 Moviendo perfume de "${marcaAnterior}" a "${nuevaMarca}"`
      );

      await eliminarPerfume(
        perfumeActual.categoria,
        marcaAnterior,
        perfumeActual.arrayIndex
      );

      await agregarPerfume(perfumeActual.categoria, nuevaMarca, updates);

      alert("✅ Perfume movido exitosamente a la nueva marca");
    } else {
      // Actualización normal sin cambio de marca
      await actualizarPerfume(
        perfumeActual.categoria,
        perfumeActual.marca,
        perfumeActual.arrayIndex,
        updates
      );

      alert("✅ Perfume actualizado correctamente");
    }

    // --- ACTUALIZAR LOCAL SIN RECARGAR ---
    Object.assign(perfumeActual, updates);
    perfumeActual.precioBase = precioBase;
    perfumeActual.precioFinal = precioFinalInput;
    if (cambioDeMarca) {
      perfumeActual.marca = nuevaMarca;
    }

    mostrarPerfumes();
    closeEditModal();
  } catch (error) {
    console.error("Error al guardar:", error);
    alert("❌ Error al guardar: " + error.message);
  }
});

// ============ CERRAR MODAL DE AGREGAR ============
window.closeAddModal = function () {
  document.getElementById("addModal").classList.remove("show");
  document.body.style.overflow = "";
  document.getElementById("addForm").reset();
};

document
  .querySelector("#addModal .modal-overlay")
  .addEventListener("click", closeAddModal);

// ============ GUARDAR NUEVO PERFUME ============
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
    marca = marcaSelect.toLowerCase().trim();
  }

  const precioFinalInput =
    parseInt(document.getElementById("addPrecio").value) || 0;

  // Calcular precio base restando incremento
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

  if (document.getElementById("addTamano60").checked) {
    tamanosDisponibles.push(60);
    const precio60 = document.getElementById("addPrecio60").value;
    if (precio60) preciosPersonalizados[60] = parseInt(precio60);
  }
  if (document.getElementById("addTamano100").checked) {
    tamanosDisponibles.push(100);
    const precio100 = document.getElementById("addPrecio100").value;
    if (precio100) preciosPersonalizados[100] = parseInt(precio100);
  }
  if (document.getElementById("addTamano120").checked) {
    tamanosDisponibles.push(120);
    const precio120 = document.getElementById("addPrecio120").value;
    if (precio120) preciosPersonalizados[120] = parseInt(precio120);
  }

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
    console.log("➕ Agregando nuevo perfume...", nuevoPerfume);

    await agregarPerfume(categoria, marca, nuevoPerfume);

    alert("✅ Perfume agregado exitosamente");
    closeAddModal();

    // Recargar perfumes
    await cargarPerfumes();
  } catch (error) {
    console.error("Error al agregar:", error);
    alert("❌ Error al agregar: " + error.message);
  }
});

// ============ ELIMINAR PERFUME ============
async function eliminarPerfumeConfirm(categoria, marca, index, nombre) {
  const confirmacion = confirm(
    `¿Estás seguro de eliminar este perfume?\n\n` +
      `Nombre: ${nombre}\n` +
      `Marca: ${marca}\n` +
      `Categoría: ${categoria}\n\n` +
      `Esta acción no se puede deshacer.`
  );

  if (!confirmacion) return;

  try {
    console.log("🗑️ Eliminando perfume...");

    await eliminarPerfume(categoria, marca, index);

    alert("✅ Perfume eliminado exitosamente");

    // Recargar perfumes
    await cargarPerfumes();
  } catch (error) {
    console.error("Error al eliminar:", error);
    alert("❌ Error al eliminar: " + error.message);
  }
}

// ============ UTILIDADES ============
function capitalizar(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
