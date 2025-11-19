const NUMERO_WHATSAPP = "+18298914134";

// Variables globales
let todosLosPerfumes = [];
let perfumesFiltrados = [];
let catalogoData = null;

// Elementos del DOM
const galeria = document.getElementById("galeria");
const subfiltersDiv = document.getElementById("subfilters");
const searchInput = document.getElementById("searchInput");

// Cargar datos del JSON
async function cargarCatalogo() {
  try {
    const response = await fetch("perfumes.json");
    catalogoData = await response.json();
    procesarDatos();
    mostrarPerfumes(todosLosPerfumes);
  } catch (error) {
    console.error("Error cargando catálogo:", error);
    // Fallback a datos básicos si falla la carga
    todosLosPerfumes = [];
    mostrarPerfumes([]);
  }
}

// Procesar y normalizar datos del JSON
function procesarDatos() {
  todosLosPerfumes = [];

  // Procesar perfumes árabes
  if (catalogoData.perfumes?.arabes) {
    Object.entries(catalogoData.perfumes.arabes).forEach(
      ([marca, perfumes]) => {
        perfumes.forEach((perfume) => {
          todosLosPerfumes.push({
            ...perfume,
            categoria: "arabes",
            marca: marca,
            tipo: "unisex",
          });
        });
      }
    );
  }

  // Procesar perfumes de diseñador
  if (catalogoData.perfumes?.disenador) {
    Object.entries(catalogoData.perfumes.disenador).forEach(
      ([marca, perfumes]) => {
        perfumes.forEach((perfume) => {
          todosLosPerfumes.push({
            ...perfume,
            categoria: "disenador",
            marca: marca,
            tipo: "unisex",
          });
        });
      }
    );
  }

  // Procesar sets
  if (catalogoData.perfumes?.sets) {
    Object.entries(catalogoData.perfumes.sets).forEach(([tipoSet, sets]) => {
      sets.forEach((set) => {
        todosLosPerfumes.push({
          ...set,
          categoria: "sets",
          marca: `Set ${tipoSet}`,
          tipo: "set",
        });
      });
    });
  }

  // Procesar nichos
  if (catalogoData.nichos) {
    Object.entries(catalogoData.nichos).forEach(([marca, perfumes]) => {
      perfumes.forEach((perfume) => {
        todosLosPerfumes.push({
          ...perfume,
          categoria: "nichos",
          marca: marca,
          tipo: "nicho",
          precio: perfume.precio || "Consultar",
        });
      });
    });
  }

  perfumesFiltrados = [...todosLosPerfumes];
}

// Calcular precio final con incrementos por categoría
function calcularPrecioFinal(perfume) {
  if (!perfume.precio || perfume.precio === "Consultar") {
    return "Consultar";
  }

  let incremento = 0;

  switch (perfume.categoria) {
    case "arabes":
      incremento = 1800;
      break;
    case "disenador":
      incremento = 2300;
      break;
    case "nichos":
      incremento = 3000;
      break;
    case "sets":
      // Los sets mantienen su precio original
      incremento = 0;
      break;
    default:
      incremento = 0;
  }

  const precioFinal = perfume.precio + incremento;
  return `$${precioFinal.toLocaleString()}`;
}

// Mostrar perfumes en la galería
function mostrarPerfumes(lista) {
  galeria.innerHTML = "";

  if (lista.length === 0) {
    galeria.innerHTML =
      '<div style="text-align: center; padding: 40px; grid-column: 1/-1;"><h3>No se encontraron perfumes</h3></div>';
    return;
  }

  lista.forEach((perfume, index) => {
    const card = document.createElement("div");
    card.className = "card";

    const precio = calcularPrecioFinal(perfume);

    card.innerHTML = `
      <img src="${perfume.imagen}" alt="${perfume.nombre}" onerror="this.src='https://placehold.co/400x500?text=Perfume'">
      <h3>${perfume.nombre}</h3>
      <p class="marca">${perfume.marca}</p>
      <p class="precio">${precio}</p>
    `;

    // Hacer la card clickeable para abrir página de detalle
    card.addEventListener("click", () => mostrarPaginaPerfume(perfume, precio));

    galeria.appendChild(card);
    setTimeout(() => card.classList.add("is-visible"), index * 50);
  });
}

