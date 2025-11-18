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
    const mensaje = encodeURIComponent(
      `Hola, estoy interesado/a en ${perfume.nombre} de ${perfume.marca}. ¿Me podrías dar más detalles?`
    );
    const whatsappLink = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensaje}`;

    card.innerHTML = `
      <img src="${perfume.imagen}" alt="${perfume.nombre}" onerror="this.src='https://placehold.co/400x500?text=Perfume'">
      <h3>${perfume.nombre}</h3>
      <p class="marca">${perfume.marca}</p>
      <p class="precio">${precio}</p>
      <a href="${whatsappLink}" target="_blank" class="whatsapp-btn">Consultar por WhatsApp</a>
    `;

    galeria.appendChild(card);
    setTimeout(() => card.classList.add("is-visible"), index * 50);
  });
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
