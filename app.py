import os
import base64
from io import BytesIO
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import replicate

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Inicializar la aplicación Flask
app = Flask(__name__)
CORS(app)

# Configurar el cliente de Replicate
try:
    REPLICATE_API_TOKEN = os.environ["REPLICATE_API_TOKEN"]
    client = replicate.Client(api_token=REPLICATE_API_TOKEN)
except KeyError:
    print("‼️ ERROR: La variable de entorno REPLICATE_API_TOKEN no está definida.")
    print("Asegúrate de crear un archivo .env y añadir tu token.")
    exit()

def process_image_to_rgb_base64(image_data_uri):
    """
    Procesa una imagen en formato Data URI para asegurar que esté en formato RGB (sin transparencia)
    y la devuelve como un Data URI limpio en formato JPEG.
    """
    header, encoded = image_data_uri.split(",", 1)
    decoded_data = base64.b64decode(encoded)
    image = Image.open(BytesIO(decoded_data))
    rgb_image = image.convert("RGB")
    buffered = BytesIO()
    rgb_image.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{img_str}"

@app.route('/api/redesign', methods=['POST'])
def redesign_space():
    """
    Endpoint que genera el diseño base con adirik/interior-design.
    Ahora puede recibir una imagen base64 o una URL de una imagen previa.
    """
    try:
        data = request.get_json()
        image_input = data.get('image') # Puede ser base64 o una URL
        prompt = data.get('prompt')
        prompt_strength = data.get('strength', 0.8)

        if not image_input or not prompt:
            return jsonify({'error': 'Se requiere una imagen y un prompt.'}), 400

        # Si la imagen es un data URI (base64), la procesamos. Si es una URL, la usamos directamente.
        if image_input.startswith('data:image'):
            print("🔧 Procesando imagen base64 para asegurar compatibilidad...")
            clean_image_input = process_image_to_rgb_base64(image_input)
            print("✅ Imagen procesada.")
        else:
            print("ℹ️ Usando URL de imagen existente como entrada.")
            clean_image_input = image_input

        print(f"🚀 Enviando petición a adirik/interior-design...")
        design_output = client.run(
            "adirik/interior-design:76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38",
            input={
                "image": clean_image_input,
                "prompt": prompt,
                "negative_prompt": "lowres, watermark, banner, logo, contact information, text, blurry, ugly, disfigured, deformed",
                "prompt_strength": prompt_strength,
            }
        )

        new_image_url = str(design_output)
        print(f"✅ ¡Diseño generado! URL: {new_image_url}")
        return jsonify({'newImage': new_image_url})

    except Exception as e:
        print(f"❌ Error durante la generación del diseño: {e}")
        return jsonify({'error': f'Hubo un error en el servidor: {e}'}), 500

@app.route('/api/upscale', methods=['POST'])
def upscale_image():
    """
    Endpoint que mejora la resolución de una imagen generada.
    """
    try:
        data = request.get_json()
        image_url = data.get('imageUrl')

        if not image_url:
            return jsonify({'error': 'Se requiere la URL de la imagen.'}), 400

        print("🚀 Mejorando la resolución de la imagen...")
        upscaled_output = client.run(
            "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
            input={
                "image": image_url,
                "scale": 4, # Escalar la imagen 4 veces
            }
        )
        final_image_url = str(upscaled_output)
        print(f"✅ ¡Resolución mejorada! URL: {final_image_url}")
        return jsonify({'newImage': final_image_url})

    except Exception as e:
        print(f"❌ Error durante la mejora de resolución: {e}")
        return jsonify({'error': f'Hubo un error en el servidor: {e}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