// Mostrar página completa del perfume
function mostrarPaginaPerfume(perfume, precio) {
  // Guardar estado actual
  sessionStorage.setItem("perfumeActual", JSON.stringify(perfume));
  sessionStorage.setItem("precioActual", precio);

  // Ocultar la galería y header principal
  document.getElementById("galeria").style.display = "none";
  document.querySelector("header").style.display = "none";
  const h1Element = document.querySelector("h1");
  if (h1Element) h1Element.style.display = "none";

  // Crear o mostrar página de detalle
  let detallePage = document.getElementById("perfumeDetailPage");
  if (!detallePage) {
    detallePage = document.createElement("div");
    detallePage.id = "perfumeDetailPage";
    detallePage.className = "perfume-detail-page";
    document.body.appendChild(detallePage);
  }

  // Construir HTML de la página
  const mensaje = encodeURIComponent(
    `Hola, estoy interesado/a en ${perfume.nombre} de ${perfume.marca}. ¿Me podrías dar más detalles?`
  );
  const whatsappLink = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensaje}`;

  let notasHTML = "";
  if (perfume.notas && typeof perfume.notas === "object") {
    notasHTML = `
      <div class="detail-notes-section">
        <h3>🌸 Notas Olfativas</h3>
        <div class="detail-note-item">
          <strong>Notas de Salida</strong>
          <p>${perfume.notas.salida || "N/A"}</p>
        </div>
        <div class="detail-note-item">
          <strong>Notas de Corazón</strong>
          <p>${perfume.notas.corazon || "N/A"}</p>
        </div>
        <div class="detail-note-item">
          <strong>Notas de Fondo</strong>
          <p>${perfume.notas.fondo || "N/A"}</p>
        </div>
      </div>
    `;
  } else {
    notasHTML = `<p class="detail-notes-fallback">${
      perfume.notas || "Consulta notas disponibles"
    }</p>`;
  }

  detallePage.innerHTML = `
    <button class="detail-back-btn" onclick="volverACatalogo()">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Volver al Catálogo
    </button>
    
    <div class="detail-container">
      <div class="detail-image-section">
        <img src="${
          perfume.imagen || "https://placehold.co/400x500?text=Perfume"
        }" alt="${
    perfume.nombre
  }" onerror="this.src='https://placehold.co/400x500?text=Perfume'">
      </div>
      
      <div class="detail-info-section">
        <div class="detail-header">
          <p class="detail-marca">${perfume.marca}</p>
          <h1 class="detail-nombre">${perfume.nombre}</h1>
          <p class="detail-precio">${precio}</p>
        </div>
        
        <div class="detail-description">
          <h3>Descripción</h3>
          <p>${
            perfume.descripcion ||
            "Fragancia de alta calidad con una composición única y sofisticada."
          }</p>
        </div>
        
        ${notasHTML}
        
        <a href="${whatsappLink}" target="_blank" class="detail-whatsapp-btn">
          📞 Consultar por WhatsApp
        </a>
      </div>
    </div>
  `;

  detallePage.style.display = "block";
  window.scrollTo(0, 0);
}

// Volver al catálogo
function volverACatalogo() {
  const detallePage = document.getElementById("perfumeDetailPage");
  if (detallePage) {
    detallePage.style.display = "none";
  }

  // Restaurar elementos principales
  document.getElementById("galeria").style.display = "grid";
  document.querySelector("header").style.display = "flex";
  const h1Element = document.querySelector("h1");
  if (h1Element) h1Element.style.display = "block";

  window.scrollTo(0, 0);
}

// FUNCIÓN OBSOLETA - mantener por compatibilidad pero ya no se usa
function openModal(perfume, precio) {
  const modal = document.getElementById("perfumeModal");
  const mensaje = encodeURIComponent(
    `Hola, estoy interesado/a en ${perfume.nombre} de ${perfume.marca}. ¿Me podrías dar más detalles?`
  );
  const whatsappLink = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensaje}`;

  // Rellenar el modal con la información
  document.getElementById("modalImage").src =
    perfume.imagen || "https://placehold.co/400x500?text=Perfume";
  document.getElementById("modalNombre").textContent = perfume.nombre;
  document.getElementById("modalMarca").textContent = perfume.marca;
  document.getElementById("modalDescription").textContent =
    perfume.descripcion || "Fragancia de alta calidad";

  // Formatear notas de perfume con estructura bonita
  const notesElement = document.getElementById("modalNotes");
  if (perfume.notas && typeof perfume.notas === "object") {
    notesElement.innerHTML = `
      <div class="notes-section">
        <div class="note-item">
          <strong>Notas de Salida:</strong><br>${perfume.notas.salida || "N/A"}
        </div>
        <div class="note-item">
          <strong>Notas de Corazón:</strong><br>${
            perfume.notas.corazon || "N/A"
          }
        </div>
        <div class="note-item">
          <strong>Notas de Fondo:</strong><br>${perfume.notas.fondo || "N/A"}
        </div>
      </div>
    `;
  } else {
    notesElement.textContent = perfume.notas || "Consulta notas disponibles";
  }

  document.getElementById("modalPrecio").textContent = precio;
  document.getElementById("modalWhatsapp").href = whatsappLink;

  // Mostrar modal
  modal.classList.add("active");
  document.body.style.overflow = "hidden"; // Prevenir scroll
}

