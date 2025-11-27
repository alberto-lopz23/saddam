// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyASMM00t5QjjTiIUtvTEsN62VUR9TQAW5E",
  authDomain: "sadam-f9276.firebaseapp.com",
  projectId: "sadam-f9276",
  storageBucket: "sadam-f9276.firebasestorage.app",
  messagingSenderId: "277794745714",
  appId: "1:277794745714:web:ed4df2dfc9287945a541eb",
  measurementId: "G-FVRX115B07",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ============ OPTIMIZACIÓN PARA CERO COSTOS ============

// Caché en localStorage para evitar lecturas repetidas
const CACHE_KEY = "perfumes_cache";
const CACHE_TIMESTAMP_KEY = "perfumes_cache_timestamp";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Obtener perfumes con estrategia CACHE-FIRST (carga instantánea)
export async function obtenerPerfumes() {
  // 1. PRIMERO: Intentar cargar desde caché (instantáneo)
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (cachedData) {
    console.log("⚡ Cargando desde caché (instantáneo)...");
    const cacheAge = Date.now() - parseInt(cacheTimestamp || "0");

    // Si la caché es reciente (menos de 24h), usarla directamente
    if (cacheAge < CACHE_DURATION) {
      console.log(
        `✅ Usando caché (edad: ${Math.round(cacheAge / 1000 / 60)} minutos)`
      );

      // Intentar actualizar en background (sin esperar)
      actualizarCacheEnBackground();

      return JSON.parse(cachedData);
    } else {
      console.log("⏰ Caché expirada, intentando actualizar...");
    }
  } else {
    console.log("📦 No hay caché disponible");
  }

  // 2. SEGUNDO: Intentar obtener de Firebase con timeout
  try {
    console.log("📖 Cargando desde Firebase...");

    const docRef = doc(db, "catalogo", "perfumes");

    // Timeout de 8 segundos
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 8000)
    );

    const docSnap = await Promise.race([getDoc(docRef), timeoutPromise]);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Guardar en caché
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        console.log("✅ Datos actualizados y guardados en caché");
      } catch (cacheError) {
        console.warn("⚠️ No se pudo guardar en caché:", cacheError);
      }

      return data;
    } else {
      throw new Error("No se encontraron perfumes en Firebase");
    }
  } catch (error) {
    console.error("⚠️ Error al obtener de Firebase:", error.message);

    // 3. FALLBACK: Usar caché aunque esté expirada
    if (cachedData) {
      console.log("📦 Usando caché expirada como fallback");
      return JSON.parse(cachedData);
    }

    throw new Error(
      "❌ Sin conexión y no hay datos en caché.\n\n" +
        "Soluciones:\n" +
        "• Verifica tu conexión a internet\n" +
        "• Recarga la página\n" +
        "• Intenta de nuevo en unos momentos"
    );
  }
}

// Función auxiliar para actualizar caché en background
async function actualizarCacheEnBackground() {
  try {
    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log("🔄 Caché actualizada en background");
    }
  } catch (error) {
    // Silenciar errores de actualización en background
    console.log("ℹ️ No se pudo actualizar caché en background");
  }
}

// Helper: Normalizar categoría para Firebase (frontend usa "nichos", Firebase usa "nicho")
function normalizarCategoriaParaFirebase(categoria) {
  if (categoria === "nichos") {
    return "nicho";
  }
  return categoria;
}

// Helper: Normalizar marca para Firebase (remover prefijo "Set " si existe)
function normalizarMarcaParaFirebase(categoria, marca) {
  // Si es categoría sets y la marca tiene el prefijo "Set ", quitarlo
  if (categoria === "sets" && marca.startsWith("Set ")) {
    return marca.substring(4).toLowerCase().trim();
  }
  return marca.toLowerCase().trim();
}

// Actualizar un perfume específico (solo admin) - OPTIMIZADO
export async function actualizarPerfume(categoria, marca, index, updates) {
  // Normalizar marca primero (usa categoría original), luego categoría
  marca = normalizarMarcaParaFirebase(categoria, marca);
  categoria = normalizarCategoriaParaFirebase(categoria);
  try {
    console.log(`📝 Actualizando perfume: ${categoria}/${marca}[${index}]`);

    // Construir la ruta específica del perfume
    const perfumePath = `perfumes.${categoria}.${marca}.${index}`;

    // Crear objeto con las rutas completas para cada campo a actualizar
    const updateData = {};

    if (updates.nombre !== undefined)
      updateData[`${perfumePath}.nombre`] = updates.nombre;
    if (updates.imagen !== undefined)
      updateData[`${perfumePath}.imagen`] = updates.imagen;
    if (updates.precio !== undefined)
      updateData[`${perfumePath}.precio`] = updates.precio;
    if (updates.genero !== undefined)
      updateData[`${perfumePath}.genero`] = updates.genero;
    if (updates.descripcion !== undefined)
      updateData[`${perfumePath}.descripcion`] = updates.descripcion;
    if (updates.notas !== undefined)
      updateData[`${perfumePath}.notas`] = updates.notas;
    if (updates.tamanosDisponibles !== undefined)
      updateData[`${perfumePath}.tamanosDisponibles`] =
        updates.tamanosDisponibles;
    if (updates.preciosPersonalizados !== undefined)
      updateData[`${perfumePath}.preciosPersonalizados`] =
        updates.preciosPersonalizados;

    // Actualizar solo los campos específicos (MUCHO MÁS RÁPIDO)
    console.log("💾 Actualizando solo campos modificados...");
    const docRef = doc(db, "catalogo", "perfumes");
    await updateDoc(docRef, updateData);

    console.log("✅ Perfume actualizado correctamente");
    return updates;
  } catch (error) {
    console.error("❌ Error al actualizar perfume:", error);
    throw error;
  }
}

