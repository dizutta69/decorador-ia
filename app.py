import os
import base64
import json
import uuid
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

SHARED_DB_FILE = 'shared_images.json'

def load_shared_images():
    if not os.path.exists(SHARED_DB_FILE):
        return {}
    with open(SHARED_DB_FILE, 'r') as f:
        return json.load(f)

def save_shared_images(data):
    with open(SHARED_DB_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def process_image_to_rgb_base64(image_data_uri):
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
    try:
        data = request.get_json()
        image_input = data.get('image')
        prompt = data.get('prompt')
        prompt_strength = data.get('strength', 0.8)

        if not image_input or not prompt:
            return jsonify({'error': 'Se requiere una imagen y un prompt.'}), 400

        if image_input.startswith('data:image'):
            clean_image_input = process_image_to_rgb_base64(image_input)
        else:
            clean_image_input = image_input

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
        return jsonify({'newImage': new_image_url})
    except Exception as e:
        return jsonify({'error': f'Hubo un error en el servidor: {e}'}), 500

@app.route('/api/upscale', methods=['POST'])
def upscale_image():
    try:
        data = request.get_json()
        image_url = data.get('imageUrl')
        if not image_url:
            return jsonify({'error': 'Se requiere la URL de la imagen.'}), 400
        upscaled_output = client.run(
            "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
            input={"image": image_url, "scale": 4}
        )
        return jsonify({'newImage': str(upscaled_output)})
    except Exception as e:
        return jsonify({'error': f'Hubo un error en el servidor: {e}'}), 500

@app.route('/api/create-share-link', methods=['POST'])
def create_share_link():
    try:
        data = request.get_json()
        image_url = data.get('imageUrl')
        if not image_url:
            return jsonify({'error': 'Se requiere la URL de la imagen.'}), 400

        share_id = str(uuid.uuid4())[:8]
        shared_images = load_shared_images()
        shared_images[share_id] = image_url
        save_shared_images(shared_images)

        return jsonify({'shareId': share_id})
    except Exception as e:
        return jsonify({'error': f'Hubo un error en el servidor: {e}'}), 500

@app.route('/api/get-shared-image/<share_id>', methods=['GET'])
def get_shared_image(share_id):
    shared_images = load_shared_images()
    image_url = shared_images.get(share_id)
    if not image_url:
        return jsonify({'error': 'Imagen no encontrada'}), 404
    return jsonify({'imageUrl': image_url})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