// Cerrar modal
function closeModal() {
  const modal = document.getElementById("perfumeModal");
  modal.classList.remove("active");
  document.body.style.overflow = ""; // Restaurar scroll
}

// Filtrar por categoría principal
function filtrarCategoria(categoria, boton) {
  // Verificar si el botón ya está activo (toggle)
  const yaEstaActivo = boton.classList.contains("active");

  if (yaEstaActivo && categoria !== "todos") {
    // Si ya está activo, quitar filtro y mostrar todos
    document
      .querySelectorAll(".btn")
      .forEach((b) => b.classList.remove("active"));
    document.querySelector('.btn[onclick*="todos"]').classList.add("active");

    // Sincronizar con menú móvil
    document
      .querySelectorAll(".mobile-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector('.mobile-filter-btn[onclick*="todos"]')
      .classList.add("active");

    // Mostrar todos los perfumes
    aplicarFiltroCategoria("todos");
    return;
  }

  // Actualizar botón activo
  document
    .querySelectorAll(".btn")
    .forEach((b) => b.classList.remove("active"));
  boton.classList.add("active");

  // Sincronizar con menú móvil
  document
    .querySelectorAll(".mobile-filter-btn")
    .forEach((b) => b.classList.remove("active"));
  const mobileBtn = Array.from(
    document.querySelectorAll(".mobile-filter-btn")
  ).find(
    (b) =>
      b.textContent.toLowerCase().trim() === categoria ||
      (categoria === "todos" && b.textContent.toLowerCase().trim() === "todos")
  );
  if (mobileBtn) mobileBtn.classList.add("active");

  // Aplicar filtro usando función compartida
  aplicarFiltroCategoria(categoria);
}

// Mostrar subfiltros según la categoría
function mostrarSubfiltros(categoria) {
  if (categoria === "todos") return;

  let subfiltros = [];

  if (categoria === "arabes") {
    // Obtener marcas árabes únicas
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === "arabes")
          .map((p) => p.marca)
      ),
    ];
    subfiltros = marcas.slice(0, 8); // Mostrar las primeras 8 marcas
  } else if (categoria === "disenador") {
    // Obtener marcas de diseñador únicas
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === "disenador")
          .map((p) => p.marca)
      ),
    ];
    subfiltros = marcas.slice(0, 8);
  } else if (categoria === "nichos") {
    // Obtener marcas nicho únicas
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === "nichos")
          .map((p) => p.marca)
      ),
    ];
    subfiltros = marcas;
  } else if (categoria === "sets") {
    subfiltros = ["Set disenador", "Set arabe"];
  }

  // Crear botones de subfiltros
  subfiltros.forEach((subfiltro) => {
    const btn = document.createElement("button");
    btn.className = "subfilter-btn";
    btn.textContent = subfiltro;
    btn.onclick = () => filtrarPorMarca(subfiltro, categoria);
    subfiltersDiv.appendChild(btn);
  });
}

// Filtrar por marca específica
function filtrarPorMarca(marca, categoria) {
  const filtrados = todosLosPerfumes.filter(
    (p) => p.categoria === categoria && p.marca === marca
  );
  mostrarPerfumes(filtrados);
}

// Buscar perfumes por nombre
function buscarPerfumes() {
  const termino = searchInput.value.toLowerCase().trim();

  if (termino === "") {
    mostrarPerfumes(perfumesFiltrados);
    return;
  }

  const resultados = perfumesFiltrados.filter(
    (perfume) =>
      perfume.nombre.toLowerCase().includes(termino) ||
      perfume.marca.toLowerCase().includes(termino)
  );

  mostrarPerfumes(resultados);
}

// Toggle del buscador expandible
function toggleSearch() {
  const container = document.getElementById("searchContainer");
  const input = document.getElementById("searchInput");

  container.classList.toggle("active");

  if (container.classList.contains("active")) {
    // Dar foco al input cuando se expande
    setTimeout(() => input.focus(), 100);
  } else {
    // Limpiar búsqueda al cerrar si está vacío
    if (input.value.trim() === "") {
      input.value = "";
      buscarPerfumes();
    }
  }
}

