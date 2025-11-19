import json
import os
from datetime import datetime

# Base de datos completa de notas de perfumes con emojis
PERFUME_NOTES = {
    # ===== ORIENTICA =====
    "orientica oud saffron": {
        "salida": "🌶️ Azafrán, 🍋 Bergamota, 🌿 Cardamomo",
        "corazon": "🪵 Oud, 🌹 Rosa, 🌸 Jazmín",
        "fondo": "🍦 Vainilla, 🪵 Ámbar, 🌲 Pachulí"
    },
    "orientica royal": {
        "salida": "🍋 Bergamota, 🌸 Flor de Naranjo, 🌿 Cardamomo",
        "corazon": "🌹 Rosa Búlgara, 🪵 Oud, 🌸 Jazmín",
        "fondo": "🪵 Sándalo, 🍦 Almizcle, 🪵 Ámbar"
    },
    
    # ===== RASASI =====
    "hawas rasasi": {
        "salida": "🍎 Manzana, 🍋 Limón, 🌿 Canela, 🍊 Bergamota",
        "corazon": "🌸 Naranja Amarga, 🌿 Cardamomo, 🌊 Notas Acuáticas",
        "fondo": "🪵 Almizcle, 🍦 Ámbar Gris, 🌲 Musgo de Roble"
    },
    "hawas rasasi ice": {
        "salida": "🍋 Bergamota, 🌿 Menta, 🍎 Manzana Verde",
        "corazon": "🌊 Notas Acuáticas, 🌸 Lavanda, 🌿 Geranio",
        "fondo": "🪵 Almizcle, 🍦 Ámbar, 🌲 Cedro"
    },
    "hawas rasasi black": {
        "salida": "🍎 Manzana, 🌶️ Pimienta Negra, 🍋 Bergamota",
        "corazon": "🌹 Rosa, 🪵 Oud, 🌿 Ciprés",
        "fondo": "🪵 Sándalo, 🍦 Almizcle, 🌲 Pachulí, 🪵 Ámbar"
    },
    
    # ===== NITRO =====
    "nitro red": {
        "salida": "🍓 Frutos Rojos, 🍋 Cítricos, 🍎 Manzana",
        "corazon": "🌸 Jazmín, 🌹 Rosa, 🌺 Peonía",
        "fondo": "🍦 Vainilla, 🪵 Almizcle, 🍦 Caramelo"
    },
    
    # ===== ARMAF =====
    "armaf l'homme": {
        "salida": "🍋 Bergamota, 🌿 Lavanda, 🍃 Salvia, 🌶️ Pimienta",
        "corazon": "🌸 Iris, 🌿 Geranio, 🌹 Rosa",
        "fondo": "🌲 Vetiver, 🪵 Cedro, 🌲 Pachulí"
    },
    "armaf le parfait": {
        "salida": "🍋 Limón, 🍎 Manzana, 🌿 Menta, 🍊 Mandarina",
        "corazon": "🌹 Rosa, 🌸 Jazmín, 🌿 Geranio",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🌲 Pachulí, 🍦 Vainilla"
    },
    "club de nuit precieux": {
        "salida": "🍍 Piña, 🍎 Grosellas Negras, 🍋 Bergamota, 🍎 Manzana",
        "corazon": "🌹 Rosa Marroquí, 🌸 Jazmín, 🍃 Abedul",
        "fondo": "🍦 Almizcle, 🪵 Ámbar Gris, 🍦 Vainilla, 🌲 Musgo"
    },
    "club de nuit intense": {
        "salida": "🍋 Limón, 🍎 Grosellas Negras, 🍍 Piña, 🍎 Manzana",
        "corazon": "🌹 Rosa, 🌸 Jazmín, 🍃 Abedul",
        "fondo": "🍦 Almizcle, 🪵 Ámbar Gris, 🌲 Pachulí, 🍦 Vainilla"
    },
    "club de nuit untold": {
        "salida": "🍋 Bergamota, 🍎 Manzana, 🌿 Lavanda, 🌶️ Pimienta",
        "corazon": "🌸 Geranio, 🌹 Rosa, 🌿 Salvia",
        "fondo": "🪵 Sándalo, 🌲 Cedro, 🍦 Almizcle, 🌲 Vetiver"
    },
    "club de nuit imperiale": {
        "salida": "🍋 Limón, 🍎 Manzana, 🌿 Menta, 🍊 Mandarina",
        "corazon": "🌹 Rosa, 🌸 Jazmín, 🌿 Romero",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🌲 Musgo de Roble"
    },
    "club de nuit milestone": {
        "salida": "🍋 Bergamota, 🌶️ Pimienta Rosa, 🍊 Mandarina",
        "corazon": "🌸 Iris, 🌹 Geranio, 🌿 Elemi",
        "fondo": "🌲 Vetiver, 🪵 Cedro, 🌲 Pachulí, 🍦 Almizcle"
    },
    "club de nuit urban elixir": {
        "salida": "🍋 Limón, 🍎 Manzana, 🌿 Menta, 🌶️ Pimienta",
        "corazon": "🌸 Lavanda, 🌹 Geranio, 🌿 Salvia",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🌲 Tonka, 🍦 Vainilla"
    },
    "club de nuit sillage": {
        "salida": "🍋 Bergamota, 🍊 Mandarina, 🌶️ Pimienta Rosa",
        "corazon": "🌹 Rosa, 🌸 Jazmín, 🪵 Oud",
        "fondo": "🪵 Oud, 🍦 Almizcle, 🍦 Vainilla, 🪵 Ámbar"
    },
    "club de nuit women": {
        "salida": "🍊 Naranja, 🍑 Durazno, 🌸 Jazmín, 🍋 Bergamota",
        "corazon": "🌹 Rosa, 🌸 Violeta, 🌺 Lirio, 🌸 Orquídea",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🌲 Pachulí, 🍦 Vainilla"
    },
    "odyssey mandarin": {
        "salida": "🍊 Mandarina, 🍋 Bergamota, 🍎 Manzana Verde",
        "corazon": "🌸 Jazmín, 🌹 Rosa, 🌺 Peonía",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🪵 Sándalo"
    },
    "odyssey mandarin elixir": {
        "salida": "🍊 Mandarina, 🌶️ Pimienta Rosa, 🍋 Bergamota",
        "corazon": "🌸 Iris, 🌹 Rosa, 🌸 Jazmín",
        "fondo": "🪵 Sándalo, 🍦 Almizcle, 🍦 Vainilla, 🌲 Tonka"
    },
    "odyssey mega": {
        "salida": "🍋 Bergamota, 🍎 Manzana, 🌿 Menta, 🌊 Notas Marinas",
        "corazon": "🌹 Rosa, 🌸 Geranio, 🌿 Salvia",
        "fondo": "🪵 Ámbar, 🌲 Cedro, 🍦 Almizcle, 🌲 Vetiver"
    },
    
    # ===== LATTAFA =====
    "raghba": {
        "salida": "🍋 Bergamota, 🍊 Mandarina, 🌿 Cardamomo",
        "corazon": "🪵 Oud, 🌹 Rosa, 🌶️ Azafrán",
        "fondo": "🪵 Sándalo, 🍦 Almizcle, 🪵 Ámbar, 🌲 Pachulí"
    },
    "raghba lattafa": {
        "salida": "🍋 Bergamota, 🍊 Mandarina, 🌿 Cardamomo",
        "corazon": "🪵 Oud, 🌹 Rosa, 🌶️ Azafrán",
        "fondo": "🪵 Sándalo, 🍦 Almizcle, 🪵 Ámbar, 🌲 Pachulí"
    },
    "khamrah": {
        "salida": "🍎 Canela, 🌿 Nuez Moscada, 🍋 Bergamota",
        "corazon": "🍒 Dátiles, 🌹 Rosa Praline, 🌺 Tuberosa",
        "fondo": "🌲 Tonka, 🍦 Vainilla, 🪵 Ámbar, 🍯 Benjuí"
    },
    "khamrah lattafa": {
        "salida": "🍎 Canela, 🌿 Nuez Moscada, 🍋 Bergamota",
        "corazon": "🍒 Dátiles, 🌹 Rosa Praline, 🌺 Tuberosa",
        "fondo": "🌲 Tonka, 🍦 Vainilla, 🪵 Ámbar, 🍯 Benjuí"
    },
    "fakhar": {
        "salida": "🍎 Manzana, 🍋 Limón, 🍊 Bergamota",
        "corazon": "🌹 Rosa, 🌸 Jazmín, 🌺 Lirio",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🌲 Cedro"
    },
    "asad": {
        "salida": "🍋 Bergamota, 🍊 Mandarina, 🌶️ Pimienta",
        "corazon": "🌹 Rosa, 🌸 Iris, 🌿 Geranio",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🌲 Pachulí, 🍦 Vainilla"
    },
    "yara": {
        "salida": "🍊 Naranja, 🍓 Heliotropo, 🌸 Flor de Azahar",
        "corazon": "🪵 Orquídea, 🌺 Tuberosa, 🌸 Jazmín",
        "corazon": "🪵 Ámbar, 🍦 Vainilla, 🍦 Almizcle, 🪵 Sándalo"
    },
    "yara lattafa": {
        "salida": "🍊 Naranja, 🍓 Heliotropo, 🌸 Flor de Azahar",
        "corazon": "🪵 Orquídea, 🌺 Tuberosa, 🌸 Jazmín",
        "fondo": "🪵 Ámbar, 🍦 Vainilla, 🍦 Almizcle, 🪵 Sándalo"
    },
    "ana abiyedh rouge": {
        "salida": "🍓 Frutos Rojos, 🍋 Cítricos, 🌸 Jazmín",
        "corazon": "🌹 Rosa, 🌺 Orquídea, 🌸 Lirio",
        "fondo": "🍦 Vainilla, 🍦 Almizcle, 🪵 Ámbar"
    },
    "oud mood": {
        "salida": "🌹 Rosa, 🌶️ Azafrán, 🌸 Jazmín",
        "corazon": "🪵 Oud, 🌿 Patchouli, 🌸 Orquídea",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🌲 Cedro"
    },
    "bade'e al oud amethyst": {
        "salida": "🍋 Bergamota, 🌹 Rosa, 🌸 Jazmín",
        "corazon": "🪵 Oud, 🌿 Guayaco, 🌶️ Azafrán",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🌲 Pachulí, 🪵 Sándalo"
    },
    "oud for glory": {
        "salida": "🪵 Oud, 🌶️ Azafrán, 🌹 Rosa",
        "corazon": "🪵 Oud, 🌿 Pachulí, 🌸 Jazmín",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🌲 Cedro, 🪵 Sándalo"
    },
    "najdia": {
        "salida": "🍋 Bergamota, 🍊 Mandarina, 🌸 Jazmín",
        "corazon": "🌹 Rosa, 🪵 Oud, 🌿 Pachulí",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🍦 Vainilla"
    },
    
    # ===== PACO RABANNE =====
    "paco rabanne phantom": {
        "salida": "🍋 Limón, 🌿 Cardamomo, 🌿 Lavanda",
        "corazon": "🌸 Lavanda Escocia, 🌿 Helechos, 🍦 Vainilla",
        "fondo": "🌲 Vetiver, 🌲 Pachulí, 🪵 Sándalo"
    },
    "paco rabanne 1 million": {
        "salida": "🍊 Naranja Sangre, 🌿 Menta, 🍊 Pomelo",
        "corazon": "🌹 Rosa, 🌿 Canela, 🌶️ Especias",
        "fondo": "🪵 Ámbar, 🌲 Pachulí, 🪵 Cuero"
    },
    "paco rabanne one million": {
        "salida": "🍊 Naranja Sangre, 🌿 Menta, 🍊 Pomelo",
        "corazon": "🌹 Rosa, 🌿 Canela, 🌶️ Especias",
        "fondo": "🪵 Ámbar, 🌲 Pachulí, 🪵 Cuero"
    },
    "paco rabanne invictus": {
        "salida": "🍊 Pomelo, 🌊 Notas Marinas, 🍊 Mandarina",
        "corazon": "🌿 Hoja de Laurel, 🌸 Jazmín, 🌿 Gaiacwood",
        "fondo": "🪵 Ámbar Gris, 🌲 Guayaco, 🌲 Musgo de Roble"
    },
    
    # ===== JEAN PAUL GAULTIER =====
    "jean paul gaultier le male": {
        "salida": "🌿 Menta, 🍋 Lavanda, 🌿 Cardamomo",
        "corazon": "🌿 Anís, 🌿 Comino, 🌸 Flor de Naranjo",
        "fondo": "🍦 Vainilla, 🌲 Tonka, 🪵 Cedro, 🪵 Sándalo"
    },
    "jpg le male": {
        "salida": "🌿 Menta, 🍋 Lavanda, 🌿 Cardamomo",
        "corazon": "🌿 Anís, 🌿 Comino, 🌸 Flor de Naranjo",
        "fondo": "🍦 Vainilla, 🌲 Tonka, 🪵 Cedro, 🪵 Sándalo"
    },
    "jpg le male elixir": {
        "salida": "🌿 Lavanda, 🌿 Menta, 🌿 Salvia",
        "corazon": "🌲 Tonka, 🍯 Benjuí, 🍦 Vainilla",
        "fondo": "🪵 Ámbar, 🌲 Cedro, 🍦 Vainilla Bourbon"
    },
    "jpg scandal": {
        "salida": "🍯 Miel, 🍊 Naranja Sangre, 🍊 Mandarina",
        "corazon": "🌺 Gardenia, 🌸 Jazmín, 🌹 Rosa",
        "fondo": "🍦 Caramelo, 🌲 Pachulí, 🪵 Haba Tonka"
    },
    
    # ===== HUGO BOSS =====
    "hugo boss bottled": {
        "salida": "🍎 Manzana, 🍋 Limón, 🍊 Bergamota",
        "corazon": "🌿 Geranio, 🌿 Clavo, 🌿 Canela",
        "fondo": "🪵 Sándalo, 🌲 Cedro, 🌲 Vetiver"
    },
    "hugo boss the scent": {
        "salida": "🍋 Jengibre, 🍊 Mandarina",
        "corazon": "🌺 Maninka, 🪵 Cuero",
        "fondo": "🪵 Cuero, 🪵 Madera"
    },
    
    # ===== MONT BLANC =====
    "montblanc explorer": {
        "salida": "🍋 Bergamota, 🌶️ Pimienta Rosa, 🌿 Salvia",
        "corazon": "🌲 Vetiver, 🪵 Cuero, 🌿 Cacao",
        "fondo": "🪵 Ambroxan, 🌲 Pachulí, 🪵 Cedro"
    },
    "montblanc legend": {
        "salida": "🌿 Lavanda, 🍋 Bergamota, 🍍 Piña, 🌿 Cardamomo",
        "corazon": "🌹 Rosa, 🌿 Geranio, 🌿 Coumarin",
        "fondo": "🌲 Tonka, 🪵 Sándalo, 🌲 Cedro"
    },
    
    # ===== CAROLINA HERRERA =====
    "carolina herrera bad boy": {
        "salida": "🌶️ Pimienta Negra, 🌶️ Pimienta Blanca, 🍋 Bergamota",
        "corazon": "🪵 Cedro, 🌿 Salvia",
        "fondo": "🌲 Tonka, 🍦 Cacao, 🪵 Ámbar"
    },
    "carolina herrera 212 vip": {
        "salida": "🍎 Manzana, 🍊 Mandarina, 🌿 Menta",
        "corazon": "🍸 Vodka, 🌿 Jengibre, 🌿 Cardamomo",
        "fondo": "🪵 Ámbar, 🌲 Tonka, 🪵 Cuero"
    },
    
    # ===== VERSACE =====
    "versace eros": {
        "salida": "🌿 Menta, 🍎 Manzana Verde, 🍋 Limón",
        "corazon": "🌲 Tonka, 🌿 Geranio, 🌿 Ambroxan",
        "fondo": "🌲 Vetiver, 🪵 Cedro, 🌲 Musgo de Roble, 🍦 Vainilla"
    },
    "versace dylan blue": {
        "salida": "🍋 Bergamota, 🍊 Pomelo, 🌸 Higo",
        "corazon": "🌸 Violeta, 🌿 Papiro, 🌿 Pimienta Negra",
        "fondo": "🪵 Almizcle, 🌲 Tonka, 🪵 Incienso, 🌶️ Azafrán"
    },
    
    # ===== DIOR =====
    "dior sauvage": {
        "salida": "🍋 Bergamota, 🌶️ Pimienta",
        "corazon": "🌶️ Pimienta Sichuan, 🌿 Lavanda, 🌶️ Elemi",
        "fondo": "🪵 Ambroxan, 🌲 Cedro, 🌿 Labdanum"
    },
    "dior homme intense": {
        "salida": "🌿 Lavanda, 🌸 Iris, 🍋 Bergamota",
        "corazon": "🌸 Iris, 🌿 Hojas de Violeta, 🌺 Peonía",
        "fondo": "🌲 Cedro, 🌲 Vetiver, 🪵 Cuero"
    },
    
    # ===== BLEU DE CHANEL =====
    "bleu de chanel": {
        "salida": "🍋 Limón, 🌿 Menta, 🌶️ Pimienta Rosa",
        "corazon": "🍊 Pomelo, 🌿 Nuez Moscada, 🌸 Jazmín, 🌿 Jengibre",
        "fondo": "🪵 Incienso, 🌲 Cedro, 🪵 Sándalo, 🌿 Labdanum"
    },
    "bleu de chanel edp": {
        "salida": "🍋 Limón, 🍋 Bergamota, 🌿 Menta",
        "corazon": "🍊 Pomelo, 🌸 Jazmín, 🌿 Melon",
        "fondo": "🪵 Sándalo, 🌲 Cedro, 🍦 Almizcle, 🪵 Ámbar"
    },
    
    # ===== CREED =====
    "creed aventus": {
        "salida": "🍍 Piña, 🍎 Manzana, 🍎 Grosellas Negras, 🍋 Bergamota",
        "corazon": "🌹 Rosa, 🌸 Jazmín, 🌲 Pachulí, 🍃 Abedul",
        "fondo": "🪵 Almizcle, 🌲 Musgo de Roble, 🪵 Ámbar Gris, 🍦 Vainilla"
    },
    "creed aventus cologne": {
        "salida": "🍋 Bergamota, 🍊 Pomelo, 🍋 Limón, 🌿 Jengibre",
        "corazon": "🌶️ Pimienta Rosa, 🌸 Jazmín, 🌲 Vetiver",
        "fondo": "🪵 Sándalo, 🪵 Almizcle, 🌿 Styrax"
    },
    
    # ===== TOM FORD =====
    "tom ford oud wood": {
        "salida": "🪵 Oud, 🌿 Cardamomo, 🌶️ Pimienta Rosa",
        "corazon": "🪵 Oud, 🪵 Sándalo, 🌲 Vetiver",
        "fondo": "🌲 Tonka, 🍦 Vainilla, 🪵 Ámbar"
    },
    "tom ford noir": {
        "salida": "🍋 Bergamota, 🌶️ Pimienta Rosa, 🌿 Cardamomo",
        "corazon": "🌹 Rosa Búlgara, 🌸 Iris, 🌿 Geranio",
        "fondo": "🌲 Vetiver, 🌲 Pachulí, 🪵 Ámbar"
    },
    
    # ===== YVES SAINT LAURENT =====
    "ysl y edp": {
        "salida": "🍎 Manzana, 🍋 Bergamota, 🌿 Jengibre",
        "corazon": "🌿 Salvia, 🌸 Geranio",
        "fondo": "🌲 Cedro, 🌲 Vetiver, 🪵 Olibanum"
    },
    "ysl la nuit de l'homme": {
        "salida": "🍋 Bergamota, 🌿 Cardamomo",
        "corazon": "🌸 Lavanda, 🌲 Cedro",
        "fondo": "🌲 Vetiver, 🌿 Coumarin"
    },
    
    # ===== DOLCE & GABBANA =====
    "dolce gabbana the one": {
        "salida": "🍊 Pomelo, 🌿 Coriandro, 🌿 Albahaca",
        "corazon": "🌿 Cardamomo, 🌸 Jengibre, 🌸 Flor de Naranjo",
        "fondo": "🪵 Cedro, 🪵 Ámbar, 🌲 Tabaco"
    },
    "dolce gabbana light blue": {
        "salida": "🍋 Limón Siciliano, 🍎 Manzana, 🌸 Campanilla",
        "corazon": "🌸 Jazmín, 🌹 Rosa",
        "fondo": "🪵 Cedro, 🪵 Ámbar, 🪵 Almizcle"
    },
    
    # ===== GIVENCHY =====
    "givenchy gentleman": {
        "salida": "🍋 Bergamota, 🍋 Limón, 🌿 Menta",
        "corazon": "🌸 Iris, 🌿 Geranio",
        "fondo": "🌲 Vetiver, 🌲 Cedro, 🌲 Pachulí"
    },
    "givenchy pi": {
        "salida": "🍊 Mandarina, 🌿 Albahaca, 🌿 Tarragon",
        "corazon": "🌿 Anís, 🌿 Geranio, 🌺 Lirio",
        "fondo": "🪵 Ámbar, 🌲 Tonka, 🪵 Cedro, 🍦 Vainilla"
    }
}