// Agregar un nuevo perfume - OPTIMIZADO (maneja arrays y objetos)
export async function agregarPerfume(categoria, marca, nuevoPerfume) {
  try {
    console.log(`➕ Agregando nuevo perfume: ${categoria}/${marca}`);

    // 1. Normalizar marca primero (usa categoría original), luego categoría
    marca = normalizarMarcaParaFirebase(categoria, marca);
    categoria = normalizarCategoriaParaFirebase(categoria);

    // 2. Leer datos actuales
    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Documento de catálogo no encontrado");
    }

    const data = docSnap.data();

    // 3. Obtener la estructura actual de la marca
    const marcaData = data.perfumes?.[categoria]?.[marca];
    let nuevoIndex;
    let updateData = {};

    if (Array.isArray(marcaData)) {
      // CASO 1: Es un array - agregar al final
      const arrayActualizado = [...marcaData, nuevoPerfume];
      nuevoIndex = marcaData.length;
      const marcaPath = `perfumes.${categoria}.${marca}`;
      updateData[marcaPath] = arrayActualizado;
    } else if (typeof marcaData === "object" && marcaData !== null) {
      // CASO 2: Es un objeto - encontrar el siguiente índice disponible
      const indicesExistentes = Object.keys(marcaData).map((k) => parseInt(k));
      nuevoIndex =
        indicesExistentes.length > 0 ? Math.max(...indicesExistentes) + 1 : 0;

      // Agregar solo el nuevo perfume en su índice específico
      const perfumePath = `perfumes.${categoria}.${marca}.${nuevoIndex}`;
      updateData[perfumePath] = nuevoPerfume;
    } else {
      // CASO 3: La marca no existe - crear array nuevo
      nuevoIndex = 0;
      const marcaPath = `perfumes.${categoria}.${marca}`;
      updateData[marcaPath] = [nuevoPerfume];
    }

    console.log(
      `💾 Guardando en: perfumes.${categoria}.${marca}[${nuevoIndex}]`
    );
    await updateDoc(docRef, updateData);

    console.log(`✅ Perfume agregado en índice ${nuevoIndex}`);
    return nuevoIndex;
  } catch (error) {
    console.error("❌ Error al agregar perfume:", error);
    throw error;
  }
}

// Eliminar un perfume - OPTIMIZADO (maneja arrays y objetos)
export async function eliminarPerfume(categoria, marca, index) {
  try {
    // Normalizar marca primero (usa categoría original), luego categoría
    const marcaNormalizada = normalizarMarcaParaFirebase(categoria, marca);
    categoria = normalizarCategoriaParaFirebase(categoria);
    console.log(
      `🗑️ Eliminando perfume: ${categoria}/${marcaNormalizada}[${index}]`
    );

    // 1. Obtener datos actuales
    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Documento de catálogo no encontrado");
    }

    const data = docSnap.data();

    // 2. Verificar que la estructura existe
    if (
      !data.perfumes[categoria] ||
      !data.perfumes[categoria][marcaNormalizada]
    ) {
      throw new Error("Perfume no encontrado");
    }

    // 3. Obtener la estructura de la marca
    const marcaData = data.perfumes[categoria][marcaNormalizada];

    if (Array.isArray(marcaData)) {
      // CASO 1: Es un array - eliminar por índice
      if (index < 0 || index >= marcaData.length) {
        throw new Error(`Perfume no encontrado en índice ${index}`);
      }

      const arrayActualizado = [...marcaData];
      arrayActualizado.splice(index, 1);

      const marcaPath = `perfumes.${categoria}.${marcaNormalizada}`;
      console.log(`💾 Actualizando array: ${marcaPath}`);
      await updateDoc(docRef, {
        [marcaPath]: arrayActualizado,
      });
    } else if (typeof marcaData === "object" && marcaData !== null) {
      // CASO 2: Es un objeto - verificar que la clave existe
      if (!(index.toString() in marcaData)) {
        throw new Error(`Perfume no encontrado en clave ${index}`);
      }

      // Crear nuevo objeto sin la clave eliminada
      const objetoActualizado = { ...marcaData };
      delete objetoActualizado[index.toString()];

      const marcaPath = `perfumes.${categoria}.${marcaNormalizada}`;
      console.log(
        `💾 Actualizando objeto: ${marcaPath} (eliminando clave ${index})`
      );
      await updateDoc(docRef, {
        [marcaPath]: objetoActualizado,
      });
    } else {
      throw new Error("Estructura de datos inválida");
    }

    console.log("✅ Perfume eliminado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error al eliminar perfume:", error);
    throw error;
  }
}

