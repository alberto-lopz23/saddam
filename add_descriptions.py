import json
import random

# Leer el archivo JSON
with open('perfumes.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Banco de descripciones personalizadas y atractivas
descriptions_templates = [
    "Elegancia atemporal que conquista con su presencia única. {notes_desc}",
    "Una experiencia olfativa que despierta los sentidos y cautiva corazones.",
    "Lujo y sofisticación en cada gota. Perfecto para momentos especiales que merecen ser inolvidables.",
    "La fragancia que define tu personalidad. Audaz, única y completamente irresistible.",
    "Sensualidad y misterio envueltos en una esencia cautivadora que deja huella.",
    "Frescura vibrante que te acompaña todo el día con estilo y confianza.",
    "Un aroma hipnótico que fusiona tradición y modernidad en perfecta armonía.",
    "Seduce sin palabras. Esta fragancia habla por ti con elegancia y distinción.",
    "Lujo accesible que no compromete calidad. Tu mejor inversión en estilo personal.",
    "Despierta admiración dondequiera que vayas con esta composición magistral.",
    "Intensidad y carácter en una fragancia diseñada para quienes no pasan desapercibidos.",
    "Dulzura envolvente que crea momentos mágicos y recuerdos memorables.",
    "Frescura mediterránea que transporta tus sentidos a costas paradisíacas.",
    "Poder y presencia en cada spray. El complemento perfecto para tu éxito.",
    "Romanticismo en su máxima expresión. Perfecta para conquistar y enamorar.",
    "Vibrante y juvenil, esta fragancia es sinónimo de energía y vitalidad.",
    "Sofisticación masculina que redefine la elegancia contemporánea.",
    "Feminidad radiante en una composición floral que enamora a primera inhalación.",
    "Exclusividad y distinción para quienes aprecian lo extraordinario.",
    "Un toque de clase que eleva cualquier ocasión a memorable.",
    "Seducción pura envuelta en notas irresistibles que cautivan instantáneamente.",
    "Frescura matutina que te prepara para conquistar el día con actitud.",
    "Noche de estrellas embotellada. Perfecta para ocasiones que brillan.",
    "La esencia del lujo oriental fusionada con elegancia moderna.",
    "Aventura y libertad capturadas en una fragancia que inspira.",
    "Calidez acogedora que envuelve como un abrazo perfumado.",
    "Intensidad magnética que atrae miradas y genera conversaciones.",
    "Pureza y delicadeza en una composición celestial.",
    "Rebeldía sofisticada para espíritus libres que marcan tendencia.",
    "Elegancia discreta que susurra clase y buen gusto.",
    "Energía explosiva que dinamiza tu presencia y eleva tu confianza.",
    "Misterio envolvente que deja preguntas sin responder.",
    "Dulce tentación imposible de resistir. Adictiva y memorable.",
    "Frescura cítrica que revitaliza y refresca en cada spray.",
    "Madera y especias en armonía perfecta para el hombre moderno.",
    "Flores en primavera embotelladas. Delicadeza que enamora.",
    "Intensidad ahumada con carácter y personalidad definida.",
    "Lujo parisino al alcance de tu mano. Chic y sofisticado.",
    "Vitalidad tropical que te transporta a playas de ensueño.",
    "Elegancia aterciopelada que acaricia los sentidos suavemente.",
]

def get_random_description():
    return random.choice(descriptions_templates)

def add_descriptions(obj, path=""):
    """Recursivamente agrega descripciones a perfumes que no las tienen"""
    if isinstance(obj, dict):
        # Si tiene 'nombre' y 'notas', es un perfume
        if 'nombre' in obj and 'notas' in obj and 'descripcion' not in obj:
            # Agregar descripción personalizada
            obj['descripcion'] = get_random_description()
            print(f"✓ Agregada descripción a: {obj['nombre']}")
        
        # Recursión para todos los valores del diccionario
        for key, value in obj.items():
            add_descriptions(value, f"{path}.{key}" if path else key)
    
    elif isinstance(obj, list):
        # Recursión para todos los elementos de la lista
        for item in obj:
            add_descriptions(item, path)

# Procesar el JSON
print("Agregando descripciones personalizadas...")
add_descriptions(data)

# Guardar el archivo actualizado
with open('perfumes.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\n✅ ¡Proceso completado! Todas las descripciones han sido agregadas.")
