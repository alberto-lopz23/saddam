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

// Actualizar un perfume específico (solo admin) - OPTIMIZADO
export async function actualizarPerfume(categoria, marca, index, updates) {
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

// Agregar un nuevo perfume - OPTIMIZADO
export async function agregarPerfume(categoria, marca, nuevoPerfume) {
  try {
    console.log(`➕ Agregando nuevo perfume: ${categoria}/${marca}`);

    // 1. Normalizar la marca (lowercase, sin espacios extras)
    marca = marca.toLowerCase().trim();

    // 2. Leer solo la marca específica para obtener el array actual
    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Documento de catálogo no encontrado");
    }

    const data = docSnap.data();

    // 3. Obtener el array actual de perfumes de esa marca
    const marcaPerfumes = data.perfumes?.[categoria]?.[marca] || [];

    // 4. Calcular el índice del nuevo perfume
    const nuevoIndex = marcaPerfumes.length;

    // 5. Construir la ruta del nuevo perfume
    const perfumePath = `perfumes.${categoria}.${marca}.${nuevoIndex}`;

    // 6. Actualizar solo agregando el nuevo perfume (sin tocar el resto)
    console.log(`💾 Guardando en: ${perfumePath}`);
    await updateDoc(docRef, {
      [perfumePath]: nuevoPerfume,
    });

    console.log(`✅ Perfume agregado en índice ${nuevoIndex}`);
    return nuevoIndex;
  } catch (error) {
    console.error("❌ Error al agregar perfume:", error);
    throw error;
  }
}

// Eliminar un perfume - OPTIMIZADO (solo actualiza la marca específica)
export async function eliminarPerfume(categoria, marca, index) {
  try {
    console.log(`🗑️ Eliminando perfume: ${categoria}/${marca}[${index}]`);

    // 1. Obtener solo la data necesaria
    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Documento de catálogo no encontrado");
    }

    const data = docSnap.data();

    // 2. Verificar que el perfume existe
    if (
      !data.perfumes[categoria] ||
      !data.perfumes[categoria][marca] ||
      !data.perfumes[categoria][marca][index]
    ) {
      throw new Error("Perfume no encontrado");
    }

    // 3. Obtener el array de perfumes de esa marca
    const marcaPerfumes = Object.values(data.perfumes[categoria][marca]);  // Convertimos el objeto en array

    // 4. Eliminar el perfume del array
    marcaPerfumes.splice(index, 1);

    // 5. Actualizar solo el array de esa marca específica
    const marcaPath = `perfumes.${categoria}.${marca}`;

    console.log(`💾 Actualizando solo: ${marcaPath}`);
    await updateDoc(docRef, {
      [marcaPath]: marcaPerfumes,  // Ahora, marcaPerfumes es un array
    });

    console.log("✅ Perfume eliminado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error al eliminar perfume:", error);
    throw error;
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
    console.log(
      `🔄 Moviendo perfume: ${categoriaOrigen}/${marcaOrigen}[${indexOrigen}] → ${categoriaDestino}/${marcaDestino}`
    );

    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Documento de catálogo no encontrado");
    }

    const data = docSnap.data();

    // 1. Verificar que el perfume origen existe
    if (!data.perfumes[categoriaOrigen]?.[marcaOrigen]?.[indexOrigen]) {
      throw new Error("Perfume origen no encontrado");
    }

    // 2. Obtener arrays actuales (convertir objetos a arrays)
    const arrayOrigen = Object.values(data.perfumes[categoriaOrigen][marcaOrigen]);  // Convertir objeto a array
    const arrayDestino = data.perfumes[categoriaDestino]?.[marcaDestino]
      ? Object.values(data.perfumes[categoriaDestino][marcaDestino])  // Convertir objeto a array
      : [];

    // 3. Eliminar de origen
    arrayOrigen.splice(indexOrigen, 1);

    // 4. Agregar a destino
    const nuevoIndex = arrayDestino.length;
    arrayDestino.push(perfumeData);

    // 5. Actualizar ambos arrays en una sola operación
    const updateData = {};
    updateData[`perfumes.${categoriaOrigen}.${marcaOrigen}`] = arrayOrigen;
    updateData[`perfumes.${categoriaDestino}.${marcaDestino}`] = arrayDestino;

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