// Función de compatibilidad (ya no usa caché)
// Limpiar caché manualmente (útil después de hacer cambios en admin)
export function limpiarCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log("🗑️ Caché limpiada correctamente");
    return true;
  } catch (error) {
    console.error("⚠️ Error al limpiar caché:", error);
    return false;
  }
}

// Obtener info de la caché
export function infoCacheActual() {
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (!cachedData) {
    return { existe: false };
  }

  const cacheAge = Date.now() - parseInt(cacheTimestamp || "0");
  const minutosEdad = Math.round(cacheAge / 1000 / 60);

  return {
    existe: true,
    edad: minutosEdad,
    expira: minutosEdad < 24 * 60,
    tamaño: (cachedData.length / 1024).toFixed(2) + " KB",
  };
}

// ============ AUTENTICACIÓN ============

export async function loginAdmin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

export async function logoutAdmin() {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Mover un perfume entre categorías/marcas - OPTIMIZADO (1 sola operación)
export async function moverPerfume(
  categoriaOrigen,
  marcaOrigen,
  indexOrigen,
  categoriaDestino,
  marcaDestino,
  perfumeData
) {
  try {
    // Normalizar marcas primero (usan categoría original), luego categorías
    const marcaOrigenNorm = normalizarMarcaParaFirebase(
      categoriaOrigen,
      marcaOrigen
    );
    const marcaDestinoNorm = normalizarMarcaParaFirebase(
      categoriaDestino,
      marcaDestino
    );
    categoriaOrigen = normalizarCategoriaParaFirebase(categoriaOrigen);
    categoriaDestino = normalizarCategoriaParaFirebase(categoriaDestino);

    console.log(
      `🔄 Moviendo perfume: ${categoriaOrigen}/${marcaOrigenNorm}[${indexOrigen}] → ${categoriaDestino}/${marcaDestinoNorm}`
    );

    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Documento de catálogo no encontrado");
    }

    const data = docSnap.data();

    // 1. Obtener estructura origen (puede ser array u objeto)
    const marcaOrigenData = data.perfumes[categoriaOrigen]?.[marcaOrigenNorm];
    let arrayOrigen = [];

    if (Array.isArray(marcaOrigenData)) {
      arrayOrigen = [...marcaOrigenData];
    } else if (
      typeof marcaOrigenData === "object" &&
      marcaOrigenData !== null
    ) {
      arrayOrigen = Object.values(marcaOrigenData);
    } else {
      throw new Error("Perfume origen no encontrado");
    }

    // 2. Verificar que el índice existe
    if (indexOrigen < 0 || indexOrigen >= arrayOrigen.length) {
      throw new Error(`Índice ${indexOrigen} fuera de rango`);
    }

    // 3. Obtener estructura destino (puede ser array u objeto)
    const marcaDestinoData =
      data.perfumes[categoriaDestino]?.[marcaDestinoNorm];
    let arrayDestino = [];

    if (Array.isArray(marcaDestinoData)) {
      arrayDestino = [...marcaDestinoData];
    } else if (
      typeof marcaDestinoData === "object" &&
      marcaDestinoData !== null
    ) {
      arrayDestino = Object.values(marcaDestinoData);
    }

    // 4. Eliminar de origen
    arrayOrigen.splice(indexOrigen, 1);

    // 5. Agregar a destino
    const nuevoIndex = arrayDestino.length;
    arrayDestino.push(perfumeData);

    // 6. Actualizar ambos arrays en una sola operación
    const updateData = {};
    updateData[`perfumes.${categoriaOrigen}.${marcaOrigenNorm}`] = arrayOrigen;
    updateData[`perfumes.${categoriaDestino}.${marcaDestinoNorm}`] =
      arrayDestino;

    console.log("💾 Moviendo perfume (1 operación atómica)...");
    await updateDoc(docRef, updateData);

    console.log(`✅ Perfume movido exitosamente a índice ${nuevoIndex}`);
    return nuevoIndex;
  } catch (error) {
    console.error("❌ Error al mover perfume:", error);
    throw error;
  }
}

export { db, auth };
