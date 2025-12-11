const NUMERO_WHATSAPP = "+18298070599";

// Variables globales
let todosLosPerfumes = [];
let perfumesFiltrados = [];
let perfumesFiltradosSinBusqueda = []; // Backup para restaurar cuando se borra la búsqueda
let catalogoData = null;
let paginaActual = 1;
const perfumesPorPagina = 20;
let filtroGeneroActual = "todos"; // Nuevo filtro de género

// Elementos del DOM
const galeria = document.getElementById("galeria");
const subfiltersDiv = document.getElementById("subfilters");
const searchInput = document.getElementById("searchInput");

// Cargar datos desde Firebase DIRECTAMENTE
async function cargarCatalogo() {
  // Mostrar indicador de carga
  galeria.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #667eea;">
      <div style="font-size: 48px; margin-bottom: 20px; animation: pulse 1.5s infinite;">⏳</div>
      <h3 style="color: #333; font-size: 24px;">Cargando catálogo desde Firebase...</h3>
      <p style="color: #666; margin-top: 10px;">Esto puede tardar unos segundos</p>
    </div>
  `;

  try {
    // Cargar desde Firebase
    const dbRef = window.firebaseRef(window.firebaseDB, "perfumes");
    const snapshot = await window.firebaseGet(dbRef);

    if (!snapshot.exists()) {
      throw new Error("No hay datos en Firebase");
    }

    // Firebase format: objeto con IDs únicos como keys
    const firebaseData = snapshot.val();

    // Convertir a formato esperado por procesarDatos
    catalogoData = {
      perfumes: Object.values(firebaseData), // Convertir objeto a array
    };
    procesarDatos();
    // SIEMPRE restaurar filtros guardados (no solo en navegación interna)
    const filtroCategoria = sessionStorage.getItem("filtroCategoria");
    const filtroMarca = sessionStorage.getItem("filtroMarca");
    const esNavegacionInterna = sessionStorage.getItem("navegacionInterna");

    // Limpiar flag de navegación interna
    if (esNavegacionInterna === "true") {
      sessionStorage.removeItem("navegacionInterna");
    }

    if (filtroCategoria) {
      // Restaurar filtro de categoría
      // Normalizar el filtro guardado
      const categoriaNormalizada = filtroCategoria
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Eliminar acentos

      const btnCategoria = Array.from(document.querySelectorAll(".btn")).find(
        (b) => {
          const textoBtn = b.textContent
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          return textoBtn === categoriaNormalizada;
        }
      );

      if (btnCategoria) {
        btnCategoria.classList.add("active");
        // Usar el filtro directamente si no es "todos"
        const categoria =
          filtroCategoria === "todos"
            ? "todos"
            : todosLosPerfumes.find((p) => {
                const catNorm = p.categoria
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "");
                return catNorm === categoriaNormalizada;
              })?.categoria || "todos";
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
    } else {
      // Si no hay filtros, mostrar todos
      mostrarPerfumes(todosLosPerfumes);
    }
  } catch (error) {
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

  // Detectar si es formato nuevo (array) o viejo (objeto anidado)
  if (Array.isArray(catalogoData.perfumes)) {
    // FORMATO NUEVO: Array directo
    catalogoData.perfumes.forEach((perfume, index) => {
      if (perfume && typeof perfume === "object") {
        todosLosPerfumes.push({
          ...perfume,
          indexOriginal: index,
          marcaOriginal: perfume.marca,
          tipo:
            perfume.categoria === "sets"
              ? "set"
              : perfume.categoria === "nichos"
              ? "nicho"
              : "unisex",
        });
      }
    });
  } else {
    // FORMATO VIEJO: Objeto anidado por categoria/marca
    // Helper para procesar cada categoría de forma optimizada
    const procesarCategoria = (categoria, data, tipo = "unisex") => {
      if (!data) return;

      for (const [marca, perfumes] of Object.entries(data)) {
        // Manejar diferentes estructuras de datos
        let arrayPerfumes;

        if (Array.isArray(perfumes)) {
          // Caso normal: es un array directo
          arrayPerfumes = perfumes;
        } else if (typeof perfumes === "object" && perfumes !== null) {
          // Caso especial: es un objeto, convertir valores a array
          arrayPerfumes = Object.values(perfumes);
        } else {
          continue;
        }

        for (let i = 0; i < arrayPerfumes.length; i++) {
          const perfume = arrayPerfumes[i];
          // Asegurar que perfume sea un objeto válido
          if (perfume && typeof perfume === "object") {
            todosLosPerfumes.push({
              ...perfume,
              categoria,
              marca: categoria === "sets" ? `Set ${marca}` : marca,
              tipo,
              indexOriginal: i, // Guardar índice original
              marcaOriginal: marca, // Guardar marca sin prefijo
            });
          }
        }
      }
    };

    // Procesar todas las categorías
    procesarCategoria("arabes", catalogoData.perfumes?.arabes);
    procesarCategoria("disenador", catalogoData.perfumes?.disenador);
    procesarCategoria("sets", catalogoData.perfumes?.sets, "set");
    procesarCategoria(
      "nichos",
      catalogoData.perfumes?.nichos || catalogoData.perfumes?.nicho,
      "nicho"
    );
  }
  perfumesFiltrados = [...todosLosPerfumes];
  // Generar botones de categorías dinámicamente
  generarBotonesCategorias();
}

// Generar botones de categorías dinámicamente desde los datos
function generarBotonesCategorias() {
  // Obtener categorías únicas desde los perfumes
  const categorias = [
    ...new Set(todosLosPerfumes.map((p) => p.categoria)),
  ].sort();
  // Mapeo de nombres amigables
  const nombresAmigables = {
    arabes: "Árabes",
    arabe: "Árabe",
    disenador: "Diseñador",
    nichos: "Nichos",
    nicho: "Nicho",
    sets: "Sets",
  };

  // Generar botones desktop
  const desktopFilters = document.querySelector(".desktop-filters");
  const btnGenero = desktopFilters.querySelector(".btn-genero");

  if (desktopFilters) {
    categorias.forEach((categoria) => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent =
        nombresAmigables[categoria] ||
        categoria.charAt(0).toUpperCase() + categoria.slice(1);
      btn.onclick = function () {
        filtrarCategoria(categoria, this);
      };

      // Insertar antes del botón de Género
      desktopFilters.insertBefore(btn, btnGenero);
    });
  }

  // Generar botones mobile (menú lateral)
  const mobileMenuSections = document.querySelectorAll(
    ".mobile-filter-section"
  );

  // Buscar la sección de Categorías (la primera)
  let categoriasSection = null;
  mobileMenuSections.forEach((section) => {
    const h4 = section.querySelector("h4");
    if (h4 && h4.textContent.trim() === "Categorías") {
      categoriasSection = section;
    }
  });

  if (categoriasSection) {
    // Insertar después del botón "Todos"
    categorias.forEach((categoria) => {
      const btn = document.createElement("button");
      btn.className = "mobile-filter-btn";
      btn.textContent =
        nombresAmigables[categoria] ||
        categoria.charAt(0).toUpperCase() + categoria.slice(1);
      btn.onclick = function () {
        filtrarCategoriaMobile(categoria, this);
      };

      categoriasSection.appendChild(btn);
    });
  } else {
  }
}

// Calcular precio final - SIEMPRE mostrar precio de 100ml
function calcularPrecioFinal(perfume) {
  // PRIORIDAD 1: Si tiene precio de 100ml personalizado, usar ese
  if (perfume.preciosPersonalizados && perfume.preciosPersonalizados["100"]) {
    return `RD$ ${perfume.preciosPersonalizados["100"].toLocaleString()}`;
  }

  // PRIORIDAD 2: Si no tiene precios personalizados pero el ml es 100, usar precio base
  if (perfume.ml === 100 && perfume.precio) {
    return `RD$ ${perfume.precio.toLocaleString()}`;
  }

  // PRIORIDAD 3: Si tiene precios personalizados, buscar el de 100ml
  if (perfume.preciosPersonalizados) {
    const precio100 =
      perfume.preciosPersonalizados[100] ||
      perfume.preciosPersonalizados["100"];
    if (precio100) {
      return `RD$ ${precio100.toLocaleString()}`;
    }
  }

  // FALLBACK: usar precio base si existe
  if (perfume.precio && perfume.precio !== "Consultar") {
    return `RD$ ${perfume.precio.toLocaleString()}`;
  }

  return "Consultar";
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

    // Determinar el ml a mostrar (SIEMPRE 100ml cuando mostramos ese precio)
    let mlMostrar = 100;
    if (perfume.preciosPersonalizados && perfume.preciosPersonalizados["100"]) {
      mlMostrar = 100;
    } else if (perfume.ml === 100 || perfume.ml) {
      mlMostrar = perfume.ml;
    }

    card.innerHTML = `
      <img loading="lazy" src="${perfume.imagen}" alt="${perfume.nombre}" onerror="this.src='https://placehold.co/400x500?text=Perfume'">
      <h3>${perfume.nombre}</h3>
      <p class="marca">${perfume.marca} ${generoIcono}</p>
      <p class="ml" style="font-size: 0.9em; color: #666; margin: 5px 0;">🧴 ${mlMostrar} ml</p>
      <p class="precio">${precio}</p>
    `;

    // Hacer la card clickeable para abrir página de detalle
    card.addEventListener("click", () => {
      // Usar firebaseId si está disponible, sino usar formato viejo
      if (perfume.id || perfume.firebaseId) {
        const id = perfume.id || perfume.firebaseId;
        const url = `detalle-perfume.html?id=${encodeURIComponent(id)}`;
        window.location.href = url;
      } else {
        // Fallback al formato viejo
        const marcaParaURL = perfume.marcaOriginal || perfume.marca;
        const indexParaURL =
          perfume.indexOriginal !== undefined ? perfume.indexOriginal : index;
        const url = `detalle-perfume.html?categoria=${encodeURIComponent(
          perfume.categoria
        )}&marca=${encodeURIComponent(marcaParaURL)}&index=${indexParaURL}`;
        window.location.href = url;
      }
    });

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
    mostrarPerfumes(perfumesFiltrados, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// Cargar siguiente página
function cargarSiguientePagina() {
  const totalPaginas = Math.ceil(perfumesFiltrados.length / perfumesPorPagina);

  if (paginaActual < totalPaginas) {
    paginaActual++;
    mostrarPerfumes(perfumesFiltrados, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
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
    let default100mlIndex = -1;

    tamanosDisponibles.forEach((tamano, index) => {
      const option = document.createElement("option");
      option.value = tamano;

      // Marcar índice de 100ml para seleccionarlo por defecto
      if (tamano === 100 || tamano === "100") {
        default100mlIndex = index;
      }

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

      // SIEMPRE usar 100ml como tamaño inicial si existe, sino el primero
      const tamanoInicial =
        default100mlIndex >= 0
          ? tamanosDisponibles[default100mlIndex]
          : tamanosDisponibles[0];

      // Seleccionar 100ml en el dropdown si existe
      if (default100mlIndex >= 0) {
        mlSelect.selectedIndex = default100mlIndex;
      }

      document.getElementById(
        "detailNombre"
      ).textContent = `${perfume.nombre} ${tamanoInicial}ML`;

      // Actualizar precio inicial (PRIORIDAD A 100ML)
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

  // Detectar si es categoría de tipo árabes (puede ser "arabes" o "arabe")
  const esArabes = categoria.toLowerCase().includes("arabe");

  if (esArabes) {
    // Obtener marcas árabes únicas
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === categoria)
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
  } else if (categoria === "nichos" || categoria === "nicho") {
    // Obtener marcas nicho únicas
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === categoria)
          .map((p) => p.marca)
      ),
    ];
    subfiltros = marcas;
  } else if (categoria === "sets") {
    // Para sets, mostrar marcas únicas (no subfiltros por categoría)
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === "sets")
          .map((p) => p.marca)
      ),
    ].sort();
    subfiltros = marcas.slice(0, 8); // Mostrar solo 8 marcas
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
  const esArabesBtn = categoria.toLowerCase().includes("arabe");
  if ((categoria === "disenador" || esArabesBtn) && subfiltros.length === 8) {
    const btnMas = document.createElement("button");
    btnMas.className = "subfilter-btn subfilter-btn-mas";
    btnMas.textContent = "✨ Más marcas";
    const url = esArabesBtn ? "marcas-arabes.html" : "marcas.html";
    btnMas.onclick = () => (window.location.href = url);
    subfiltersDiv.appendChild(btnMas);
  }
}

// Filtrar por marca específica
function filtrarPorMarca(marca, categoria) {
  // Guardar estado del filtro
  sessionStorage.setItem("filtroCategoria", categoria);
  sessionStorage.setItem("filtroMarca", marca);

  // Limpiar búsqueda y su backup
  searchInput.value = "";
  perfumesFiltradosSinBusqueda = [];

  const filtrados = todosLosPerfumes.filter(
    (p) => p.categoria === categoria && p.marca === marca
  );

  // Aplicar filtro de género adicional
  const filtradosConGenero = aplicarFiltroGenero(filtrados, filtroGeneroActual);

  // Actualizar el array global para que la paginación funcione correctamente
  perfumesFiltrados = filtradosConGenero;

  mostrarPerfumes(perfumesFiltrados);
}

// Buscar perfumes por nombre (búsqueda en tiempo real)
function buscarPerfumes() {
  const termino = searchInput.value.toLowerCase().trim();

  if (termino === "") {
    // Restaurar el estado de filtros previo a la búsqueda
    if (perfumesFiltradosSinBusqueda.length > 0) {
      perfumesFiltrados = [...perfumesFiltradosSinBusqueda];
    }
    mostrarPerfumes(perfumesFiltrados);
    return;
  }

  // Guardar el estado actual si es la primera búsqueda
  if (
    perfumesFiltradosSinBusqueda.length === 0 ||
    searchInput.value.length === 1
  ) {
    perfumesFiltradosSinBusqueda = [...perfumesFiltrados];
  }

  // Buscar en el backup (no en perfumesFiltrados para evitar búsqueda incremental incorrecta)
  const baseParaBuscar =
    perfumesFiltradosSinBusqueda.length > 0
      ? perfumesFiltradosSinBusqueda
      : perfumesFiltrados;

  const resultados = baseParaBuscar.filter((perfume) => {
    const nombre = perfume.nombre?.toLowerCase() || "";
    const marca = perfume.marca?.toLowerCase() || "";
    return nombre.includes(termino) || marca.includes(termino);
  });

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

// Diagnóstico de caché simple
function diagnosticarCache() {}

// Hacer disponible globalmente para debugging
window.diagnosticarCache = diagnosticarCache;

// Inicializar cuando carga la página
document.addEventListener("DOMContentLoaded", async () => {
  // Esperar a que Firebase esté listo
  if (!window.firebaseReady) {
    await new Promise((resolve) => {
      window.addEventListener("firebaseReady", resolve, { once: true });
    });
  }

  await cargarCatalogo();

  // Restaurar filtros si existen (con más tiempo para que se carguen los datos)
  setTimeout(() => {
    const filtroCategoriaSaved = sessionStorage.getItem("filtroCategoria");
    const filtroMarcaSaved = sessionStorage.getItem("filtroMarca");
    if (filtroMarcaSaved && filtroCategoriaSaved) {
      // Restaurar filtro de marca
      filtrarPorMarca(filtroMarcaSaved, filtroCategoriaSaved);

      // Actualizar botones activos
      const botonCategoria = Array.from(document.querySelectorAll(".btn")).find(
        (b) => b.textContent.toLowerCase().trim() === filtroCategoriaSaved
      );
      if (botonCategoria) {
        document
          .querySelectorAll(".btn")
          .forEach((b) => b.classList.remove("active"));
        botonCategoria.classList.add("active");
      }
    } else if (filtroCategoriaSaved && filtroCategoriaSaved !== "todos") {
      // Restaurar filtro de categoría
      aplicarFiltroCategoria(filtroCategoriaSaved);

      // Actualizar botones activos
      const botonCategoria = Array.from(document.querySelectorAll(".btn")).find(
        (b) => b.textContent.toLowerCase().trim() === filtroCategoriaSaved
      );
      if (botonCategoria) {
        document
          .querySelectorAll(".btn")
          .forEach((b) => b.classList.remove("active"));
        botonCategoria.classList.add("active");
      }
    }
  }, 500);

  // Ejecutar diagnóstico automático después de 1 segundo
  setTimeout(diagnosticarCache, 1000);
});

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
    subfiltros = marcas.slice(0, 8); // Mostrar solo 8 marcas
  } else if (categoria === "disenador") {
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === "disenador")
          .map((p) => p.marca)
      ),
    ];
    subfiltros = marcas.slice(0, 8); // Mostrar solo 8 marcas
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
    // Para sets, mostrar marcas únicas (no subfiltros por categoría)
    const marcas = [
      ...new Set(
        todosLosPerfumes
          .filter((p) => p.categoria === "sets")
          .map((p) => p.marca)
      ),
    ].sort();
    subfiltros = marcas.slice(0, 8); // Mostrar solo 8 marcas
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

    // Agregar botón "Más marcas" para diseñador y árabes
    if (
      (categoria === "disenador" || categoria === "arabes") &&
      subfiltros.length === 8
    ) {
      const btnMas = document.createElement("button");
      btnMas.className = "mobile-subfilter-btn mobile-subfilter-btn-mas";
      btnMas.textContent = "✨ Más marcas";
      const url = categoria === "arabes" ? "marcas-arabes.html" : "marcas.html";
      btnMas.onclick = () => (window.location.href = url);
      subfilterSection.appendChild(btnMas);
    }

    mobileSubfilters.appendChild(subfilterSection);
  }
}

// Función compartida para aplicar filtro de categoría
function aplicarFiltroCategoria(categoria) {
  // Guardar estado del filtro
  sessionStorage.setItem("filtroCategoria", categoria);
  sessionStorage.removeItem("filtroMarca"); // Limpiar filtro de marca

  // Limpiar subfiltros desktop
  subfiltersDiv.innerHTML = "";

  // Limpiar subfiltros de género
  const generoSubfiltersDiv = document.getElementById("generoSubfilters");
  if (generoSubfiltersDiv) {
    generoSubfiltersDiv.innerHTML = "";
  }

  // Limpiar búsqueda y su backup
  searchInput.value = "";
  perfumesFiltradosSinBusqueda = [];

  // Filtrar por categoría
  let filtrados = [];
  if (categoria === "todos") {
    filtrados = [...todosLosPerfumes];
  } else {
    filtrados = todosLosPerfumes.filter((p) => p.categoria === categoria);
  }

  // Aplicar filtro de género adicional
  filtrados = aplicarFiltroGenero(filtrados, filtroGeneroActual);

  perfumesFiltrados = filtrados;

  // Mostrar subfiltros desktop
  mostrarSubfiltros(categoria);

  // Mostrar perfumes filtrados
  mostrarPerfumes(perfumesFiltrados);
}

// Función auxiliar para aplicar filtro de género
function aplicarFiltroGenero(perfumes, genero) {
  if (genero === "todos") {
    return perfumes;
  } else if (genero === "unisex") {
    // Solo perfumes unisex
    return perfumes.filter((p) => p.genero === "unisex");
  } else if (genero === "hombre") {
    // Hombres + unisex
    return perfumes.filter(
      (p) => p.genero === "hombre" || p.genero === "unisex"
    );
  } else if (genero === "mujer") {
    // Mujeres + unisex
    return perfumes.filter(
      (p) => p.genero === "mujer" || p.genero === "unisex"
    );
  }
  return perfumes;
}

// Mostrar subfiltros de género en desktop
function mostrarFiltrosGenero(boton) {
  const generoSubfiltersDiv = document.getElementById("generoSubfilters");

  // Toggle: si ya están mostrados, ocultarlos
  if (generoSubfiltersDiv.innerHTML !== "") {
    generoSubfiltersDiv.innerHTML = "";
    boton.classList.remove("active");
    return;
  }

  // Desactivar todos los botones de categoría
  document.querySelectorAll(".desktop-filters .btn").forEach((b) => {
    b.classList.remove("active");
  });

  // Activar el botón de género
  boton.classList.add("active");

  // Limpiar subfiltros de marcas cuando se abre género
  const subfiltersDiv = document.getElementById("subfilters");
  if (subfiltersDiv) {
    subfiltersDiv.innerHTML = "";
  }

  // Crear los botones de género
  const opciones = [
    { texto: "Masculino", valor: "hombre" },
    { texto: "Femenino", valor: "mujer" },
    { texto: "Unisex", valor: "unisex" },
  ];

  opciones.forEach((opcion) => {
    const btn = document.createElement("button");
    btn.classList.add("subfilter-btn");
    if (opcion.valor === filtroGeneroActual) {
      btn.classList.add("active");
    }
    btn.textContent = opcion.texto;
    btn.onclick = () => filtrarGeneroDesktop(opcion.valor, btn);
    generoSubfiltersDiv.appendChild(btn);
  });
}

// Filtrar género desde menú móvil
function filtrarGeneroMobile(genero, boton) {
  // Actualizar botón activo en la sección de género
  const generoSection = boton.closest(".mobile-filter-section");
  if (generoSection) {
    generoSection
      .querySelectorAll(".mobile-filter-btn")
      .forEach((b) => b.classList.remove("active"));
  }
  boton.classList.add("active");

  // Actualizar filtro global
  filtroGeneroActual = genero;

  // Sincronizar con filtros desktop
  document
    .querySelectorAll(".btn-gender")
    .forEach((b) => b.classList.remove("active"));
  const desktopBtn = Array.from(document.querySelectorAll(".btn-gender")).find(
    (b) => b.textContent.toLowerCase().trim() === genero
  );
  if (desktopBtn) desktopBtn.classList.add("active");

  // Reaplicar filtros actuales con el nuevo género
  const categoriaActual = Array.from(
    document.querySelectorAll(
      '.mobile-filter-btn[onclick*="filtrarCategoriaMobile"]'
    )
  ).find((b) => b.classList.contains("active"));
  if (categoriaActual) {
    const textoCategoria = categoriaActual.textContent.toLowerCase().trim();

    // Buscar la categoría real desde los perfumes basándose en el texto del botón
    const categoriaNormalizada = textoCategoria
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Eliminar acentos

    let categoriaReal = "todos";
    if (textoCategoria !== "todos") {
      const perfumeEncontrado = todosLosPerfumes.find((p) => {
        const catNorm = p.categoria
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return (
          catNorm === categoriaNormalizada ||
          p.categoria.toLowerCase() === textoCategoria
        );
      });
      categoriaReal = perfumeEncontrado?.categoria || textoCategoria;
    }

    aplicarFiltroCategoria(categoriaReal);
  } else {
    aplicarFiltroCategoria("todos");
  }
}

// Filtrar género desde desktop
function filtrarGeneroDesktop(genero, boton) {
  // Actualizar botón activo en subfiltros de género
  const generoSubfiltersDiv = document.getElementById("generoSubfilters");
  generoSubfiltersDiv
    .querySelectorAll(".subfilter-btn")
    .forEach((b) => b.classList.remove("active"));
  boton.classList.add("active");

  // Desactivar todos los botones de categoría excepto "Género"
  document.querySelectorAll(".desktop-filters .btn").forEach((b) => {
    if (!b.textContent.includes("Género")) {
      b.classList.remove("active");
    }
  });

  // Actualizar filtro global
  filtroGeneroActual = genero;

  // Sincronizar con filtros móviles
  const generoMobileBtns = Array.from(
    document.querySelectorAll(
      '.mobile-filter-btn[onclick*="filtrarGeneroMobile"]'
    )
  );
  generoMobileBtns.forEach((b) => b.classList.remove("active"));
  const mobileBtn = generoMobileBtns.find(
    (b) => b.textContent.toLowerCase().trim() === genero
  );
  if (mobileBtn) mobileBtn.classList.add("active");

  // Aplicar filtro de género sobre todos los perfumes
  aplicarFiltroCategoria("todos");
}

// ============ EXPONER FUNCIONES AL ÁMBITO GLOBAL ============
// Necesario porque usamos type="module" en el HTML
window.filtrarCategoria = filtrarCategoria;
window.filtrarCategoriaMobile = filtrarCategoriaMobile;
window.filtrarGeneroMobile = filtrarGeneroMobile;
window.filtrarGeneroDesktop = filtrarGeneroDesktop;
window.mostrarFiltrosGenero = mostrarFiltrosGenero;
window.toggleSearch = toggleSearch;
window.toggleMobileMenu = toggleMobileMenu;
window.buscarPerfumes = buscarPerfumes;
window.mostrarPaginaPerfume = mostrarPaginaPerfume;
window.volverACatalogo = volverACatalogo;
window.cargarPaginaAnterior = cargarPaginaAnterior;
window.cargarSiguientePagina = cargarSiguientePagina;