# Notas genéricas por tipo
GENERIC_NOTES = {
    "oud": {
        "salida": "🍋 Bergamota, 🌿 Cardamomo, 🌶️ Azafrán",
        "corazon": "🪵 Oud, 🌹 Rosa, 🌸 Jazmín",
        "fondo": "🪵 Sándalo, 🍦 Almizcle, 🪵 Ámbar"
    },
    "floral": {
        "salida": "🍋 Bergamota, 🍊 Mandarina, 🌸 Neroli",
        "corazon": "🌹 Rosa, 🌸 Jazmín, 🌺 Lirio",
        "fondo": "🍦 Almizcle, 🪵 Ámbar, 🍦 Vainilla"
    },
    "woody": {
        "salida": "🍋 Limón, 🌿 Lavanda, 🌶️ Pimienta",
        "corazon": "🌲 Cedro, 🌿 Geranio, 🌹 Rosa",
        "fondo": "🌲 Vetiver, 🪵 Sándalo, 🌲 Pachulí"
    },
    "fresh": {
        "salida": "🍋 Limón, 🍊 Bergamota, 🌿 Menta",
        "corazon": "🌊 Notas Acuáticas, 🌿 Lavanda, 🌸 Jazmín",
        "fondo": "🪵 Ámbar, 🍦 Almizcle, 🌲 Cedro"
    },
    "spicy": {
        "salida": "🌶️ Pimienta, 🌿 Cardamomo, 🍋 Bergamota",
        "corazon": "🌿 Canela, 🌿 Nuez Moscada, 🌹 Rosa",
        "fondo": "🪵 Ámbar, 🌲 Pachulí, 🍦 Almizcle"
    },
    "oriental": {
        "salida": "🍊 Mandarina, 🌿 Cardamomo, 🌶️ Azafrán",
        "corazon": "🌹 Rosa, 🪵 Oud, 🌸 Jazmín",
        "fondo": "🍦 Vainilla, 🪵 Ámbar, 🌲 Pachulí"
    }
}

