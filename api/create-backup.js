// API Route para crear backup manual en Vercel Blob
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Leer el archivo actual de perfumes-data.json
    const { list } = await import("@vercel/blob");
    const { blobs } = await list();

    const perfumesBlob = blobs.find(
      (blob) => blob.pathname === "perfumes-data.json"
    );

    if (!perfumesBlob) {
      return res.status(404).json({
        error: "No hay datos para respaldar",
        message: "No existe perfumes-data.json en Vercel Blob",
      });
    }

    // Descargar el contenido actual
    const response = await fetch(perfumesBlob.url);
    const dataString = await response.text();

    // Crear backup con timestamp
    const { put } = await import("@vercel/blob");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const backupBlob = await put(
      `backups/perfumes-${timestamp}.json`,
      dataString,
      {
        access: "public",
        contentType: "application/json",
      }
    );

    console.log("📦 Backup manual creado:", backupBlob.url);

    return res.status(200).json({
      success: true,
      message: "Backup creado exitosamente",
      backup: {
        url: backupBlob.url,
        timestamp,
      },
    });
  } catch (error) {
    console.error("❌ Error al crear backup:", error);
    return res.status(500).json({
      error: "Error al crear backup",
      message: error.message,
    });
  }
}
