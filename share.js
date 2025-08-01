document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('loader');
    const sharedImage = document.getElementById('sharedImage');
    const imageContainer = document.getElementById('image-container');

    // 1. Obtener el ID de la imagen desde la URL
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('id');

    if (!shareId) {
        loader.textContent = 'Error: No se encontró el ID de la imagen.';
        return;
    }

    // 2. Llamar a nuestro backend para obtener la URL de la imagen
    try {
        const response = await fetch(`https://decorador-ia.onrender.com/api/get-shared-image/${shareId}`);
        if (!response.ok) {
            throw new Error('La imagen no fue encontrada o ha expirado.');
        }
        const data = await response.json();
        
        // 3. Mostrar la imagen
        sharedImage.src = data.imageUrl;
        sharedImage.style.display = 'block';
        loader.style.display = 'none';

    } catch (error) {
        loader.textContent = `Error: ${error.message}`;
    }
});
