// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
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

// Obtener perfumes con fallback a caché si está offline
export async function obtenerPerfumes() {
  try {
    console.log("📖 Intentando leer de Firebase...");
    const docRef = doc(db, "catalogo", "perfumes");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Guardar en caché para uso offline
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        console.log("✅ Datos actualizados y guardados en caché");
      } catch (cacheError) {
        console.warn("No se pudo guardar en caché:", cacheError);
      }

      return data;
    } else {
      throw new Error("No se encontraron perfumes en Firebase");
    }
  } catch (error) {
    console.error("⚠️ Error al obtener perfumes de Firebase:", error);

    // Intentar usar caché si está offline
    if (
      error.code === "unavailable" ||
      error.message.includes("offline") ||
      error.message.includes("Failed to get document")
    ) {
      console.log("📦 Intentando cargar desde caché offline...");
      const cachedData = localStorage.getItem(CACHE_KEY);

      if (cachedData) {
        console.log("✅ Usando datos del caché (modo offline)");
        return JSON.parse(cachedData);
      } else {
        throw new Error(
          "Sin conexión y no hay datos en caché. Por favor, conéctate a internet."
        );
      }
    }

    throw error;
  }
}

// Actualizar un perfume específico (solo admin)
export async function actualizarPerfume(categoria, marca, index, updates) {
  try {
    // 1. Obtener data actual
    const data = await obtenerPerfumes();

    // 2. Actualizar el perfume específico
    if (
      data.perfumes[categoria] &&
      data.perfumes[categoria][marca] &&
      data.perfumes[categoria][marca][index]
    ) {
      const perfume = data.perfumes[categoria][marca][index];

      // Actualizar campos
      if (updates.nombre !== undefined) perfume.nombre = updates.nombre;
      if (updates.imagen !== undefined) perfume.imagen = updates.imagen;
      if (updates.precio !== undefined) perfume.precio = updates.precio;
      if (updates.genero !== undefined) perfume.genero = updates.genero;
      if (updates.descripcion !== undefined)
        perfume.descripcion = updates.descripcion;
      if (updates.notas !== undefined) perfume.notas = updates.notas;
      if (updates.tamanosDisponibles !== undefined)
        perfume.tamanosDisponibles = updates.tamanosDisponibles;
      if (updates.preciosPersonalizados !== undefined)
        perfume.preciosPersonalizados = updates.preciosPersonalizados;

      // 3. Guardar todo el documento (1 ESCRITURA)
      console.log("💾 Guardando en Firebase (1 escritura)");
      const docRef = doc(db, "catalogo", "perfumes");
      await setDoc(docRef, data);

      return perfume;
    } else {
      throw new Error("Perfume no encontrado");
    }
  } catch (error) {
    console.error("Error al actualizar perfume:", error);
    throw error;
  }
}

// Agregar un nuevo perfume
export async function agregarPerfume(categoria, marca, nuevoPerfume) {
  try {
    // 1. Obtener data actual
    const data = await obtenerPerfumes();

    // 2. Normalizar la marca (lowercase, sin espacios extras)
    marca = marca.toLowerCase().trim();

    // 3. Inicializar estructura si no existe
    if (!data.perfumes[categoria]) {
      data.perfumes[categoria] = {};
    }
    if (!data.perfumes[categoria][marca]) {
      data.perfumes[categoria][marca] = [];
    }

    // 4. Agregar el nuevo perfume
    data.perfumes[categoria][marca].push(nuevoPerfume);

    // 5. Calcular el índice del perfume recién agregado
    const nuevoIndex = data.perfumes[categoria][marca].length - 1;

    // 6. Guardar en Firebase
    console.log(
      `💾 Guardando nuevo perfume en Firebase (${categoria}/${marca}[${nuevoIndex}])`
    );
    const docRef = doc(db, "catalogo", "perfumes");
    await setDoc(docRef, data);

    // 7. Retornar el índice del perfume agregado
    return nuevoIndex;
  } catch (error) {
    console.error("Error al agregar perfume:", error);
    throw error;
  }
}

// Eliminar un perfume
export async function eliminarPerfume(categoria, marca, index) {
  try {
    // 1. Obtener data actual
    const data = await obtenerPerfumes();

    // 2. Verificar que el perfume existe
    if (
      data.perfumes[categoria] &&
      data.perfumes[categoria][marca] &&
      data.perfumes[categoria][marca][index] !== undefined
    ) {
      // 3. Eliminar el perfume del array
      data.perfumes[categoria][marca].splice(index, 1);

      // 4. Si la marca quedó vacía, eliminarla
      if (data.perfumes[categoria][marca].length === 0) {
        delete data.perfumes[categoria][marca];
        console.log(`🗑️ Marca "${marca}" eliminada (sin perfumes)`);
      }

      // 5. Guardar en Firebase
      console.log("💾 Guardando cambios en Firebase (1 escritura)");
      const docRef = doc(db, "catalogo", "perfumes");
      await setDoc(docRef, data);

      return true;
    } else {
      throw new Error("Perfume no encontrado");
    }
  } catch (error) {
    console.error("Error al eliminar perfume:", error);
    throw error;
  }
}

// Función de compatibilidad (ya no usa caché)
export function limpiarCache() {
  console.log("✅ Sin caché - siempre actualizado");
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

export { db, auth };