def normalize_name(name):
    """Normalizar nombre para matching"""
    import unicodedata
    # Remover acentos
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('ASCII')
    # Lowercase y limpiar
    name = name.lower().strip()
    # Remover puntuación excepto espacios
    import string
    name = ''.join(c if c not in string.punctuation or c == ' ' else ' ' for c in name)
    # Colapsar espacios múltiples
    name = ' '.join(name.split())
    return name

def get_notes_for_perfume(nombre):
    """Obtener notas para un perfume"""
    normalized = normalize_name(nombre)
    
    # Buscar coincidencia exacta
    if normalized in PERFUME_NOTES:
        return PERFUME_NOTES[normalized]
    
    # Buscar por palabras clave
    nombre_lower = normalized
    if "oud" in nombre_lower or "oudh" in nombre_lower:
        return GENERIC_NOTES["oud"]
    elif "floral" in nombre_lower or "rose" in nombre_lower or "jasmine" in nombre_lower:
        return GENERIC_NOTES["floral"]
    elif "wood" in nombre_lower or "cedar" in nombre_lower or "vetiver" in nombre_lower:
        return GENERIC_NOTES["woody"]
    elif "fresh" in nombre_lower or "aqua" in nombre_lower or "ocean" in nombre_lower:
        return GENERIC_NOTES["fresh"]
    elif "spice" in nombre_lower or "spicy" in nombre_lower:
        return GENERIC_NOTES["spicy"]
    else:
        return GENERIC_NOTES["oriental"]