// Cerrar búsqueda al hacer clic fuera
document.addEventListener("click", function (e) {
  const container = document.getElementById("searchContainer");
  const input = document.getElementById("searchInput");

  if (container && !container.contains(e.target)) {
    if (input.value.trim() === "") {
      container.classList.remove("active");
    }
  }
});

// Inicializar cuando carga la página
document.addEventListener("DOMContentLoaded", cargarCatalogo);

// ============ FUNCIONES MÓVILES ============

// Toggle del menú móvil
function toggleMobileMenu() {
  const mobileMenu = document.getElementById("mobileMenu");
  const overlay = document.getElementById("mobileMenuOverlay");
  const body = document.body;

  if (mobileMenu.classList.contains("active")) {
    mobileMenu.classList.remove("active");
    overlay.classList.remove("active");
    body.classList.remove("menu-open");
  } else {
    mobileMenu.classList.add("active");
    overlay.classList.add("active");
    body.classList.add("menu-open");
  }
}

// Filtrar categoría desde menú móvil
function filtrarCategoriaMobile(categoria, boton) {
  // Verificar si el botón ya está activo (toggle)
  const yaEstaActivo = boton.classList.contains("active");

  if (yaEstaActivo && categoria !== "todos") {
    // Si ya está activo, quitar filtro y mostrar todos
    document
      .querySelectorAll(".mobile-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector('.mobile-filter-btn[onclick*="todos"]')
      .classList.add("active");

    // Sincronizar con desktop
    document
      .querySelectorAll(".btn")
      .forEach((b) => b.classList.remove("active"));
    document.querySelector('.btn[onclick*="todos"]').classList.add("active");

    // Mostrar todos los perfumes
    aplicarFiltroCategoria("todos");
    mostrarSubfiltrosMobile("todos");
    return;
  }

  // Actualizar botón activo en móvil
  document
    .querySelectorAll(".mobile-filter-btn")
    .forEach((b) => b.classList.remove("active"));
  boton.classList.add("active");

  // Actualizar también los filtros desktop para mantener sincronización
  document
    .querySelectorAll(".btn")
    .forEach((b) => b.classList.remove("active"));
  const desktopBtn = Array.from(document.querySelectorAll(".btn")).find(
    (b) =>
      b.textContent.toLowerCase().trim() === categoria ||
      (categoria === "todos" && b.textContent.toLowerCase().trim() === "todos")
  );
  if (desktopBtn) desktopBtn.classList.add("active");

  // Aplicar filtro
  aplicarFiltroCategoria(categoria);

  // Mostrar subfiltros móviles
  mostrarSubfiltrosMobile(categoria);
}

// Mostrar subfiltros en menú móvil
function mostrarSubfiltrosMobile(categoria) {
  const mobileSubfilters = document.getElementById("mobileSubfilters");
  mobileSubfilters.innerHTML = "";

  if (categoria === "todos") return;

  let subfiltros = [];

  if (categoria === "arabes") {
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === "arabes")
          .map((p) => p.marca)
      ),
    ];
    subfiltros = marcas.slice(0, 10);
  } else if (categoria === "disenador") {
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === "disenador")
          .map((p) => p.marca)
      ),
    ];
    subfiltros = marcas.slice(0, 10);
  } else if (categoria === "nichos") {
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === "nichos")
          .map((p) => p.marca)
      ),
    ];
    subfiltros = marcas;
  } else if (categoria === "sets") {
    subfiltros = ["Set disenador", "Set arabe"];
  }

  if (subfiltros.length > 0) {
    const subfilterSection = document.createElement("div");
    subfilterSection.className = "mobile-filter-section";
    subfilterSection.innerHTML = "<h4>Marcas</h4>";

    subfiltros.forEach((subfiltro) => {
      const btn = document.createElement("button");
      btn.className = "mobile-subfilter-btn";
      btn.textContent = subfiltro;
      btn.onclick = () => {
        filtrarPorMarca(subfiltro, categoria);
        toggleMobileMenu(); // Cerrar menú después de seleccionar
      };
      subfilterSection.appendChild(btn);
    });

    mobileSubfilters.appendChild(subfilterSection);
  }
}

// Función compartida para aplicar filtro de categoría
function aplicarFiltroCategoria(categoria) {
  // Limpiar subfiltros desktop
  subfiltersDiv.innerHTML = "";

  if (categoria === "todos") {
    perfumesFiltrados = [...todosLosPerfumes];
  } else {
    perfumesFiltrados = todosLosPerfumes.filter(
      (p) => p.categoria === categoria
    );
  }

  // Mostrar subfiltros desktop
  mostrarSubfiltros(categoria);

  // Mostrar perfumes filtrados
  mostrarPerfumes(perfumesFiltrados);
}
