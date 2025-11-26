const NUMERO_WHATSAPP = "+18298070599";

// Variables globales
let todosLosPerfumes = [];
let perfumesFiltrados = [];
let catalogoData = null;
let paginaActual = 1;
const perfumesPorPagina = 20;
let filtroGeneroActual = "todos"; // Filtro de género por defecto

// Elementos del DOM
const galeria = document.getElementById("galeria");
const subfiltersDiv = document.getElementById("subfilters");
const searchInput = document.getElementById("searchInput");

// Cargar datos desde Firebase (con caché para cero costos)
async function cargarCatalogo() {
  // Mostrar indicador de carga con animación
  galeria.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #667eea;">
      <div style="font-size: 48px; margin-bottom: 20px; animation: pulse 1.5s infinite;">⏳</div>
      <h3 style="color: #333; font-size: 24px;">Cargando catálogo...</h3>
      <p style="color: #666; margin-top: 10px;">Esto puede tardar unos segundos</p>
      <div style="margin-top: 20px; font-size: 14px; color: #999;">
        Optimizando la carga de ${catalogoData ? "datos" : "imágenes"}...
      </div>
    </div>
  `;

  try {
    // Importar Firebase dinámicamente
    const { obtenerPerfumes } = await import("./firebase-config.js");

    // Obtener perfumes (usa caché automático de 24h)
    console.time("📦 Carga desde Firebase");
    catalogoData = await obtenerPerfumes();
    console.timeEnd("📦 Carga desde Firebase");

    console.time("⚡ Procesamiento de datos");
    procesarDatos();
    console.timeEnd("⚡ Procesamiento de datos");

    // Verificar si viene desde una navegación interna (modal de perfume)
    const esNavegacionInterna = sessionStorage.getItem("navegacionInterna");

    if (esNavegacionInterna === "true") {
      // Solo en este caso restaurar filtros
      sessionStorage.removeItem("navegacionInterna");

      const filtroCategoria = sessionStorage.getItem("filtroCategoria");
      const filtroMarca = sessionStorage.getItem("filtroMarca");

      if (filtroCategoria) {
        // Restaurar filtro de categoría
        const btnCategoria = Array.from(document.querySelectorAll(".btn")).find(
          (b) => b.textContent.toLowerCase().trim() === filtroCategoria
        );
        if (btnCategoria) {
          btnCategoria.classList.add("active");
          const categoria =
            filtroCategoria === "todos"
              ? "todos"
              : filtroCategoria === "árabes"
              ? "arabes"
              : filtroCategoria === "diseñador"
              ? "disenador"
              : filtroCategoria === "nichos"
              ? "nichos"
              : filtroCategoria === "sets"
              ? "sets"
              : "todos";
          aplicarFiltroCategoria(categoria);

          // Si hay filtro de marca, aplicarlo
          if (filtroMarca && categoria !== "todos") {
            setTimeout(() => {
              const btnMarca = Array.from(
                document.querySelectorAll(".subfilter-btn")
              ).find((b) => b.textContent === filtroMarca);
              if (btnMarca) {
                btnMarca.click();
              }
            }, 100);
          }
        }

        // Limpiar filtros guardados después de restaurar
        sessionStorage.removeItem("filtroCategoria");
        sessionStorage.removeItem("filtroMarca");
      } else {
        mostrarPerfumes(todosLosPerfumes);
      }
    } else {
      // Es una carga nueva o un refresh - limpiar todo y empezar de cero
      sessionStorage.removeItem("filtroCategoria");
      sessionStorage.removeItem("filtroMarca");
      sessionStorage.removeItem("marcaSeleccionada");
      sessionStorage.removeItem("categoriaSeleccionada");

      mostrarPerfumes(todosLosPerfumes);
    }
  } catch (error) {
    console.error("❌ Error cargando catálogo:", error);

    // Mostrar mensaje de error más amigable
    galeria.innerHTML = `  
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h3 style="color: #333; font-size: 24px; margin-bottom: 15px;">No se pudieron cargar los perfumes</h3>
        <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
          ${error.message || "Error de conexión"}
        </p>
        <button onclick="location.reload()" 
          style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                 color: white; border: none; padding: 15px 30px; 
                 border-radius: 25px; font-size: 16px; font-weight: 600; 
                 cursor: pointer; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                 transition: transform 0.2s;"
          onmouseover="this.style.transform='translateY(-2px)'"
          onmouseout="this.style.transform='translateY(0)'">
          🔄 Reintentar
        </button>
        <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 10px; max-width: 500px; margin-left: auto; margin-right: auto; text-align: left;">
          <strong style="color: #333;">💡 Consejos:</strong>
          <ul style="margin-top: 10px; color: #666; line-height: 1.8;">
            <li>Verifica tu conexión a internet</li>
            <li>Si estás en modo avión, desactívalo</li>
            <li>Intenta recargar la página en unos segundos</li>
            <li>Si el problema persiste, limpia la caché del navegador</li>
          </ul>
        </div>
      </div>
    `;
  }
}

// Procesar y normalizar datos del JSON (OPTIMIZADO - Carga progresiva)
function procesarDatos() {
  todosLosPerfumes = [];

  // Helper para procesar cada categoría de forma optimizada
  const procesarCategoria = (categoria, data, tipo = "unisex") => {
    if (!data) return;

    for (const [marca, perfumes] of Object.entries(data)) {
      if (!perfumes) continue;

      // Normalizar perfumes para que siempre sea un array
      const lista = Array.isArray(perfumes)
        ? perfumes
        : Object.values(perfumes);

      for (const perfume of lista) {
        todosLosPerfumes.push({
          ...perfume,
          categoria,
          marca: categoria === "sets" ? `Set ${marca}` : marca,
          tipo,
        });
      }
    }
  };

  // Procesar todas las categorías
  procesarCategoria("arabes", catalogoData.perfumes?.arabes);
  procesarCategoria("disenador", catalogoData.perfumes?.disenador);
  procesarCategoria("sets", catalogoData.perfumes?.sets, "set");
  procesarCategoria("nichos", catalogoData.perfumes?.nicho, "nicho");

  perfumesFiltrados = [...todosLosPerfumes];

  console.log(`✅ ${todosLosPerfumes.length} perfumes procesados`);
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
function mostrarPerfumes(lista, resetearPagina = true) {
  if (resetearPagina) {
    paginaActual = 1;
  }

  galeria.innerHTML = "";

  if (lista.length === 0) {
    galeria.innerHTML =
      '<div style="text-align: center; padding: 40px; grid-column: 1/-1;"><h3>No se encontraron perfumes</h3></div>';
    return;
  }

  // Calcular índices para la página actual
  const inicio = (paginaActual - 1) * perfumesPorPagina;
  const fin = inicio + perfumesPorPagina;
  const perfumesPagina = lista.slice(inicio, fin);
  const hayMasPerfumes = fin < lista.length;

  // Renderizado optimizado con DocumentFragment
  const fragment = document.createDocumentFragment();

  perfumesPagina.forEach((perfume, index) => {
    const card = document.createElement("div");
    card.className = "card";

    const precio = calcularPrecioFinal(perfume);

    // Icono de género
    let generoIcono = "";
    if (perfume.genero === "hombre") {
      generoIcono =
        "<span style='color: #4A90E2; font-size: 1.3em; margin-left: 5px;'>♂️</span>"; // Símbolo masculino
    } else if (perfume.genero === "mujer") {
      generoIcono =
        "<span style='color: #FF69B4; font-size: 1.3em; margin-left: 5px;'>♀️</span>"; // Símbolo femenino
    } else {
      generoIcono =
        "<span style='color: #9B59B6; font-size: 1.3em; margin-left: 5px;'>⚧️</span>"; // Símbolo unisex
    }

    card.innerHTML = `
      <img loading="lazy" src="${perfume.imagen}" alt="${perfume.nombre}" onerror="this.src='https://placehold.co/400x500?text=Perfume'">
      <h3>${perfume.nombre}</h3>
      <p class="marca">${perfume.marca} ${generoIcono}</p>
      <p class="precio">${precio}</p>
    `;

    // Hacer la card clickeable para abrir página de detalle
    card.addEventListener("click", () => mostrarPaginaPerfume(perfume, precio));

    fragment.appendChild(card);

    // Aplicar animación después de agregar al DOM
    requestAnimationFrame(() => {
      setTimeout(() => card.classList.add("is-visible"), index * 50);
    });
  });

  // Agregar todas las cards de una vez (más eficiente)
  galeria.appendChild(fragment);

  // Agregar botones de navegación si es necesario
  const totalPaginas = Math.ceil(lista.length / perfumesPorPagina);

  if (totalPaginas > 1) {
    const paginacionContainer = document.createElement("div");
    paginacionContainer.className = "pagination-btn-container";

    let botonesHTML = "";

    // Botón anterior
    if (paginaActual > 1) {
      botonesHTML += `
        <button class="btn-paginacion btn-anterior" onclick="cargarPaginaAnterior()">
          ← Anterior
        </button>
      `;
    }

    // Indicador de página
    botonesHTML += `
      <span class="pagination-info">Página ${paginaActual} de ${totalPaginas}</span>
    `;

    // Botón siguiente
    if (hayMasPerfumes) {
      botonesHTML += `
        <button class="btn-paginacion btn-siguiente" onclick="cargarSiguientePagina()">
          Siguiente →
        </button>
      `;
    }

    paginacionContainer.innerHTML = botonesHTML;
    galeria.appendChild(paginacionContainer);
  }
}

// Cargar página anterior
function cargarPaginaAnterior() {
  if (paginaActual > 1) {
    paginaActual--;
    console.log(
      `📄 Cargando página ${paginaActual}, filtrados: ${perfumesFiltrados.length}`
    );
    mostrarPerfumes(perfumesFiltrados, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// Cargar siguiente página
function cargarSiguientePagina() {
  const totalPaginas = Math.ceil(perfumesFiltrados.length / perfumesPorPagina);

  if (paginaActual < totalPaginas) {
    paginaActual++;
    console.log(
      `📄 Cargando página ${paginaActual} de ${totalPaginas}, filtrados: ${perfumesFiltrados.length}`
    );
    mostrarPerfumes(perfumesFiltrados, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    console.warn("⚠️ Ya estás en la última página");
  }
}

// Mostrar página completa del perfume
function mostrarPaginaPerfume(perfume, precio) {
  // Marcar como navegación interna
  sessionStorage.setItem("navegacionInterna", "true");

  // Guardar filtros activos
  const categoriaActiva = document.querySelector(".btn.active");
  if (categoriaActiva) {
    const categoriaTexto = categoriaActiva.textContent.toLowerCase().trim();
    sessionStorage.setItem("filtroCategoria", categoriaTexto);
  }

  const marcaActiva = document.querySelector(".subfilter-btn.active");
  if (marcaActiva) {
    sessionStorage.setItem("filtroMarca", marcaActiva.textContent);
  }

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
          <h1 class="detail-nombre" id="detailNombre">${perfume.nombre}</h1>
          <p class="detail-precio" id="detailPrecio">${precio}</p>
        </div>
        
        <div class="detail-ml-selector" id="mlSelectorContainer">
          <label for="detailMlSelect">Tamaño:</label>
          <select id="detailMlSelect">
          </select>
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


 // Configurar el selector de ML (sin setTimeout para evitar parpadeo)
const mlSelect = document.getElementById("detailMlSelect");
const whatsappBtn = document.querySelector(".detail-whatsapp-btn");

if (mlSelect && whatsappBtn) {
  // Obtener tamaños disponibles
  const tamanosDisponibles =
    perfume.tamanosDisponibles && perfume.tamanosDisponibles.length > 0
      ? perfume.tamanosDisponibles
      : [];

  // Obtener precios personalizados si existen
  const preciosPersonalizados = perfume.preciosPersonalizados || {};
  const precioNumerico = parseInt(precio.replace(/[^0-9]/g, ""));

  // Definir multiplicadores para cada tamaño (por defecto)
  const multiplicadores = {
    30: 0.4,
    50: 0.6,
    60: 0.7,
    75: 0.85,
    80: 0.9,
    90: 0.95,
    100: 1.0,
    120: 1.2,
    125: 1.25,
    200: 1.8,
  };

  const mlSelectorContainer = document.getElementById("mlSelectorContainer");

  // Si no tiene tamaños configurados, ocultar selector y mostrar nombre sin ML
  if (tamanosDisponibles.length === 0) {
    mlSelectorContainer.style.display = "none";
    document.getElementById("detailNombre").textContent = perfume.nombre;
    return; // Salir aquí, no hay nada más que hacer
  }

  // Generar opciones dinámicamente
  mlSelect.innerHTML = "";
  tamanosDisponibles.forEach((tamano, index) => {
    const option = document.createElement("option");
    option.value = tamano;

    // Usar precio personalizado si existe, sino usar multiplicador
    if (preciosPersonalizados[tamano]) {
      option.dataset.precioFijo = preciosPersonalizados[tamano];
      option.dataset.multiplier = null;
    } else {
      option.dataset.multiplier = multiplicadores[tamano];
      option.dataset.precioFijo = null;
    }

    option.textContent = `${tamano} ML`;
    if (index === 0) option.selected = true;
    mlSelect.appendChild(option);
  });

  // Si solo hay un tamaño, ocultar el selector
  if (tamanosDisponibles.length === 1) {
    mlSelectorContainer.style.display = "none";
    const tamano = tamanosDisponibles[0];
    document.getElementById(
      "detailNombre"
    ).textContent = `${perfume.nombre} ${tamano}ML`;

    // Actualizar precio si hay precio personalizado
    if (preciosPersonalizados[tamano]) {
      document.getElementById(
        "detailPrecio"
      ).textContent = `$${preciosPersonalizados[tamano].toLocaleString()}`;
    } else {
      const precioConMultiplicador = Math.round(
        precioNumerico * multiplicadores[tamano]
      );
      document.getElementById(
        "detailPrecio"
      ).textContent = `$${precioConMultiplicador.toLocaleString()}`;
    }
  } else {
    // Mostrar el selector cuando hay múltiples tamaños
    mlSelectorContainer.style.display = "flex";

    // Actualizar nombre y precio inicial con el primer tamaño
    const tamanoInicial = tamanosDisponibles[0];
    document.getElementById(
      "detailNombre"
    ).textContent = `${perfume.nombre} ${tamanoInicial}ML`;

    // Actualizar precio inicial
    if (preciosPersonalizados[tamanoInicial]) {
      document.getElementById(
        "detailPrecio"
      ).textContent = `$${preciosPersonalizados[
        tamanoInicial
      ].toLocaleString()}`;
    } else {
      const precioConMultiplicador = Math.round(
        precioNumerico * multiplicadores[tamanoInicial]
      );
      document.getElementById(
        "detailPrecio"
      ).textContent = `$${precioConMultiplicador.toLocaleString()}`;
    }
  }

  mlSelect.addEventListener("change", function () {
    const selectedOption = this.options[this.selectedIndex];
    const mlValue = this.value;
    let nuevoPrecio;

    // Usar precio fijo personalizado si existe, sino calcular con multiplicador
    if (selectedOption.dataset.precioFijo) {
      nuevoPrecio = parseInt(selectedOption.dataset.precioFijo);
    } else {
      const multiplier = parseFloat(selectedOption.dataset.multiplier);
      nuevoPrecio = Math.round(precioNumerico * multiplier);
    }

    // Actualizar precio en pantalla
    document.getElementById(
      "detailPrecio"
    ).textContent = `$${nuevoPrecio.toLocaleString()}`;

    // Actualizar nombre del perfume con el tamaño
    document.getElementById(
      "detailNombre"
    ).textContent = `${perfume.nombre} ${mlValue}ML`;

    // Actualizar mensaje de WhatsApp
    const nuevoMensaje = encodeURIComponent(
      `Hola! Me interesa el perfume:\n\n*${perfume.nombre}*\n${
        perfume.marca
      }\nTamaño: ${mlValue}ML\nPrecio: RD$ ${nuevoPrecio.toLocaleString()}`
    );
    whatsappBtn.href = `https://wa.me/${NUMERO_WHATSAPP}?text=${nuevoMensaje}`;
  });
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
  // Guardar estado del filtro actual y marcar como navegación interna
  sessionStorage.setItem("navegacionInterna", "true");

  const categoriaActiva = document.querySelector(".btn.active");
  if (categoriaActiva) {
    const categoriaTexto = categoriaActiva.textContent.toLowerCase().trim();
    sessionStorage.setItem("filtroCategoria", categoriaTexto);
  }

  const marcaActiva = document.querySelector(".subfilter-btn.active");
  if (marcaActiva) {
    sessionStorage.setItem("filtroMarca", marcaActiva.textContent);
  }

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
    subfiltros = marcas.slice(0, 8); // Mostrar solo 8 marcas
  } else if (categoria === "disenador") {
    // Obtener marcas de diseñador únicas
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === "disenador")
          .map((p) => p.marca)
      ),
    ];
    subfiltros = marcas.slice(0, 8); // Mostrar solo 8 marcas
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
    subfiltros = ["Set arabes", "Set disenador"];
  }

  // Crear botones de subfiltros
  subfiltros.forEach((subfiltro) => {
    const btn = document.createElement("button");
    btn.className = "subfilter-btn";
    btn.textContent = subfiltro;
    btn.onclick = () => filtrarPorMarca(subfiltro, categoria);
    subfiltersDiv.appendChild(btn);
  });

  // Agregar botón "Más marcas" para diseñador y árabes
  if (
    (categoria === "disenador" || categoria === "arabes") &&
    subfiltros.length === 8
  ) {
    const btnMas = document.createElement("button");
    btnMas.className = "subfilter-btn subfilter-btn-mas";
    btnMas.textContent = "✨ Más marcas";
    const url = categoria === "arabes" ? "marcas-arabes.html" : "marcas.html";
    btnMas.onclick = () => (window.location.href = url);
    subfiltersDiv.appendChild(btnMas);
  }
}

// Filtrar por marca específica
function filtrarPorMarca(marca, categoria) {
  const filtrados = todosLosPerfumes.filter(
    (p) => p.categoria === categoria && p.marca === marca
  );

  // Aplicar filtro de género adicional
  const filtradosConGenero = aplicarFiltroGenero(filtrados, filtroGeneroActual);

  // Actualizar el array global para que la paginación funcione correctamente
  perfumesFiltrados = filtradosConGenero;

  mostrarPerfumes(perfumesFiltrados);
}

// Buscar perfumes por nombre
function buscarPerfumes() {
  const termino = searchInput.value.toLowerCase().trim();

  if (termino === "") {
    // Si no hay término de búsqueda, restaurar los filtros actuales
    // (ya sea por categoría, marca o género)
    mostrarPerfumes(perfumesFiltrados);
    return;
  }

  const resultados = perfumesFiltrados.filter(
    (perfume) =>
      perfume.nombre.toLowerCase().includes(termino) ||
      perfume.marca.toLowerCase().includes(termino)
  );

  // Actualizar el array global para que la paginación funcione correctamente
  perfumesFiltrados = resultados;

  mostrarPerfumes(perfumesFiltrados);
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
