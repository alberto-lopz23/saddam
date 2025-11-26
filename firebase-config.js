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
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (cachedData) {
    console.log("⚡ Cargando desde caché (instantáneo)...");
    const cacheAge = Date.now() - parseInt(cacheTimestamp || "0");

    if (cacheAge < CACHE_DURATION) {
      console.log(`✅ Usando caché (edad: ${Math.round(cacheAge / 1000 / 60)} minutos)`);
      actualizarCacheEnBackground(); // Actualizar caché en segundo plano
      return JSON.parse(cachedData);
    } else {
      console.log("⏰ Caché expirada, intentando actualizar...");
    }
  } else {
    console.log("📦 No hay caché disponible");
  }

  try {
    console.log("📖 Cargando desde Firebase...");
    const docRef = doc(db, "catalogo", "perfumes");

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 8000)
    );

    const docSnap = await Promise.race([getDoc(docRef), timeoutPromise]);

    if (docSnap.exists()) {
      const data = docSnap.data();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log("✅ Datos actualizados y guardados en caché");
      return data;
    } else {
      throw new Error("No se encontraron perfumes en Firebase");
    }
  } catch (error) {
    console.error("⚠️ Error al obtener de Firebase:", error.message);
    if (cachedData) {
      console.log("📦 Usando caché expirada como fallback");
      return JSON.parse(cachedData);
    }

    throw new Error("❌ Sin conexión y no hay datos en caché.");
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
    console.log("ℹ️ No se pudo actualizar caché en background");
  }
}

// Actualizar un perfume específico (solo admin) - OPTIMIZADO
export async function actualizarPerfume(categoria, marca, index, updates) {
  try {
    const perfumePath = `perfumes.${categoria}.${marca}.${index}`;
    const updateData = {};

    if (updates.nombre !== undefined) updateData[`${perfumePath}.nombre`] = updates.nombre;
    if (updates.imagen !== undefined) updateData[`${perfumePath}.imagen`] = updates.imagen;
    if (updates.precio !== undefined) updateData[`${perfumePath}.precio`] = updates.precio;
    if (updates.genero !== undefined) updateData[`${perfumePath}.genero`] = updates.genero;
    if (updates.descripcion !== undefined) updateData[`${perfumePath}.descripcion`] = updates.descripcion;
    if (updates.notas !== undefined) updateData[`${perfumePath}.notas`] = updates.notas;
    if (updates.tamanosDisponibles !== undefined) updateData[`${perfumePath}.tamanosDisponibles`] = updates.tamanosDisponibles;
    if (updates.preciosPersonalizados !== undefined) updateData[`${perfumePath}.preciosPersonalizados`] = updates.preciosPersonalizados;

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
    marca = marca.toLowerCase().trim();
    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Documento de catálogo no encontrado");
    }

    const data = docSnap.data();
    const marcaPerfumes = data.perfumes?.[categoria]?.[marca] || [];
    const nuevoIndex = marcaPerfumes.length;

    const perfumePath = `perfumes.${categoria}.${marca}.${nuevoIndex}`;
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
// Versión robusta con:
// - Comprobación segura de existencia usando 'in' operator
// - Normalización de estructura (objeto → array) con verificación Array.isArray
// - Manejo de errores claro y logs de depuración
export async function eliminarPerfume(categoria, marca, index) {
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

    console.log(`✅ Perfume eliminado correctamente de Firestore: ${categoria}/${marca}[${index}]`);
    return true;
  } catch (error) {
    console.error("❌ Error al eliminar perfume:", error);
    throw error;
  }
}

// Limpiar caché de localStorage
export function limpiarCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  console.log("🗑️ Caché limpiada");
}

// Obtener info de la caché
export function infoCacheActual() {
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (!cachedData) return { existe: false };

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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
    console.log(`🔄 Moviendo perfume: ${categoriaOrigen}/${marcaOrigen}[${indexOrigen}] → ${categoriaDestino}/${marcaDestino}`);

    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Documento de catálogo no encontrado");
    }

    const data = docSnap.data();

    if (!data.perfumes[categoriaOrigen]?.[marcaOrigen]?.[indexOrigen]) {
      throw new Error("Perfume origen no encontrado");
    }

    const arrayOrigen = Object.values(data.perfumes[categoriaOrigen][marcaOrigen]);
    const arrayDestino = data.perfumes[categoriaDestino]?.[marcaDestino]
      ? Object.values(data.perfumes[categoriaDestino][marcaDestino])
      : [];

    arrayOrigen.splice(indexOrigen, 1);

    const nuevoIndex = arrayDestino.length;
    arrayDestino.push(perfumeData);

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