def process_perfumes():
    """Procesar y agregar notas a todos los perfumes"""
    root = r"c:\Users\User\OneDrive\Desktop\saddam"
    perfumes_path = os.path.join(root, "perfumes.json")
    
    # Crear backup
    backup_path = f"perfumes.json.notas.bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    import shutil
    shutil.copy(perfumes_path, os.path.join(root, backup_path))
    print(f"✅ Backup creado: {backup_path}")
    
    # Cargar perfumes
    with open(perfumes_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    count = 0
    found = 0
    generic = 0
    
    # Procesar cada perfume recursivamente
    def add_notes_recursive(obj):
        nonlocal count, found, generic
        
        if isinstance(obj, dict):
            # Si tiene "nombre", agregar notas
            if 'nombre' in obj and isinstance(obj['nombre'], str):
                count += 1
                notas = get_notes_for_perfume(obj['nombre'])
                obj['notas'] = notas
                
                normalized = normalize_name(obj['nombre'])
                if normalized in PERFUME_NOTES:
                    found += 1
                else:
                    generic += 1
            
            # Recursión en todos los valores
            for value in obj.values():
                add_notes_recursive(value)
        
        elif isinstance(obj, list):
            for item in obj:
                add_notes_recursive(item)
    
    add_notes_recursive(data)
    
    # Guardar
    with open(perfumes_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ COMPLETADO!")
    print(f"📊 Perfumes procesados: {count}")
    print(f"✨ Notas específicas encontradas: {found}")
    print(f"🔄 Notas genéricas aplicadas: {generic}")
    print(f"💾 Archivo actualizado: perfumes.json")
    print(f"🔙 Backup disponible: {backup_path}")

if __name__ == "__main__":
    process_perfumes()
